import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export async function POST(request, context) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', id)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ success: false, error: 'System user not found.' }, { status: 404 });
    if (!target.is_active) return NextResponse.json({ success: false, error: 'Reactivate this account before sending a password reset.' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(target.email, { redirectTo: `${origin}/change-password` });
    if (resetError) throw resetError;

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ last_password_reset_at: now, updated_by: access.user.id, updated_at: now })
      .eq('id', id);
    if (updateError) throw updateError;

    const targetName = [target.first_name, target.last_name].filter(Boolean).join(' ') || target.email;
    await writeAuditLog(supabaseAdmin, {
      actorUserId: access.user.id,
      action: 'RESET_USER_ACCESS',
      module: 'System Users',
      entityType: 'profile',
      entityId: id,
      details: `Sent a password reset email to ${targetName}.`,
      metadata: { email: target.email, role: target.role },
    });

    return NextResponse.json({ success: true, message: `Password reset email sent to ${target.email}.` });
  } catch (error) {
    console.error('Admin reset access error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send password reset email.' }, { status: 500 });
  }
}
