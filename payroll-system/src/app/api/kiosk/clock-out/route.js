import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, clock_out_photo_url } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required to clock out.' },
        { status: 400 }
      );
    }

    // 1. Fetch user details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Employee account not found.' },
        { status: 404 }
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 2. Find the active shift (where clock_out IS NULL)
    const { data: activeShift, error: shiftError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('user_id', user_id)
      .gte('clock_in', todayStart.toISOString())
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .maybeSingle();

    if (shiftError) {
      return NextResponse.json(
        { success: false, error: shiftError.message },
        { status: 500 }
      );
    }

    if (!activeShift) {
      return NextResponse.json(
        {
          success: false,
          error: `No active clock-in session found for ${profile.first_name || 'Employee'} today.`
        },
        { status: 400 }
      );
    }

    // 3. Calculate total worked hours
    const clockInTime = new Date(activeShift.clock_in);
    const clockOutTime = new Date();
    const durationHours = parseFloat(
      ((clockOutTime - clockInTime) / (1000 * 60 * 60)).toFixed(2)
    );

    // 4. Update attendance record with clock_out & calculated total hours
    const { data: updatedAttendance, error: updateError } = await supabaseAdmin
      .from('attendance')
      .update({
        clock_out: clockOutTime.toISOString(),
        total_hours: durationHours,
        ...(clock_out_photo_url && { clock_out_photo_url })
      })
      .eq('id', activeShift.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Clocked out successfully! Shift duration: ${durationHours} hrs.`,
      employee: {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      },
      attendance: updatedAttendance
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}