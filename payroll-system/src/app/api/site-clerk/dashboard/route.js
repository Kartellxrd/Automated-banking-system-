import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteParam = searchParams.get('site');

    // 1. Fetch sites using the correct schema column: site_name
    const { data: rawSites, error: sitesError } = await supabase
      .from('sites')
      .select('id, site_name, location')
      .order('site_name', { ascending: true });

    if (sitesError) {
      console.error('API Error fetching sites:', sitesError.message);
      return NextResponse.json({ error: sitesError.message }, { status: 500 });
    }

    // Map site_name to name for consistent frontend rendering
    const sites = rawSites?.map((site) => ({
      id: site.id,
      name: site.site_name,
      location: site.location,
    })) || [];

    // Determine target site name
    const selectedSite = siteParam || (sites[0]?.name ?? '');

    let metrics = {
      activeWorkers: 0,
      lateArrivals: 0,
      pendingDocs: 0,
      totalHours: 0,
    };

    if (selectedSite) {
      // 2. Query pending timesheets for selected site
      const { count: pendingCount } = await supabase
        .from('timesheets')
        .select('id', { count: 'exact', head: true })
        .eq('site_name', selectedSite)
        .eq('status', 'pending');

      // 3. Query shift logs metrics for selected site
      const { data: logs } = await supabase
        .from('shift_logs')
        .select('total_hours, is_late')
        .eq('site_name', selectedSite);

      const totalHoursSum = logs?.reduce((acc, log) => acc + (log.total_hours || 0), 0) || 0;
      const lateCount = logs?.filter((log) => log.is_late).length || 0;

      metrics = {
        activeWorkers: logs?.length || 0,
        lateArrivals: lateCount,
        pendingDocs: pendingCount || 0,
        totalHours: totalHoursSum,
      };
    }

    return NextResponse.json({
      sites,
      selectedSite,
      metrics,
    });
  } catch (err) {
    console.error('Dashboard Route Handler Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}