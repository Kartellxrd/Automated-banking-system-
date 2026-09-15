import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

function personName(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Site Clerk';
}

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const db = createSupabaseAdminClient();
    const [{ data: sites, error: sitesError }, { data: clerks, error: clerksError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      db.from('sites').select('id, site_name, location, is_active').order('site_name'),
      db.from('profiles').select('id, first_name, last_name, email, role, is_active').eq('role', 'site_clerk').order('first_name'),
      db.from('user_site_assignments').select('id, site_id, user_id, assigned_at').eq('is_active', true),
    ]);
    if (sitesError) throw sitesError;
    if (clerksError) throw clerksError;
    if (assignmentsError) throw assignmentsError;
    return NextResponse.json({ success: true, data: { sites: sites || [], clerks: clerks || [], assignments: assignments || [] } });
  } catch (error) {
    console.error('Site assignments GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load site assignments.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    const siteId = typeof body.site_id === 'string' ? body.site_id.trim() : '';
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    if (!siteId || !userId) return NextResponse.json({ success: false, error: 'Site and Site Clerk are required.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const [siteResult, clerkResult, siteAssignmentResult, userAssignmentResult] = await Promise.all([
      db.from('sites').select('id, site_name, location, is_active').eq('id', siteId).maybeSingle(),
      db.from('profiles').select('id, first_name, last_name, email, role, is_active').eq('id', userId).maybeSingle(),
      db.from('user_site_assignments').select('id, site_id, user_id, assigned_at').eq('site_id', siteId).eq('is_active', true).maybeSingle(),
      db.from('user_site_assignments').select('id, site_id, user_id, assigned_at').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    ]);

    if (siteResult.error) throw siteResult.error;
    if (clerkResult.error) throw clerkResult.error;
    if (siteAssignmentResult.error) throw siteAssignmentResult.error;
    if (userAssignmentResult.error) throw userAssignmentResult.error;
    if (!siteResult.data) return NextResponse.json({ success: false, error: 'Site not found.' }, { status: 404 });
    if (!clerkResult.data) return NextResponse.json({ success: false, error: 'Site Clerk not found.' }, { status: 404 });

    const currentSiteAssignment = siteAssignmentResult.data;
    const currentUserAssignment = userAssignmentResult.data;
    if (currentSiteAssignment?.user_id === userId && currentUserAssignment?.site_id === siteId) {
      return NextResponse.json({ success: true, message: `${personName(clerkResult.data)} is already assigned to ${siteResult.data.site_name}.`, data: currentSiteAssignment });
    }

    const isReassignment = Boolean(
      (currentSiteAssignment && currentSiteAssignment.user_id !== userId) ||
      (currentUserAssignment && currentUserAssignment.site_id !== siteId)
    );

    const { data, error } = await db.rpc('admin_assign_site_clerk', {
      p_site_id: siteId,
      p_user_id: userId,
      p_admin_id: access.user.id,
    });

    if (error) {
      const message = error.message || '';
      if (message.includes('inactive site') || message.includes('Only active Site Clerk')) return NextResponse.json({ success: false, error: message }, { status: 400 });
      if (message.includes('not found')) return NextResponse.json({ success: false, error: message }, { status: 404 });
      throw error;
    }

    const clerkName = personName(clerkResult.data);
    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: isReassignment ? 'REASSIGN_SITE_CLERK' : 'ASSIGN_SITE_CLERK',
      module: 'Site Assignments',
      entityType: 'site',
      entityId: siteId,
      details: `${isReassignment ? 'Reassigned' : 'Assigned'} ${clerkName} to ${siteResult.data.site_name}.`,
      metadata: {
        clerk_user_id: userId,
        site_id: siteId,
        previous_site_id: currentUserAssignment?.site_id || null,
        previous_clerk_user_id: currentSiteAssignment?.user_id || null,
      },
    });

    return NextResponse.json({ success: true, message: 'Site Clerk assignment saved.', data }, { status: 201 });
  } catch (error) {
    console.error('Site assignment POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to assign Site Clerk.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id')?.trim();
    if (!siteId) return NextResponse.json({ success: false, error: 'Site ID is required.' }, { status: 400 });

    const db = createSupabaseAdminClient();
    const [siteResult, assignmentResult] = await Promise.all([
      db.from('sites').select('id, site_name').eq('id', siteId).maybeSingle(),
      db.from('user_site_assignments').select('id, site_id, user_id').eq('site_id', siteId).eq('is_active', true).maybeSingle(),
    ]);
    if (siteResult.error) throw siteResult.error;
    if (assignmentResult.error) throw assignmentResult.error;
    if (!assignmentResult.data) return NextResponse.json({ success: false, error: 'This site has no active Site Clerk assignment.' }, { status: 404 });

    const { data: clerk, error: clerkError } = await db
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', assignmentResult.data.user_id)
      .maybeSingle();
    if (clerkError) throw clerkError;

    const { data: changed, error } = await db.rpc('admin_unassign_site_clerk', {
      p_site_id: siteId,
      p_admin_id: access.user.id,
    });
    if (error) throw error;
    if (!changed) return NextResponse.json({ success: false, error: 'This site has no active Site Clerk assignment.' }, { status: 404 });

    const clerkName = personName(clerk);
    const siteName = siteResult.data?.site_name || 'site';
    await writeAuditLog(db, {
      actorUserId: access.user.id,
      action: 'UNASSIGN_SITE_CLERK',
      module: 'Site Assignments',
      entityType: 'site',
      entityId: siteId,
      details: `Unassigned ${clerkName} from ${siteName}.`,
      metadata: { clerk_user_id: assignmentResult.data.user_id, site_id: siteId },
    });

    return NextResponse.json({ success: true, message: 'Site Clerk unassigned successfully.' });
  } catch (error) {
    console.error('Site assignment DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to unassign Site Clerk.' }, { status: 500 });
  }
}
