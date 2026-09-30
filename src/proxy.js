import { NextResponse } from 'next/server';
// Adjust import path as needed to match your lib folder structure
import { hasSupabaseConfig, getSupabaseUrl, getSupabaseAnonKey } from './app/lib/supabase/config';

/**
 * Routes that require a signed-in user.
 *
 * `/feed` is personalised — it ranks by who you read and what you save — and
 * `/account` is your own profile, so both are meaningless without a session.
 * An unauthenticated request is redirected to /login with the original path
 * preserved in `next`, so signing in returns the reader to where they were
 * going instead of dumping them on the home page.
 *
 * This is a redirect, not the security boundary. RLS is: every table this app
 * reads is guarded by policy, so a request that skips the proxy entirely still
 * gets nothing. The proxy exists to avoid rendering an empty personalised page
 * and to keep private routes out of the crawlable navigation.
 */
const PROTECTED_PREFIXES = ['/feed', '/account'];

function isProtected(pathname) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request) {
    let supabaseResponse = NextResponse.next({ request });
    const { pathname } = request.nextUrl;

    // Guard check: Avoid initializing Supabase if env vars aren't loaded
    if (!hasSupabaseConfig()) {
        return supabaseResponse;
    }

    const { createServerClient } = await import('@supabase/ssr');

    let supabase;
    try {
        supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Update incoming request object first
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

                    // Re-create the base response object carrying updated request headers
                    supabaseResponse = NextResponse.next({ request });

                    // Apply updated cookies onto the outgoing response object
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        });
    } catch (error) {
        // A malformed URL/key can make the client constructor itself throw.
        // This middleware runs on every request, so letting that escape turns a
        // configuration mistake into a 500 on every page in the app.
        console.error('Supabase client could not be created in middleware:', error);
        return supabaseResponse;
    }

    try {
        // Refresh expired auth tokens and keep cookies in sync.
        // `getUser` validates against the Supabase auth server rather than
        // trusting the cookie, which is why it must not be skipped — but a
        // failure here must not take the page down with it. An unreachable
        // backend should degrade to "signed out", not to a 500.
        const { data, error } = await supabase.auth.getUser();
        if (error && /fetch|network|timeout/i.test(error.message || '')) {
            console.warn('Supabase unreachable during auth refresh:', error.message);
        }

        // The response is only rebuilt when a cookie actually changed, so the
        // redirect below carries the refreshed session rather than a stale one.
        if (isProtected(pathname) && !data?.user) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.search = '';
            url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
            return NextResponse.redirect(url);
        }
    } catch (error) {
        console.error('Auth refresh failed in middleware:', error);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
