import { NextResponse } from 'next/server';
import { requireSiteClerk } from '@/lib/auth/requireSiteClerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteClerkContext } from '@/lib/site-clerk/getSiteContext';

function botswanaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Gaborone',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET() {
  const access = await requireSiteClerk('employees.view_site');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const db = createSupabaseAdminClient();
    const context = await getSiteClerkContext(db, access.user.id);

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'No active site is assigned to your Site Clerk account. Contact the System Administrator.' },
        { status: 409 }
      );
    }

    const today = botswanaDate();
    const { data: assignmentRows, error: assignmentError } = await db
      .from('employee_site_assignments')
      .select('employee_id')
      .eq('site_id', context.site.id)
      .eq('is_active', true);
    if (assignmentError) throw assignmentError;

    const employeeIds = (assignmentRows || []).map((row) => row.employee_id);
    let activeWorkers = 0;

    if (employeeIds.length > 0) {
      const { count, error } = await db
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .in('id', employeeIds)
        .eq('status', 'Active');
      if (error) throw error;
      activeWorkers = count || 0;
    }

    const { data: roster, error: rosterError } = await db
      .from('daily_site_rosters')
      .select('id, shift_date, status, submitted_at, rejection_reason, updated_at')
      .eq('site_id', context.site.id)
      .eq('shift_date', today)
      .maybeSingle();
    if (rosterError) throw rosterError;

    let enteredWorkers = 0;
    let totalHours = 0;

    if (roster?.id) {
      const { data: entries, error: entryError } = await db
        .from('shift_logs')
        .select('worked_hours')
        .eq('daily_roster_id', roster.id);
      if (entryError) throw entryError;
      enteredWorkers = entries?.length || 0;
      totalHours = (entries || []).reduce((sum, row) => sum + Number(row.worked_hours || 0), 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        clerk: access.profile,
        site: context.site,
        today,
        roster: roster || null,
        metrics: {
          assignedWorkers: activeWorkers,
          enteredWorkers,
          missingEntries: Math.max(activeWorkers - enteredWorkers, 0),
          totalHours: Math.round(totalHours * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Site Clerk dashboard GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load Site Clerk dashboard.' }, { status: 500 });
  }
}
