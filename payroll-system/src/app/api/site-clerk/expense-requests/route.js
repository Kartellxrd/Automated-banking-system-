import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireSiteClerk } from '@/lib/auth/requireSiteClerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteClerkContext } from '@/lib/site-clerk/getSiteContext';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'expense-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function extFor(type) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'application/pdf') return 'pdf';
  return 'bin';
}

async function signedUrl(db, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data?.signedUrl || null;
}

async function buildPayload(db, userId) {
  const context = await getSiteClerkContext(db, userId);
  if (!context) throw new Error('No active Site Clerk assignment was found.');

  const [requestsResult, categoriesResult] = await Promise.all([
    db.from('expense_requests')
      .select('id,request_code,site_id,category_id,requested_by_user_id,operational_requester_name,operational_requester_role,purpose,requested_amount,accountant_recommended_amount,approved_amount,payment_type,vendor_name,needed_by_date,status,submitted_at,accountant_return_reason,accountant_rejection_reason,ceo_rejection_reason,approved_at,funded_at,reconciled_at,created_at,updated_at')
      .eq('site_id', context.site.id)
      .order('created_at', { ascending: false }),
    db.from('expense_categories').select('id,category_name').order('category_name'),
  ]);
  if (requestsResult.error) throw requestsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;

  const requests = requestsResult.data || [];
  const requestIds = requests.map((row) => row.id);
  const [docsResult, disbursementsResult, reconciliationsResult] = await Promise.all([
    requestIds.length ? db.from('expense_request_documents').select('id,request_id,document_kind,storage_path,original_filename,mime_type,file_size_bytes,uploaded_at').in('request_id', requestIds).order('uploaded_at') : Promise.resolve({ data: [], error: null }),
    requestIds.length ? db.from('expense_disbursements').select('id,request_id,amount,payment_reference,notes,disbursed_at').in('request_id', requestIds).order('disbursed_at') : Promise.resolve({ data: [], error: null }),
    requestIds.length ? db.from('expense_reconciliations').select('id,request_id,version,actual_spent,returned_amount,notes,status,submitted_at,issue_reason,accountant_reviewed_at').in('request_id', requestIds).order('version', { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [docsResult, disbursementsResult, reconciliationsResult]) if (result.error) throw result.error;

  const categoryMap = new Map((categoriesResult.data || []).map((row) => [row.id, row]));
  const docsByRequest = new Map();
  for (const doc of docsResult.data || []) {
    const list = docsByRequest.get(doc.request_id) || [];
    list.push({ ...doc, preview_url: await signedUrl(db, doc.storage_path) });
    docsByRequest.set(doc.request_id, list);
  }
  const disbursementsByRequest = new Map();
  for (const item of disbursementsResult.data || []) {
    const list = disbursementsByRequest.get(item.request_id) || [];
    list.push({ ...item, amount: Number(item.amount || 0) });
    disbursementsByRequest.set(item.request_id, list);
  }
  const latestReconciliation = new Map();
  for (const item of reconciliationsResult.data || []) {
    if (!latestReconciliation.has(item.request_id)) {
      latestReconciliation.set(item.request_id, {
        ...item,
        actual_spent: Number(item.actual_spent || 0),
        returned_amount: Number(item.returned_amount || 0),
      });
    }
  }

  const data = requests.map((request) => {
    const disbursements = disbursementsByRequest.get(request.id) || [];
    const disbursed = disbursements.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const reconciliation = latestReconciliation.get(request.id) || null;
    const unexplained = reconciliation ? Number((disbursed - reconciliation.actual_spent - reconciliation.returned_amount).toFixed(2)) : disbursed;
    return {
      ...request,
      requested_amount: Number(request.requested_amount || 0),
      accountant_recommended_amount: request.accountant_recommended_amount == null ? null : Number(request.accountant_recommended_amount),
      approved_amount: request.approved_amount == null ? null : Number(request.approved_amount),
      category: categoryMap.get(request.category_id) || null,
      documents: docsByRequest.get(request.id) || [],
      disbursements,
      total_disbursed: Number(disbursed.toFixed(2)),
      latest_reconciliation: reconciliation,
      unexplained_amount: unexplained,
    };
  });

  const outstandingAdvance = data
    .filter((row) => row.payment_type === 'site_advance' && !['reconciled', 'rejected', 'ceo_rejected', 'cancelled'].includes(row.status))
    .reduce((sum, row) => sum + Math.max(0, row.unexplained_amount || row.total_disbursed || 0), 0);

  return { site: context.site, categories: categoriesResult.data || [], data, outstanding_advance: Number(outstandingAdvance.toFixed(2)) };
}

async function saveInitialDocument(db, requestId, userId, file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) return null;
  if (!ALLOWED_MIME.has(file.type)) throw new Error('Supporting document must be JPG, PNG or PDF.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Supporting document must be 10 MB or smaller.');
  const path = `${requestId}/request/${randomUUID()}.${extFor(file.type)}`;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const kind = String(file.name || '').toLowerCase().includes('invoice') ? 'invoice' : 'quote';
  const { data: doc, error: insertError } = await db.from('expense_request_documents').insert({
    request_id: requestId,
    document_kind: kind,
    storage_bucket: BUCKET,
    storage_path: path,
    original_filename: file.name || 'supporting-document',
    mime_type: file.type,
    file_size_bytes: file.size,
    uploaded_by: userId,
  }).select('*').single();
  if (insertError) {
    await db.storage.from(BUCKET).remove([path]);
    throw insertError;
  }
  return doc;
}

export async function GET() {
  const access = await requireSiteClerk('expenses.request.create');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const db = createSupabaseAdminClient();
    return NextResponse.json({ success: true, ...(await buildPayload(db, access.user.id)) });
  } catch (error) {
    console.error('Site Clerk expense requests GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load expense requests.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireSiteClerk('expenses.request.create');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const form = await request.formData();
    const categoryId = String(form.get('category_id') || '').trim();
    const requesterName = String(form.get('operational_requester_name') || '').trim();
    const requesterRole = String(form.get('operational_requester_role') || '').trim() || null;
    const purpose = String(form.get('purpose') || '').trim();
    const amount = Number(form.get('requested_amount'));
    const paymentType = String(form.get('payment_type') || '').trim();
    const vendorName = String(form.get('vendor_name') || '').trim() || null;
    const neededBy = String(form.get('needed_by_date') || '').trim() || null;
    const file = form.get('supporting_document');

    if (!categoryId || !requesterName || !purpose || !Number.isFinite(amount) || amount <= 0 || !['direct_vendor', 'site_advance'].includes(paymentType)) {
      return NextResponse.json({ success: false, error: 'Category, requester, purpose, positive amount and payment type are required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: created, error } = await db.rpc('site_clerk_create_expense_request', {
      p_user_id: access.user.id,
      p_category_id: categoryId,
      p_operational_requester_name: requesterName,
      p_operational_requester_role: requesterRole,
      p_purpose: purpose,
      p_requested_amount: amount,
      p_payment_type: paymentType,
      p_vendor_name: vendorName,
      p_needed_by_date: neededBy,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    let attachmentWarning = null;
    try { await saveInitialDocument(db, created.id, access.user.id, file); } catch (uploadError) { attachmentWarning = uploadError.message; }

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'SUBMIT_EXPENSE_REQUEST',
      module: 'Expenses',
      entityType: 'expense_requests',
      entityId: created.id,
      details: `Submitted expense request ${created.request_code}.`,
      metadata: { site_id: created.site_id, requested_amount: amount, payment_type: paymentType, category_id: categoryId },
    });

    return NextResponse.json({ success: true, data: created, attachment_warning: attachmentWarning }, { status: 201 });
  } catch (error) {
    console.error('Site Clerk expense request POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit expense request.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireSiteClerk('expenses.request.create');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const db = createSupabaseAdminClient();
    const { data, error } = await db.rpc('site_clerk_resubmit_expense_request', {
      p_user_id: access.user.id,
      p_request_id: body.id,
      p_category_id: body.category_id,
      p_operational_requester_name: body.operational_requester_name,
      p_operational_requester_role: body.operational_requester_role || null,
      p_purpose: body.purpose,
      p_requested_amount: Number(body.requested_amount),
      p_payment_type: body.payment_type,
      p_vendor_name: body.vendor_name || null,
      p_needed_by_date: body.needed_by_date || null,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'RESUBMIT_EXPENSE_REQUEST',
      module: 'Expenses',
      entityType: 'expense_requests',
      entityId: data.id,
      details: `Resubmitted expense request ${data.request_code}.`,
      metadata: { requested_amount: data.requested_amount, payment_type: data.payment_type },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Site Clerk expense request PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to resubmit expense request.' }, { status: 500 });
  }
}
