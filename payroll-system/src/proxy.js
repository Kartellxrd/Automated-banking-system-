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

  // 1. Protect all /dashboard routes if unauthenticated
  if (url.pathname.startsWith('/dashboard') && !user) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Enforce strict role-based route matching for authenticated users
  if (url.pathname.startsWith('/dashboard') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (role === 'admin' || role === 'ceo') {
      return response;
    }

    if (url.pathname.startsWith('/dashboard/hr') && role !== 'hr') {
      url.pathname = `/dashboard/${role.replace('_', '-')}`;
      return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith('/dashboard/accountant') && role !== 'accountant') {
      url.pathname = `/dashboard/${role.replace('_', '-')}`;
      return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith('/dashboard/site-clerk') && role !== 'site_clerk') {
      url.pathname = `/dashboard/${role.replace('_', '-')}`;
      return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      url.pathname = `/dashboard/${role.replace('_', '-')}`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};