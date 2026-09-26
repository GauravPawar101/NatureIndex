/**
 * Friendly, human-readable messages for the auth errors Supabase returns.
 *
 * The raw `error.message` coming out of GoTrue is written for developers, not
 * for people ("Invalid login credentials", "Email not confirmed",
 * "Database error saving new user", and worst of all the bare
 * "Failed to fetch" the browser produces when a request never leaves the
 * machine). This module turns those into a title / message / hint triple the
 * UI can render directly.
 *
 * Matching is done on the message + `status` + `code` fields because
 * supabase-js surfaces different shapes depending on which layer failed
 * (network vs. GoTrue vs. Postgres trigger).
 */

const NETWORK_PATTERN = /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet_disconnected|err_name_not_resolved/i;

const DEFAULT_MESSAGES = {
    'sign-in': 'We could not sign you in. Please try again.',
    'sign-up': 'We could not create your account. Please try again.',
    'sign-out': 'We could not sign you out. Please try again.',
};

/**
 * Best-effort extraction of the configured Supabase host, so network failures
 * can name the exact endpoint that was unreachable.
 */
function getSupabaseHost() {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!raw) return null;
    try {
        return new URL(raw).host;
    } catch {
        return null;
    }
}

function readMessage(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error.message === 'string') return error.message;
    return String(error);
}

function readStatus(error) {
    if (!error || typeof error !== 'object') return null;
    return typeof error.status === 'number' ? error.status : null;
}

function readCode(error) {
    if (!error || typeof error !== 'object') return '';
    return typeof error.code === 'string' ? error.code : '';
}

/**
 * "Failed to fetch" is thrown by `fetch()` itself when the request never
 * completes: DNS failure, offline device, VPN, ad blocker, CORS, or a paused
 * / deleted project. Nothing about the password or email is wrong, so the
 * message needs to say that explicitly and point at the real suspects.
 */
function describeNetworkFailure() {
    const host = getSupabaseHost();
    const target = host ? ` ${host}` : ' the authentication server';

    return {
        kind: 'network',
        title: "Can't reach the server",
        message: `The request to${target} never completed, so we never got to check your details.`,
        hint: `This is a connection problem, not a wrong email or password. Check that you are online, then try again — and if it persists, verify NEXT_PUBLIC_SUPABASE_URL in .env.local matches a live Supabase project (a deleted project or a typo'd project ref fails exactly this way).`,
    };
}

/**
 * @param {unknown} error  Supabase `AuthError`, a thrown `TypeError`, or a string.
 * @param {{ action?: 'sign-in' | 'sign-up' | 'sign-out' }} [options]
 * @returns {{ kind: string, title: string, message: string, hint?: string }}
 */
export function describeAuthError(error, options = {}) {
    const { action = 'sign-in' } = options;
    const message = readMessage(error);
    const status = readStatus(error);
    const code = readCode(error);
    const haystack = `${message} ${code}`;

    // No client at all -> the env vars are missing entirely.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return {
            kind: 'config',
            title: 'Configuration required',
            message: 'This app is not connected to Supabase yet, so signing in is disabled.',
            hint: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.',
        };
    }

    if (NETWORK_PATTERN.test(haystack) || status === 0) {
        return describeNetworkFailure();
    }

    if (/invalid login credentials/i.test(haystack)) {
        // Deliberately does not say *which* field was wrong — telling an
        // anonymous visitor that an email is registered turns the login form
        // into an account-enumeration oracle.
        return {
            kind: 'credentials',
            title: 'Incorrect email or password',
            message: 'That email and password combination did not match an account.',
            hint: 'Check for typos and make sure Caps Lock is off. If you have forgotten the password, reset it from the Supabase dashboard or the reset-password flow.',
        };
    }

    if (/email.*not.*confirmed|confirm.*email/i.test(haystack) && !/already/i.test(haystack)) {
        return {
            kind: 'confirm-email',
            title: 'Email not confirmed yet',
            message: 'Your account exists, but the confirmation email has not been completed.',
            hint: 'Open the confirmation link we sent you, then come back and sign in.',
        };
    }

    if (/user already registered|already been registered|already exists/i.test(haystack)) {
        return {
            kind: 'email-taken',
            title: 'That email is already registered',
            message: 'An account already exists for this email address.',
            hint: 'Try signing in instead, or reset the password if you have lost access.',
        };
    }

    if (/password should be at least (\d+) characters?/i.test(haystack)) {
        const min = message.match(/at least (\d+) characters?/i)?.[1] || '8';
        return {
            kind: 'weak-password',
            title: 'Password is too short',
            message: `Supabase requires at least ${min} characters.`,
            hint: 'Make it longer, or add a mix of letters, numbers and symbols.',
        };
    }

    if (/invalid format|unable to validate email|invalid email/i.test(haystack)) {
        return {
            kind: 'bad-email',
            title: 'That email address looks invalid',
            message: 'Supabase could not accept this address.',
            hint: 'Double-check the spelling and that it includes a domain, for example you@example.com.',
        };
    }

    if (status === 429 || /rate limit|too many requests|security purposes|over_request_rate/i.test(haystack)) {
        return {
            kind: 'rate-limit',
            title: 'Too many attempts',
            message: 'You have tried this a few times in a row, so Supabase has paused requests for a moment.',
            hint: 'Wait about a minute, then try again. If you are testing, this is also the usual cause of failures right after a fresh signup.',
        };
    }

    if (/captcha/i.test(haystack)) {
        return {
            kind: 'captcha',
            title: 'Verification failed',
            message: 'Supabase could not confirm you are human for this attempt.',
            hint: 'Reload the page and try once more. Automated retrying tends to make this worse.',
        };
    }

    if (/signups not allowed|signups are disabled|registration.*disabled/i.test(haystack)) {
        return {
            kind: 'signup-disabled',
            title: 'New signups are paused',
            message: 'This project currently has open signups turned off.',
            hint: 'If you already have an account, just sign in instead.',
        };
    }

    if (/session.*(missing|not found|expired)|jwt.*expired|token.*expired/i.test(haystack)) {
        return {
            kind: 'session',
            title: 'Your session expired',
            message: 'You were signed out somewhere else, or the session timed out.',
            hint: 'Sign in again to continue.',
        };
    }

    if (status === 401 || status === 403) {
        return {
            kind: 'unauthorized',
            title: 'Not allowed',
            message: 'Supabase rejected this request.',
            hint: 'If this keeps happening, the anon key may be wrong or the account may lack permission.',
        };
    }

    if (status >= 500 || /database error|internal error|service unavailable|unexpected/i.test(haystack)) {
        return {
            kind: 'server',
            title: 'Something went wrong on our side',
            message: 'Supabase hit an internal error while handling the request.',
            hint: 'This is not something you did wrong. Wait a moment and try again — if it persists, check the Supabase project logs.',
        };
    }

    return {
        kind: 'unknown',
        title: 'Sign in failed',
        message: message || DEFAULT_MESSAGES[action] || DEFAULT_MESSAGES['sign-in'],
        hint: 'If this keeps happening, check the browser console and the Supabase dashboard logs for the matching entry.',
    };
}

export default describeAuthError;
