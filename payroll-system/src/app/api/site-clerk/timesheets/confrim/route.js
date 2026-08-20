import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { records, siteName, shiftDate } = await request.json();

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No records to commit.' }, { status: 400 });
    }

    // Get active user ID
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare shift_logs bulk insert payload
    const datePrefix = shiftDate || new Date().toISOString().split('T')[0];

    const shiftLogsPayload = records.map((rec) => {
      // Construct TIMESTAMPTZ strings for clock_in and clock_out
      const clockInIso = new Date(`${datePrefix} ${rec.timeInStr}`).toISOString();
      const clockOutIso = new Date(`${datePrefix} ${rec.timeOutStr}`).toISOString();

      return {
        employee_id: rec.employee_id, // Foreign key to employees.id
        clock_in: clockInIso,
        clock_out: clockOutIso,
        regular_hours: rec.regular_hours,
        overtime_hours: rec.overtime_hours,
        site_location: siteName,
        status: rec.status || 'completed',
        logged_by: user?.id || null,
        supervisor_notes: `Parsed from physical timesheet upload for ${siteName}`,
      };
    });

    const { data, error } = await supabase
      .from('shift_logs')
      .insert(shiftLogsPayload)
      .select();

    if (error) {
      console.error('Database Error inserting shift_logs:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      insertedCount: data.length,
      logs: data,
    });
  } catch (err) {
    console.error('Commit Shift Error:', err);
    return NextResponse.json({ error: 'Internal server error while writing shift logs.' }, { status: 500 });
  }
}