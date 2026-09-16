import { NextResponse } from 'next/server';
import { requireCEO } from '@/lib/auth/requireCEO';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

const BUCKET = 'expense-attachments';
const CEO_VISIBLE_STATUSES = [
  'pending_ceo',
  'ceo_rejected',
  'approved',
  'funded',
  'awaiting_reconciliation',
  'reconciliation_submitted',
  'reconciliation_issue',
  'reconciled',
];

async function signedUrl(db, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data?.signedUrl || null;
}

async function loadRequests(db) {
  const [requestsResult, sitesResult, categoriesResult] = await Promise.all([
    db.from('expense_requests')
      .select('id,request_code,site_id,category_id,requested_by_user_id,operational_requester_name,operational_requester_role,purpose,requested_amount,accountant_recommended_amount,approved_amount,payment_type,vendor_name,needed_by_date,status,submitted_at,accountant_reviewed_by,accountant_reviewed_at,accountant_return_reason,accountant_rejection_reason,ceo_reviewed_by,ceo_reviewed_at,ceo_rejection_reason,approved_at,funded_at,reconciled_at,created_at,updated_at')
      .in('status', CEO_VISIBLE_STATUSES)
      .order('created_at', { ascending: false }),
    db.from('sites').select('id,site_name,location').order('site_name'),
    db.from('expense_categories').select('id,category_name').order('category_name'),
  ]);

  for (const result of [requestsResult, sitesResult, categoriesResult]) {
    if (result.error) throw result.error;
  }

  const requests = requestsResult.data || [];
  const requestIds = requests.map((row) => row.id);
  const profileIds = [...new Set(requests.flatMap((row) => [
    row.requested_by_user_id,
    row.accountant_reviewed_by,
    row.ceo_reviewed_by,
  ]).filter(Boolean))];

  const [docsResult, disbursementsResult, profilesResult] = await Promise.all([
    requestIds.length
      ? db.from('expense_request_documents')
        .select('id,request_id,document_kind,storage_path,original_filename,mime_type,file_size_bytes,uploaded_at')
        .in('request_id', requestIds)
        .order('uploaded_at')
      : Promise.resolve({ data: [], error: null }),
    requestIds.length
      ? db.from('expense_disbursements')
        .select('id,request_id,amount,payment_reference,notes,disbursed_by,disbursed_at')
        .in('request_id', requestIds)
        .order('disbursed_at')
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? db.from('profiles').select('id,first_name,last_name,email,role').in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [docsResult, disbursementsResult, profilesResult]) {
    if (result.error) throw result.error;
  }

  const siteMap = new Map((sitesResult.data || []).map((row) => [row.id, row]));
  const categoryMap = new Map((categoriesResult.data || []).map((row) => [row.id, row]));
  const profileMap = new Map((profilesResult.data || []).map((row) => [row.id, {
    ...row,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
  }]));

  const docsByRequest = new Map();
  for (const doc of docsResult.data || []) {
    const list = docsByRequest.get(doc.request_id) || [];
    list.push({ ...doc, preview_url: await signedUrl(db, doc.storage_path) });
    docsByRequest.set(doc.request_id, list);
  }

  const disbursementsByRequest = new Map();
  for (const row of disbursementsResult.data || []) {
    const list = disbursementsByRequest.get(row.request_id) || [];
    list.push({ ...row, amount: Number(row.amount || 0) });
    disbursementsByRequest.set(row.request_id, list);
  }

  const data = requests.map((request) => {
    const disbursements = disbursementsByRequest.get(request.id) || [];
    const totalDisbursed = disbursements.reduce((sum, row) => sum + row.amount, 0);

    return {
      ...request,
      requested_amount: Number(request.requested_amount || 0),
      accountant_recommended_amount: request.accountant_recommended_amount == null
        ? null
        : Number(request.accountant_recommended_amount),
      approved_amount: request.approved_amount == null ? null : Number(request.approved_amount),
      total_disbursed: Number(totalDisbursed.toFixed(2)),
      site: siteMap.get(request.site_id) || null,
      category: categoryMap.get(request.category_id) || null,
      submitted_by_profile: profileMap.get(request.requested_by_user_id) || null,
      accountant_reviewed_by_profile: profileMap.get(request.accountant_reviewed_by) || null,
      ceo_reviewed_by_profile: profileMap.get(request.ceo_reviewed_by) || null,
      documents: docsByRequest.get(request.id) || [],
      disbursements,
    };
  });

  return {
    data,
    summary: {
      awaiting_review: data.filter((row) => row.status === 'pending_ceo').length,
      approved_waiting_payment: data.filter((row) => row.status === 'approved').length,
      rejected: data.filter((row) => row.status === 'ceo_rejected').length,
      funded: data.filter((row) => ['funded', 'awaiting_reconciliation', 'reconciliation_submitted', 'reconciliation_issue', 'reconciled'].includes(row.status)).length,
      approved_waiting_payment_total: Number(data
        .filter((row) => row.status === 'approved')
        .reduce((sum, row) => sum + Number(row.approved_amount || 0), 0)
        .toFixed(2)),
    },
  };
}

export async function GET() {
  const access = await requireCEO('expenses.view');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    return NextResponse.json({ success: true, ...(await loadRequests(db)) });
  } catch (error) {
    console.error('CEO expense requests GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load CEO expense requests.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireCEO('expenses.final_approve');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const action = String(body.action || '').trim().toLowerCase();

    if (!id) return NextResponse.json({ success: false, error: 'Expense request ID is required.' }, { status: 400 });
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Unsupported CEO expense action.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data, error } = await db.rpc('ceo_review_expense_request', {
      p_ceo_id: access.user.id,
      p_request_id: id,
      p_action: action,
      p_reason: String(body.reason || '').trim() || null,
      p_approved_amount: body.approved_amount == null ? null : Number(body.approved_amount),
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: action === 'approve' ? 'CEO_APPROVE_EXPENSE_REQUEST' : 'CEO_REJECT_EXPENSE_REQUEST',
      module: 'Expenses',
      entityType: 'expense_requests',
      entityId: id,
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} expense request ${data.request_code}.`,
      metadata: {
        status: data.status,
        requested_amount: Number(data.requested_amount || 0),
        accountant_recommended_amount: data.accountant_recommended_amount == null ? null : Number(data.accountant_recommended_amount),
        approved_amount: data.approved_amount == null ? null : Number(data.approved_amount),
        reason: body.reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      data,
      message: action === 'approve' ? 'Expense approved for payment.' : 'Expense request rejected.',
    });
  } catch (error) {
    console.error('CEO expense request PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to review expense request.' }, { status: 500 });
  }
}
