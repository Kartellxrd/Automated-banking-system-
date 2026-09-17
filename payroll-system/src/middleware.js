import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const ROLE_DASHBOARDS = {
  admin: '/dashboard/admin',
  ceo: '/dashboard/ceo',
  hr: '/dashboard/hr',
  accountant: '/dashboard/accountant',
  site_clerk: '/dashboard/site-clerk',
};

function redirect(request, response, pathname, error = null) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (error) url.searchParams.set('error', error);
  const next = NextResponse.redirect(url);

  // Preserve auth cookie updates produced by the Supabase server client.
  response.cookies.getAll().forEach((cookie) => {
    next.cookies.set(cookie.name, cookie.value, cookie);
  });
  return next;
}

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (error) {
    console.error('Middleware Supabase auth error:', error);
  }

  if (pathname === '/') {
    return redirect(request, response, user ? '/dashboard' : '/login');
  }

  // A recovery link may open /change-password before a session exists; the page
  // exchanges its recovery code for a session itself.
  if (pathname === '/change-password' && !user) return response;

  if (pathname.startsWith('/dashboard') && !user) {
    return redirect(request, response, '/login', 'authentication_required');
  }

  if (!user) return response;

  let profile = null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role,is_active,must_change_password')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    profile = data;
  } catch (error) {
    console.error('Middleware profile fetch error:', error);
  }

  const role = profile?.role ? String(profile.role).toLowerCase() : null;
  const targetDashboard = role ? ROLE_DASHBOARDS[role] : null;

  if (!profile || !targetDashboard) {
    try { await supabase.auth.signOut(); } catch {}
    return redirect(request, response, '/login', 'invalid_account');
  }

  if (profile.is_active === false) {
    try { await supabase.auth.signOut(); } catch {}
    return redirect(request, response, '/login', 'account_inactive');
  }

  if (profile.must_change_password === true && pathname !== '/change-password') {
    return redirect(request, response, '/change-password');
  }

  if (pathname === '/login') {
    return redirect(request, response, targetDashboard);
  }

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return redirect(request, response, targetDashboard);
  }

  if (pathname.startsWith('/dashboard/')) {
    const allowedPrefix = `${targetDashboard}/`;
    const isOwnDashboard = pathname === targetDashboard || pathname.startsWith(allowedPrefix);
    if (!isOwnDashboard) {
      return redirect(request, response, targetDashboard, 'role_boundary');
    }
  }

  return response;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/change-password'],
};
