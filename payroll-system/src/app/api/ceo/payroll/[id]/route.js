import { NextResponse } from 'next/server';
import { requireCEO } from '@/lib/auth/requireCEO';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

async function loadBatch(db, id) {
  const { data: batch, error: batchError } = await db
    .from('payroll_batches')
    .select('id,batch_code,pay_period_id,status,scheduled_payment_date,created_by,submitted_by,submitted_at,ceo_reviewed_by,ceo_reviewed_at,ceo_rejection_reason,total_employees,total_regular_hours,total_overtime_hours,gross_total,deductions_total,net_total,execution_started_at,execution_completed_at,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();
  if (batchError) throw batchError;
  if (!batch) return null;

  const [periodResult, entriesResult, rosterLinksResult] = await Promise.all([
    db.from('pay_periods').select('id,period_name,start_date,end_date,status').eq('id', batch.pay_period_id).maybeSingle(),
    db.from('payroll_entries')
      .select('id,employee_id,applied_hourly_rate,total_hours_worked,regular_hours,overtime_hours,applied_overtime_rate,regular_pay,overtime_pay,gross_pay,tax_deductions,net_pay,status,has_multiple_rates,payout_provider_id,payout_provider_name_snapshot,payout_account_snapshot,payout_branch_code_snapshot,payout_verified_at_snapshot,payment_status,payment_reference,payment_error,payment_attempts')
      .eq('batch_id', batch.id)
      .order('created_at'),
    db.from('payroll_batch_rosters').select('roster_id').eq('batch_id', batch.id),
  ]);

  if (periodResult.error) throw periodResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (rosterLinksResult.error) throw rosterLinksResult.error;

  const entries = entriesResult.data || [];
  const employeeIds = [...new Set(entries.map((entry) => entry.employee_id).filter(Boolean))];
  const rosterIds = (rosterLinksResult.data || []).map((row) => row.roster_id);

  const [employeesResult, rostersResult] = await Promise.all([
    employeeIds.length
      ? db.from('employees').select('id,employee_code,first_name,last_name,job_role,status').in('id', employeeIds)
      : Promise.resolve({ data: [], error: null }),
    rosterIds.length
      ? db.from('daily_site_rosters').select('id,site_id,shift_date,version').in('id', rosterIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (employeesResult.error) throw employeesResult.error;
  if (rostersResult.error) throw rostersResult.error;

  const employeeMap = new Map((employeesResult.data || []).map((employee) => [employee.id, employee]));
  const siteIds = [...new Set((rostersResult.data || []).map((roster) => roster.site_id).filter(Boolean))];
  const { data: sites, error: sitesError } = siteIds.length
    ? await db.from('sites').select('id,site_name,location').in('id', siteIds)
    : { data: [], error: null };
  if (sitesError) throw sitesError;
  const siteMap = new Map((sites || []).map((site) => [site.id, site]));

  const formattedEntries = entries.map((entry) => {
    const employee = employeeMap.get(entry.employee_id);
    const payoutReady = entry.net_pay <= 0 || Boolean(
      entry.payout_provider_id &&
      entry.payout_account_snapshot &&
      entry.payout_verified_at_snapshot
    );

    return {
      ...entry,
      applied_hourly_rate: Number(entry.applied_hourly_rate || 0),
      total_hours_worked: Number(entry.total_hours_worked || 0),
      regular_hours: Number(entry.regular_hours || 0),
      overtime_hours: Number(entry.overtime_hours || 0),
      applied_overtime_rate: Number(entry.applied_overtime_rate || 0),
      regular_pay: Number(entry.regular_pay || 0),
      overtime_pay: Number(entry.overtime_pay || 0),
      gross_pay: Number(entry.gross_pay || 0),
      tax_deductions: Number(entry.tax_deductions || 0),
      net_pay: Number(entry.net_pay || 0),
      payout_ready: payoutReady,
      payout_destination_masked: entry.payout_account_snapshot
        ? `${'*'.repeat(Math.max(0, String(entry.payout_account_snapshot).length - 4))}${String(entry.payout_account_snapshot).slice(-4)}`
        : null,
      employee: employee ? {
        id: employee.id,
        employee_code: employee.employee_code,
        name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        job_role: employee.job_role,
        status: employee.status,
      } : null,
    };
  });

  const payoutBreakdownMap = new Map();
  for (const entry of formattedEntries) {
    if (entry.net_pay <= 0) continue;
    const key = entry.payout_provider_name_snapshot || 'Missing payout provider';
    const current = payoutBreakdownMap.get(key) || { provider: key, employees: 0, amount: 0 };
    current.employees += 1;
    current.amount += entry.net_pay;
    payoutBreakdownMap.set(key, current);
  }

  return {
    ...batch,
    total_regular_hours: Number(batch.total_regular_hours || 0),
    total_overtime_hours: Number(batch.total_overtime_hours || 0),
    gross_total: Number(batch.gross_total || 0),
    deductions_total: Number(batch.deductions_total || 0),
    net_total: Number(batch.net_total || 0),
    pay_period: periodResult.data || null,
    entries: formattedEntries,
    rosters: (rostersResult.data || []).map((roster) => ({ ...roster, site: siteMap.get(roster.site_id) || null })),
    payout_breakdown: [...payoutBreakdownMap.values()].map((row) => ({
      ...row,
      amount: Number(row.amount.toFixed(2)),
    })),
    blockers: {
      missing_payout_profiles: formattedEntries.filter((entry) => entry.net_pay > 0 && !entry.payout_ready).length,
    },
  };
}

export async function GET(_request, context) {
  const access = await requireCEO('payroll.view_approved');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { id } = await context.params;
    const db = createSupabaseAdminClient();
    const batch = await loadBatch(db, id);
    if (!batch) return NextResponse.json({ success: false, error: 'Payroll batch not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: batch });
  } catch (error) {
    console.error('CEO payroll batch GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load payroll batch.' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  const access = await requireCEO('payroll.final_approve');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = String(body.action || '').trim().toLowerCase();
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Unsupported CEO payroll action.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data, error } = await db.rpc('ceo_review_payroll_batch', {
      p_ceo_id: access.user.id,
      p_batch_id: id,
      p_action: action,
      p_reason: String(body.reason || '').trim() || null,
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: action === 'approve' ? 'CEO_APPROVE_PAYROLL_BATCH' : 'CEO_REJECT_PAYROLL_BATCH',
      module: 'Payroll & Finance',
      entityType: 'payroll_batches',
      entityId: id,
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} payroll batch ${data.batch_code}.`,
      metadata: {
        status: data.status,
        scheduled_payment_date: data.scheduled_payment_date || null,
        net_total: Number(data.net_total || 0),
        reason: body.reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: await loadBatch(db, id),
      message: action === 'approve' ? 'Payroll batch approved for payment.' : 'Payroll batch returned to Accountant.',
    });
  } catch (error) {
    console.error('CEO payroll review PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to review payroll batch.' }, { status: 500 });
  }
}
