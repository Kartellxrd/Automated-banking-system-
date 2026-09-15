import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireSiteClerk } from '@/lib/auth/requireSiteClerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteClerkContext } from '@/lib/site-clerk/getSiteContext';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const runtime = 'nodejs';

const BUCKET = 'expense-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function extFor(type) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'application/pdf') return 'pdf';
  return 'bin';
}

async function uploadFile(db, { requestId, userId, file, kind }) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) return null;
  if (!ALLOWED_MIME.has(file.type)) throw new Error('Proof must be JPG, PNG or PDF.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Proof must be 10 MB or smaller.');
  const path = `${requestId}/reconciliation/${randomUUID()}.${extFor(file.type)}`;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  return { path, row: {
    request_id: requestId,
    document_kind: kind,
    storage_bucket: BUCKET,
    storage_path: path,
    original_filename: file.name || kind,
    mime_type: file.type,
    file_size_bytes: file.size,
    uploaded_by: userId,
  } };
}

export async function POST(request, context) {
  const access = await requireSiteClerk('expenses.request.reconcile');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  const uploadedPaths = [];
  try {
    const { id } = await context.params;
    const form = await request.formData();
    const actualSpent = Number(form.get('actual_spent'));
    const returnedAmount = Number(form.get('returned_amount') || 0);
    const notes = String(form.get('notes') || '').trim() || null;
    const receipt = form.get('receipt');
    const returnProof = form.get('return_proof');

    if (!Number.isFinite(actualSpent) || actualSpent < 0 || !Number.isFinite(returnedAmount) || returnedAmount < 0) {
      return NextResponse.json({ success: false, error: 'Spent and returned amounts must be zero or greater.' }, { status: 400 });
    }
    if (actualSpent > 0 && (!receipt || typeof receipt.arrayBuffer !== 'function' || receipt.size <= 0)) {
      return NextResponse.json({ success: false, error: 'A receipt or invoice is required when money was spent.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const siteContext = await getSiteClerkContext(db, access.user.id);
    if (!siteContext) return NextResponse.json({ success: false, error: 'No active Site assignment.' }, { status: 403 });

    const { data: expenseRequest, error: requestError } = await db.from('expense_requests').select('id,request_code,site_id,status').eq('id', id).maybeSingle();
    if (requestError) throw requestError;
    if (!expenseRequest || expenseRequest.site_id !== siteContext.site.id) return NextResponse.json({ success: false, error: 'Expense request not found for your Site.' }, { status: 404 });

    const uploads = [];
    const receiptUpload = await uploadFile(db, { requestId: id, userId: access.user.id, file: receipt, kind: 'receipt' });
    if (receiptUpload) { uploads.push(receiptUpload); uploadedPaths.push(receiptUpload.path); }
    const returnUpload = await uploadFile(db, { requestId: id, userId: access.user.id, file: returnProof, kind: 'return_proof' });
    if (returnUpload) { uploads.push(returnUpload); uploadedPaths.push(returnUpload.path); }

    const { data: reconciliation, error } = await db.rpc('site_clerk_submit_expense_reconciliation', {
      p_user_id: access.user.id,
      p_request_id: id,
      p_actual_spent: actualSpent,
      p_returned_amount: returnedAmount,
      p_notes: notes,
    });
    if (error) {
      if (uploadedPaths.length) await db.storage.from(BUCKET).remove(uploadedPaths);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (uploads.length) {
      const { error: docsError } = await db.from('expense_request_documents').insert(uploads.map((item) => item.row));
      if (docsError) throw docsError;
    }

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'SUBMIT_EXPENSE_RECONCILIATION',
      module: 'Expenses',
      entityType: 'expense_requests',
      entityId: id,
      details: `Submitted reconciliation for ${expenseRequest.request_code}.`,
      metadata: { actual_spent: actualSpent, returned_amount: returnedAmount, reconciliation_version: reconciliation.version },
    });

    return NextResponse.json({ success: true, data: reconciliation }, { status: 201 });
  } catch (error) {
    console.error('Site Clerk expense reconciliation error:', error);
    if (uploadedPaths.length) {
      try { await createSupabaseAdminClient().storage.from(BUCKET).remove(uploadedPaths); } catch {}
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit expense reconciliation.' }, { status: 500 });
  }
}
