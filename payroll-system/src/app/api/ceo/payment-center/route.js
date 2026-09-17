import { NextResponse } from 'next/server';
import { requireCEO } from '@/lib/auth/requireCEO';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

const num = (value) => Number(value || 0);

async function loadPaymentCenter(db) {
  const [payrollResult, expensesResult, runsResult] = await Promise.all([
    db.from('payroll_batches')
      .select('id,batch_code,pay_period_id,status,total_employees,net_total,ceo_reviewed_at,submitted_at')
      .eq('status', 'approved_by_ceo')
      .order('ceo_reviewed_at', { ascending: true }),
    db.from('expense_requests')
      .select('id,request_code,site_id,category_id,status,purpose,payment_type,vendor_name,operational_requester_name,approved_amount,approved_at')
      .eq('status', 'approved')
      .order('approved_at', { ascending: true }),
    db.from('payment_runs')
      .select('id,run_code,run_type,payroll_batch_id,status,execution_mode,provider_adapter,total_items,total_amount,prepared_by,prepared_at,authorized_by,authorized_at,source_payment_account_id,execution_notes,executed_by,execution_started_at,execution_completed_at,created_at,updated_at')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  if (payrollResult.error) throw payrollResult.error;
  if (expensesResult.error) throw expensesResult.error;
  if (runsResult.error) throw runsResult.error;

  const payrollBatches = payrollResult.data || [];
  const expenseRows = expensesResult.data || [];
  const runs = runsResult.data || [];
  const awaitingBatchIds = payrollBatches.map((row) => row.id);
  const allBatchIds = [...new Set([...awaitingBatchIds, ...runs.map((row) => row.payroll_batch_id).filter(Boolean)])];
  const periodIds = [...new Set(payrollBatches.map((row) => row.pay_period_id).filter(Boolean))];
  const siteIds = [...new Set(expenseRows.map((row) => row.site_id).filter(Boolean))];
  const categoryIds = [...new Set(expenseRows.map((row) => row.category_id).filter(Boolean))];
  const runIds = runs.map((row) => row.id);

  const [entriesResult, periodsResult, sitesResult, categoriesResult, runItemsResult, allBatchesResult, accountsResult] = await Promise.all([
    awaitingBatchIds.length
      ? db.from('payroll_entries')
        .select('id,batch_id,employee_id,net_pay,payout_provider_id,payout_provider_name_snapshot,payout_account_snapshot,payout_verified_at_snapshot,payment_status')
        .in('batch_id', awaitingBatchIds)
      : Promise.resolve({ data: [], error: null }),
    periodIds.length ? db.from('pay_periods').select('id,period_name,start_date,end_date').in('id', periodIds) : Promise.resolve({ data: [], error: null }),
    siteIds.length ? db.from('sites').select('id,site_name,location').in('id', siteIds) : Promise.resolve({ data: [], error: null }),
    categoryIds.length ? db.from('expense_categories').select('id,category_name').in('id', categoryIds) : Promise.resolve({ data: [], error: null }),
    runIds.length ? db.from('payment_run_items').select('id,payment_run_id,amount,status,payment_reference,payment_error,paid_at').in('payment_run_id', runIds) : Promise.resolve({ data: [], error: null }),
    allBatchIds.length ? db.from('payroll_batches').select('id,batch_code,pay_period_id,status,total_employees,net_total').in('id', allBatchIds) : Promise.resolve({ data: [], error: null }),
    db.from('company_payment_accounts').select('id,account_name,institution_name,account_identifier_label,is_active'),
  ]);

  for (const result of [entriesResult, periodsResult, sitesResult, categoriesResult, runItemsResult, allBatchesResult, accountsResult]) {
    if (result.error) throw result.error;
  }

  const periodIds2 = [...new Set((allBatchesResult.data || []).map((row) => row.pay_period_id).filter(Boolean))];
  let allPeriods = periodsResult.data || [];
  const missingPeriodIds = periodIds2.filter((id) => !allPeriods.some((p) => p.id === id));
  if (missingPeriodIds.length) {
    const { data, error } = await db.from('pay_periods').select('id,period_name,start_date,end_date').in('id', missingPeriodIds);
    if (error) throw error;
    allPeriods = [...allPeriods, ...(data || [])];
  }

  const entriesByBatch = new Map();
  for (const entry of entriesResult.data || []) {
    const list = entriesByBatch.get(entry.batch_id) || [];
    list.push({ ...entry, net_pay: num(entry.net_pay) });
    entriesByBatch.set(entry.batch_id, list);
  }

  const periodMap = new Map(allPeriods.map((row) => [row.id, row]));
  const siteMap = new Map((sitesResult.data || []).map((row) => [row.id, row]));
  const categoryMap = new Map((categoriesResult.data || []).map((row) => [row.id, row]));
  const batchMap = new Map((allBatchesResult.data || []).map((row) => [row.id, row]));
  const accountMap = new Map((accountsResult.data || []).map((row) => [row.id, row]));

  const itemsByRun = new Map();
  for (const item of runItemsResult.data || []) {
    if (!itemsByRun.has(item.payment_run_id)) itemsByRun.set(item.payment_run_id, []);
    itemsByRun.get(item.payment_run_id).push({ ...item, amount: num(item.amount) });
  }

  const runByBatch = new Map();
  for (const run of runs.filter((row) => row.run_type === 'payroll')) {
    if (run.payroll_batch_id && !runByBatch.has(run.payroll_batch_id)) runByBatch.set(run.payroll_batch_id, run);
  }

  const payroll = payrollBatches.map((batch) => {
    const entries = entriesByBatch.get(batch.id) || [];
    const payable = entries.filter((entry) => entry.net_pay > 0);
    const blockers = payable.filter((entry) => !(entry.payout_provider_id && entry.payout_account_snapshot && entry.payout_verified_at_snapshot));
    const breakdownMap = new Map();
    for (const entry of payable) {
      const provider = entry.payout_provider_name_snapshot || 'Missing payout provider';
      const current = breakdownMap.get(provider) || { provider, recipients: 0, amount: 0 };
      current.recipients += 1;
      current.amount += entry.net_pay;
      breakdownMap.set(provider, current);
    }
    return {
      ...batch,
      net_total: num(batch.net_total),
      pay_period: periodMap.get(batch.pay_period_id) || null,
      payable_recipients: payable.length,
      payment_blockers: blockers.length,
      payment_ready: payable.length > 0 && blockers.length === 0,
      payment_run: runByBatch.get(batch.id) || null,
      channel_breakdown: [...breakdownMap.values()].map((row) => ({ ...row, amount: Number(row.amount.toFixed(2)) })),
    };
  });

  const paymentRuns = runs.map((run) => {
    const runItems = itemsByRun.get(run.id) || [];
    const batch = run.payroll_batch_id ? batchMap.get(run.payroll_batch_id) || null : null;
    const counts = runItems.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});
    return {
      ...run,
      total_amount: num(run.total_amount),
      batch: batch ? { ...batch, net_total: num(batch.net_total), pay_period: periodMap.get(batch.pay_period_id) || null } : null,
      source_account: run.source_payment_account_id ? accountMap.get(run.source_payment_account_id) || null : null,
      progress: {
        queued: counts.queued || 0,
        submitted: counts.submitted || 0,
        paid: counts.paid || 0,
        failed: counts.failed || 0,
        skipped: counts.skipped || 0,
      },
    };
  });

  const expenses = expenseRows.map((row) => ({
    ...row,
    approved_amount: num(row.approved_amount),
    site: siteMap.get(row.site_id) || null,
    category: categoryMap.get(row.category_id) || null,
    payment_ready: false,
    payment_blockers: ['Verified expense payee payout destination is not yet configured.'],
  }));

  return {
    payroll,
    payment_runs: paymentRuns,
    expenses,
    summary: {
      payroll_batches: payroll.length,
      payroll_recipients: payroll.reduce((sum, row) => sum + row.payable_recipients, 0),
      payroll_total: Number(payroll.reduce((sum, row) => sum + row.net_total, 0).toFixed(2)),
      payroll_ready_batches: payroll.filter((row) => row.payment_ready && !row.payment_run).length,
      active_payment_runs: paymentRuns.filter((row) => ['prepared','executing','partial_failed','failed'].includes(row.status)).length,
      completed_payment_runs: paymentRuns.filter((row) => row.status === 'completed').length,
      expense_requests: expenses.length,
      expense_total: Number(expenses.reduce((sum, row) => sum + row.approved_amount, 0).toFixed(2)),
      expense_ready_requests: expenses.filter((row) => row.payment_ready).length,
    },
    execution: {
      mode: 'manual_execution',
      message: 'Periscope currently uses FNB bulk and manually processed Orange Money / P2C / eWallet payments. CEO Pay All authorizes and locks the payment run; the Accountant executes the real transactions and records the actual references/results. No gateway is assumed.',
    },
  };
}

export async function GET() {
  const access = await requireCEO('payments.view');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const db = createSupabaseAdminClient();
    return NextResponse.json({ success: true, data: await loadPaymentCenter(db) });
  } catch (error) {
    console.error('CEO payment center GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load CEO payment center.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireCEO('payroll.execute');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const action = String(body.action || '').trim().toLowerCase();
    const batchId = String(body.batch_id || '').trim();
    if (action !== 'prepare_payroll') return NextResponse.json({ success: false, error: 'Unsupported payment center action.' }, { status: 400 });
    if (!batchId) return NextResponse.json({ success: false, error: 'Payroll batch ID is required.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const { data: run, error } = await db.rpc('ceo_prepare_payroll_payment_run', { p_ceo_id: access.user.id, p_batch_id: batchId });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'AUTHORIZE_PAYROLL_PAYMENT_RUN',
      module: 'Payments',
      entityType: 'payment_run',
      entityId: run.id,
      details: `CEO authorized payroll payment run ${run.run_code} for Accountant execution.`,
      metadata: { payroll_batch_id: batchId, total_items: run.total_items, total_amount: num(run.total_amount), execution_mode: run.execution_mode },
    });

    return NextResponse.json({
      success: true,
      data: run,
      message: 'Pay All authorized. The immutable run is now available to the Accountant for real FNB/mobile-money execution and reference capture.',
    }, { status: 201 });
  } catch (error) {
    console.error('CEO payment center POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to authorize payroll payment run.' }, { status: 500 });
  }
}
