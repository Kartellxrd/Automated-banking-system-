import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch active personnel count
    const { count: activePersonnel, error: personnelErr } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true });

    if (personnelErr) console.warn('Personnel count warning:', personnelErr.message);

    // 2. Fetch pending site roster batches with clerk & site metadata
    const { data: rosterData, error: rosterErr } = await supabase
      .from('daily_site_rosters')
      .select(`
        id,
        site_id,
        clerk_id,
        roster_date,
        status,
        total_workers,
        timesheet_file_url,
        created_at,
        sites ( site_name, location ),
        profiles ( full_name, email ),
        daily_roster_entries (
          id,
          employee_id,
          regular_hours,
          overtime_hours,
          status,
          employees ( full_name, employee_code, position )
        )
      `)
      .in('status', ['submitted', 'pending_hr_review', 'flagged'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (rosterErr) throw new Error(`Rosters fetch failed: ${rosterErr.message}`);

    // 3. Fetch unverified individual shift logs
    const { data: shiftData, error: shiftErr } = await supabase
      .from('shift_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (shiftErr) throw new Error(`Shifts fetch failed: ${shiftErr.message}`);

    // 4. Format roster batches with aggregated hours & safe backups
    const formattedPendingRosters = (rosterData || []).map((roster) => {
      const entries = roster.daily_roster_entries || [];

      // Calculate total regular and overtime hours for the batch
      const totalRegHours = entries.reduce((sum, e) => sum + Number(e.regular_hours || 0), 0);
      const totalOtHours = entries.reduce((sum, e) => sum + Number(e.overtime_hours || 0), 0);

      const siteName = roster.sites?.site_name || 'Unassigned Site';
      const rosterDate = roster.roster_date || new Date(roster.created_at).toLocaleDateString();

      return {
        id: String(roster.id),
        // Primary properties matching client component expectations
        site_name: siteName,
        shift_date: rosterDate,
        total_workers: roster.total_workers || entries.length || 0,
        total_regular_hours: totalRegHours,
        total_overtime_hours: totalOtHours,
        status: roster.status || 'submitted',
        timesheet_file_url: roster.timesheet_file_url || null,

        // Additional camelCase metadata
        rosterDate,
        submittedAt: roster.created_at,
        siteName,
        siteLocation: roster.sites?.location || 'Unknown Location',
        clerkName: roster.profiles?.full_name || roster.profiles?.email || 'Field Clerk',
        entries: entries.map((entry) => ({
          id: String(entry.id),
          employeeId: entry.employee_id,
          employeeName: entry.employees?.full_name || 'Unknown Employee',
          employeeCode: entry.employees?.employee_code || 'N/A',
          position: entry.employees?.position || 'General Worker',
          regularHours: entry.regular_hours || 8,
          overtimeHours: entry.overtime_hours || 0,
          status: entry.status || 'PENDING',
        })),
      };
    });

    // 5. Transform individual shift queue
    const formattedQueue = (shiftData || []).map((shift) => ({
      id: String(shift.id),
      worker: shift.worker_name || shift.employee_name || 'Field Worker',
      site: shift.site_location || shift.site_name || 'Unassigned Site',
      type: `${shift.regular_hours || 8}h Reg / ${shift.overtime_hours || 0}h OT`,
      date: shift.shift_date || new Date(shift.created_at).toLocaleDateString(),
      status: shift.status || 'PENDING',
    }));

    // 6. Calculate metrics
    const pendingRostersCount = formattedPendingRosters.length;
    const pendingShiftsCount = formattedQueue.filter(
      (s) => String(s.status).toUpperCase() === 'PENDING'
    ).length;

    const readyForStaging = formattedQueue.filter(
      (s) => String(s.status).toUpperCase() === 'APPROVED'
    ).length;

    const totalItems = pendingShiftsCount + readyForStaging;
    const readinessPercentage =
      totalItems > 0 ? Math.round((readyForStaging / totalItems) * 100) : 100;

    return NextResponse.json({
      success: true,
      stats: {
        activePersonnel: activePersonnel || 0,
        pendingRostersCount,
        pendingReviews: pendingShiftsCount,
        readyForStaging,
        unmatchedRates: 0,
        readinessPercentage,
      },
      pendingRosters: formattedPendingRosters,
      pendingQueue: formattedQueue,
    });
  } catch (err) {
    console.error('HR Dashboard GET error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Database fetch failed' },
      { status: 500 }
    );
  }
}