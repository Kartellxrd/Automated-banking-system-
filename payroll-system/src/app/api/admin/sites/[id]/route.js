import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function PATCH(request, context) {
  const access = await requireAdmin();

  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.status }
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Site ID is required.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: currentSite, error: currentSiteError } = await supabaseAdmin
      .from('sites')
      .select('id, site_name, location, is_active')
      .eq('id', id)
      .maybeSingle();

    if (currentSiteError) throw currentSiteError;

    if (!currentSite) {
      return NextResponse.json(
        { success: false, error: 'Site not found.' },
        { status: 404 }
      );
    }

    if (action === 'edit') {
      const siteName = cleanText(body.site_name);
      const location = cleanText(body.location);

      if (!siteName) {
        return NextResponse.json(
          { success: false, error: 'Site name is required.' },
          { status: 400 }
        );
      }

      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from('sites')
        .select('id')
        .ilike('site_name', siteName)
        .neq('id', id)
        .maybeSingle();

      if (duplicateError) throw duplicateError;

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Another site already uses this name.' },
          { status: 409 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('sites')
        .update({
          site_name: siteName,
          location: location || null,
          updated_by: access.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, site_name, location, is_active, created_at, updated_at')
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `${siteName} was updated successfully.`,
        data,
      });
    }

    if (action === 'set_active') {
      const nextActive = Boolean(body.is_active);

      if (!nextActive) {
        const { data: activeAssignment, error: assignmentError } = await supabaseAdmin
          .from('user_site_assignments')
          .select('id')
          .eq('site_id', id)
          .eq('is_active', true)
          .maybeSingle();

        if (assignmentError) throw assignmentError;

        if (activeAssignment) {
          return NextResponse.json(
            {
              success: false,
              error: 'Unassign the Site Clerk before deactivating this site.',
            },
            { status: 400 }
          );
        }
      }

      const { data, error } = await supabaseAdmin
        .from('sites')
        .update({
          is_active: nextActive,
          updated_by: access.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, site_name, location, is_active, created_at, updated_at')
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: nextActive ? 'Site reactivated.' : 'Site deactivated.',
        data,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported site action.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin site PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update site.' },
      { status: 500 }
    );
  }
}
