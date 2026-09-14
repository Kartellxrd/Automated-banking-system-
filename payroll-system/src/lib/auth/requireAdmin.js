import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      error: 'You must be signed in to perform this action.',
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      status: 500,
      error: 'Could not verify your system access.',
    };
  }

  if (!profile || profile.role !== 'admin') {
    return {
      ok: false,
      status: 403,
      error: 'Administrator access is required.',
    };
  }

  if (profile.is_active === false) {
    return {
      ok: false,
      status: 403,
      error: 'This administrator account is inactive.',
    };
  }

  return {
    ok: true,
    user,
    profile,
  };
}
