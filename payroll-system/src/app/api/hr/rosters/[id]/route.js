import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

const TIMESHEET_BUCKET = 'timesheet-attachments';

function actorName(profile) {
  if (!profile) return null;
  return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || null;
}

export async function GET(_request, context) {
  const access = await requireHR('rosters.review');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const { id } = await context.params;
    const db = createSupabaseAdminClient();

    const { data: roster, error: rosterError } = await db
      .from('daily_site_rosters')
      .select('id, site_id, shift_date, status, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_reason, version, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (rosterError) throw rosterError;
    if (!roster) {
      return NextResponse.json({ success: false, error: 'Roster not found.' }, { status: 404 });
    }

    const [{ data: site, error: siteError }, { data: shifts, error: shiftError }, { data: uploads, error: uploadError }] = await Promise.all([
      db.from('sites').select('id, site_name, location').eq('id', roster.site_id).maybeSingle(),
      db.from('shift_logs')
        .select('id, employee_id, clock_in, clock_out, regular_hours, overtime_hours, worked_hours, hourly_rate_snapshot, attendance_state, supervisor_notes, status')
        .eq('daily_roster_id', roster.id)
        .order('created_at'),
      db.from('timesheet_uploads')
        .select('id, original_filename, mime_type, file_size_bytes, storage_path, uploaded_by, uploaded_at, confirmed_at, processing_status, detected_site_text, detected_document_date')
        .eq('roster_id', roster.id)
        .order('uploaded_at', { ascending: false })
        .limit(1),
    ]);
    if (siteError) throw siteError;
    if (shiftError) throw shiftError;
    if (uploadError) throw uploadError;

    const attendance = shifts || [];
    const employeeIds = [...new Set(attendance.map((row) => row.employee_id).filter(Boolean))];
    const profileIds = [...new Set([roster.submitted_by, roster.reviewed_by, uploads?.[0]?.uploaded_by].filter(Boolean))];

    let employees = [];
    let profiles = [];
    if (employeeIds.length) {
      const { data, error } = await db
        .from('employees')
        .select('id, employee_code, first_name, last_name, job_role, status')
        .in('id', employeeIds);
      if (error) throw error;
      employees = data || [];
    }
    if (profileIds.length) {
      const { data, error } = await db
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('id', profileIds);
      if (error) throw error;
      profiles = data || [];
    }

    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

    const entries = attendance.map((entry) => {
      const employee = employeeMap.get(entry.employee_id);
      return {
        ...entry,
        employee: employee ? {
          id: employee.id,
          employee_code: employee.employee_code,
          name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
          job_role: employee.job_role,
          status: employee.status,
        } : null,
      };
    });

    const latestUpload = uploads?.[0] || null;
    let previewUrl = null;
    if (latestUpload?.storage_path) {
      const { data: signed, error: signedError } = await db.storage
        .from(TIMESHEET_BUCKET)
        .createSignedUrl(latestUpload.storage_path, 60 * 60);
      if (!signedError) previewUrl = signed?.signedUrl || null;
    }

    const totals = entries.reduce((acc, entry) => {
      acc.workers += 1;
      acc.regular_hours += Number(entry.regular_hours || 0);
      acc.overtime_hours += Number(entry.overtime_hours || 0);
      acc.worked_hours += Number(entry.worked_hours || 0);
      return acc;
    }, { workers: 0, regular_hours: 0, overtime_hours: 0, worked_hours: 0 });

    return NextResponse.json({
      success: true,
      data: {
        roster,
        site,
        submitted_by: roster.submitted_by ? { ...profileMap.get(roster.submitted_by), name: actorName(profileMap.get(roster.submitted_by)) } : null,
        reviewed_by: roster.reviewed_by ? { ...profileMap.get(roster.reviewed_by), name: actorName(profileMap.get(roster.reviewed_by)) } : null,
        entries,
        upload: latestUpload ? {
          ...latestUpload,
          uploaded_by_user: latestUpload.uploaded_by ? { ...profileMap.get(latestUpload.uploaded_by), name: actorName(profileMap.get(latestUpload.uploaded_by)) } : null,
          preview_url: previewUrl,
        } : null,
        totals: {
          workers: totals.workers,
          regular_hours: Number(totals.regular_hours.toFixed(2)),
          overtime_hours: Number(totals.overtime_hours.toFixed(2)),
          worked_hours: Number(totals.worked_hours.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error('HR roster detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load roster review details.' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  const access = await requireHR('rosters.approve');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const decision = String(body.decision || '').toLowerCase();
    const reason = String(body.reason || '').trim();

    if (!['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ success: false, error: 'Decision must be approve or reject.' }, { status: 400 });
    }
    if (decision === 'reject' && !reason) {
      return NextResponse.json({ success: false, error: 'A rejection reason is required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();

    const { data: before, error: beforeError } = await db
      .from('daily_site_rosters')
      .select('id, site_id, shift_date, status, version')
      .eq('id', id)
      .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) {
      return NextResponse.json({ success: false, error: 'Roster not found.' }, { status: 404 });
    }

    const { data: reviewed, error: reviewError } = await db.rpc('hr_review_roster', {
      p_hr_id: access.user.id,
      p_roster_id: id,
      p_decision: decision,
      p_reason: reason || null,
    });
    if (reviewError) {
      const message = reviewError.message || 'Roster review failed.';
      const status = message.includes('Only submitted rosters') ? 409 : 400;
      return NextResponse.json({ success: false, error: message }, { status });
    }

    const action = decision === 'approve' ? 'APPROVE_ROSTER' : 'REJECT_ROSTER';
    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action,
      module: 'Attendance & Rosters',
      entityType: 'daily_site_rosters',
      entityId: id,
      details: decision === 'approve'
        ? `Approved roster for ${before.shift_date}.`
        : `Rejected roster for ${before.shift_date}: ${reason}`,
      metadata: {
        site_id: before.site_id,
        shift_date: before.shift_date,
        roster_version: before.version,
        previous_status: before.status,
        new_status: decision === 'approve' ? 'approved' : 'rejected',
      },
    });

    return NextResponse.json({ success: true, data: reviewed, message: decision === 'approve' ? 'Roster approved and released for payroll.' : 'Roster rejected and returned to the Site Clerk.' });
  } catch (error) {
    console.error('HR roster decision error:', error);
    return NextResponse.json({ success: false, error: 'Failed to review this roster.' }, { status: 500 });
  }
}
