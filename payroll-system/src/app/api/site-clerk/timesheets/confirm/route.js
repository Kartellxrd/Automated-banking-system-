import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();

    // Standardize worker list array across potential frontend keys
    const rawWorkers = body.parsedWorkers || body.parsedData || body.workers || body.roster || [];
    const siteName = body.siteName || body.selectedSite || 'Debete Site';
    const shiftDate = body.shiftDate || body.targetDate || new Date().toISOString().split('T')[0];
    const documentUrl = body.documentUrl || null;

    if (!rawWorkers || rawWorkers.length === 0) {
      return NextResponse.json(
        { error: 'No worker records to process.' },
        { status: 400 }
      );
    }

    const processedLogs = [];

    for (const worker of rawWorkers) {
      let employeeId = worker.employee_id || worker.employeeId || null;
      const workerName = worker.worker_name || worker.workerName || 'Unknown Worker';
      const nationalId = worker.national_id || worker.idNumber || null;

      // Auto-register walk-on/unregistered workers
      if (worker.is_unregistered || !employeeId) {
        const [firstName, ...lastNameParts] = workerName.trim().split(' ');
        const lastName = lastNameParts.join(' ') || 'Worker';

        const { data: newEmp } = await supabase
          .from('employees')
          .insert({
            first_name: firstName,
            last_name: lastName,
            national_id: nationalId,
            employee_code: worker.employee_code || `WALKON-${nationalId || Date.now()}`,
            assigned_site: siteName,
            status: 'Active',
          })
          .select('id')
          .single();

        if (newEmp) {
          employeeId = newEmp.id;
        }
      }

      // Build shift log entry
      processedLogs.push({
        employee_id: employeeId,
        site_name: siteName,
        shift_date: shiftDate,
        time_in: worker.timeInStr || worker.timeIn || '07:00 AM',
        time_out: worker.timeOutStr || worker.timeOut || '05:00 PM',
        regular_hours: Number(worker.regular_hours ?? worker.regHours ?? 8),
        overtime_hours: Number(worker.overtime_hours ?? worker.otHours ?? 0),
        total_hours:
          Number(worker.regular_hours ?? worker.regHours ?? 8) +
          Number(worker.overtime_hours ?? worker.otHours ?? 0),
        is_late: Boolean(worker.warnings?.is_late || worker.isLate || false),
        status: 'Locked',
      });
    }

    // Upsert into shift logs
    const { error: logError } = await supabase
      .from('shift_logs')
      .upsert(processedLogs, { onConflict: 'employee_id, shift_date' });

    if (logError) {
      console.error('Shift Log DB Error:', logError.message);
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    // Insert approved timesheet document log
    await supabase.from('timesheets').insert({
      site_name: siteName,
      shift_date: shiftDate,
      total_workers: rawWorkers.length,
      document_url: documentUrl,
      status: 'approved',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully locked ${rawWorkers.length} shift logs for ${siteName}.`,
    });
  } catch (err) {
    console.error('Confirmation Handler Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}