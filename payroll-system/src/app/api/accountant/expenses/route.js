import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LEGACY_BUCKET = 'expense-receipts';

async function signLegacyReceipt(db, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(LEGACY_BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data?.signedUrl || null;
}

export async function GET() {
  const access = await requireAccountant('expenses.view');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [expensesResult, categoriesResult, sitesResult] = await Promise.all([
      db.from('expenses')
        .select('id,expense_request_id,category_id,site_id,title,vendor,description,amount,spent_at,status,notes,recorded_by,reviewed_by,reviewed_at,receipt_storage_path,receipt_original_filename,receipt_mime_type,created_at,updated_at')
        .order('spent_at', { ascending: false })
        .order('created_at', { ascending: false }),
      db.from('expense_categories').select('id,category_name'),
      db.from('sites').select('id,site_name,location'),
    ]);

    if (expensesResult.error) throw expensesResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (sitesResult.error) throw sitesResult.error;

    const expenses = expensesResult.data || [];
    const requestIds = [...new Set(expenses.map((row) => row.expense_request_id).filter(Boolean))];

    const [requestsResult, disbursementsResult] = await Promise.all([
      requestIds.length
        ? db.from('expense_requests')
          .select('id,request_code,payment_type,purpose,requested_amount,accountant_recommended_amount,approved_amount,status,funded_at,reconciled_at,payee_id')
          .in('id', requestIds)
        : Promise.resolve({ data: [], error: null }),
      requestIds.length
        ? db.from('expense_disbursements')
          .select('id,request_id,amount,payment_reference,disbursed_at')
          .in('request_id', requestIds)
          .order('disbursed_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (requestsResult.error) throw requestsResult.error;
    if (disbursementsResult.error) throw disbursementsResult.error;

    const categoryMap = new Map((categoriesResult.data || []).map((row) => [row.id, row]));
    const siteMap = new Map((sitesResult.data || []).map((row) => [row.id, row]));
    const requestMap = new Map((requestsResult.data || []).map((row) => [row.id, row]));
    const disbursementsByRequest = new Map();

    for (const row of disbursementsResult.data || []) {
      const list = disbursementsByRequest.get(row.request_id) || [];
      list.push({ ...row, amount: Number(row.amount || 0) });
      disbursementsByRequest.set(row.request_id, list);
    }

    const data = await Promise.all(expenses.map(async (expense) => {
      const request = expense.expense_request_id ? requestMap.get(expense.expense_request_id) || null : null;
      const disbursements = request ? disbursementsByRequest.get(request.id) || [] : [];
      const latestPayment = disbursements[0] || null;
      const totalDisbursed = disbursements.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const sourceType = request?.payment_type || 'legacy';
      const sourceLabel = sourceType === 'direct_vendor'
        ? 'Direct vendor payment'
        : sourceType === 'site_advance'
          ? 'Site advance reconciliation'
          : 'Legacy record';

      return {
        ...expense,
        amount: Number(expense.amount || 0),
        category: categoryMap.get(expense.category_id) || null,
        site: siteMap.get(expense.site_id) || null,
        request: request ? {
          ...request,
          requested_amount: Number(request.requested_amount || 0),
          accountant_recommended_amount: request.accountant_recommended_amount == null ? null : Number(request.accountant_recommended_amount),
          approved_amount: request.approved_amount == null ? null : Number(request.approved_amount),
        } : null,
        source_type: sourceType,
        source_label: sourceLabel,
        payment_reference: latestPayment?.payment_reference || null,
        payment_date: latestPayment?.disbursed_at || request?.funded_at || request?.reconciled_at || null,
        total_disbursed: Number(totalDisbursed.toFixed(2)),
        receipt_url: await signLegacyReceipt(db, expense.receipt_storage_path),
      };
    }));

    return NextResponse.json({
      success: true,
      data,
      summary: {
        total_records: data.length,
        total_amount: Number(data.reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
        direct_vendor: data.filter((row) => row.source_type === 'direct_vendor').length,
        site_advance: data.filter((row) => row.source_type === 'site_advance').length,
        legacy: data.filter((row) => row.source_type === 'legacy').length,
      },
    });
  } catch (error) {
    console.error('Accountant expense ledger GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load expense ledger.' }, { status: 500 });
  }
}

function workflowOnlyResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Direct expense entry is disabled in V1. Expenses are created automatically after an approved vendor payment is completed or a site advance is reconciled.',
    },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function POST() {
  return workflowOnlyResponse();
}

export async function PATCH() {
  return workflowOnlyResponse();
}
