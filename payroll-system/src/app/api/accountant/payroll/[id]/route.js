import { NextResponse } from 'next/server';
import { requireAccountant } from '@/lib/auth/requireAccountant';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';

async function loadBatch(db, id) {
  const { data: batch, error: batchError } = await db
    .from('payroll_batches')
    .select('id, batch_code, pay_period_id, status, scheduled_payment_date, created_by, submitted_by, submitted_at, ceo_reviewed_by, ceo_reviewed_at, ceo_rejection_reason, total_employees, total_regular_hours, total_overtime_hours, gross_total, deductions_total, net_total, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (batchError) throw batchError;
  if (!batch) return null;

  const [periodResult, entriesResult, rosterLinksResult] = await Promise.all([
    db.from('pay_periods').select('id, period_name, start_date, end_date, status').eq('id', batch.pay_period_id).maybeSingle(),
    db.from('payroll_entries')
      .select('id, employee_id, applied_hourly_rate, total_hours_worked, regular_hours, overtime_hours, applied_overtime_rate, regular_pay, overtime_pay, gross_pay, tax_deductions, net_pay, status, has_multiple_rates, payout_provider_id, payout_provider_name_snapshot, payout_account_snapshot, payout_branch_code_snapshot, payout_verified_at_snapshot, payment_status')
      .eq('batch_id', batch.id)
      .order('created_at'),
    db.from('payroll_batch_rosters').select('roster_id').eq('batch_id', batch.id),
  ]);
  if (periodResult.error) throw periodResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (rosterLinksResult.error) throw rosterLinksResult.error;

  const entries = entriesResult.data || [];
  const employeeIds = [...new Set(entries.map((entry) => entry.employee_id).filter(Boolean))];
  const entryIds = entries.map((entry) => entry.id);
  const rosterIds = (rosterLinksResult.data || []).map((row) => row.roster_id);

  const [employeesResult, linesResult, rostersResult] = await Promise.all([
    employeeIds.length ? db.from('employees').select('id, employee_code, first_name, last_name, job_role, status').in('id', employeeIds) : Promise.resolve({ data: [], error: null }),
    entryIds.length ? db.from('payroll_entry_lines').select('id, payroll_entry_id, shift_log_id, roster_id, shift_date, regular_hours, overtime_hours, hourly_rate_snapshot, overtime_multiplier, regular_pay, overtime_pay, gross_pay').in('payroll_entry_id', entryIds).order('shift_date') : Promise.resolve({ data: [], error: null }),
    rosterIds.length ? db.from('daily_site_rosters').select('id, site_id, shift_date, version').in('id', rosterIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (employeesResult.error) throw employeesResult.error;
  if (linesResult.error) throw linesResult.error;
  if (rostersResult.error) throw rostersResult.error;

  const employeeMap = new Map((employeesResult.data || []).map((employee) => [employee.id, employee]));
  const linesByEntry = new Map();
  for (const line of linesResult.data || []) {
    const list = linesByEntry.get(line.payroll_entry_id) || [];
    list.push({
      ...line,
      regular_hours: Number(line.regular_hours || 0),
      overtime_hours: Number(line.overtime_hours || 0),
      hourly_rate_snapshot: Number(line.hourly_rate_snapshot || 0),
      overtime_multiplier: Number(line.overtime_multiplier || 1.5),
      regular_pay: Number(line.regular_pay || 0),
      overtime_pay: Number(line.overtime_pay || 0),
      gross_pay: Number(line.gross_pay || 0),
    });
    linesByEntry.set(line.payroll_entry_id, list);
  }

  const siteIds = [...new Set((rostersResult.data || []).map((roster) => roster.site_id).filter(Boolean))];
  const { data: sites, error: sitesError } = siteIds.length
    ? await db.from('sites').select('id, site_name, location').in('id', siteIds)
    : { data: [], error: null };
  if (sitesError) throw sitesError;
  const siteMap = new Map((sites || []).map((site) => [site.id, site]));

  const formattedEntries = entries.map((entry) => {
    const employee = employeeMap.get(entry.employee_id);
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
      payout_ready: entry.net_pay <= 0 || Boolean(entry.payout_provider_id && entry.payout_account_snapshot && entry.payout_verified_at_snapshot),
      employee: employee ? {
        id: employee.id,
        employee_code: employee.employee_code,
        name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        job_role: employee.job_role,
        status: employee.status,
      } : null,
      lines: linesByEntry.get(entry.id) || [],
    };
  });

  const rosters = (rostersResult.data || []).map((roster) => ({ ...roster, site: siteMap.get(roster.site_id) || null }));
  const missingPayouts = formattedEntries.filter((entry) => entry.net_pay > 0 && !entry.payout_ready).length;

  return {
    ...batch,
    total_regular_hours: Number(batch.total_regular_hours || 0),
    total_overtime_hours: Number(batch.total_overtime_hours || 0),
    gross_total: Number(batch.gross_total || 0),
    deductions_total: Number(batch.deductions_total || 0),
    net_total: Number(batch.net_total || 0),
    pay_period: periodResult.data || null,
    entries: formattedEntries,
    rosters,
    blockers: { missing_payout_profiles: missingPayouts, missing_pay_date: batch.scheduled_payment_date ? 0 : 1 },
    can_submit_to_ceo: ['draft', 'rejected_by_ceo'].includes(batch.status) && missingPayouts === 0 && Boolean(batch.scheduled_payment_date),
  };
}

export async function GET(_request, context) {
  const access = await requireAccountant('payroll.view_approved');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { id } = await context.params;
    const db = createSupabaseAdminClient();
    const batch = await loadBatch(db, id);
    if (!batch) return NextResponse.json({ success: false, error: 'Payroll batch not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: batch });
  } catch (error) {
    console.error('Accountant payroll batch GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load payroll batch.' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  const access = await requireAccountant('payroll.prepare');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = String(body.action || '').toLowerCase();
    const db = createSupabaseAdminClient();

    const { data: current, error: currentError } = await db.from('payroll_batches').select('id, batch_code, status, scheduled_payment_date').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ success: false, error: 'Payroll batch not found.' }, { status: 404 });

    if (action === 'set_pay_date') {
      if (!['draft', 'rejected_by_ceo'].includes(current.status)) {
        return NextResponse.json({ success: false, error: 'The scheduled payday can only be changed before CEO approval.' }, { status: 409 });
      }
      const scheduledPaymentDate = String(body.scheduled_payment_date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledPaymentDate)) {
        return NextResponse.json({ success: false, error: 'Select a valid scheduled payday.' }, { status: 400 });
      }

      const { error: updateError } = await db.from('payroll_batches').update({ scheduled_payment_date: scheduledPaymentDate, updated_at: new Date().toISOString() }).eq('id', id);
      if (updateError) throw updateError;

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: 'SET_PAYROLL_PAYMENT_DATE',
        module: 'Payroll & Finance',
        entityType: 'payroll_batches',
        entityId: id,
        details: `Set payroll ${current.batch_code} payment date to ${scheduledPaymentDate}.`,
        metadata: { previous_date: current.scheduled_payment_date || null, scheduled_payment_date: scheduledPaymentDate },
      });

      return NextResponse.json({ success: true, data: await loadBatch(db, id), message: 'Scheduled payday updated.' });
    }

    if (action === 'refresh_payouts') {
      if (!['draft', 'rejected_by_ceo'].includes(current.status)) {
        return NextResponse.json({ success: false, error: 'Payout details can only be refreshed before CEO approval.' }, { status: 409 });
      }

      const { data: entries, error: entriesError } = await db.from('payroll_entries').select('id, employee_id').eq('batch_id', id);
      if (entriesError) throw entriesError;

      for (const entry of entries || []) {
        const { data: profile, error: profileError } = await db
          .from('employee_payout_profiles')
          .select('payout_provider_id, account_or_mobile_number, branch_code, verified_at')
          .eq('employee_id', entry.employee_id)
          .eq('is_primary', true)
          .not('verified_at', 'is', null)
          .order('verified_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (profileError) throw profileError;

        let providerName = null;
        if (profile?.payout_provider_id) {
          const { data: provider, error: providerError } = await db.from('payout_providers').select('name').eq('id', profile.payout_provider_id).maybeSingle();
          if (providerError) throw providerError;
          providerName = provider?.name || null;
        }

        const { error: updateError } = await db.from('payroll_entries').update({
          payout_provider_id: profile?.payout_provider_id || null,
          payout_provider_name_snapshot: providerName,
          payout_account_snapshot: profile?.account_or_mobile_number || null,
          payout_branch_code_snapshot: profile?.branch_code || null,
          payout_verified_at_snapshot: profile?.verified_at || null,
          updated_at: new Date().toISOString(),
        }).eq('id', entry.id);
        if (updateError) throw updateError;
      }

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: 'REFRESH_PAYROLL_PAYOUT_DETAILS',
        module: 'Payroll & Finance',
        entityType: 'payroll_batches',
        entityId: id,
        details: `Refreshed payout details for payroll batch ${current.batch_code}.`,
      });

      return NextResponse.json({ success: true, data: await loadBatch(db, id) });
    }

    if (action === 'submit_to_ceo') {
      if (!current.scheduled_payment_date) {
        return NextResponse.json({ success: false, error: 'Set the scheduled payday before submitting payroll to the CEO.' }, { status: 400 });
      }

      const { data: batch, error } = await db.rpc('accountant_submit_payroll_batch', {
        p_accountant_id: access.user.id,
        p_batch_id: id,
      });
      if (error) return NextResponse.json({ success: false, error: error.message || 'Could not submit payroll batch.' }, { status: 400 });

      await writeAuditLog(db, {
        actorUserId: access.user.id,
        action: 'SUBMIT_PAYROLL_BATCH_TO_CEO',
        module: 'Payroll & Finance',
        entityType: 'payroll_batches',
        entityId: id,
        details: `Submitted payroll batch ${current.batch_code} to CEO for final approval.`,
        metadata: { previous_status: current.status, new_status: batch.status, scheduled_payment_date: current.scheduled_payment_date, net_total: batch.net_total },
      });

      return NextResponse.json({ success: true, data: batch, message: 'Payroll batch submitted to CEO.' });
    }

    return NextResponse.json({ success: false, error: 'Unsupported payroll action.' }, { status: 400 });
  } catch (error) {
    console.error('Accountant payroll batch PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update payroll batch.' }, { status: 500 });
  }
}
