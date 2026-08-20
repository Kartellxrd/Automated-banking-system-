import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET /api/hr/complaince/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: item, error } = await supabase
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
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching compliance record ${id}:`, error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json({ success: false, error: 'Compliance record not found' }, { status: 404 });
    }

    const emp = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    const site = Array.isArray(item.sites) ? item.sites[0] : item.sites;

    const firstName = emp?.first_name || '';
    const lastName = emp?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Employee';
    const contractRate = emp?.hourly_rate ? Number(emp.hourly_rate) : 0;

    const formattedRecord = {
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

    return NextResponse.json({ success: true, data: formattedRecord }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch compliance record' },
      { status: 500 }
    );
  }
}

// PATCH /api/hr/complaince/[id]
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const { data, error } = await supabase
      .from('compliance_records')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: `Record ${id} updated successfully`, data },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error updating compliance record:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update compliance record' },
      { status: 500 }
    );
  }
}

// DELETE /api/hr/complaince/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('compliance_records')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: `Compliance record ${id} removed successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting compliance record:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete record' },
      { status: 500 }
    );
  }
}