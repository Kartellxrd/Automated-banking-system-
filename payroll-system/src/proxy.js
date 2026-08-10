import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function proxy(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 1. Unauthenticated user trying to access any protected route
  if (pathname.startsWith('/dashboard') && !user) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user logic
  if (user) {
    // Fetch profile role safely
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

    // Default fallback role if database error or missing profile row
    const targetDashboard = role ? `/dashboard/${role.replace('_', '-')}` : '/dashboard/admin';

    // A. Logged-in user visiting /login -> redirect to their role dashboard
    if (pathname === '/login') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    // B. Logged-in user visiting base /dashboard -> redirect to specific dashboard
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      url.pathname = targetDashboard;
      return NextResponse.redirect(url);
    }

    // C. Role-based permission checks (Admins & CEOs bypass all restrictions)
    if (role === 'admin' || role === 'ceo') {
      return response;
    }

    // Restrict non-admin roles from accessing other department routes
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
  matcher: ['/dashboard/:path*', '/login'],
};