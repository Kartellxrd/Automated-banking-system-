import { NextResponse } from 'next/server';
import { requireSiteClerk } from '@/lib/auth/requireSiteClerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteClerkContext } from '@/lib/site-clerk/getSiteContext';

const BUCKET = 'timesheet-attachments';

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

async function loadWorkers(db, siteId) {
  const { data: assignments, error: assignmentError } = await db
    .from('employee_site_assignments')
    .select('employee_id')
    .eq('site_id', siteId)
    .eq('is_active', true);
  if (assignmentError) throw assignmentError;

  const ids = (assignments || []).map((row) => row.employee_id);
  if (!ids.length) return [];

  const { data, error } = await db
    .from('employees')
    .select('id, employee_code, first_name, last_name, job_role, status')
    .in('id', ids)
    .eq('status', 'Active')
    .order('last_name')
    .order('first_name');
  if (error) throw error;
  return data || [];
}

export async function GET(request) {
  const access = await requireSiteClerk('employees.view_site');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || botswanaDate();
    if (!validDate(date)) {
      return NextResponse.json({ success: false, error: 'Invalid work date.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const context = await getSiteClerkContext(db, access.user.id);
    if (!context) {
      return NextResponse.json({ success: false, error: 'No active site assignment found for your account.' }, { status: 409 });
    }

    const workers = await loadWorkers(db, context.site.id);

    const { data: roster, error: rosterError } = await db
      .from('daily_site_rosters')
      .select('id, site_id, shift_date, status, submitted_at, rejection_reason, version, updated_at')
      .eq('site_id', context.site.id)
      .eq('shift_date', date)
      .maybeSingle();
    if (rosterError) throw rosterError;

    let latestUpload = null;
    let extractedRows = [];
    let attendanceEntries = [];
    let previewUrl = null;

    if (roster?.id) {
      const { data: uploads, error: uploadError } = await db
        .from('timesheet_uploads')
        .select('id, original_filename, mime_type, file_size_bytes, processing_status, detected_site_text, detected_document_date, parser_provider, parser_model, extraction_error, uploaded_at, confirmed_at, storage_path')
        .eq('roster_id', roster.id)
        .order('uploaded_at', { ascending: false })
        .limit(1);
      if (uploadError) throw uploadError;
      latestUpload = uploads?.[0] || null;

      if (latestUpload) {
        const { data: rows, error: rowError } = await db
          .from('timesheet_extracted_rows')
          .select('id, source_row_number, raw_employee_name, raw_employee_code, extracted_clock_in, extracted_clock_out, extracted_overtime_hours, signature_present, ocr_confidence, matched_employee_id, match_method, match_confidence, match_status, review_note')
          .eq('upload_id', latestUpload.id)
          .order('source_row_number');
        if (rowError) throw rowError;
        extractedRows = rows || [];

        const { data: signed, error: signedError } = await db.storage
          .from(BUCKET)
          .createSignedUrl(latestUpload.storage_path, 60 * 60);
        if (!signedError) previewUrl = signed?.signedUrl || null;
      }

      const { data: attendance, error: attendanceError } = await db
        .from('shift_logs')
        .select('id, employee_id, clock_in, clock_out, regular_hours, overtime_hours, worked_hours, attendance_state, supervisor_notes')
        .eq('daily_roster_id', roster.id);
      if (attendanceError) throw attendanceError;
      attendanceEntries = attendance || [];
    }

    const attendanceMap = new Map(attendanceEntries.map((entry) => [entry.employee_id, entry]));
    const candidateRows = new Map();
    for (const row of extractedRows) {
      if (!row.matched_employee_id) continue;
      const existing = candidateRows.get(row.matched_employee_id);
      if (!existing || Number(row.match_confidence || 0) > Number(existing.match_confidence || 0)) {
        candidateRows.set(row.matched_employee_id, row);
      }
    }

    const workerRows = workers.map((worker) => ({
      ...worker,
      suggested_row: candidateRows.get(worker.id) || null,
      attendance: attendanceMap.get(worker.id) || null,
    }));

    const matched = extractedRows.filter((row) => row.match_status === 'matched').length;
    const review = extractedRows.filter((row) => row.match_status === 'review').length;
    const unmatched = extractedRows.filter((row) => row.match_status === 'unmatched').length;
    const workersWithCandidate = new Set(extractedRows.map((row) => row.matched_employee_id).filter(Boolean));

    const publicUpload = latestUpload ? {
      id: latestUpload.id,
      original_filename: latestUpload.original_filename,
      mime_type: latestUpload.mime_type,
      file_size_bytes: latestUpload.file_size_bytes,
      processing_status: latestUpload.processing_status,
      detected_site_text: latestUpload.detected_site_text,
      detected_document_date: latestUpload.detected_document_date,
      parser_provider: latestUpload.parser_provider,
      parser_model: latestUpload.parser_model,
      extraction_error: latestUpload.extraction_error,
      uploaded_at: latestUpload.uploaded_at,
      confirmed_at: latestUpload.confirmed_at,
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        clerk: access.profile,
        site: context.site,
        date,
        roster: roster || null,
        upload: publicUpload,
        preview_url: previewUrl,
        workers: workerRows,
        extracted_rows: extractedRows,
        summary: {
          assigned_workers: workers.length,
          extracted_rows: extractedRows.length,
          auto_matched: matched,
          needs_review: review,
          unmatched_rows: unmatched,
          missing_workers: workers.filter((worker) => !workersWithCandidate.has(worker.id)).length,
        },
        can_upload: !roster || ['draft', 'rejected'].includes(roster.status),
        can_confirm: Boolean(latestUpload) && (!roster || ['draft', 'rejected'].includes(roster.status)),
      },
    });
  } catch (error) {
    console.error('Timesheet verification GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load the paper timesheet workflow.' }, { status: 500 });
  }
}
