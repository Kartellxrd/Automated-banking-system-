import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Added !left to enforce a LEFT JOIN so no records get dropped
    let query = supabase
      .from('compliance_records')
      .select(`
        id,
        display_id,
        logged_hours,
        timesheet_rate,
        compliance_status,
        cert_status,
        cert_expiry,
        pay_code,
        mismatch_details,
        employees!compliance_records_employee_id_fkey!left (
          employee_code,
          first_name,
          last_name,
          job_role,
          hourly_rate
        ),
        sites!compliance_records_site_id_fkey!left (
          site_name,
          location
        )
      `);

    if (status && status !== 'All') {
      query = query.eq('compliance_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log(`[Compliance API] Raw records count:`, data?.length);

    let formattedRecords = (data || []).map((item) => {
      const emp = Array.isArray(item.employees) ? item.employees[0] : item.employees;
      const site = Array.isArray(item.sites) ? item.sites[0] : item.sites;

      const firstName = emp?.first_name || '';
      const lastName = emp?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Employee';
      const contractRate = emp?.hourly_rate ? Number(emp.hourly_rate) : 0;

      return {
        id: item.id,
        displayId: item.display_id || 'N/A',
        workerName: fullName,
        workerId: emp?.employee_code || 'N/A',
        jobTitle: emp?.job_role || 'General Staff',
        site: site?.site_name ? `${site.site_name} (${site.location || 'N/A'})` : 'Unassigned Site',
        loggedHours: item.logged_hours || 0,
        contractRate: `BWP ${contractRate.toFixed(2)}/hr`,
        timesheetRate: `BWP ${Number(item.timesheet_rate || 0).toFixed(2)}/hr`,
        complianceStatus: item.compliance_status || 'Matched',
        certStatus: item.cert_status || 'Valid',
        certExpiry: item.cert_expiry || 'N/A',
        payCode: item.pay_code || 'REG-01',
        mismatchDetails: item.mismatch_details || null,
      };
    });

    if (search) {
      const term = search.toLowerCase();
      formattedRecords = formattedRecords.filter(
        (rec) =>
          rec.workerName.toLowerCase().includes(term) ||
          rec.workerId.toLowerCase().includes(term) ||
          rec.site.toLowerCase().includes(term) ||
          rec.jobTitle.toLowerCase().includes(term)
      );
    }

    return NextResponse.json({ success: true, data: formattedRecords }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { id, action } = await request.json();

    if (action === 'FORCE_ALIGN') {
      const { error } = await supabase
        .from('compliance_records')
        .update({
          compliance_status: 'Matched',
          mismatch_details: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json(
        { success: true, message: 'Compliance record aligned successfully' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}