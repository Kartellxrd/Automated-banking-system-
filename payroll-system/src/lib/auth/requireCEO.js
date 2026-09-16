import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function requireCEO(permissionKey = null) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: 'You must be signed in to continue.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: 'Could not verify your CEO access.' };
  }

  if (!profile || profile.role !== 'ceo') {
    return { ok: false, status: 403, error: 'CEO access is required.' };
  }

  if (profile.is_active === false) {
    return { ok: false, status: 403, error: 'This CEO account is inactive.' };
  }

  if (permissionKey) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: permission, error: permissionError } = await admin
        .from('permissions')
        .select('id')
        .eq('permission_key', permissionKey)
        .eq('is_active', true)
        .maybeSingle();

      if (permissionError) throw permissionError;
      if (!permission) {
        return { ok: false, status: 403, error: 'This CEO capability is not configured.' };
      }

      const { data: grant, error: grantError } = await admin
        .from('role_permissions')
        .select('granted')
        .eq('role', 'ceo')
        .eq('permission_id', permission.id)
        .maybeSingle();

      if (grantError) throw grantError;
      if (!grant?.granted) {
        return { ok: false, status: 403, error: 'CEO does not currently have permission for this action.' };
      }
    } catch (error) {
      console.error('CEO permission check failed:', error);
      return { ok: false, status: 500, error: 'Could not verify CEO permissions.' };
    }
  }

  return { ok: true, user, profile };
}
