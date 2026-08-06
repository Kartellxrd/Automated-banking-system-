import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all active/inactive employees with payout details and attached documents
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        national_id,
        first_name,
        last_name,
        phone_number,
        job_role,
        department,
        hourly_rate,
        overtime_rate,
        is_active,
        created_at,
        employee_payout_profiles (
          id,
          account_or_mobile_number,
          branch_code,
          is_primary,
          payout_providers (
            id,
            code,
            name,
            payment_channels (
              id,
              code,
              name
            )
          )
        ),
        employee_documents (
          id,
          document_type,
          document_url,
          file_path,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase GET Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Server GET Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Register a new employee with complete profile details
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      employee_code,
      national_id,
      first_name,
      last_name,
      phone_number,
      job_role,
      department,
      hourly_rate,
      overtime_rate,
      payout_provider_id,
      account_or_mobile_number,
      branch_code
    } = body;

    if (!employee_code || !first_name || !last_name || !phone_number || !hourly_rate || !payout_provider_id || !account_or_mobile_number) {
      return NextResponse.json(
        { success: false, error: 'Missing required employee or payout fields.' },
        { status: 400 }
      );
    }

    // 1. Insert Employee Record
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert([
        {
          employee_code,
          national_id: national_id || null,
          first_name,
          last_name,
          phone_number,
          job_role: job_role || 'General Worker',
          department: department || 'General',
          hourly_rate: parseFloat(hourly_rate),
          overtime_rate: overtime_rate ? parseFloat(overtime_rate) : parseFloat(hourly_rate) * 1.5,
          is_active: true
        }
      ])
      .select()
      .single();

    if (employeeError) {
      console.error('Employee Insert Error:', employeeError);
      return NextResponse.json({ success: false, error: employeeError.message }, { status: 400 });
    }

    // 2. Insert Payout Profile Record
    const { data: profileData, error: profileError } = await supabase
      .from('employee_payout_profiles')
      .insert([
        {
          employee_id: employeeData.id,
          payout_provider_id: parseInt(payout_provider_id, 10),
          account_or_mobile_number,
          branch_code: branch_code || 'N/A',
          is_primary: true
        }
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Payout Profile Insert Error:', profileError);
      return NextResponse.json({ success: false, error: profileError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...employeeData,
          payout_profile: profileData
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Server POST Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}