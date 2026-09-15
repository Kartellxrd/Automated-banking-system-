import { NextResponse } from 'next/server';
import { requireSiteClerk } from '@/lib/auth/requireSiteClerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteClerkContext } from '@/lib/site-clerk/getSiteContext';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

export async function POST(request) {
  const access = await requireSiteClerk('attendance.edit_draft');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const uploadId = typeof body.upload_id === 'string' ? body.upload_id.trim() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (!uploadId || !validDate(date) || !entries.length) {
      return NextResponse.json({ success: false, error: 'Upload, work date and reviewed worker entries are required.' }, { status: 400 });
    }

    if (entries.some((entry) => entry.reviewed !== true)) {
      return NextResponse.json({ success: false, error: 'Review and confirm every assigned worker before continuing.' }, { status: 400 });
    }

    for (const entry of entries) {
      if (!entry.employee_id || !['present', 'absent', 'leave', 'sick'].includes(entry.attendance_state)) {
        return NextResponse.json({ success: false, error: 'Every worker needs a valid attendance status.' }, { status: 400 });
      }
      if (entry.attendance_state === 'present' && (!entry.clock_in || !entry.clock_out)) {
        return NextResponse.json({ success: false, error: 'Present workers require both clock-in and clock-out times.' }, { status: 400 });
      }
      const overtime = Number(entry.overtime_hours || 0);
      if (!Number.isFinite(overtime) || overtime < 0) {
        return NextResponse.json({ success: false, error: 'Overtime hours must be zero or greater.' }, { status: 400 });
      }
    }

    const db = createSupabaseAdminClient();
    const context = await getSiteClerkContext(db, access.user.id);
    if (!context) {
      return NextResponse.json({ success: false, error: 'No active site assignment found for your account.' }, { status: 409 });
    }

    const rpcEntries = entries.map((entry) => ({
      employee_id: entry.employee_id,
      attendance_state: entry.attendance_state,
      clock_in: entry.attendance_state === 'present' ? entry.clock_in : null,
      clock_out: entry.attendance_state === 'present' ? entry.clock_out : null,
      overtime_hours: entry.attendance_state === 'present' ? Number(entry.overtime_hours || 0) : 0,
      notes: typeof entry.notes === 'string' ? entry.notes.trim() : '',
      extracted_row_id: entry.extracted_row_id || null,
    }));

    const { data: roster, error } = await db.rpc('site_clerk_confirm_timesheet', {
      p_clerk_id: access.user.id,
      p_upload_id: uploadId,
      p_shift_date: date,
      p_entries: rpcEntries,
    });

    if (error) {
      const message = error.message || 'Could not confirm the timesheet.';
      if (
        message.includes('worker') ||
        message.includes('Worker') ||
        message.includes('attendance') ||
        message.includes('Timesheet') ||
        message.includes('roster') ||
        message.includes('Clock') ||
        message.includes('Overtime') ||
        message.includes('assignment')
      ) {
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }
      throw error;
    }

    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'CONFIRM_TIMESHEET',
      module: 'Attendance & Rosters',
      entityType: 'timesheet_upload',
      entityId: uploadId,
      details: `Verified paper timesheet for ${context.site.site_name} on ${date} and created ${entries.length} attendance entries.`,
      metadata: {
        site_id: context.site.id,
        roster_id: roster.id,
        shift_date: date,
        worker_entries: entries.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Paper timesheet verified and attendance saved. Review the roster, then submit it to HR.',
      data: roster,
      roster_url: `/dashboard/site-clerk/roster?date=${encodeURIComponent(date)}`,
    });
  } catch (error) {
    console.error('Timesheet confirmation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to confirm the paper timesheet.' }, { status: 500 });
  }
}
