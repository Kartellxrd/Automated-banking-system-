import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

<<<<<<< Updated upstream
// GET: Fetch employees with contracts and banking info
=======
// GET: Fetch employees with active contracts and payment details
>>>>>>> Stashed changes
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
        created_at,
        employment_contracts (
          job_title,
          hourly_rate,
          sites ( site_name )
        ),
        employee_banking (
          payment_method,
          bank_name,
          account_number,
          branch_code,
<<<<<<< Updated upstream
          payment_channel,
          mobile_provider,
=======
>>>>>>> Stashed changes
          mobile_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (employees || []).map((emp) => {
<<<<<<< Updated upstream
=======
      // Extract contract details
>>>>>>> Stashed changes
      const contract = Array.isArray(emp.employment_contracts)
        ? emp.employment_contracts[0] || {}
        : emp.employment_contracts || {};

<<<<<<< Updated upstream
      const siteName = contract.sites?.site_name || 'Unassigned';
      
      const bankingRecords = Array.isArray(emp.employee_banking) 
        ? emp.employee_banking 
        : [emp.employee_banking || {}];
      const banking = bankingRecords[bankingRecords.length - 1] || {};

      const computedFullName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || 'Unnamed Employee';
      const rawChannel = banking.payment_channel || banking.paymentChannel || 'EFT';
=======
      // Extract banking/payout details
      const banking = Array.isArray(emp.employee_banking)
        ? emp.employee_banking[0] || {}
        : emp.employee_banking || {};

      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
      const rate = Number(contract.rate_amount || 0);
      const paymentMethod = banking.payment_method || 'BANK';
>>>>>>> Stashed changes

      return {
        id: emp.id,
        employee_code: emp.employee_code || null,
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        name: computedFullName,
        nationalId: emp.national_id || '',
<<<<<<< Updated upstream
        phone: emp.phone || '',
        email: emp.email || '',
        role: contract.job_title || 'Unassigned Role',
        site: siteName,
        rate: contract.hourly_rate ? Number(contract.hourly_rate) : 0,
        formatted_rate: `BWP ${parseFloat(contract.hourly_rate || 0).toFixed(2)}/hr`,
        status: emp.status || 'Active',
        paymentChannel: rawChannel,
        bankName: banking.bank_name || '',
        accountNumber: banking.account_number || '',
        branchCode: banking.branch_code || '',
        mobileProvider: banking.mobile_provider || '',
        mobileNumber: banking.mobile_number || '',
=======
        site: emp.sites?.site_name || 'Unassigned',
        contract_type: contract.contract_type || 'CASUAL',
        rate: rate,
        formatted_rate: `BWP ${rate.toFixed(2)}/hr`,
        status: emp.status || 'ACTIVE',
        paymentMethod: paymentMethod,
        bankName: paymentMethod === 'BANK' ? (banking.bank_name || '') : '',
        accountNumber: paymentMethod === 'BANK' ? (banking.account_number || '') : '',
        mobileNumber: paymentMethod !== 'BANK' ? (banking.mobile_number || '') : '',
        payoutDetailsDisplay:
          paymentMethod === 'BANK'
            ? `${banking.bank_name || 'Bank'} (${banking.account_number || 'N/A'})`
            : `${paymentMethod.replace('_', ' ')} (${banking.mobile_number || 'N/A'})`,
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
// POST: Add new employee with payment channel fallbacks
=======
// POST: Register new employee with contract & payment details
>>>>>>> Stashed changes
export async function POST(request) {
  let createdEmployeeId = null;

  try {
    const body = await request.json();
<<<<<<< Updated upstream
    
    const first_name = body.first_name || body.firstName;
    const last_name = body.last_name || body.lastName;
    const nationalId = body.nationalId || body.national_id;
    const phone = body.phone;
    const email = body.email;
    const employeeCode = body.employeeCode || body.employee_code;
    const role = body.role || body.job_title;
    const site = body.site || body.site_name;
    const rate = body.rate || body.hourly_rate;

    const paymentChannel = body.paymentChannel || body.payment_channel || body.paymentMethod || body.payment_method || 'EFT';
    
    const bankName = body.bankName || body.bank_name;
    const accountNumber = body.accountNumber || body.account_number;
    const branchCode = body.branchCode || body.branch_code;
    const mobileProvider = body.mobileProvider || body.mobile_provider;
    const mobileNumber = body.mobileNumber || body.mobile_number;

    const finalFirstName = first_name?.trim() || '';
    const finalLastName = last_name?.trim() || '';

    if (!finalFirstName || !finalLastName || !site?.toString().trim() || !role?.toString().trim()) {
=======
    const {
      firstName,
      lastName,
      nationalId,
      phone,
      department,
      siteId,
      jobTitle,
      contractType,
      payRateType,
      rate,
      paymentMethod = 'BANK', // 'BANK', 'ORANGE_MONEY', 'MYZAKA', 'SMEGA', 'EWALLET'
      bankName,
      accountNumber,
      branchCode,
      mobileNumber
    } = body;

    // 1. Core Field Validation
    if (!firstName?.trim() || !lastName?.trim()) {
>>>>>>> Stashed changes
      return NextResponse.json(
        { success: false, error: 'First Name, Last Name, Job Title, and Site Location are required.' },
        { status: 400 }
      );
    }

    // 2. Conditional Payment Validation
    const selectedMethod = paymentMethod.toUpperCase().trim();
    const isMobilePayout = ['ORANGE_MONEY', 'MYZAKA', 'SMEGA', 'EWALLET'].includes(selectedMethod);

    if (isMobilePayout) {
      const activePhone = mobileNumber?.trim() || phone?.trim();
      if (!activePhone) {
        return NextResponse.json(
          { success: false, error: `A valid mobile phone number is required for ${selectedMethod.replace('_', ' ')} payouts.` },
          { status: 400 }
        );
      }
    } else if (selectedMethod === 'BANK') {
      if (!bankName?.trim() || !accountNumber?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Bank Name and Account Number are required for traditional bank payouts.' },
          { status: 400 }
        );
      }
    }

    const cleanRate = parseFloat(rate) || 0;
<<<<<<< Updated upstream

    // 1. Insert Core Employee
=======
    const generatedCode = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanSiteId = siteId && siteId.trim() !== '' ? siteId.trim() : null;

    // 3. Insert Core Employee Record
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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

    // 3. Create Contract
=======
    // 4. Create Employment Contract
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    // 4. Save Banking / Mobile Details
    const selectedChannel = paymentChannel.toUpperCase().includes('MOBILE') ? 'MOBILE_MONEY' 
                          : paymentChannel.toUpperCase().includes('CASH') ? 'CASH' 
                          : 'EFT';

    const bankingPayload = {
      employee_id: createdEmployeeId,
      payment_channel: selectedChannel,
      bank_name: selectedChannel === 'EFT' ? bankName?.trim() || null : null,
      account_number: selectedChannel === 'EFT' ? accountNumber?.trim() || null : null,
      branch_code: branchCode?.trim() || null,
      mobile_provider: selectedChannel === 'MOBILE_MONEY' ? mobileProvider?.trim() || null : null,
      mobile_number: selectedChannel === 'MOBILE_MONEY' ? mobileNumber?.trim() || null : null,
    };

    const { error: bankingError } = await supabase
      .from('employee_banking')
      .insert([bankingPayload]);

    if (bankingError) console.warn('Non-fatal banking error:', bankingError);
=======
    // 5. Save Payment Record (Bank or Mobile Wallet)
    const payoutPayload = {
      employee_id: createdEmployeeId,
      payment_method: selectedMethod,
      bank_name: selectedMethod === 'BANK' ? bankName.trim() : null,
      account_number: selectedMethod === 'BANK' ? accountNumber.trim() : null,
      branch_code: selectedMethod === 'BANK' ? branchCode?.trim() || null : null,
      mobile_number: isMobilePayout ? (mobileNumber?.trim() || phone?.trim() || null) : null,
    };

    const { error: bankingError } = await supabase
      .from('employee_banking')
      .insert([payoutPayload]);

    if (bankingError) throw bankingError;
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
          paymentChannel: selectedChannel,
=======
          payment_method: selectedMethod,
>>>>>>> Stashed changes
        },
      },
      { status: 201 }
    );
  } catch (error) {
<<<<<<< Updated upstream
    console.error('Error in employee creation:', error);
=======
    console.error('Error in employee registration pipeline:', error);

    // Rollback atomic multi-table inserts if a failure occurs
>>>>>>> Stashed changes
    if (createdEmployeeId) {
      await supabase.from('employees').delete().eq('id', createdEmployeeId);
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete employee creation.' },
      { status: 500 }
    );
  }
}

// PUT: Update Employee Details (HR Updates)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, first_name, last_name, phone, nationalId, role, rate, paymentChannel, bankName, accountNumber, mobileProvider, mobileNumber } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 });
    }

    // Update core employee
    await supabase
      .from('employees')
      .update({
        first_name: first_name?.trim(),
        last_name: last_name?.trim(),
        phone: phone?.trim(),
        national_id: nationalId?.trim(),
      })
      .eq('id', id);

    // Update contract
    if (role || rate) {
      await supabase
        .from('employment_contracts')
        .update({
          job_title: role?.trim(),
          hourly_rate: parseFloat(rate) || 0,
        })
        .eq('employee_id', id);
    }

    // Update banking/payment preference
    if (paymentChannel) {
      await supabase
        .from('employee_banking')
        .upsert({
          employee_id: id,
          payment_channel: paymentChannel,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          mobile_provider: mobileProvider || null,
          mobile_number: mobileNumber || null,
        }, { onConflict: 'employee_id' });
    }

    return NextResponse.json({ success: true, message: 'Employee details updated successfully.' });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}