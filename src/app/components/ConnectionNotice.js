'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { checkSupabaseHealth } from '../lib/supabase/health';

/**
 * A quiet live indicator of whether the Supabase project is actually reachable.
 *
 * This exists because "Failed to fetch" is the least informative string the
 * browser can produce. Probing the project on mount turns an unexplained
 * failure into a sentence with a cause, and it does so *before* anyone types a
 * password — so nobody concludes their credentials are broken when the network
 * is.
 *
 * Renders nothing while healthy, so the common case costs zero visual noise.
 */
export default function ConnectionNotice({ enabled = true, recheckToken = 0 }) {
    const [result, setResult] = useState(null);
    const [checking, setChecking] = useState(enabled);
    const [showDetails, setShowDetails] = useState(false);

    // `recheckToken` lets the owning page ask for another probe after a failed
    // submit, without this component having to own that state. The probe runs
    // straight after the first `await` so no state is set synchronously inside
    // the effect body, which would trigger a cascading render.
    useEffect(() => {
        if (!enabled) return undefined;

        let cancelled = false;

        (async () => {
            const outcome = await checkSupabaseHealth();
            if (cancelled) return;
            setResult(outcome);
            setChecking(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, recheckToken]);

    // The "Try again" button is an event handler, so updating the loading state
    // up front is fine here.
    const handleRetry = useCallback(async () => {
        setChecking(true);
        const outcome = await checkSupabaseHealth();
        setResult(outcome);
        setChecking(false);
    }, []);

    if (!enabled) return null;

    if (checking && !result) {
        return (
            <p className="mb-5 flex items-center gap-2 text-xs text-[var(--ink-faint)]" role="status">
                <RefreshCw size={13} className="animate-spin" aria-hidden="true" />
                Checking connection to the sign-in service...
            </p>
        );
    }

    // Only the failure path earns screen space.
    if (!result || result.ok) return null;

    const isNetwork = result.reason === 'network' || result.reason === 'timeout';
    const Icon = isNetwork ? WifiOff : AlertTriangle;

    // A configuration fault cannot be fixed by retrying, so it gets no
    // "Try again" button — offering one just invites pointless clicking.
    const retryable = result.reason !== 'config';

    const heading = {
        config: 'Sign-in is not configured',
        network: result.dns ? 'Supabase project not found' : 'Cannot reach the sign-in service',
        timeout: 'Sign-in service timed out',
        unauthorized: 'Supabase rejected the API key',
        status: 'Sign-in service returned an error',
    }[result.reason] || 'Sign-in is unavailable';

    return (
        <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-left"
        >
            <div className="flex items-start gap-3">
                <Icon size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-200">{heading}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-amber-100/80">{result.message}</p>
                    {result.hint && <p className="mt-1.5 text-xs leading-relaxed text-amber-100/60">{result.hint}</p>}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {retryable && (
                            <button
                                type="button"
                                onClick={handleRetry}
                                disabled={checking}
                                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/10 disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={checking ? 'animate-spin' : ''} aria-hidden="true" />
                                {checking ? 'Checking...' : 'Try again'}
                            </button>
                        )}

                        {/* The exact failing value matters when someone is
                            debugging a config problem, and copying it beats
                            retyping a 40-character project ref. */}
                        <button
                            type="button"
                            onClick={() => setShowDetails((open) => !open)}
                            aria-expanded={showDetails}
                            className="text-xs font-semibold text-amber-200/70 underline underline-offset-2 transition-colors hover:text-amber-100"
                        >
                            {showDetails ? 'Hide details' : 'Details'}
                        </button>
                    </div>

                    {showDetails && (
                        <dl className="mt-3 space-y-1 rounded-lg bg-black/40 p-3 font-mono text-[11px] text-amber-100/70">
                            <div className="flex gap-2">
                                <dt className="shrink-0 text-amber-200/60">reason</dt>
                                <dd>{result.reason}{result.code ? ` (${result.code})` : ''}</dd>
                            </div>
                            {typeof result.status === 'number' && (
                                <div className="flex gap-2">
                                    <dt className="shrink-0 text-amber-200/60">http</dt>
                                    <dd>{result.status || 'no response'}</dd>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <dt className="shrink-0 text-amber-200/60">env</dt>
                                <dd>NEXT_PUBLIC_SUPABASE_URL</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </div>
        </div>
    );
}
