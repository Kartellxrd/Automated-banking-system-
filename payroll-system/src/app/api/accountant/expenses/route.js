import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'expense-receipts';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function extFor(type) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'application/pdf') return 'pdf';
  return 'bin';
}

async function sign(db, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data?.signedUrl || null;
}

export async function GET() {
  const access = await requireAccountant('expenses.view');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [expensesResult, categoriesResult, sitesResult] = await Promise.all([
      db.from('expenses').select('id, category_id, site_id, title, vendor, description, amount, spent_at, status, notes, recorded_by, reviewed_by, reviewed_at, receipt_storage_path, receipt_original_filename, receipt_mime_type, created_at, updated_at').order('spent_at', { ascending: false }).order('created_at', { ascending: false }),
      db.from('expense_categories').select('id, category_name').order('category_name'),
      db.from('sites').select('id, site_name, location, is_active').eq('is_active', true).order('site_name'),
    ]);
    if (expensesResult.error) throw expensesResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (sitesResult.error) throw sitesResult.error;

    const categoryMap = new Map((categoriesResult.data || []).map((row) => [row.id, row]));
    const siteMap = new Map((sitesResult.data || []).map((row) => [row.id, row]));
    const data = await Promise.all((expensesResult.data || []).map(async (expense) => ({
      ...expense,
      amount: Number(expense.amount || 0),
      category: categoryMap.get(expense.category_id) || null,
      site: siteMap.get(expense.site_id) || null,
      receipt_url: await sign(db, expense.receipt_storage_path),
    })));

    return NextResponse.json({ success: true, data, categories: categoriesResult.data || [], sites: sitesResult.data || [] });
  } catch (error) {
    console.error('Accountant expenses GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load expenses.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireAccountant('expenses.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  let storagePath = null;
  try {
    const form = await request.formData();
    const title = String(form.get('title') || '').trim();
    const description = String(form.get('description') || '').trim() || null;
    const vendor = String(form.get('vendor') || '').trim() || null;
    const notes = String(form.get('notes') || '').trim() || null;
    const amount = Number(form.get('amount'));
    const spentAt = String(form.get('spent_at') || '').trim();
    const categoryId = String(form.get('category_id') || '').trim() || null;
    const siteId = String(form.get('site_id') || '').trim() || null;
    const file = form.get('receipt');

    if (!title || !Number.isFinite(amount) || amount <= 0 || !spentAt) {
      return NextResponse.json({ success: false, error: 'Title, positive amount and expense date are required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    if (siteId) {
      const { data: site, error } = await db.from('sites').select('id').eq('id', siteId).eq('is_active', true).maybeSingle();
      if (error) throw error;
      if (!site) return NextResponse.json({ success: false, error: 'Selected site is not active.' }, { status: 400 });
    }
    if (categoryId) {
      const { data: category, error } = await db.from('expense_categories').select('id').eq('id', categoryId).maybeSingle();
      if (error) throw error;
      if (!category) return NextResponse.json({ success: false, error: 'Expense category not found.' }, { status: 400 });
    }

    let receiptOriginal = null;
    let receiptMime = null;
    if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
      if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ success: false, error: 'Receipt must be JPG, PNG or PDF.' }, { status: 400 });
      if (file.size > MAX_FILE_SIZE) return NextResponse.json({ success: false, error: 'Receipt must be 10 MB or smaller.' }, { status: 400 });
      const expenseFileId = randomUUID();
      storagePath = `${access.user.id}/${expenseFileId}.${extFor(file.type)}`;
      const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      receiptOriginal = file.name || 'receipt';
      receiptMime = file.type;
    }

    const { data: expense, error: insertError } = await db.from('expenses').insert({
      category_id: categoryId,
      site_id: siteId,
      title,
      vendor,
      description,
      amount,
      spent_at: spentAt,
      status: 'recorded',
      notes,
      recorded_by: access.user.id,
      receipt_url: null,
      receipt_bucket: storagePath ? BUCKET : null,
      receipt_storage_path: storagePath,
      receipt_original_filename: receiptOriginal,
      receipt_mime_type: receiptMime,
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (insertError) throw insertError;

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'RECORD_EXPENSE',
      module: 'Payroll & Finance',
      entityType: 'expenses',
      entityId: expense.id,
      details: `Recorded expense ${title}.`,
      metadata: { amount, site_id: siteId, category_id: categoryId, spent_at: spentAt },
    });

    return NextResponse.json({ success: true, data: { ...expense, receipt_url: await sign(db, storagePath) } }, { status: 201 });
  } catch (error) {
    console.error('Accountant expense POST error:', error);
    if (storagePath) {
      try { await createSupabaseAdminClient().storage.from(BUCKET).remove([storagePath]); } catch {}
    }
    return NextResponse.json({ success: false, error: 'Failed to record expense.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireAccountant('expenses.manage');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const status = String(body.status || '').trim().toLowerCase();
    const notes = body.notes === undefined ? undefined : String(body.notes || '').trim() || null;
    if (!id || !['recorded', 'verified', 'flagged'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Expense ID and valid status are required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const updates = { status, reviewed_by: access.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    const { data: expense, error } = await db.from('expenses').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!expense) return NextResponse.json({ success: false, error: 'Expense not found.' }, { status: 404 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: status === 'verified' ? 'VERIFY_EXPENSE' : status === 'flagged' ? 'FLAG_EXPENSE' : 'UPDATE_EXPENSE',
      module: 'Payroll & Finance',
      entityType: 'expenses',
      entityId: id,
      details: `Expense ${expense.title} marked ${status}.`,
      metadata: { status },
    });

    return NextResponse.json({ success: true, data: expense });
  } catch (error) {
    console.error('Accountant expense PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update expense.' }, { status: 500 });
  }
}
