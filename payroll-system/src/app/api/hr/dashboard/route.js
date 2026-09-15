import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireHR('rosters.review');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const db = createSupabaseAdminClient();

    const [employeesResult, sitesResult, rostersResult] = await Promise.all([
      db.from('employees').select('id, status'),
      db.from('sites').select('id, site_name, location, is_active').eq('is_active', true).order('site_name'),
      db.from('daily_site_rosters')
        .select('id, site_id, shift_date, status, submitted_by, submitted_at, reviewed_at, version, rejection_reason')
        .in('status', ['submitted_to_hr', 'approved', 'rejected'])
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(50),
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (sitesResult.error) throw sitesResult.error;
    if (rostersResult.error) throw rostersResult.error;

    const employees = employeesResult.data || [];
    const sites = sitesResult.data || [];
    const rosters = rostersResult.data || [];
    const siteMap = new Map(sites.map((site) => [site.id, site]));

    const rosterIds = rosters.map((row) => row.id);
    const submitterIds = [...new Set(rosters.map((row) => row.submitted_by).filter(Boolean))];

    let shifts = [];
    let profiles = [];

    if (rosterIds.length) {
      const { data, error } = await db
        .from('shift_logs')
        .select('daily_roster_id, regular_hours, overtime_hours, worked_hours')
        .in('daily_roster_id', rosterIds);
      if (error) throw error;
      shifts = data || [];
    }

    if (submitterIds.length) {
      const { data, error } = await db
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', submitterIds);
      if (error) throw error;
      profiles = data || [];
    }

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const shiftMap = new Map();
    for (const shift of shifts) {
      const current = shiftMap.get(shift.daily_roster_id) || { count: 0, regular: 0, overtime: 0, worked: 0 };
      current.count += 1;
      current.regular += Number(shift.regular_hours || 0);
      current.overtime += Number(shift.overtime_hours || 0);
      current.worked += Number(shift.worked_hours || 0);
      shiftMap.set(shift.daily_roster_id, current);
    }

    const formatted = rosters.map((roster) => {
      const site = siteMap.get(roster.site_id);
      const submitter = profileMap.get(roster.submitted_by);
      const totals = shiftMap.get(roster.id) || { count: 0, regular: 0, overtime: 0, worked: 0 };
      return {
        id: roster.id,
        site_id: roster.site_id,
        site_name: site?.site_name || 'Unknown Site',
        site_location: site?.location || '',
        shift_date: roster.shift_date,
        status: roster.status,
        submitted_at: roster.submitted_at,
        submitted_by_name: submitter ? `${submitter.first_name || ''} ${submitter.last_name || ''}`.trim() || submitter.email : 'Unknown Site Clerk',
        version: roster.version,
        rejection_reason: roster.rejection_reason,
        total_workers: totals.count,
        total_regular_hours: Number(totals.regular.toFixed(2)),
        total_overtime_hours: Number(totals.overtime.toFixed(2)),
        total_worked_hours: Number(totals.worked.toFixed(2)),
      };
    });

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Gaborone', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());

    return NextResponse.json({
      success: true,
      data: {
        hr: access.profile,
        today,
        sites,
        stats: {
          active_employees: employees.filter((employee) => employee.status === 'Active').length,
          pending_rosters: formatted.filter((roster) => roster.status === 'submitted_to_hr').length,
          approved_rosters: formatted.filter((roster) => roster.status === 'approved').length,
          rejected_rosters: formatted.filter((roster) => roster.status === 'rejected').length,
          active_sites: sites.length,
        },
        pending_rosters: formatted.filter((roster) => roster.status === 'submitted_to_hr').slice(0, 10),
        recent_rosters: formatted.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('HR dashboard error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load the HR dashboard.' }, { status: 500 });
  }
}
