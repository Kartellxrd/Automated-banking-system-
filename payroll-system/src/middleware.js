import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Initialize Supabase Client
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.error('Middleware Supabase Auth Error:', err);
  }

  // 1. Root route handling: send unauthenticated users to /login immediately
  if (pathname === '/') {
    url.pathname = user ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // 2. Unauthenticated user attempting to access protected routes
  if (pathname.startsWith('/dashboard') && !user) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 3. Authenticated user logic
  if (user) {
    let role = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      role = profile?.role ? profile.role.toLowerCase() : null;
    } catch (err) {
      console.error('Middleware profile fetch error:', err);
    }

    const targetDashboard = role ? `/dashboard/${role.replace('_', '-')}` : '/dashboard/admin';

    // Logged-in user visiting /login -> send to dashboard
    if (pathname === '/login') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    // Logged-in user visiting /dashboard -> send to role dashboard
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    // Admins & CEOs bypass restrictions
    if (role === 'admin' || role === 'ceo') {
      return response;
    }

    // Strict role boundary checks
    if (pathname.startsWith('/dashboard/ceo') && role !== 'ceo') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/dashboard/hr') && role !== 'hr') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/dashboard/accountant') && role !== 'accountant') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/dashboard/site-clerk') && role !== 'site_clerk') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login'],
};