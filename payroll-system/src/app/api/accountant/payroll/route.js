import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireAccountant('payroll.view_approved');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [rostersResult, usedResult, batchesResult] = await Promise.all([
      db.from('daily_site_rosters')
        .select('id, site_id, shift_date, status, submitted_at, reviewed_at, version')
        .eq('status', 'approved')
        .order('shift_date', { ascending: false }),
      db.from('payroll_batch_rosters').select('roster_id'),
      db.from('payroll_batches')
        .select('id, batch_code, pay_period_id, status, total_employees, total_regular_hours, total_overtime_hours, gross_total, deductions_total, net_total, submitted_at, ceo_rejection_reason, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (rostersResult.error) throw rostersResult.error;
    if (usedResult.error) throw usedResult.error;
    if (batchesResult.error) throw batchesResult.error;

    const usedRosterIds = new Set((usedResult.data || []).map((row) => row.roster_id));
    const availableRosters = (rostersResult.data || []).filter((roster) => !usedRosterIds.has(roster.id));
    const rosterIds = availableRosters.map((roster) => roster.id);
    const siteIds = [...new Set(availableRosters.map((roster) => roster.site_id).filter(Boolean))];
    const periodIds = [...new Set((batchesResult.data || []).map((batch) => batch.pay_period_id).filter(Boolean))];

    const [sitesResult, shiftsResult, periodsResult] = await Promise.all([
      siteIds.length ? db.from('sites').select('id, site_name, location').in('id', siteIds) : Promise.resolve({ data: [], error: null }),
      rosterIds.length ? db.from('shift_logs')
        .select('id, daily_roster_id, employee_id, regular_hours, overtime_hours, worked_hours, hourly_rate_snapshot, attendance_state, status')
        .in('daily_roster_id', rosterIds)
        .eq('status', 'approved') : Promise.resolve({ data: [], error: null }),
      periodIds.length ? db.from('pay_periods').select('id, period_name, start_date, end_date, status').in('id', periodIds) : Promise.resolve({ data: [], error: null }),
    ]);

    if (sitesResult.error) throw sitesResult.error;
    if (shiftsResult.error) throw shiftsResult.error;
    if (periodsResult.error) throw periodsResult.error;

    const siteMap = new Map((sitesResult.data || []).map((site) => [site.id, site]));
    const periodMap = new Map((periodsResult.data || []).map((period) => [period.id, period]));
    const shiftsByRoster = new Map();
    for (const shift of shiftsResult.data || []) {
      const list = shiftsByRoster.get(shift.daily_roster_id) || [];
      list.push(shift);
      shiftsByRoster.set(shift.daily_roster_id, list);
    }

    const rosters = availableRosters.map((roster) => {
      const shifts = shiftsByRoster.get(roster.id) || [];
      const totals = shifts.reduce((acc, shift) => {
        const regular = Number(shift.regular_hours || 0);
        const overtime = Number(shift.overtime_hours || 0);
        const rate = Number(shift.hourly_rate_snapshot || 0);
        acc.regular_hours += regular;
        acc.overtime_hours += overtime;
        acc.gross_pay += regular * rate + overtime * rate * 1.5;
        acc.employee_ids.add(shift.employee_id);
        return acc;
      }, { regular_hours: 0, overtime_hours: 0, gross_pay: 0, employee_ids: new Set() });

      return {
        ...roster,
        site: siteMap.get(roster.site_id) || null,
        workers: totals.employee_ids.size,
        regular_hours: Number(totals.regular_hours.toFixed(2)),
        overtime_hours: Number(totals.overtime_hours.toFixed(2)),
        estimated_gross: Number(totals.gross_pay.toFixed(2)),
      };
    });

    const batches = (batchesResult.data || []).map((batch) => ({
      ...batch,
      total_regular_hours: Number(batch.total_regular_hours || 0),
      total_overtime_hours: Number(batch.total_overtime_hours || 0),
      gross_total: Number(batch.gross_total || 0),
      deductions_total: Number(batch.deductions_total || 0),
      net_total: Number(batch.net_total || 0),
      pay_period: periodMap.get(batch.pay_period_id) || null,
    }));

    return NextResponse.json({ success: true, rosters, batches });
  } catch (error) {
    console.error('Accountant payroll GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load payroll preparation data.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireAccountant('payroll.prepare');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const rosterIds = Array.isArray(body.roster_ids) ? [...new Set(body.roster_ids.map(String).filter(Boolean))] : [];
    if (!rosterIds.length) {
      return NextResponse.json({ success: false, error: 'Select at least one HR-approved roster.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: batch, error } = await db.rpc('accountant_prepare_payroll_batch', {
      p_accountant_id: access.user.id,
      p_roster_ids: rosterIds,
    });

    if (error) {
      const conflict = error.message?.includes('already included');
      return NextResponse.json({ success: false, error: error.message || 'Could not prepare payroll batch.' }, { status: conflict ? 409 : 400 });
    }

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'PREPARE_PAYROLL_BATCH',
      module: 'Payroll & Finance',
      entityType: 'payroll_batches',
      entityId: batch.id,
      details: `Prepared payroll batch ${batch.batch_code}.`,
      metadata: { roster_ids: rosterIds, total_employees: batch.total_employees, gross_total: batch.gross_total, net_total: batch.net_total },
    });

    return NextResponse.json({ success: true, data: batch }, { status: 201 });
  } catch (error) {
    console.error('Accountant payroll create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to prepare payroll batch.' }, { status: 500 });
  }
}
