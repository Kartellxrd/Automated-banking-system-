import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function to convert "07:00 AM" and shift date into ISO Timestamps
function parseToISO(timeStr, dateStr) {
  if (!timeStr || timeStr === '--:--') return null;
  if (timeStr.includes('T')) return timeStr;

  try {
    const cleanTime = timeStr.trim();
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

    if (!match) return null;

    let [, hours, minutes, period] = match;
    hours = parseInt(hours, 10);

    if (period) {
      period = period.toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return new Date(`${dateStr}T${formattedHours}:${formattedMinutes}:00Z`).toISOString();
  } catch (e) {
    console.error('Time parsing error:', e);
    return null;
  }
}

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
    let dailyRosterId = null;
    try {
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
        .maybeSingle();

      if (!rosterErr && rosterRecord) {
        dailyRosterId = rosterRecord.id;
      }
    } catch (e) {
      console.warn('Daily roster parent creation skipped:', e.message);
    }

    const processedLogs = [];

    // 2. Map workers and parse time strings to ISO timestamps
    for (const worker of rawWorkers) {
      let employeeId = worker.employee_id || worker.employeeId || worker.id || null;
      const workerName = worker.worker_name || worker.workerName || worker.name || 'Unknown Worker';
      const nationalId = worker.national_id || worker.idNumber || null;

      if (worker.is_unregistered || !employeeId) {
        const [firstName, ...lastNameParts] = workerName.trim().split(' ');
        const lastName = lastNameParts.join(' ') || 'Worker';

        const { data: newEmp } = await supabase
          .from('employees')
          .insert({
            first_name: firstName,
            last_name: lastName,
            national_id: nationalId,
            employee_code: worker.employee_code || `WALKON-${Date.now().toString().slice(-4)}`,
            assigned_site: siteName,
            status: 'Active',
          })
          .select('id')
          .single();

        if (newEmp) {
          employeeId = newEmp.id;
        }
      }

      const regHours = Number(worker.regular_hours ?? worker.regHours ?? 8.0);
      const otHours = Number(worker.overtime_hours ?? worker.otHours ?? 0.0);

      const rawIn = worker.timeInStr || worker.timeIn || '07:00 AM';
      const rawOut = worker.timeOutStr || worker.timeOut || '04:00 PM';

      const logItem = {
        employee_id: employeeId,
        site_location: siteName,
        shift_date: shiftDate,
        clock_in: parseToISO(rawIn, shiftDate),
        clock_out: parseToISO(rawOut, shiftDate),
        regular_hours: regHours,
        overtime_hours: otHours,
        status: 'pending', // Validated enum value matching shift_status type
      };

      if (dailyRosterId) {
        logItem.daily_roster_id = dailyRosterId;
      }

      processedLogs.push(logItem);
    }

    // 3. Clear existing logs for this site and date
    if (dailyRosterId) {
      await supabase
        .from('shift_logs')
        .delete()
        .eq('daily_roster_id', dailyRosterId);
    } else {
      await supabase
        .from('shift_logs')
        .delete()
        .eq('site_location', siteName)
        .eq('shift_date', shiftDate);
    }

    // 4. Batch Insert Into shift_logs
    const { error: logError } = await supabase
      .from('shift_logs')
      .insert(processedLogs);

    if (logError) {
      console.error('Shift Log DB Insert Error:', logError.message);

      if (logError.message?.includes('daily_roster_id')) {
        const strippedLogs = processedLogs.map(({ daily_roster_id, ...rest }) => rest);
        const { error: fallbackErr } = await supabase
          .from('shift_logs')
          .insert(strippedLogs);

        if (fallbackErr) {
          return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: logError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `/dashboard/site-clerk/roster?site=${encodeURIComponent(siteName)}&date=${shiftDate}`,
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