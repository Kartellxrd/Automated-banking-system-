import { NextResponse } from 'next/server';
import { requireHR } from '@/lib/auth/requireHR';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ALLOWED_STATUSES = new Set(['submitted_to_hr', 'approved', 'rejected']);

export async function GET(request) {
  const access = await requireHR('rosters.review');
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const siteId = searchParams.get('site_id');
    const date = searchParams.get('date');

    const db = createSupabaseAdminClient();

    const { data: sites, error: sitesError } = await db
      .from('sites')
      .select('id, site_name, location, is_active')
      .eq('is_active', true)
      .order('site_name');
    if (sitesError) throw sitesError;

    let query = db
      .from('daily_site_rosters')
      .select('id, site_id, shift_date, status, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_reason, version, updated_at')
      .in('status', ['submitted_to_hr', 'approved', 'rejected'])
      .order('shift_date', { ascending: false })
      .order('submitted_at', { ascending: false, nullsFirst: false });

    if (status && status !== 'all') {
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ success: false, error: 'Invalid roster status filter.' }, { status: 400 });
      }
      query = query.eq('status', status);
    }
    if (siteId && siteId !== 'all') query = query.eq('site_id', siteId);
    if (date) query = query.eq('shift_date', date);

    const { data: rosters, error: rosterError } = await query.limit(250);
    if (rosterError) throw rosterError;

    const rows = rosters || [];
    const rosterIds = rows.map((row) => row.id);
    const actorIds = [...new Set(rows.flatMap((row) => [row.submitted_by, row.reviewed_by]).filter(Boolean))];

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
    if (actorIds.length) {
      const { data, error } = await db
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', actorIds);
      if (error) throw error;
      profiles = data || [];
    }

    const siteMap = new Map((sites || []).map((site) => [site.id, site]));
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const totalsMap = new Map();
    for (const shift of shifts) {
      const current = totalsMap.get(shift.daily_roster_id) || { workers: 0, regular: 0, overtime: 0, worked: 0 };
      current.workers += 1;
      current.regular += Number(shift.regular_hours || 0);
      current.overtime += Number(shift.overtime_hours || 0);
      current.worked += Number(shift.worked_hours || 0);
      totalsMap.set(shift.daily_roster_id, current);
    }

    const formatActor = (id) => {
      const profile = profileMap.get(id);
      if (!profile) return null;
      return {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
        email: profile.email,
      };
    };

    const data = rows.map((roster) => {
      const site = siteMap.get(roster.site_id);
      const totals = totalsMap.get(roster.id) || { workers: 0, regular: 0, overtime: 0, worked: 0 };
      return {
        ...roster,
        site: site || null,
        submitted_by_user: formatActor(roster.submitted_by),
        reviewed_by_user: formatActor(roster.reviewed_by),
        totals: {
          workers: totals.workers,
          regular_hours: Number(totals.regular.toFixed(2)),
          overtime_hours: Number(totals.overtime.toFixed(2)),
          worked_hours: Number(totals.worked.toFixed(2)),
        },
      };
    });

    return NextResponse.json({ success: true, data, sites: sites || [] });
  } catch (error) {
    console.error('HR roster queue error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load roster review queue.' }, { status: 500 });
  }
}
