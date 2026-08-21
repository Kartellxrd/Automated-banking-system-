import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { records, siteName, shiftDate, documentUrl } = await request.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided to commit.' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    const datePrefix = shiftDate || new Date().toISOString().split('T')[0];

    const parseToIso = (dateStr, timeStr) => {
      try {
        if (!timeStr || timeStr === '--:--') return null;
        const fullStr = `${dateStr} ${timeStr}`;
        const parsedDate = new Date(fullStr);
        if (isNaN(parsedDate.getTime())) return null;
        return parsedDate.toISOString();
      } catch {
        return null;
      }
    };

    const finalShiftLogs = [];

    // Process each worker row
    for (const rec of records) {
      let activeEmployeeId = rec.employee_id;
      let isNewWorker = false;

      // 1. If worker does NOT exist in DB, insert them into `employees` table first
      if (!activeEmployeeId || rec.is_unregistered) {
        const rawName = (rec.worker_name || 'WalkOn Worker').trim();
        const nameParts = rawName.split(' ');
        const firstName = nameParts[0] || 'WalkOn';
        const lastName = nameParts.slice(1).join(' ') || 'Worker';
        const generatedCode = `TEMP-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data: newEmp, error: empInsertError } = await supabase
          .from('employees')
          .insert({
            first_name: firstName,
            last_name: lastName,
            employee_code: generatedCode,
            site_location: siteName || 'General Site',
            status: 'active',
            position: 'General Worker',
          })
          .select('id')
          .single();

        if (!empInsertError && newEmp) {
          activeEmployeeId = newEmp.id;
          isNewWorker = true;
        } else {
          console.error('Failed to create walk-on employee row:', empInsertError);
        }
      }

      const clockInIso = parseToIso(datePrefix, rec.timeInStr);
      const clockOutIso = parseToIso(datePrefix, rec.timeOutStr);

      let noteDetails = `Batch entry for ${siteName || 'Site'} on ${datePrefix}.`;
      if (isNewWorker) {
        noteDetails += ` [Auto-Registered Walk-On Worker: ${rec.worker_name}]`;
      }
      if (documentUrl) {
        noteDetails += ` | Attached Sheet: ${documentUrl}`;
      }

      finalShiftLogs.push({
        employee_id: activeEmployeeId,
        shift_date: datePrefix,
        clock_in: clockInIso,
        clock_out: clockOutIso,
        regular_hours: Number(rec.regular_hours) || 0.0,
        overtime_hours: Number(rec.overtime_hours) || 0.0,
        site_name: siteName || rec.site_location || 'General Site',
        site_location: siteName || rec.site_location || 'General Site',
        status: rec.status || 'completed',
        logged_by: user?.id || null,
        is_unregistered: isNewWorker,
        unregistered_worker_name: isNewWorker ? rec.worker_name : null,
        supervisor_notes: noteDetails,
      });
    }

    // 2. Commit logs to shift_logs with upsert logic
    const { data, error } = await supabase
      .from('shift_logs')
      .upsert(finalShiftLogs, {
        onConflict: 'employee_id, shift_date',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Database Error committing shift_logs:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      committedCount: data ? data.length : 0,
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