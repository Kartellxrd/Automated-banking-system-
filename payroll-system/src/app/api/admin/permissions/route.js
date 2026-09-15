import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

const SYSTEM_ROLES = ['site_clerk', 'hr', 'accountant', 'ceo', 'admin'];
const LOCKED_ADMIN_PERMISSIONS = new Set(['admin.users.manage','admin.sites.manage','admin.site_assignments.manage','admin.permissions.manage','admin.audit.view']);

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const db = createSupabaseAdminClient();
    const [{ data: permissions, error: pError }, { data: grants, error: gError }] = await Promise.all([
      db.from('permissions').select('id, permission_key, module, name, description, display_order').eq('is_active', true).order('module').order('display_order'),
      db.from('role_permissions').select('role, permission_id, granted'),
    ]);
    if (pError) throw pError;
    if (gError) throw gError;
    return NextResponse.json({ success: true, roles: SYSTEM_ROLES, permissions: permissions || [], grants: grants || [], locked_admin_permissions: [...LOCKED_ADMIN_PERMISSIONS] });
  } catch (error) {
    console.error('Permission matrix GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load role permissions.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (!changes.length) return NextResponse.json({ success: false, error: 'No permission changes were supplied.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const permissionIds = [...new Set(changes.map((c) => c.permission_id).filter(Boolean))];
    const { data: permissions, error: permissionError } = await db.from('permissions').select('id, permission_key, is_active').in('id', permissionIds);
    if (permissionError) throw permissionError;
    const permissionMap = new Map((permissions || []).map((p) => [p.id, p]));
    const now = new Date().toISOString();
    const rows = [];
    const auditChanges = [];

    for (const change of changes) {
      const role = String(change.role || '').toLowerCase();
      const permission = permissionMap.get(change.permission_id);
      if (!SYSTEM_ROLES.includes(role) || !permission || !permission.is_active || typeof change.granted !== 'boolean') {
        return NextResponse.json({ success: false, error: 'One or more permission changes are invalid.' }, { status: 400 });
      }
      if (role === 'admin' && LOCKED_ADMIN_PERMISSIONS.has(permission.permission_key) && change.granted === false) {
        return NextResponse.json({ success: false, error: 'Core System Admin permissions cannot be disabled.' }, { status: 400 });
      }
      rows.push({ role, permission_id: permission.id, granted: change.granted, updated_by: access.user.id, updated_at: now });
      auditChanges.push({ role, permission_key: permission.permission_key, granted: change.granted });
    }

    const { error } = await db.from('role_permissions').upsert(rows, { onConflict: 'role,permission_id' });
    if (error) throw error;
    await writeAuditLog(db, { actorUserId: access.user.id, action: 'UPDATE_ROLE_PERMISSIONS', module: 'Access Control', entityType: 'role_permissions', details: `Updated ${rows.length} role permission grant${rows.length === 1 ? '' : 's'}.`, metadata: { changes: auditChanges } });
    return NextResponse.json({ success: true, message: 'Role permissions updated successfully.' });
  } catch (error) {
    console.error('Permission matrix PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save role permissions.' }, { status: 500 });
  }
}
