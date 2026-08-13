import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { employee_code, site, timestamp, terminal_id, photo_snapshot } = await req.json();

    if (!employee_code || !site) {
      return NextResponse.json(
        { success: false, error: 'Employee code and site are required.' },
        { status: 400 }
      );
    }

    // 1. Verify Employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code')
      .eq('employee_code', employee_code)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found.' },
        { status: 404 }
      );
    }

    // 2. Insert Attendance Scan Audit Log
    const scanTime = new Date().toISOString();
    const { data: scanLog, error: logError } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: employee.id,
        site: site,
        terminal_id: terminal_id || 'KIOSK-MAIN',
        scan_time: scanTime,
        audit_snapshot_url: photo_snapshot || null,
        verification_status: 'Verified',
      })
      .select()
      .single();

    if (logError) {
      throw new Error(logError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Clock-in verified successfully.',
      data: {
        id: scanLog.id,
        name: `${employee.first_name} ${employee.last_name}`,
        code: employee.employee_code,
        site: site,
        time: new Date(scanTime).toLocaleTimeString(),
        status: 'Clock In Verified',
      },
    });
  } catch (error) {
    console.error('Kiosk Verification API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}