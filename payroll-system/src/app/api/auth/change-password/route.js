import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

const ROLE_DASHBOARDS = {
  admin: '/dashboard/admin',
  ceo: '/dashboard/ceo',
  hr: '/dashboard/hr',
  accountant: '/dashboard/accountant',
  site_clerk: '/dashboard/site-clerk',
};

export async function POST(request) {
  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 10 characters long.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'You must be signed in to change your password.' },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, role, is_active, must_change_password')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.role) {
      return NextResponse.json(
        { success: false, error: 'Your system profile is incomplete. Contact an administrator.' },
        { status: 400 }
      );
    }
    if (profile.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'This account is inactive. Contact an administrator.' },
        { status: 403 }
      );
    }

    const role = String(profile.role).toLowerCase();
    const redirectTo = ROLE_DASHBOARDS[role] || '/dashboard';

    // Use the server-only service role for the actual credential update. The
    // authenticated session above proves the caller is changing only their own account.
    const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (passwordError) {
      return NextResponse.json(
        { success: false, error: passwordError.message },
        { status: 400 }
      );
    }

    // This flag must be cleared with the service-role client because browser users
    // intentionally have no UPDATE RLS policy on profiles.
    const { error: flagError } = await admin
      .from('profiles')
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (flagError) {
      console.error('Password changed but must_change_password reset failed:', flagError);
      return NextResponse.json(
        {
          success: false,
          error: 'Your password was changed, but the account transition could not be completed. Please contact an administrator.',
        },
        { status: 500 }
      );
    }

    try {
      await writeAuditLog(admin, {
        actorUserId: user.id,
        action: profile.must_change_password ? 'COMPLETE_TEMPORARY_PASSWORD_CHANGE' : 'CHANGE_OWN_PASSWORD',
        module: 'Authentication',
        entityType: 'profile',
        entityId: user.id,
        details: profile.must_change_password
          ? 'Completed required temporary password change.'
          : 'Changed own account password.',
        metadata: { role },
      });
    } catch (auditError) {
      console.error('Password change audit log failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
      role,
      redirect_to: redirectTo,
      first_login_completed: profile.must_change_password === true,
    });
  } catch (error) {
    console.error('Password Update Error:', error);
    return NextResponse.json(
      { success: false, error: 'Could not update your password.' },
      { status: 500 }
    );
  }
}
