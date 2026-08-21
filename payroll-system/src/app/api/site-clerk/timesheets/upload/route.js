import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const siteName = formData.get('siteName') || '';
    const shiftDate = formData.get('shiftDate') || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ error: 'No timesheet document provided.' }, { status: 400 });
    }

    // 1. Process and upload document attachment to Supabase Storage
    const fileExt = file.name ? file.name.split('.').pop() : 'pdf';
    const cleanSiteName = siteName ? siteName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'General';
    const fileName = `${cleanSiteName}_${shiftDate}_${Date.now()}.${fileExt}`;
    const fileBuffer = await file.arrayBuffer();

    const { data: storageData, error: storageError } = await supabase.storage
      .from('timesheet-attachments')
      .upload(fileName, fileBuffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      });

    let documentUrl = null;
    if (!storageError && storageData) {
      const { data: publicUrlData } = supabase.storage
        .from('timesheet-attachments')
        .getPublicUrl(fileName);
      documentUrl = publicUrlData?.publicUrl || null;
    }

    // 2. Parallel Database Lookups: Roster, Existing Shift Logs, and Approved Leave
    const [
      { data: siteEmployees, error: empError },
      { data: existingLogs, error: logError },
      { data: crossSiteLogs, error: crossLogError },
      { data: leaveRecords, error: leaveError },
    ] = await Promise.all([
      // Fetch active site employees
      supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, site_location')
        .eq('status', 'active')
        .ilike('site_location', `%${siteName}%`),

      // Check if shift logs already exist for this site and date (Duplicate Check)
      supabase
        .from('shift_logs')
        .select('id, employee_id, site_name, shift_date')
        .ilike('site_name', `%${siteName}%`)
        .eq('shift_date', shiftDate),

      // Check if employees are already logged at OTHER sites on this date (Double-booking Check)
      supabase
        .from('shift_logs')
        .select('employee_id, site_name, regular_hours')
        .eq('shift_date', shiftDate)
        .not('site_name', 'ilike', `%${siteName}%`),

      // Check approved leave requests spanning shiftDate
      supabase
        .from('leave_requests')
        .select('employee_id, leave_type')
        .lte('start_date', shiftDate)
        .gte('end_date', shiftDate)
        .eq('status', 'approved'),
    ]);

    if (empError) {
      console.error('Error fetching employees:', empError);
      return NextResponse.json({ error: 'Failed to retrieve site roster.' }, { status: 500 });
    }

    // Map warning lookups for quick evaluation
    const existingLogEmpIds = new Set((existingLogs || []).map((l) => l.employee_id));
    
    const crossSiteMap = new Map();
    (crossSiteLogs || []).forEach((l) => {
      crossSiteMap.set(l.employee_id, { site: l.site_name, hours: l.regular_hours });
    });

    const leaveMap = new Map();
    (leaveRecords || []).forEach((r) => {
      leaveMap.set(r.employee_id, r.leave_type);
    });

    // 3. Format Roster & Attach Diagnostics
    const parsedWorkers = (siteEmployees || []).map((emp, index) => {
      const isCrossLogged = crossSiteMap.get(emp.id);
      const leaveType = leaveMap.get(emp.id);

      return {
        id: emp.id || index + 1,
        employee_id: emp.id,
        worker_name: `${emp.first_name} ${emp.last_name}`.trim(),
        employee_code: emp.employee_code || `EMP-${emp.id}`,
        site_location: emp.site_location || siteName || 'Unassigned',
        timeInStr: '07:00',
        timeOutStr: '17:00',
        regular_hours: 9,
        overtime_hours: 0,
        status: leaveType ? 'on_leave' : 'completed',
        is_unregistered: false,
        warnings: {
          already_logged_here: existingLogEmpIds.has(emp.id),
          cross_site_logged: isCrossLogged ? isCrossLogged.site : null,
          hr_leave_status: leaveType || null,
        },
      };
    });

    // 4. Operational Flag Diagnostics
    const warnings = {
      is_duplicate_shift: existingLogs && existingLogs.length > 0,
      site_mismatch_or_empty: !siteEmployees || siteEmployees.length === 0,
      total_existing_records: existingLogs ? existingLogs.length : 0,
    };

    return NextResponse.json({
      success: true,
      documentUrl,
      shiftDate,
      siteName,
      workerCount: parsedWorkers.length,
      warnings,
      parsedWorkers,
    });
  } catch (err) {
    console.error('Timesheet Ingestion Error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred processing the file.' },
      { status: 500 }
    );
  }
}