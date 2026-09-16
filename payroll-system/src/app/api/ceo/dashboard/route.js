import { NextResponse } from 'next/server';
import { requireCEO } from '@/lib/auth/requireCEO';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireCEO();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();

    const [sitesResult, employeesResult, payrollResult, expenseResult] = await Promise.all([
      db.from('sites').select('id,site_name,location,is_active').eq('is_active', true).order('site_name'),
      db.from('employees').select('id,status'),
      db.from('payroll_batches')
        .select('id,batch_code,status,total_employees,net_total,submitted_at,ceo_reviewed_at,execution_completed_at')
        .in('status', ['ready_for_ceo','approved_by_ceo','executing','paid','partial_failed','failed'])
        .order('created_at', { ascending: false }),
      db.from('expense_requests')
        .select('id,request_code,status,requested_amount,accountant_recommended_amount,approved_amount,submitted_at,approved_at,funded_at')
        .in('status', ['pending_ceo','approved','funded','awaiting_reconciliation','reconciliation_submitted','reconciliation_issue','reconciled'])
        .order('created_at', { ascending: false }),
    ]);

    for (const result of [sitesResult, employeesResult, payrollResult, expenseResult]) {
      if (result.error) throw result.error;
    }

    const payroll = (payrollResult.data || []).map((row) => ({ ...row, net_total: Number(row.net_total || 0) }));
    const expenses = (expenseResult.data || []).map((row) => ({
      ...row,
      requested_amount: Number(row.requested_amount || 0),
      accountant_recommended_amount: row.accountant_recommended_amount == null ? null : Number(row.accountant_recommended_amount),
      approved_amount: row.approved_amount == null ? null : Number(row.approved_amount),
    }));

    const activeEmployees = (employeesResult.data || []).filter((employee) => {
      const status = String(employee.status || '').toLowerCase();
      return !['inactive', 'terminated', 'left', 'deactivated'].includes(status);
    }).length;

    const payrollAwaitingReview = payroll.filter((row) => row.status === 'ready_for_ceo');
    const payrollReadyToPay = payroll.filter((row) => row.status === 'approved_by_ceo');
    const expensesAwaitingReview = expenses.filter((row) => row.status === 'pending_ceo');
    const expensesReadyToPay = expenses.filter((row) => row.status === 'approved');
    const paidPayroll = payroll.filter((row) => row.status === 'paid');

    return NextResponse.json({
      success: true,
      data: {
        ceo: {
          id: access.profile.id,
          name: `${access.profile.first_name || ''} ${access.profile.last_name || ''}`.trim() || access.profile.email,
        },
        metrics: {
          active_sites: (sitesResult.data || []).length,
          active_employees: activeEmployees,
          payroll_awaiting_review: payrollAwaitingReview.length,
          expenses_awaiting_review: expensesAwaitingReview.length,
          payroll_ready_to_pay: payrollReadyToPay.length,
          expenses_ready_to_pay: expensesReadyToPay.length,
          payroll_ready_to_pay_total: Number(payrollReadyToPay.reduce((sum, row) => sum + row.net_total, 0).toFixed(2)),
          expenses_ready_to_pay_total: Number(expensesReadyToPay.reduce((sum, row) => sum + Number(row.approved_amount || 0), 0).toFixed(2)),
          paid_payroll_total: Number(paidPayroll.reduce((sum, row) => sum + row.net_total, 0).toFixed(2)),
        },
        sites: sitesResult.data || [],
        recent_payroll: payroll.slice(0, 5),
        recent_expenses: expenses.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('CEO dashboard GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load CEO dashboard.' }, { status: 500 });
  }
}
