#!/usr/bin/env node
/**
 * Diagnose the Supabase configuration and connectivity from the terminal.
 *
 * Run this first when login or uploads fail. The browser can only report
 * "Failed to fetch", which does not distinguish a missing https:// prefix from
 * a deleted project from an ad blocker — this script separates them and tells
 * you which line of .env.local to change.
 *
 *   npm run check:env
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

let failures = 0;
let warnings = 0;

function pass(label, detail = '') {
    console.log(`  ${GREEN}PASS${RESET}  ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
}
function warn(label, detail = '') {
    warnings += 1;
    console.log(`  ${YELLOW}WARN${RESET}  ${label}${detail ? `\n        ${detail}` : ''}`);
}
function fail(label, detail = '') {
    failures += 1;
    console.log(`  ${RED}FAIL${RESET}  ${label}${detail ? `\n        ${detail}` : ''}`);
}
function section(title) {
    console.log(`\n${BOLD}${title}${RESET}`);
}

// --- Load env the same way Next.js does -------------------------------------

section('Environment files');

for (const file of ['.env.local', '.env']) {
    const path = resolve(root, file);
    if (!existsSync(path)) {
        console.log(`  ${DIM}skip${RESET}  ${file} (not present)`);
        continue;
    }
    // Counts only real assignments, so commented-out lines do not read as set.
    const assigned = readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line)).length;
    pass(`${file} present`, `(${assigned} assignment${assigned === 1 ? '' : 's'})`);
}

if (!existsSync(resolve(root, '.env.local')) && !existsSync(resolve(root, '.env'))) {
    fail('No .env.local or .env found', 'Copy .env.example to .env.local and fill it in.');
    process.exit(1);
}

// Values are parsed the way dotenv does, so this reports what the app sees.
let env = {};
try {
    require('dotenv').config({ path: resolve(root, '.env.local') });
    require('dotenv').config({ path: resolve(root, '.env') });
    env = process.env;
} catch {
    console.log(`  ${DIM}note${RESET}  dotenv unavailable; falling back to manual parsing`);
    for (const file of ['.env.local', '.env']) {
        const path = resolve(root, file);
        if (!existsSync(path)) continue;
        for (const line of readFileSync(path, 'utf8').split('\n')) {
            const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
            if (match && env[match[1]] === undefined) {
                env[match[1]] = match[2].replace(/^["']|["']$/g, '');
            }
        }
    }
}

// --- Validate the values -----------------------------------------------------

section('Configuration values');

const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const anonKey = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!url) {
    fail('NEXT_PUBLIC_SUPABASE_URL is not set', 'Supabase → Project Settings → API → Project URL');
} else if (!/^https?:\/\//i.test(url)) {
    fail('NEXT_PUBLIC_SUPABASE_URL is missing https://', `Found: "${url}"`);
} else {
    pass('NEXT_PUBLIC_SUPABASE_URL has a scheme', url);
}

const ref = /^https:\/\/([a-z0-9-]+)\.supabase\.co$/i.exec(url)?.[1];
if (url && !ref && /^https?:\/\//i.test(url)) {
    fail('NEXT_PUBLIC_SUPABASE_URL is not a Supabase project URL', `Found: "${url}" — expected https://<ref>.supabase.co`);
} else if (ref) {
    pass('Project ref extracted', ref);
}

if (!anonKey) {
    fail('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set', 'Use the publishable/anon key, never a secret key.');
} else if (/^sb_secret_/.test(anonKey)) {
    fail('NEXT_PUBLIC_SUPABASE_ANON_KEY holds a secret key (sb_secret_…)', [
        'A secret key bypasses all row level security and, in a NEXT_PUBLIC_* variable, is shipped to every browser.',
        'Replace it with the publishable key, then rotate the exposed one in Supabase → Project Settings → API Keys.',
    ].join('\n        '));
} else if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(anonKey) && !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(anonKey)) {
    fail('NEXT_PUBLIC_SUPABASE_ANON_KEY is not a well-formed key', 'Expected sb_publishable_… (current) or a three-part legacy JWT. Check for a truncated paste.');
} else {
    pass('NEXT_PUBLIC_SUPABASE_ANON_KEY is well-formed', `${anonKey.slice(0, 12)}…${anonKey.slice(-4)}`);
}

if (anonKey && serviceKey && anonKey === serviceKey) {
    fail('The anon key and service_role key are identical', 'The service_role key bypasses all row level security. Never put it in NEXT_PUBLIC_* — it is shipped to every browser.');
} else if (anonKey && serviceKey) {
    pass('anon key differs from service_role key');
}

if (/^sb_publishable_/.test(anonKey)) {
    pass('Using the current publishable key format');
} else if (anonKey) {
    warn('This is a legacy anon JWT key', 'Still supported, but the publishable key (sb_publishable_…) is the current recommendation.');
}

const appUrl = (env.NEXT_PUBLIC_URL || '').trim();
if (!appUrl) {
    warn('NEXT_PUBLIC_URL is not set', 'Falls back to the request origin. Set it when deploying behind a proxy so auth callbacks redirect correctly.');
} else if (!/^https?:\/\//i.test(appUrl)) {
    fail('NEXT_PUBLIC_URL is not a valid URL', `Found: "${appUrl}"`);
} else {
    pass('NEXT_PUBLIC_URL is valid', appUrl);
}

// --- Network reachability ----------------------------------------------------

section('Network reachability');

if (!ref) {
    console.log(`  ${DIM}skip${RESET}  cannot test connectivity without a valid project URL`);
} else {
    const host = `${ref}.supabase.co`;
    let addresses = [];
    try {
        const { promises: dns } = await import('node:dns');
        addresses = (await dns.resolve4(host)).catch(() => []);
    } catch {
        addresses = [];
    }

    if (addresses.length) {
        pass(`${host} resolves`, addresses.slice(0, 2).join(', '));
    } else {
        fail(`${host} does not resolve in DNS`, [
            'This is the cause of "Failed to fetch" in the browser, and no code change will fix it.',
            'Either the project was deleted, or NEXT_PUBLIC_SUPABASE_URL holds the wrong project ref.',
            `Check Supabase → your project → Project Settings → Data API for the current URL.`,
        ].join('\n        '));
    }

    // Only attempt HTTP when DNS works, so the error is unambiguous.
    if (addresses.length) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`https://${host}/auth/v1/health`, {
                signal: controller.signal,
                cache: 'no-store',
            });

            if (response.ok) {
                pass('auth health endpoint responds', 'HTTP 200');
            } else if (response.status === 401 || response.status === 403) {
                fail('auth endpoint rejected the request', `HTTP ${response.status} — the anon key is likely wrong.`);
            } else {
                warn('auth health endpoint returned an error', `HTTP ${response.status} — the project may be paused.`);
            }
        } catch (error) {
            fail('Could not reach the auth endpoint', String(error?.message || error));
        } finally {
            clearTimeout(timer);
        }

        // A real end-to-end check of the key, which the health endpoint skips.
        if (anonKey) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            try {
                const response = await fetch(`https://${host}/auth/v1/settings`, {
                    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
                    signal: controller.signal,
                    cache: 'no-store',
                });

                if (response.ok) {
                    pass('anon key is accepted by the auth server');
                } else if (response.status === 401) {
                    fail('anon key is rejected (HTTP 401)', 'Re-copy the "anon public" key from Supabase → Project Settings → API.');
                } else {
                    warn('auth settings request returned', `HTTP ${response.status}`);
                }
            } catch (error) {
                warn('Could not verify the anon key', String(error?.message || error));
            } finally {
                clearTimeout(timer);
            }
        }
    }
}

// --- Summary -----------------------------------------------------------------

section('Summary');
console.log(`  ${failures} failed, ${warnings} warning${warnings === 1 ? '' : 's'}`);

if (failures > 0) {
    console.log(`\n${BOLD}Login and uploads cannot work until the failures above are fixed.${RESET}`);
    console.log(`${DIM}They are all environment problems, not application bugs.${RESET}\n`);
    process.exit(1);
}

console.log(`\n${GREEN}${BOLD}Configuration looks good.${RESET} Uploads additionally require the`);
console.log('storage buckets from supabase/schema.sql:');
console.log('  avatars, post-images, comment-images\n');
process.exit(0);
