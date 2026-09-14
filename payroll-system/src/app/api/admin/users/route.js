import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const SYSTEM_ROLES = ['admin', 'site_clerk', 'hr', 'accountant', 'ceo'];

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET() {
  const access = await requireAdmin();

  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.status }
    );
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        must_change_password,
        deactivated_at,
        last_password_reset_at,
        created_at,
        created_by,
        updated_at,
        updated_by
      `)
      .in('role', SYSTEM_ROLES)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      current_user_id: access.user.id,
    });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load system users.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.status }
    );
  }

  let createdAuthUserId = null;

  try {
    const body = await request.json();

    const firstName = cleanText(body.first_name);
    const lastName = cleanText(body.last_name);
    const email = cleanText(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const role = cleanText(body.role).toLowerCase();

    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, email, password, and role are required.' },
        { status: 400 }
      );
    }

    if (!SYSTEM_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid system role.' },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Temporary password must be at least 10 characters.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: 'A system user with this email already exists.' },
        { status: 409 }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError) {
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    createdAuthUserId = authData.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: createdAuthUserId,
          first_name: firstName,
          last_name: lastName,
          email,
          role,
          is_active: true,
          must_change_password: true,
          created_by: access.user.id,
          updated_by: access.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, first_name, last_name, email, role, is_active, must_change_password, created_at')
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      throw profileError;
    }

    return NextResponse.json(
      {
        success: true,
        message: `${firstName} ${lastName} was provisioned successfully.`,
        data: profile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin users POST error:', error);

    if (createdAuthUserId) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackError) {
        console.error('Failed to rollback auth user:', rollbackError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to provision system user.' },
      { status: 500 }
    );
  }
}
