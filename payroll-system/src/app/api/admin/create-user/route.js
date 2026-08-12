import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Admin Client using the Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { first_name, last_name, email, password, role, site_location } = body;

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required employee details.' },
        { status: 400 }
      );
    }

    // 1. Updated allowed ENUM roles to include 'worker' and default to 'worker'
    const validRoles = ['admin', 'ceo', 'hr', 'accountant', 'site_clerk', 'worker'];
    const assignedRole = validRoles.includes(role) ? role : 'worker';

    // 2. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so employee can log in immediately
      user_metadata: {
        first_name,
        last_name,
        role: assignedRole,
        site_location: site_location || 'Headquarters'
      }
    });

    if (authError) {
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 3. Insert or Update the user record in public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        first_name,
        last_name,
        email,
        role: assignedRole,
        site_location: site_location || 'Headquarters',
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Employee ${first_name} ${last_name} provisioned successfully!`
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}