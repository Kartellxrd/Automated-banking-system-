import { NextResponse } from 'next/server';
import { requireCEO } from '@/lib/auth/requireCEO';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireCEO();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [payrollResult, expensesResult] = await Promise.all([
      db.from('payroll_batches')
        .select('id,batch_code,pay_period_id,status,total_employees,net_total,ceo_reviewed_at,submitted_at')
        .eq('status', 'approved_by_ceo')
        .order('ceo_reviewed_at', { ascending: true }),
      db.from('expense_requests')
        .select('id,request_code,site_id,category_id,status,purpose,payment_type,vendor_name,operational_requester_name,approved_amount,approved_at')
        .eq('status', 'approved')
        .order('approved_at', { ascending: true }),
    ]);

    if (payrollResult.error) throw payrollResult.error;
    if (expensesResult.error) throw expensesResult.error;

    const payrollBatches = payrollResult.data || [];
    const batchIds = payrollBatches.map((row) => row.id);
    const periodIds = [...new Set(payrollBatches.map((row) => row.pay_period_id).filter(Boolean))];
    const expenseRows = expensesResult.data || [];
    const siteIds = [...new Set(expenseRows.map((row) => row.site_id).filter(Boolean))];
    const categoryIds = [...new Set(expenseRows.map((row) => row.category_id).filter(Boolean))];

    const [entriesResult, periodsResult, sitesResult, categoriesResult] = await Promise.all([
      batchIds.length
        ? db.from('payroll_entries')
          .select('id,batch_id,employee_id,net_pay,payout_provider_id,payout_provider_name_snapshot,payout_account_snapshot,payout_verified_at_snapshot,payment_status')
          .in('batch_id', batchIds)
        : Promise.resolve({ data: [], error: null }),
      periodIds.length
        ? db.from('pay_periods').select('id,period_name,start_date,end_date').in('id', periodIds)
        : Promise.resolve({ data: [], error: null }),
      siteIds.length
        ? db.from('sites').select('id,site_name,location').in('id', siteIds)
        : Promise.resolve({ data: [], error: null }),
      categoryIds.length
        ? db.from('expense_categories').select('id,category_name').in('id', categoryIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const result of [entriesResult, periodsResult, sitesResult, categoriesResult]) {
      if (result.error) throw result.error;
    }

    const entriesByBatch = new Map();
    for (const entry of entriesResult.data || []) {
      const list = entriesByBatch.get(entry.batch_id) || [];
      list.push({ ...entry, net_pay: Number(entry.net_pay || 0) });
      entriesByBatch.set(entry.batch_id, list);
    }

    const periodMap = new Map((periodsResult.data || []).map((row) => [row.id, row]));
    const siteMap = new Map((sitesResult.data || []).map((row) => [row.id, row]));
    const categoryMap = new Map((categoriesResult.data || []).map((row) => [row.id, row]));

    const payroll = payrollBatches.map((batch) => {
      const entries = entriesByBatch.get(batch.id) || [];
      const payable = entries.filter((entry) => entry.net_pay > 0);
      const blockers = payable.filter((entry) => !(
        entry.payout_provider_id &&
        entry.payout_account_snapshot &&
        entry.payout_verified_at_snapshot
      ));

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
        net_total: Number(batch.net_total || 0),
        pay_period: periodMap.get(batch.pay_period_id) || null,
        payable_recipients: payable.length,
        payment_blockers: blockers.length,
        payment_ready: payable.length > 0 && blockers.length === 0,
        channel_breakdown: [...breakdownMap.values()].map((row) => ({
          ...row,
          amount: Number(row.amount.toFixed(2)),
        })),
      };
    });

    const expenses = expenseRows.map((row) => ({
      ...row,
      approved_amount: Number(row.approved_amount || 0),
      site: siteMap.get(row.site_id) || null,
      category: categoryMap.get(row.category_id) || null,
      payment_ready: false,
      payment_blockers: ['Verified expense payee payout destination is not yet configured.'],
    }));

    return NextResponse.json({
      success: true,
      data: {
        payroll,
        expenses,
        summary: {
          payroll_batches: payroll.length,
          payroll_recipients: payroll.reduce((sum, row) => sum + row.payable_recipients, 0),
          payroll_total: Number(payroll.reduce((sum, row) => sum + row.net_total, 0).toFixed(2)),
          payroll_ready_batches: payroll.filter((row) => row.payment_ready).length,
          expense_requests: expenses.length,
          expense_total: Number(expenses.reduce((sum, row) => sum + row.approved_amount, 0).toFixed(2)),
          expense_ready_requests: expenses.filter((row) => row.payment_ready).length,
        },
        execution: {
          mode: 'not_configured',
          message: 'No live corporate payout adapter is configured yet. Approval data is live; payment execution remains disabled until a verified Botswana payout rail is connected.',
        },
      },
    });
  } catch (error) {
    console.error('CEO payment center GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load CEO payment center.' }, { status: 500 });
  }
}
