import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireAccountant('payroll.view_approved');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [approvedRostersResult, usedRostersResult, batchesResult, expensesResult] = await Promise.all([
      db.from('daily_site_rosters').select('id, site_id, shift_date, reviewed_at').eq('status', 'approved').order('shift_date', { ascending: false }),
      db.from('payroll_batch_rosters').select('roster_id'),
      db.from('payroll_batches').select('id, batch_code, pay_period_id, status, total_employees, gross_total, net_total, created_at, submitted_at, ceo_rejection_reason').order('created_at', { ascending: false }).limit(10),
      db.from('expenses').select('id, amount, spent_at, created_at').order('created_at', { ascending: false }).limit(500),
    ]);
    if (approvedRostersResult.error) throw approvedRostersResult.error;
    if (usedRostersResult.error) throw usedRostersResult.error;
    if (batchesResult.error) throw batchesResult.error;
    if (expensesResult.error) throw expensesResult.error;

    const used = new Set((usedRostersResult.data || []).map((row) => row.roster_id));
    const available = (approvedRostersResult.data || []).filter((row) => !used.has(row.id));
    const siteIds = [...new Set(available.map((row) => row.site_id).filter(Boolean))];
    const periodIds = [...new Set((batchesResult.data || []).map((row) => row.pay_period_id).filter(Boolean))];

    const [sitesResult, periodsResult] = await Promise.all([
      siteIds.length ? db.from('sites').select('id, site_name, location').in('id', siteIds) : Promise.resolve({ data: [], error: null }),
      periodIds.length ? db.from('pay_periods').select('id, period_name, start_date, end_date').in('id', periodIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (sitesResult.error) throw sitesResult.error;
    if (periodsResult.error) throw periodsResult.error;

    const siteMap = new Map((sitesResult.data || []).map((site) => [site.id, site]));
    const periodMap = new Map((periodsResult.data || []).map((period) => [period.id, period]));
    const batches = (batchesResult.data || []).map((batch) => ({
      ...batch,
      gross_total: Number(batch.gross_total || 0),
      net_total: Number(batch.net_total || 0),
      pay_period: periodMap.get(batch.pay_period_id) || null,
    }));

    const expenses = expensesResult.data || [];
    const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        payroll_ready_rosters: available.length,
        draft_batches: batches.filter((batch) => ['draft', 'rejected_by_ceo'].includes(batch.status)).length,
        awaiting_ceo: batches.filter((batch) => batch.status === 'ready_for_ceo').length,
        completed_batches: batches.filter((batch) => batch.status === 'paid').length,
        recorded_expenses: expenses.length,
        recorded_expense_total: Number(expenseTotal.toFixed(2)),
      },
      payroll_ready_rosters: available.slice(0, 8).map((roster) => ({ ...roster, site: siteMap.get(roster.site_id) || null })),
      recent_batches: batches,
    });
  } catch (error) {
    console.error('Accountant dashboard error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load Accountant dashboard.' }, { status: 500 });
  }
}
