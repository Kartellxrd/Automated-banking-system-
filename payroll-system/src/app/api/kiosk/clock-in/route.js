import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, site_location, photo_url, verification_method } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required to clock in.' },
        { status: 400 }
      );
    }

    // 1. Fetch user details from public.profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, role, site_location, profile_photo_url')
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

    // 2. Check for active shift without a clock_out timestamp today
    const { data: activeShift, error: shiftError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('user_id', user_id)
      .gte('clock_in', todayStart.toISOString())
      .is('clock_out', null)
      .maybeSingle();

    if (shiftError) {
      return NextResponse.json(
        { success: false, error: shiftError.message },
        { status: 500 }
      );
    }

    // 3. Prevent duplicate clock-in
    if (activeShift) {
      return NextResponse.json(
        {
          success: false,
          error: `${profile.first_name || 'Employee'} is already clocked in today.`,
          already_clocked_in: true,
          attendance: activeShift
        },
        { status: 400 }
      );
    }

    // 4. Create new clock-in entry with live kiosk snapshot
    const timestamp = new Date().toISOString();
    const activeSite = site_location || profile.site_location || 'Headquarters';

    const { data: newAttendance, error: insertError } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id,
        clock_in: timestamp,
        site_location: activeSite,
        photo_url: photo_url || null, // Kiosk live capture
        verification_method: verification_method || 'kiosk_qr',
        verification_status: profile.profile_photo_url ? 'verified' : 'pending_review',
        status: 'present'
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Clocked in successfully! Welcome, ${profile.first_name || ''}.`,
      employee: {
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        role: profile.role
      },
      attendance: newAttendance
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}