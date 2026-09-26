import { createClient } from '../../lib/supabase/server';
import { NextResponse } from 'next/server';

// This route reads the `code` query param on every request and must not be
// statically cached/optimized away.
export const dynamic = 'force-dynamic';

/**
 * Where to send the reader once the code is exchanged.
 *
 * Prefers NEXT_PUBLIC_URL over `requestUrl.origin`: behind a reverse proxy or
 * preview deployment, the incoming Host header is frequently the internal
 * address, and redirecting an OAuth callback to that produces a broken link the
 * browser refuses. Falls back to the request origin when the variable is unset.
 */
function resolveOrigin(requestUrl) {
    const configured = (process.env.NEXT_PUBLIC_URL || '').trim();
    if (configured) {
        try {
            return new URL(configured).origin;
        } catch {
            console.warn(`NEXT_PUBLIC_URL is not a valid URL ("${configured}"); using the request origin.`);
        }
    }
    return requestUrl.origin;
}

/**
 * Machine-readable failure reasons mapped to something the login page can show.
 * The login page reads `?reason=`, so the two must stay in step.
 */
const REASONS = {
    missing_code: 'The sign-in link was incomplete. Please try signing in again.',
    not_configured: 'This deployment is not connected to Supabase yet.',
    exchange_failed: 'That sign-in link could not be completed. It may have expired — try again.',
    invalid_origin: 'That sign-in link was not valid for this site.',
};

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const origin = resolveOrigin(requestUrl);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next');

    const fail = (reason) => {
        const target = new URL('/login', origin);
        target.searchParams.set('reason', reason);
        if (REASONS[reason]) target.searchParams.set('detail', REASONS[reason]);
        // `next` is only echoed back when it is a same-origin path. Accepting an
        // absolute URL here would make the login page an open redirect.
        if (next && next.startsWith('/') && !next.startsWith('//')) {
            target.searchParams.set('next', next);
        }
        return NextResponse.redirect(target);
    };

    if (!code) {
        return fail('missing_code');
    }

    const supabase = await createClient();
    if (!supabase) {
        return fail('not_configured');
    }

    try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Failed to exchange auth code for session:', error);
            return fail('exchange_failed');
        }
    } catch (error) {
        // Network failure talking to Supabase. Without this the visitor gets a
        // bare 500 from the route instead of a page explaining what happened.
        console.error('Auth callback threw while exchanging code:', error);
        return fail('exchange_failed');
    }

    // Sanitised the same way as on the failure path.
    const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
    return NextResponse.redirect(new URL(destination, origin));
}
