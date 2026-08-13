import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch normalized employees with active contracts, site info, and banking
export async function GET() {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        full_name,
        national_id,
        email,
        status,
        employment_contracts (
          job_title,
          hourly_rate,
          sites ( site_name )
        ),
        employee_banking (
          bank_name,
          account_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (employees || []).map((emp) => {
      // Get the latest active contract
      const contract = Array.isArray(emp.employment_contracts)
        ? emp.employment_contracts[0] || {}
        : emp.employment_contracts || {};

      const siteName = contract.sites?.site_name || 'Unassigned';
      const banking = Array.isArray(emp.employee_banking)
        ? emp.employee_banking[0] || {}
        : emp.employee_banking || {};

      return {
        id: emp.id,
        employee_code: emp.employee_code || null,
        name: emp.full_name,
        nationalId: emp.national_id || '',
        email: emp.email || '',
        role: contract.job_title || 'Unassigned Role',
        site: siteName,
        rate: contract.hourly_rate ? Number(contract.hourly_rate) : 0,
        formatted_rate: `BWP ${parseFloat(contract.hourly_rate || 0).toFixed(2)}/hr`,
        status: emp.status || 'Active',
        bankName: banking.bank_name || '',
        accountNumber: banking.account_number || '',
      };
    });

    return NextResponse.json({ success: true, data: formattedData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve employee records' },
      { status: 500 }
    );
  }
}

// POST: Real-world Insert into relational tables without hardcoded fallbacks
export async function POST(request) {
  let createdEmployeeId = null;

  try {
    const body = await request.json();
    const {
      name,
      role,
      site,
      rate,
      nationalId,
      bankName,
      accountNumber,
      email,
      employeeCode,
    } = body;

    // Direct validation against required real user input
    if (!name?.trim() || !site?.trim() || !role?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full Name, Job Title, and Site Location are required.' },
        { status: 400 }
      );
    }

    const cleanRate = parseFloat(rate) || 0;

    // 1. Insert Core Employee Record
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .insert([
        {
          full_name: name.trim(),
          national_id: nationalId?.trim() || null,
          email: email?.trim() || null,
          employee_code: employeeCode?.trim() || null,
          status: 'Active',
        },
      ])
      .select()
      .single();

    if (empError) throw empError;
    createdEmployeeId = empData.id;

    // 2. Resolve Site ID (Find existing or dynamically create site entry)
    let siteId = null;
    const { data: existingSite } = await supabase
      .from('sites')
      .select('id')
      .ilike('site_name', site.trim())
      .maybeSingle();

    if (existingSite) {
      siteId = existingSite.id;
    } else {
      const { data: newSite, error: siteError } = await supabase
        .from('sites')
        .insert([{ site_name: site.trim() }])
        .select('id')
        .single();

      if (siteError) throw siteError;
      siteId = newSite.id;
    }

    // 3. Create Employment Contract Relationship
    const { error: contractError } = await supabase
      .from('employment_contracts')
      .insert([
        {
          employee_id: createdEmployeeId,
          site_id: siteId,
          job_title: role.trim(),
          hourly_rate: cleanRate,
        },
      ]);

    if (contractError) throw contractError;

    // 4. Save Banking Details (Only if user actually provided them)
    if (bankName?.trim() || accountNumber?.trim()) {
      const { error: bankingError } = await supabase
        .from('employee_banking')
        .insert([
          {
            employee_id: createdEmployeeId,
            bank_name: bankName?.trim() || null,
            account_number: accountNumber?.trim() || null,
          },
        ]);

      if (bankingError) throw bankingError;
    }

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: empData.id,
          employee_code: empData.employee_code,
          name: empData.full_name,
          role: role.trim(),
          site: site.trim(),
          rate: cleanRate,
          formatted_rate: `BWP ${cleanRate.toFixed(2)}/hr`,
          status: empData.status,
          contact: empData.email || empData.national_id || '',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in employee registration pipeline:', error);

    // Rollback core employee record if subsequent relation inserts fail
    if (createdEmployeeId) {
      await supabase.from('employees').delete().eq('id', createdEmployeeId);
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete employee creation.' },
      { status: 500 }
    );
  }
}