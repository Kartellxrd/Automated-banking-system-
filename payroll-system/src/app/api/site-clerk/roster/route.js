import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch roster, employees, and shift status for site and date
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site') || 'Site A';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Fetch available active sites
    const { data: sitesData, error: sitesErr } = await supabase
      .from('sites')
      .select('id, site_name');

    if (sitesErr) throw sitesErr;

    // 2. Fetch employees assigned to this site
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, job_role, assigned_site')
      .eq('assigned_site', site);

    if (empErr) throw empErr;

    // 3. Fetch shift log entries filtered by site location AND shift date
    const { data: shiftLogs, error: logErr } = await supabase
      .from('shift_logs')
      .select('*')
      .eq('site_location', site)
      .gte('clock_in', `${date}T00:00:00`)
      .lte('clock_in', `${date}T23:59:59`);

    if (logErr && logErr.code !== 'PGRST116') {
      console.warn('Warning querying shift_logs by date range:', logErr.message);
    }

    // 4. Determine lock status directly from shift_logs entries
    const isLocked = (shiftLogs || []).some(
      (log) => log.status === 'locked' || log.status === 'Submitted to HR'
    );

    return NextResponse.json({
      success: true,
      sites: (sitesData || []).map((s) => s.site_name),
      isLocked,
      employees: (employees || []).map((e) => ({
        ...e,
        job_title: e.job_role || 'General Worker',
      })),
      attendance: (shiftLogs || []).map((l) => ({
        ...l,
        audit_note: l.supervisor_notes || '',
      })),
    });
  } catch (err) {
    console.error('Error fetching roster route:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch site roster data.' },
      { status: 500 }
    );
  }
}

// POST: Lock and submit shift roster to HR
export async function POST(request) {
  try {
    const body = await request.json();
    const { site, date } = body;

    if (!site || !date) {
      return NextResponse.json(
        { error: 'Site name and shift date are required.' },
        { status: 400 }
      );
    }

    // Mark all logs for this site and date as locked
    const { data, error } = await supabase
      .from('shift_logs')
      .update({ status: 'Submitted to HR' })
      .eq('site_location', site)
      .gte('clock_in', `${date}T00:00:00`)
      .lte('clock_in', `${date}T23:59:59`)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Shift roster for ${site} on ${date} locked successfully.`,
      logs: data,
    });
  } catch (err) {
    console.error('Error locking shift roster:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to lock shift roster.' },
      { status: 500 }
    );
  }
}

// PATCH: Adjust variance hours and add supervisor notes in shift_logs
export async function PATCH(request) {
  try {
    const body = await request.json();
    const {
      attendanceId,
      employeeId,
      site,
      date,
      clockIn,
      clockOut,
      regHours,
      otHours,
      auditNote,
    } = body;

    if (!employeeId || !site) {
      return NextResponse.json(
        { error: 'Employee ID and site location are required.' },
        { status: 400 }
      );
    }

    let resultData = null;

    if (attendanceId) {
      // 1. Update existing timecard record in shift_logs by primary ID
      const { data, error } = await supabase
        .from('shift_logs')
        .update({
          overtime_hours: parseFloat(otHours) || 0,
          regular_hours: parseFloat(regHours) || 8,
          status: 'Adjusted & Verified',
          supervisor_notes: auditNote || '',
        })
        .eq('id', attendanceId)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      // 2. Check if a record already exists for this worker on this date before inserting
      const shiftDateStr = date || new Date().toISOString().split('T')[0];

      const { data: existingLog } = await supabase
        .from('shift_logs')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('site_location', site)
        .gte('clock_in', `${shiftDateStr}T00:00:00`)
        .lte('clock_in', `${shiftDateStr}T23:59:59`)
        .maybeSingle();

      if (existingLog?.id) {
        // Update the existing record found
        const { data, error } = await supabase
          .from('shift_logs')
          .update({
            overtime_hours: parseFloat(otHours) || 0,
            regular_hours: parseFloat(regHours) || 8,
            status: 'Adjusted & Verified',
            supervisor_notes: auditNote || '',
          })
          .eq('id', existingLog.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;
      } else {
        // Insert brand new shift log entry
        const { data, error } = await supabase
          .from('shift_logs')
          .insert({
            employee_id: employeeId,
            site_location: site,
            clock_in: clockIn ? new Date(`${shiftDateStr} ${clockIn}`).toISOString() : new Date().toISOString(),
            clock_out: clockOut ? new Date(`${shiftDateStr} ${clockOut}`).toISOString() : new Date().toISOString(),
            regular_hours: parseFloat(regHours) || 8,
            overtime_hours: parseFloat(otHours) || 0,
            status: 'Adjusted & Verified',
            supervisor_notes: auditNote || '',
          })
          .select()
          .single();

        if (error) throw error;
        resultData = data;
      }
    }

    return NextResponse.json({
      success: true,
      attendance: {
        ...resultData,
        audit_note: resultData?.supervisor_notes || '',
      },
    });
  } catch (err) {
    console.error('Error updating variance:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update variance hours.' },
      { status: 500 }
    );
  }
}