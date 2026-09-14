import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request, context) {
  const access = await requireAdmin();

  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const { id } = await context.params;
    const { temporary_password: temporaryPassword } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    if (typeof temporaryPassword !== 'string' || temporaryPassword.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Temporary password must be at least 10 characters.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, is_active')
      .eq('id', id)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target) {
      return NextResponse.json({ success: false, error: 'System user not found.' }, { status: 404 });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: temporaryPassword,
    });

    if (authError) throw authError;

    const now = new Date().toISOString();
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        must_change_password: true,
        last_password_reset_at: now,
        updated_by: access.user.id,
        updated_at: now,
      })
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({
      success: true,
      message: `Temporary password created for ${[target.first_name, target.last_name].filter(Boolean).join(' ')}.`,
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset the user password.' },
      { status: 500 }
    );
  }
}
