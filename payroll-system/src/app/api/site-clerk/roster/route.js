import { NextResponse } from 'next/server';
import { requireSiteClerk } from '@/lib/auth/requireSiteClerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteClerkContext } from '@/lib/site-clerk/getSiteContext';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

function botswanaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Gaborone',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

async function loadRosterData(db, siteId, date) {
  const { data: assignmentRows, error: assignmentError } = await db
    .from('employee_site_assignments')
    .select('employee_id')
    .eq('site_id', siteId)
    .eq('is_active', true);
  if (assignmentError) throw assignmentError;

  const employeeIds = (assignmentRows || []).map((row) => row.employee_id);
  let employees = [];
  if (employeeIds.length > 0) {
    const { data, error } = await db
      .from('employees')
      .select('id, employee_code, first_name, last_name, job_role, hourly_rate, status')
      .in('id', employeeIds)
      .eq('status', 'Active')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });
    if (error) throw error;
    employees = data || [];
  }

  const { data: roster, error: rosterError } = await db
    .from('daily_site_rosters')
    .select('id, site_id, shift_date, status, submitted_at, reviewed_at, rejection_reason, version, updated_at')
    .eq('site_id', siteId)
    .eq('shift_date', date)
    .maybeSingle();
  if (rosterError) throw rosterError;

  let entries = [];
  if (roster?.id) {
    const { data, error } = await db
      .from('shift_logs')
      .select('id, employee_id, clock_in, clock_out, regular_hours, overtime_hours, worked_hours, attendance_state, supervisor_notes, status, hourly_rate_snapshot')
      .eq('daily_roster_id', roster.id);
    if (error) throw error;
    entries = data || [];
  }

  const entryMap = new Map(entries.map((entry) => [entry.employee_id, entry]));
  const workers = employees.map((employee) => ({
    ...employee,
    attendance: entryMap.get(employee.id) || null,
  }));

  return {
    roster: roster || null,
    workers,
    enteredWorkers: entries.length,
    missingEntries: Math.max(workers.length - entries.length, 0),
  };
}

export async function GET(request) {
  const access = await requireSiteClerk('employees.view_site');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || botswanaDate();
    if (!validDate(date)) return NextResponse.json({ success: false, error: 'Invalid roster date.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const context = await getSiteClerkContext(db, access.user.id);
    if (!context) {
      return NextResponse.json({ success: false, error: 'No active site assignment found for your account.' }, { status: 409 });
    }

    const data = await loadRosterData(db, context.site.id, date);
    return NextResponse.json({
      success: true,
      data: {
        clerk: access.profile,
        site: context.site,
        date,
        ...data,
        canEdit: !data.roster || ['draft', 'rejected'].includes(data.roster.status),
        canSubmit: data.workers.length > 0 && data.missingEntries === 0 && (!data.roster || ['draft', 'rejected'].includes(data.roster.status)),
      },
    });
  } catch (error) {
    console.error('Site Clerk roster GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load daily roster.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireSiteClerk('attendance.edit_draft');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const employeeId = typeof body.employee_id === 'string' ? body.employee_id.trim() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const attendanceState = typeof body.attendance_state === 'string' ? body.attendance_state.trim().toLowerCase() : 'present';
    const clockIn = body.clock_in || null;
    const clockOut = body.clock_out || null;
    const overtimeHours = Number(body.overtime_hours || 0);
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!employeeId || !validDate(date)) {
      return NextResponse.json({ success: false, error: 'Employee and valid roster date are required.' }, { status: 400 });
    }
    if (!['present', 'absent', 'leave', 'sick'].includes(attendanceState)) {
      return NextResponse.json({ success: false, error: 'Invalid attendance state.' }, { status: 400 });
    }
    if (!Number.isFinite(overtimeHours) || overtimeHours < 0) {
      return NextResponse.json({ success: false, error: 'Overtime hours must be zero or greater.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const context = await getSiteClerkContext(db, access.user.id);
    if (!context) return NextResponse.json({ success: false, error: 'No active site assignment found for your account.' }, { status: 409 });

    const { data: employee, error: employeeError } = await db
      .from('employees')
      .select('id, first_name, last_name, employee_code')
      .eq('id', employeeId)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const { data, error } = await db.rpc('site_clerk_save_attendance', {
      p_clerk_id: access.user.id,
      p_employee_id: employeeId,
      p_shift_date: date,
      p_attendance_state: attendanceState,
      p_clock_in: attendanceState === 'present' ? clockIn : null,
      p_clock_out: attendanceState === 'present' ? clockOut : null,
      p_overtime_hours: overtimeHours,
      p_notes: notes || null,
    });

    if (error) {
      const message = error.message || 'Could not save attendance.';
      if (message.includes('assignment') || message.includes('attendance') || message.includes('Clock-in') || message.includes('Overtime') || message.includes('locked')) {
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }
      throw error;
    }

    const name = [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.employee_code || 'worker';
    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'SAVE_ATTENDANCE_ENTRY',
      module: 'Attendance & Rosters',
      entityType: 'shift_log',
      entityId: data.id,
      details: `Saved ${attendanceState} attendance for ${name} at ${context.site.site_name} on ${date}.`,
      metadata: {
        employee_id: employeeId,
        site_id: context.site.id,
        shift_date: date,
        attendance_state: attendanceState,
        worked_hours: data.worked_hours,
        overtime_hours: data.overtime_hours,
      },
    });

    return NextResponse.json({ success: true, message: 'Attendance saved.', data });
  } catch (error) {
    console.error('Site Clerk roster PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save attendance entry.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireSiteClerk('rosters.submit');
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!validDate(date)) return NextResponse.json({ success: false, error: 'A valid roster date is required.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const context = await getSiteClerkContext(db, access.user.id);
    if (!context) return NextResponse.json({ success: false, error: 'No active site assignment found for your account.' }, { status: 409 });

    const { data, error } = await db.rpc('site_clerk_submit_roster', {
      p_clerk_id: access.user.id,
      p_shift_date: date,
    });

    if (error) {
      const message = error.message || 'Could not submit roster.';
      if (message.includes('roster') || message.includes('Attendance') || message.includes('workers') || message.includes('assignment')) {
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }
      throw error;
    }

    const { count } = await db
      .from('shift_logs')
      .select('id', { count: 'exact', head: true })
      .eq('daily_roster_id', data.id);

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'SUBMIT_ROSTER',
      module: 'Attendance & Rosters',
      entityType: 'daily_site_roster',
      entityId: data.id,
      details: `Submitted ${context.site.site_name} roster for ${date} to HR with ${count || 0} worker entries.`,
      metadata: { site_id: context.site.id, shift_date: date, worker_entries: count || 0 },
    });

    return NextResponse.json({ success: true, message: 'Roster submitted to HR successfully.', data });
  } catch (error) {
    console.error('Site Clerk roster POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit roster to HR.' }, { status: 500 });
  }
}
