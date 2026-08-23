import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch roster, employees, and shift status for site and date
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site') || 'Site A';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Fetch available active sites using 'site_name'
    const { data: sitesData, error: sitesErr } = await supabase
      .from('sites')
      .select('id, site_name');

    if (sitesErr) throw sitesErr;

    // 2. Fetch employees assigned to this site using 'job_role'
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, job_role, assigned_site')
      .eq('assigned_site', site);

    if (empErr) throw empErr;

    // 3. Fetch shift log entries for site location from 'shift_logs'
    const { data: shiftLogs, error: logErr } = await supabase
      .from('shift_logs')
      .select('*')
      .eq('site_location', site);

    if (logErr) throw logErr;

    // 4. Check if shift is locked via shift_locks table or status in shift_logs
    const { data: shiftLock } = await supabase
      .from('shift_locks')
      .select('is_locked, locked_at')
      .eq('site_name', site)
      .eq('shift_date', date)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      sites: (sitesData || []).map((s) => s.site_name),
      isLocked: shiftLock?.is_locked || false,
      lockedAt: shiftLock?.locked_at || null,
      employees: (employees || []).map((e) => ({
        ...e,
        job_title: e.job_role, // map back for frontend UI compatibility
      })),
      attendance: (shiftLogs || []).map((l) => ({
        ...l,
        audit_note: l.supervisor_notes, // map back for frontend UI compatibility
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

    const { data, error } = await supabase
      .from('shift_locks')
      .upsert(
        {
          site_name: site,
          shift_date: date,
          is_locked: true,
          locked_at: new Date().toISOString(),
        },
        { onConflict: 'site_name,shift_date' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Shift roster for ${site} on ${date} locked successfully.`,
      lockData: data,
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
    const { attendanceId, employeeId, site, date, clockIn, clockOut, regHours, otHours, auditNote } = body;

    if (!employeeId || !site || !date) {
      return NextResponse.json(
        { error: 'Employee ID, site, and date are required.' },
        { status: 400 }
      );
    }

    let resultData = null;

    if (attendanceId) {
      // Update existing record in shift_logs
      const { data, error } = await supabase
        .from('shift_logs')
        .update({
          overtime_hours: otHours,
          status: 'Adjusted & Verified',
          supervisor_notes: auditNote,
        })
        .eq('id', attendanceId)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      // Insert new timecard record in shift_logs
      const { data, error } = await supabase
        .from('shift_logs')
        .insert({
          employee_id: employeeId,
          site_location: site,
          clock_in: clockIn || new Date().toISOString(),
          clock_out: clockOut || new Date().toISOString(),
          regular_hours: regHours ?? 8,
          overtime_hours: otHours ?? 0,
          status: 'Adjusted & Verified',
          supervisor_notes: auditNote,
        })
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    }

    return NextResponse.json({
      success: true,
      attendance: {
        ...resultData,
        audit_note: resultData?.supervisor_notes,
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