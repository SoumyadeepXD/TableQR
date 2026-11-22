import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect staff routes: /kitchen, /cashier, /admin
  const isStaffRoute =
    pathname.startsWith('/kitchen') ||
    pathname.startsWith('/cashier') ||
    pathname.startsWith('/admin');

  if (isStaffRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and at /login, route to appropriate dashboard based on role
  if (pathname === '/login' && user) {
    const { data: staff } = await supabase
      .from('restaurant_staff')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const role = staff?.role;
    const url = request.nextUrl.clone();
    if (role === 'kitchen') {
      url.pathname = '/kitchen';
      return NextResponse.redirect(url);
    } else if (role === 'cashier') {
      url.pathname = '/cashier';
      return NextResponse.redirect(url);
    } else if (role === 'owner' || role === 'manager') {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
