import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

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

    return NextResponse.json({
      success: true,
      data: {
        sites: sites || [],
        clerks: clerks || [],
        assignments: assignments || [],
      },
    });
  } catch (error) {
    console.error('Site assignments GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load site assignments.' }, { status: 500 });
  }
}

export async function POST(request) {
  const access = await requireAdmin();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const siteId = typeof body.site_id === 'string' ? body.site_id.trim() : '';
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';

    if (!siteId || !userId) {
      return NextResponse.json({ success: false, error: 'Site and Site Clerk are required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data, error } = await db.rpc('admin_assign_site_clerk', {
      p_site_id: siteId,
      p_user_id: userId,
      p_admin_id: access.user.id,
    });

    if (error) {
      const message = error.message || '';
      if (message.includes('inactive site') || message.includes('Only active Site Clerk')) {
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }
      if (message.includes('not found')) {
        return NextResponse.json({ success: false, error: message }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Site Clerk assignment saved.', data }, { status: 201 });
  } catch (error) {
    console.error('Site assignment POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to assign Site Clerk.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const access = await requireAdmin();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id')?.trim();
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'Site ID is required.' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const { data: changed, error } = await db.rpc('admin_unassign_site_clerk', {
      p_site_id: siteId,
      p_admin_id: access.user.id,
    });

    if (error) throw error;
    if (!changed) {
      return NextResponse.json({ success: false, error: 'This site has no active Site Clerk assignment.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Site Clerk unassigned successfully.' });
  } catch (error) {
    console.error('Site assignment DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to unassign Site Clerk.' }, { status: 500 });
  }
}
