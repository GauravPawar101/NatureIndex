/**
 * Utility functions for Supabase environment variables and Next.js Image configuration.
 */

/**
 * A Supabase project URL is always `https://<ref>.supabase.co` (or a custom
 * domain for a self-hosted/pro project). Validating the shape here means a
 * typo — a missing `https://`, a pasted project *name* instead of its URL, a
 * stray trailing space from hand-editing .env.local — produces one clear
 * message instead of a `fetch` failure on every request.
 */
const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;

/**
 * The anon key comes in two shapes, and rejecting the wrong one locks out a
 * correct setup:
 *
 *   - `sb_publishable_…`  the current format (2025+), an opaque prefixed string
 *   - a legacy JWT        `header.payload.signature`, still accepted by Supabase
 *
 * Checking for exactly three base64url segments would reject the publishable key
 * that the dashboard now shows by default, so both forms are allowed and only
 * obviously wrong values (a `sb_secret_` service key, a truncated paste) fail.
 */
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const PUBLISHABLE_KEY_PATTERN = /^sb_publishable_[A-Za-z0-9_-]{16,}$/;
const SECRET_KEY_PATTERN = /^sb_secret_/;

/** Trailing whitespace and a trailing slash are both easy to paste in by hand. */
function clean(value) {
    return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

export function getSupabaseUrl() {
    return clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey() {
    return clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Both variables are present *and* structurally plausible.
 *
 * @returns {boolean}
 */
export function hasSupabaseConfig() {
    return getConfigProblem() === null;
}

/**
 * Explains precisely what is wrong with the Supabase configuration.
 *
 * Returning a reason rather than a bare boolean is what lets the UI and the
 * `check-env` script say "the URL is missing the https:// prefix" instead of
 * the generic "configuration required", which is all the app used to be able
 * to say.
 *
 * @returns {{ code: string, message: string, hint: string } | null}
 */
export function getConfigProblem() {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    if (!url && !key) {
        return {
            code: 'missing_both',
            message: 'Supabase is not configured.',
            hint: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.',
        };
    }

    if (!url) {
        return {
            code: 'missing_url',
            message: 'NEXT_PUBLIC_SUPABASE_URL is not set.',
            hint: 'Copy the Project URL from Supabase → Project Settings → API and add it to .env.local.',
        };
    }

    if (!key) {
        return {
            code: 'missing_key',
            message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.',
            hint: 'Copy the anon public key from Supabase → Project Settings → API. Never use the service_role key here — it bypasses row level security.',
        };
    }

    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
        return {
            code: 'url_missing_scheme',
            message: `NEXT_PUBLIC_SUPABASE_URL is missing its "https://" prefix (found "${url}").`,
            hint: 'The value must be the full Project URL, for example https://abcdefghijklm.supabase.co.',
        };
    }

    if (!/^https:\/\//i.test(url)) {
        // A scheme is present but it is not https — worth saying so plainly,
        // rather than reporting the more confusing "missing prefix".
        return {
            code: 'url_not_supabase',
            message: `NEXT_PUBLIC_SUPABASE_URL must use https:// (found "${url}").`,
            hint: 'Supabase project URLs always start with https://. Check for an http:// or ftp:// paste.',
        };
    }

    if (!SUPABASE_URL_PATTERN.test(url)) {
        return {
            code: 'url_not_supabase',
            message: `NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL (found "${url}").`,
            hint: 'Use the Project URL, not the project name or the API host. It normally ends in .supabase.co.',
        };
    }

    if (SECRET_KEY_PATTERN.test(key)) {
        // The single most damaging mistake available in this file: a secret key
        // in a NEXT_PUBLIC_* variable is shipped to every browser in the bundle.
        return {
            code: 'key_is_secret',
            message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY contains a secret key (sb_secret_…).',
            hint: 'That key bypasses all row level security and is exposed to anyone who loads the page. Use the publishable/anon key instead, then rotate this one in the Supabase dashboard.',
        };
    }

    if (!JWT_PATTERN.test(key) && !PUBLISHABLE_KEY_PATTERN.test(key)) {
        return {
            code: 'key_malformed',
            message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a Supabase API key.',
            hint: 'Copy the publishable ("sb_publishable_…") or legacy anon key exactly. A truncated paste will fail here.',
        };
    }

    return null;
}

/**
 * The project ref embedded in the URL, useful for error messages ("project
 * abcdef is unreachable").
 */
export function getSupabaseProjectRef() {
    const url = getSupabaseUrl();
    const match = /^https:\/\/([a-z0-9-]+)\.supabase\.co$/i.exec(url);
    return match ? match[1] : null;
}

/**
 * Returns a Remote Pattern object for Next.js Image Optimization
 * if NEXT_PUBLIC_SUPABASE_URL is valid.
 */
export function getSupabaseRemotePattern() {
    const rawUrl = getSupabaseUrl();
    if (!rawUrl) return [];

    try {
        const url = new URL(rawUrl);
        return [
            {
                protocol: url.protocol.replace(':', ''),
                hostname: url.hostname,
                port: url.port || undefined,
                pathname: '/storage/v1/object/public/**',
            },
        ];
    } catch {
        return [];
    }
}
