'use client';

import { AlertTriangle } from 'lucide-react';
import { getConfigProblem } from '../lib/supabase/config';

/**
 * Shown instead of a form when Supabase is unusable.
 *
 * Previously this was a hand-copied block in both auth pages that only said
 * "set these two variables" — which was actively unhelpful when the variables
 * *were* set but the URL was missing `https://` or the project had been
 * deleted. It now names the specific fault via `getConfigProblem()`.
 */
export default function ConfigurationRequired() {
    const problem = getConfigProblem();

    return (
        <div className="page-shell flex items-center justify-center px-6">
            <div className="glass-card w-full max-w-md p-8 text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                    <AlertTriangle size={22} aria-hidden="true" />
                </span>

                <h1 className="mb-3 text-2xl font-bold text-white">
                    {problem?.code === 'missing_both' || !problem
                        ? 'Configuration Required'
                        : 'Supabase configuration problem'}
                </h1>

                <p className="text-sm leading-relaxed text-gray-400">
                    {problem?.message || 'The app is not connected to Supabase yet.'}
                </p>

                {problem?.hint && (
                    <p className="mt-3 text-sm leading-relaxed text-gray-300">{problem.hint}</p>
                )}

                <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-4 text-left">
                    <p className="mb-2 text-xs font-semibold text-gray-300">Set these in .env.local</p>
                    <ul className="space-y-1 font-mono text-xs text-gray-400">
                        <li><code className="text-white">NEXT_PUBLIC_SUPABASE_URL</code></li>
                        <li><code className="text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-500">
                        Then restart the dev server — Next.js only reads these at startup.
                    </p>
                </div>

                <p className="mt-5 text-xs text-gray-500">
                    Run <code className="text-gray-300">npm run check:env</code> to diagnose this
                    from the terminal.
                </p>
            </div>
        </div>
    );
}
