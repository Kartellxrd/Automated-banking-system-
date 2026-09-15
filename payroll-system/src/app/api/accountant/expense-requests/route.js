import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

const BUCKET = 'expense-attachments';

async function signedUrl(db, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data?.signedUrl || null;
}

async function loadRequests(db) {
  const [requestsResult, sitesResult, categoriesResult] = await Promise.all([
    db.from('expense_requests')
      .select('id,request_code,site_id,category_id,requested_by_user_id,operational_requester_name,operational_requester_role,purpose,requested_amount,accountant_recommended_amount,approved_amount,payment_type,vendor_name,needed_by_date,status,submitted_at,accountant_reviewed_by,accountant_reviewed_at,accountant_return_reason,accountant_rejection_reason,ceo_reviewed_by,ceo_reviewed_at,ceo_rejection_reason,approved_at,funded_at,reconciled_at,created_at,updated_at')
      .order('created_at', { ascending: false }),
    db.from('sites').select('id,site_name,location').order('site_name'),
    db.from('expense_categories').select('id,category_name').order('category_name'),
  ]);
  for (const result of [requestsResult, sitesResult, categoriesResult]) if (result.error) throw result.error;

  const requests = requestsResult.data || [];
  const requestIds = requests.map((row) => row.id);
  const profileIds = [...new Set(requests.flatMap((row) => [row.requested_by_user_id, row.accountant_reviewed_by, row.ceo_reviewed_by]).filter(Boolean))];
  const [docsResult, disbursementsResult, reconciliationsResult, profilesResult] = await Promise.all([
    requestIds.length ? db.from('expense_request_documents').select('id,request_id,document_kind,storage_path,original_filename,mime_type,file_size_bytes,uploaded_at').in('request_id', requestIds).order('uploaded_at') : Promise.resolve({ data: [], error: null }),
    requestIds.length ? db.from('expense_disbursements').select('id,request_id,amount,payment_reference,notes,disbursed_at').in('request_id', requestIds).order('disbursed_at') : Promise.resolve({ data: [], error: null }),
    requestIds.length ? db.from('expense_reconciliations').select('id,request_id,version,actual_spent,returned_amount,notes,status,submitted_by,submitted_at,accountant_reviewed_by,accountant_reviewed_at,issue_reason').in('request_id', requestIds).order('version', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    profileIds.length ? db.from('profiles').select('id,first_name,last_name,email,role').in('id', profileIds) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [docsResult, disbursementsResult, reconciliationsResult, profilesResult]) if (result.error) throw result.error;

  const siteMap = new Map((sitesResult.data || []).map((row) => [row.id, row]));
  const categoryMap = new Map((categoriesResult.data || []).map((row) => [row.id, row]));
  const profileMap = new Map((profilesResult.data || []).map((row) => [row.id, { ...row, name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email }]));
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
  const reconciliationsByRequest = new Map();
  for (const row of reconciliationsResult.data || []) {
    const list = reconciliationsByRequest.get(row.request_id) || [];
    list.push({ ...row, actual_spent: Number(row.actual_spent || 0), returned_amount: Number(row.returned_amount || 0) });
    reconciliationsByRequest.set(row.request_id, list);
  }

  const data = requests.map((request) => {
    const disbursements = disbursementsByRequest.get(request.id) || [];
    const totalDisbursed = disbursements.reduce((sum, row) => sum + row.amount, 0);
    const reconciliations = reconciliationsByRequest.get(request.id) || [];
    const latest = reconciliations[0] || null;
    const unexplained = latest ? Number((totalDisbursed - latest.actual_spent - latest.returned_amount).toFixed(2)) : Number(totalDisbursed.toFixed(2));
    return {
      ...request,
      requested_amount: Number(request.requested_amount || 0),
      accountant_recommended_amount: request.accountant_recommended_amount == null ? null : Number(request.accountant_recommended_amount),
      approved_amount: request.approved_amount == null ? null : Number(request.approved_amount),
      site: siteMap.get(request.site_id) || null,
      category: categoryMap.get(request.category_id) || null,
      submitted_by: profileMap.get(request.requested_by_user_id) || null,
      documents: docsByRequest.get(request.id) || [],
      disbursements,
      total_disbursed: Number(totalDisbursed.toFixed(2)),
      reconciliations,
      latest_reconciliation: latest,
      unexplained_amount: unexplained,
    };
  });

  const bySite = new Map();
  for (const row of data) {
    if (row.payment_type !== 'site_advance' || ['reconciled', 'rejected', 'ceo_rejected', 'cancelled'].includes(row.status)) continue;
    const current = bySite.get(row.site_id) || { site: row.site, outstanding: 0, count: 0 };
    current.outstanding += Math.max(0, row.unexplained_amount || row.total_disbursed || 0);
    current.count += 1;
    bySite.set(row.site_id, current);
  }

  return {
    data,
    sites: sitesResult.data || [],
    categories: categoriesResult.data || [],
    outstanding_by_site: [...bySite.values()].map((row) => ({ ...row, outstanding: Number(row.outstanding.toFixed(2)) })),
    summary: {
      submitted: data.filter((row) => row.status === 'submitted').length,
      pending_ceo: data.filter((row) => row.status === 'pending_ceo').length,
      reconciliation_submitted: data.filter((row) => row.status === 'reconciliation_submitted').length,
      reconciliation_issue: data.filter((row) => row.status === 'reconciliation_issue').length,
    },
  };
}

export async function GET() {
  const access = await requireAccountant('expenses.request.review');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const db = createSupabaseAdminClient();
    return NextResponse.json({ success: true, ...(await loadRequests(db)) });
  } catch (error) {
    console.error('Accountant expense requests GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load expense requests.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const body = await request.json();
  const action = String(body.action || '').trim();
  const permission = ['reconcile', 'issue'].includes(action) ? 'expenses.reconcile' : 'expenses.request.review';
  const access = await requireAccountant(permission);
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'Expense request ID is required.' }, { status: 400 });
    const db = createSupabaseAdminClient();

    if (['send_to_ceo', 'return', 'reject'].includes(action)) {
      const { data, error } = await db.rpc('accountant_review_expense_request', {
        p_accountant_id: access.user.id,
        p_request_id: id,
        p_action: action,
        p_reason: String(body.reason || '').trim() || null,
        p_recommended_amount: body.recommended_amount == null ? null : Number(body.recommended_amount),
      });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: action === 'send_to_ceo' ? 'SEND_EXPENSE_REQUEST_TO_CEO' : action === 'return' ? 'RETURN_EXPENSE_REQUEST' : 'REJECT_EXPENSE_REQUEST',
        module: 'Expenses',
        entityType: 'expense_requests',
        entityId: id,
        details: `${action} for expense request ${data.request_code}.`,
        metadata: { status: data.status, recommended_amount: data.accountant_recommended_amount, reason: body.reason || null },
      });
      return NextResponse.json({ success: true, data });
    }

    if (['reconcile', 'issue'].includes(action)) {
      const { data, error } = await db.rpc('accountant_reconcile_expense_request', {
        p_accountant_id: access.user.id,
        p_request_id: id,
        p_action: action,
        p_reason: String(body.reason || '').trim() || null,
      });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: action === 'reconcile' ? 'RECONCILE_EXPENSE_REQUEST' : 'FLAG_EXPENSE_RECONCILIATION',
        module: 'Expenses',
        entityType: 'expense_requests',
        entityId: id,
        details: `${action === 'reconcile' ? 'Reconciled' : 'Flagged'} expense request ${data.request_code}.`,
        metadata: { status: data.status, reason: body.reason || null },
      });
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: 'Unsupported expense action.' }, { status: 400 });
  } catch (error) {
    console.error('Accountant expense request PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update expense request.' }, { status: 500 });
  }
}
