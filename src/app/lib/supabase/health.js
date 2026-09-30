import {
    getConfigProblem,
    getSupabaseAnonKey,
    getSupabaseProjectRef,
    getSupabaseUrl,
    hasSupabaseConfig,
} from './config';

/**
 * Cheap liveness probe for the Supabase project.
 *
 * Worth having because the single most confusing auth failure — the browser's
 * bare "Failed to fetch" — is indistinguishable from a wrong password at the
 * call site. Hitting `/auth/v1/health` separates "the network/URL is broken"
 * from "the credentials are wrong", so the UI can say which one it is instead of
 * making the person guess.
 *
 * The `apikey` header is sent, because GoTrue rejects an unauthenticated
 * health probe with a 401 that is indistinguishable from a bad key.
 *
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<{ ok: boolean, reason: string, message: string, hint?: string }>}
 */
export async function checkSupabaseHealth(options = {}) {
    const { timeout = 8000 } = options;

    // Report the *specific* configuration fault (missing scheme, bad key shape)
    // rather than a generic "not configured", and do it before any network call
    // — a malformed URL would fail the fetch anyway, but with a much less
    // useful message.
    const configProblem = getConfigProblem();
    if (configProblem) {
        return {
            ok: false,
            reason: 'config',
            code: configProblem.code,
            message: configProblem.message,
            hint: configProblem.hint,
        };
    }

    const baseUrl = getSupabaseUrl();
    const projectRef = getSupabaseProjectRef();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        // The `apikey` header is required. The file comment above used to claim
        // /auth/v1/health "needs no API key", and that was true when it was
        // written — but GoTrue now returns 401 to an unauthenticated probe, with
        // `{"message":"No API key found in request"}`. So the probe was reporting
        // a *key* fault while the real fault was the probe itself, and the login
        // page told people to go re-copy a perfectly good key. Verified against
        // this project: no header -> 401, with header -> 200.
        const response = await fetch(`${baseUrl}/auth/v1/health`, {
            signal: controller.signal,
            cache: 'no-store',
            headers: { apikey: getSupabaseAnonKey() },
        });

        if (response.ok) {
            return { ok: true, reason: 'ok', message: 'Connected.' };
        }

        // With the header sent, a 401 genuinely does mean the key was rejected.
        if (response.status === 401 || response.status === 403) {
            return {
                ok: false,
                reason: 'unauthorized',
                status: response.status,
                message: `The server rejected the API key (HTTP ${response.status}).`,
                hint: 'The project URL resolved, so the anon key itself is the problem. Re-copy the "anon public" key from Supabase → Project Settings → API and redeploy — Next.js inlines NEXT_PUBLIC_* values at build time, so saving the variable is not enough.',
            };
        }

        return {
            ok: false,
            reason: 'status',
            status: response.status,
            message: `The server replied with HTTP ${response.status}.`,
            hint: projectRef
                ? `The project "${projectRef}" resolves but is not healthy — it is likely paused or deleted. Check Supabase → Project Settings.`
                : 'The project URL resolves, so the project itself is likely paused, deleted, or the URL is wrong.',
        };
    } catch (error) {
        const aborted = error?.name === 'AbortError';

        // A DNS failure is the single most common cause and is worth naming
        // precisely: it means the project ref does not exist (or was deleted),
        // which no amount of retrying will fix.
        const looksLikeDns = /Failed to fetch|fetch failed/i.test(String(error?.message || ''));

        return {
            ok: false,
            reason: aborted ? 'timeout' : 'network',
            dns: looksLikeDns,
            status: 0,
            message: aborted
                ? `No response from ${baseUrl} after ${timeout / 1000}s.`
                : `Could not reach ${baseUrl} at all.`,
            hint: projectRef
                ? `The request never left the browser, so nothing is wrong with the details you typed. Project "${projectRef}" has no DNS record, which means the project was deleted or the ref is wrong — verify the Project URL in Supabase and update .env.local. A VPN or ad blocker can cause the same symptom.`
                : 'Nothing was sent, so this is a connection or URL problem rather than a problem with the details you typed. Being offline, a VPN, an ad blocker, or a Supabase project that no longer exists all look like this.',
        };
    } finally {
        clearTimeout(timer);
    }
}

export default checkSupabaseHealth;
