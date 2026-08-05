import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all active employees with payout details
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        first_name,
        last_name,
        phone_number,
        hourly_rate,
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
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Register a new employee and create their payment profile
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      employee_code,
      first_name,
      last_name,
      phone_number,
      hourly_rate,
      payout_provider_id, // Foreign key ID pointing to FNB, ABSA, Orange Money, etc.
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
          first_name,
          last_name,
          phone_number,
          hourly_rate: parseFloat(hourly_rate)
        }
      ])
      .select()
      .single();

    if (employeeError) throw employeeError;

    // 2. Insert Payout Profile Record linked to the new Employee ID
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

    if (profileError) throw profileError;

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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}