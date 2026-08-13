import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch employees safely with existing schema
export async function GET() {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        first_name,
        last_name,
        national_id,
        phone,
        email,
        status,
        employment_contracts (
          job_title,
          hourly_rate,
          sites ( site_name )
        ),
        employee_banking (
          bank_name,
          account_number,
          branch_code,
          payment_channel,
          mobile_provider,
          mobile_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (employees || []).map((emp) => {
      const contract = Array.isArray(emp.employment_contracts)
        ? emp.employment_contracts[0] || {}
        : emp.employment_contracts || {};

      const siteName = contract.sites?.site_name || 'Unassigned';
      const banking = Array.isArray(emp.employee_banking)
        ? emp.employee_banking[0] || {}
        : emp.employee_banking || {};

      const computedFullName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || 'Unnamed Employee';

      return {
        id: emp.id,
        employee_code: emp.employee_code || null,
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        name: computedFullName,
        nationalId: emp.national_id || '',
        phone: emp.phone || '',
        email: emp.email || '',
        role: contract.job_title || 'Unassigned Role',
        site: siteName,
        rate: contract.hourly_rate ? Number(contract.hourly_rate) : 0,
        formatted_rate: `BWP ${parseFloat(contract.hourly_rate || 0).toFixed(2)}/hr`,
        status: emp.status || 'Active',
        paymentChannel: banking.payment_channel || 'EFT',
        bankName: banking.bank_name || '',
        accountNumber: banking.account_number || '',
        branchCode: banking.branch_code || '',
        mobileProvider: banking.mobile_provider || '',
        mobileNumber: banking.mobile_number || '',
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

// POST: Real-world Insert with isolated rollback on failure
export async function POST(request) {
  let createdEmployeeId = null;

  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      nationalId,
      phone,
      email,
      employeeCode,
      role,
      site,
      rate,
      paymentChannel,
      bankName,
      accountNumber,
      branchCode,
      mobileProvider,
      mobileNumber,
    } = body;

    const finalFirstName = first_name?.trim() || '';
    const finalLastName = last_name?.trim() || '';

    if (!finalFirstName || !finalLastName || !site?.trim() || !role?.trim()) {
      return NextResponse.json(
        { success: false, error: 'First Name, Last Name, Job Title, and Site Location are required.' },
        { status: 400 }
      );
    }

    const cleanRate = parseFloat(rate) || 0;

    // 1. Insert Core Employee Record
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .insert([
        {
          first_name: finalFirstName,
          last_name: finalLastName,
          national_id: nationalId?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          employee_code: employeeCode?.trim() || null,
          status: 'Active',
        },
      ])
      .select()
      .single();

    if (empError) throw empError;
    createdEmployeeId = empData.id;

    // 2. Resolve Site ID
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

    // 3. Create Employment Contract
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

    // 4. Save Banking / Mobile Money details
    const selectedChannel = paymentChannel || 'EFT';
    const bankingPayload = {
      employee_id: createdEmployeeId,
      bank_name: selectedChannel === 'EFT' ? bankName?.trim() || null : null,
      account_number: selectedChannel === 'EFT' ? accountNumber?.trim() || null : null,
    };

    // Include extra channels if columns exist
    if (branchCode) bankingPayload.branch_code = branchCode.trim();
    if (selectedChannel === 'MOBILE_MONEY') {
      bankingPayload.mobile_provider = mobileProvider?.trim() || null;
      bankingPayload.mobile_number = mobileNumber?.trim() || null;
    }
    bankingPayload.payment_channel = selectedChannel;

    const { error: bankingError } = await supabase
      .from('employee_banking')
      .insert([bankingPayload]);

    if (bankingError) console.warn('Non-fatal banking error:', bankingError);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: empData.id,
          employee_code: empData.employee_code,
          first_name: empData.first_name,
          last_name: empData.last_name,
          name: `${empData.first_name} ${empData.last_name}`,
          role: role.trim(),
          site: site.trim(),
          rate: cleanRate,
          formatted_rate: `BWP ${cleanRate.toFixed(2)}/hr`,
          status: empData.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in employee registration pipeline:', error);

    if (createdEmployeeId) {
      await supabase.from('employees').delete().eq('id', createdEmployeeId);
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete employee creation.' },
      { status: 500 }
    );
  }
}