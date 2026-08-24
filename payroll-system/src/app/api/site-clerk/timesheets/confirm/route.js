import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();

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

    // 1. Create or Update Daily Site Roster Parent Record
    const { data: rosterRecord, error: rosterErr } = await supabase
      .from('daily_site_rosters')
      .upsert(
        {
          site_name: siteName,
          shift_date: shiftDate,
          timesheet_file_url: documentUrl,
          status: 'draft',
          total_workers: rawWorkers.length,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'site_name, shift_date' }
      )
      .select('id')
      .single();

    const dailyRosterId = rosterRecord?.id || null;

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
            employee_code: worker.employee_code || `WALKON-${nationalId || Date.now().toString().slice(-4)}`,
            assigned_site: siteName,
            status: 'Active',
          })
          .select('id')
          .single();

        if (newEmp) {
          employeeId = newEmp.id;
        }
      }

      // Calculate Reg & Overtime Hours (Standard 8h Shift Split)
      const regHours = Number(worker.regular_hours ?? worker.regHours ?? 8.0);
      const otHours = Number(worker.overtime_hours ?? worker.otHours ?? 0.0);
      const totalHours = regHours + otHours;

      processedLogs.push({
        daily_roster_id: dailyRosterId,
        employee_id: employeeId,
        site_name: siteName,
        shift_date: shiftDate,
        time_in: worker.timeInStr || worker.timeIn || '07:00 AM',
        time_out: worker.timeOutStr || worker.timeOut || '04:00 PM',
        regular_hours: regHours,
        overtime_hours: otHours,
        total_hours: totalHours,
        is_late: Boolean(worker.warnings?.is_late || worker.isLate || false),
        status: 'Pending Entry', // Allows clerk to edit on Roster Dashboard before HR submission
      });
    }

    // Clear existing logs for this site and date to prevent duplicate key constraint crashes
    await supabase
      .from('shift_logs')
      .delete()
      .eq('site_name', siteName)
      .eq('shift_date', shiftDate);

    // Insert batch shift logs
    const { error: logError } = await supabase
      .from('shift_logs')
      .insert(processedLogs);

    if (logError) {
      console.error('Shift Log DB Error:', logError.message);
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `/site-clerk/roster?site=${encodeURIComponent(siteName)}&date=${shiftDate}`,
      message: `Successfully recorded ${rawWorkers.length} shift logs for ${siteName}.`,
    });
  } catch (err) {
    console.error('Confirmation Handler Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}