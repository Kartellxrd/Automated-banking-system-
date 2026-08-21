import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteParam = searchParams.get('site');

    // 1. Fetch available sites
    const { data: rawSites, error: sitesError } = await supabase
      .from('sites')
      .select('id, site_name, location')
      .order('site_name', { ascending: true });

    if (sitesError) {
      console.error('API Error fetching sites:', sitesError.message);
      return NextResponse.json({ error: sitesError.message }, { status: 500 });
    }

    const sites = rawSites?.map((site) => ({
      id: site.id,
      name: site.site_name,
      location: site.location,
    })) || [];

    // Determine target site
    const currentSiteObj = sites.find((s) => s.name === siteParam) || sites[0];
    const selectedSite = currentSiteObj?.name || siteParam || '';
    const selectedSiteId = currentSiteObj?.id || null;

    let metrics = {
      activeWorkers: 0,
      lateArrivals: 0,
      pendingDocs: 0,
      totalHours: 0,
    };

    if (selectedSite) {
      // 2. Query total assigned active employees for the selected site
      let empQuery = supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');

      if (selectedSiteId) {
        empQuery = empQuery.or(`assigned_site.eq.${selectedSite},primary_site_id.eq.${selectedSiteId}`);
      } else {
        empQuery = empQuery.eq('assigned_site', selectedSite);
      }

      const { count: workerCount, error: empError } = await empQuery;

      if (empError) {
        console.error('Error fetching employee metrics:', empError.message);
      }

      // 3. Query pending timesheets for selected site
      const { count: pendingCount } = await supabase
        .from('timesheets')
        .select('id', { count: 'exact', head: true })
        .eq('site_name', selectedSite)
        .eq('status', 'pending');

      // 4. Query shift logs metrics for selected site
      const { data: logs } = await supabase
        .from('shift_logs')
        .select('regular_hours, overtime_hours, total_hours, is_late')
        .eq('site_name', selectedSite);

      const totalHoursSum = logs?.reduce((acc, log) => {
        const reg = Number(log.regular_hours) || 0;
        const ot = Number(log.overtime_hours) || 0;
        const tot = Number(log.total_hours) || (reg + ot);
        return acc + tot;
      }, 0) || 0;

      const lateCount = logs?.filter((log) => log.is_late === true).length || 0;

      metrics = {
        activeWorkers: workerCount || 0,
        lateArrivals: lateCount,
        pendingDocs: pendingCount || 0,
        totalHours: Math.round(totalHoursSum * 10) / 10,
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