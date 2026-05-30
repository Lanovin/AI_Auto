import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv, hasSupabaseEnv } from '@/lib/supabase/config';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    return supabaseResponse;
  }

  const { url, publishableKey } = getSupabaseEnv();

  if (!url || !publishableKey) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      url,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          }
        }
      }
    );

    // Refreshes the session and validates the token — do not remove
    await supabase.auth.getUser();
  } catch (error) {
    console.error('[middleware] Supabase session refresh skipped:', error);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
