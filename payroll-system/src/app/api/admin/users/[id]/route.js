import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

const SYSTEM_ROLES = ['admin', 'site_clerk', 'hr', 'accountant', 'ceo'];

async function countActiveAdmins(supabaseAdmin) {
  const { count, error } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
  if (error) throw error;
  return count || 0;
}

export async function PATCH(request, context) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action;
    if (!id) return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, is_active, first_name, last_name, email')
      .eq('id', id)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ success: false, error: 'System user not found.' }, { status: 404 });
    const targetName = [target.first_name, target.last_name].filter(Boolean).join(' ') || target.email;

    if (action === 'change_role') {
      const newRole = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';
      if (!SYSTEM_ROLES.includes(newRole)) return NextResponse.json({ success: false, error: 'Invalid system role.' }, { status: 400 });
      if (id === access.user.id && newRole !== 'admin') return NextResponse.json({ success: false, error: 'You cannot remove your own administrator role.' }, { status: 400 });
      if (target.role === 'admin' && newRole !== 'admin' && target.is_active && (await countActiveAdmins(supabaseAdmin)) <= 1) {
        return NextResponse.json({ success: false, error: 'The last active administrator cannot be demoted.' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ role: newRole, updated_by: access.user.id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, first_name, last_name, email, role, is_active, must_change_password, created_at')
        .single();
      if (error) throw error;

      if (target.role === 'site_clerk' && newRole !== 'site_clerk') {
        const now = new Date().toISOString();
        const { error: assignmentError } = await supabaseAdmin
          .from('user_site_assignments')
          .update({ is_active: false, unassigned_at: now, unassigned_by: access.user.id, updated_at: now })
          .eq('user_id', id)
          .eq('is_active', true);
        if (assignmentError) throw assignmentError;
      }

      await writeAuditLog(supabaseAdmin, {
        actorUserId: access.user.id,
        action: 'CHANGE_USER_ROLE',
        module: 'System Users',
        entityType: 'profile',
        entityId: id,
        details: `Changed ${targetName} from ${target.role} to ${newRole}.`,
        metadata: { previous_role: target.role, new_role: newRole, email: target.email },
      });
      return NextResponse.json({ success: true, message: 'User role updated successfully.', data });
    }

    if (action === 'set_active') {
      const nextActive = Boolean(body.is_active);
      if (!nextActive && id === access.user.id) return NextResponse.json({ success: false, error: 'You cannot deactivate your own administrator account.' }, { status: 400 });
      if (!nextActive && target.role === 'admin' && target.is_active && (await countActiveAdmins(supabaseAdmin)) <= 1) {
        return NextResponse.json({ success: false, error: 'The last active administrator cannot be deactivated.' }, { status: 400 });
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: nextActive ? 'none' : '876000h' });
      if (authError) throw authError;

      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: nextActive, deactivated_at: nextActive ? null : now, updated_by: access.user.id, updated_at: now })
        .eq('id', id)
        .select('id, first_name, last_name, email, role, is_active, must_change_password, created_at')
        .single();
      if (error) throw error;

      if (!nextActive && target.role === 'site_clerk') {
        const { error: assignmentError } = await supabaseAdmin
          .from('user_site_assignments')
          .update({ is_active: false, unassigned_at: now, unassigned_by: access.user.id, updated_at: now })
          .eq('user_id', id)
          .eq('is_active', true);
        if (assignmentError) throw assignmentError;
      }

      await writeAuditLog(supabaseAdmin, {
        actorUserId: access.user.id,
        action: nextActive ? 'REACTIVATE_USER' : 'DEACTIVATE_USER',
        module: 'System Users',
        entityType: 'profile',
        entityId: id,
        details: `${nextActive ? 'Reactivated' : 'Deactivated'} ${targetName}.`,
        metadata: { role: target.role, email: target.email },
      });

      return NextResponse.json({ success: true, message: nextActive ? 'User account reactivated.' : 'User account deactivated.', data });
    }

    return NextResponse.json({ success: false, error: 'Unsupported account action.' }, { status: 400 });
  } catch (error) {
    console.error('Admin user PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user access.' }, { status: 500 });
  }
}
