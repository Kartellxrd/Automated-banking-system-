import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { records, siteName, shiftDate } = await request.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided to commit.' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    const datePrefix = shiftDate || new Date().toISOString().split('T')[0];

    const parseToIso = (dateStr, timeStr) => {
      try {
        const fullStr = `${dateStr} ${timeStr}`;
        const parsedDate = new Date(fullStr);
        if (isNaN(parsedDate.getTime())) {
          return new Date().toISOString();
        }
        return parsedDate.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    const shiftLogsPayload = records.map((rec) => {
      const clockInIso = parseToIso(datePrefix, rec.timeInStr);
      const clockOutIso = parseToIso(datePrefix, rec.timeOutStr);

      return {
        employee_id: rec.employee_id || null,
        clock_in: clockInIso,
        clock_out: clockOutIso,
        regular_hours: Number(rec.regular_hours) || 8.0,
        overtime_hours: Number(rec.overtime_hours) || 0.0,
        site_location: siteName || rec.site_location || 'Debete Site',
        status: rec.status || 'completed',
        logged_by: user?.id || null,
        supervisor_notes: `Parsed from physical timesheet upload for ${siteName || 'site'}`,
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
      insertedCount: data ? data.length : 0,
      logs: data,
    });
  } catch (err) {
    console.error('Commit Shift Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while writing shift logs.' },
      { status: 500 }
    );
  }
}