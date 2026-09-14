import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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

    const { data: sites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('id, site_name, location, is_active, created_at, updated_at')
      .order('site_name', { ascending: true });

    if (sitesError) throw sitesError;

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('user_site_assignments')
      .select('id, site_id, user_id, assigned_at')
      .eq('is_active', true);

    if (assignmentsError) throw assignmentsError;

    const userIds = [...new Set((assignments || []).map((item) => item.user_id))];
    let profiles = [];

    if (userIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, role, is_active')
        .in('id', userIds);

      if (error) throw error;
      profiles = data || [];
    }

    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const assignmentBySite = new Map(
      (assignments || []).map((assignment) => [
        assignment.site_id,
        {
          ...assignment,
          clerk: profilesById.get(assignment.user_id) || null,
        },
      ])
    );

    const data = (sites || []).map((site) => ({
      ...site,
      assignment: assignmentBySite.get(site.id) || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin sites GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load sites.' },
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

  try {
    const body = await request.json();
    const siteName = cleanText(body.site_name);
    const location = cleanText(body.location);

    if (!siteName) {
      return NextResponse.json(
        { success: false, error: 'Site name is required.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('sites')
      .select('id')
      .ilike('site_name', siteName)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A site with this name already exists.' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('sites')
      .insert({
        site_name: siteName,
        location: location || null,
        is_active: true,
        created_by: access.user.id,
        updated_by: access.user.id,
        updated_at: now,
      })
      .select('id, site_name, location, is_active, created_at, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        message: `${siteName} was created successfully.`,
        data: { ...data, assignment: null },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin sites POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create site.' },
      { status: 500 }
    );
  }
}
