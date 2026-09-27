#!/usr/bin/env node
/**
 * Empties the content tables so `npm run seed` can repopulate them.
 *
 *   npm run truncate            # dry run, prints the row counts
 *   npm run truncate -- --yes   # actually delete
 *
 * This is deliberately separate from `seed.mjs --reset`, which only removes
 * rows carrying a seeded marker. That is the right tool for "re-run the seed",
 * but it cannot see rows inserted by hand or by an older seed, so a database
 * that accumulated test data keeps serving it. This removes everything.
 *
 * Only the tables below are touched, children before parents, so no delete
 * trips a foreign key. Auth users are left alone: removing them is a separate,
 * more destructive operation with its own consequences, and the seeder
 * recreates the accounts it needs.
 *
 * Every request is retried with backoff. Supabase hostnames intermittently
 * fail to resolve on some networks, and a half-applied truncate is worse than
 * no truncate, so the script is safe to re-run: it is idempotent by
 * construction, since deleting an already-empty table is a no-op.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
    // `.env.local` wins, matching how Next.js and seed.mjs resolve config.
    for (const file of ['.env.local', '.env']) {
        const path = resolve(root, file);
        if (!existsSync(path)) continue;
        for (const line of readFileSync(path, 'utf8').split('\n')) {
            const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
            if (!match) continue;
            const value = match[2].replace(/^["']|["']$/g, '');
            if (process.env[match[1]] === undefined) process.env[match[1]] = value;
        }
    }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'RLS permits owners to write only their own rows, so wiping needs the service role key.'
    );
    process.exit(1);
}

const confirmed = process.argv.includes('--yes');

/**
 * Children first. `key` is a column present on every row and unique enough to
 * filter a DELETE on — PostgREST refuses an unfiltered DELETE.
 *
 * Only genuine tables are listed. `interaction`, `posts_with_author` and
 * `posts_comment_count` are views over the tables below, so they disappear on
 * their own once the underlying rows are gone.
 */
const TABLES = [
    { table: 'post_interactions', key: 'id' },
    { table: 'cf_user_scores', key: 'post_id' },
    { table: 'pagerank_scores', key: 'post_id' },
    { table: 'comments', key: 'id' },
    { table: 'posts', key: 'id' },
    { table: 'profiles', key: 'id' },
];

const BATCH = 200;
const MAX_ATTEMPTS = 6;

const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Postgres errors that no amount of retrying will fix. PostgREST surfaces
 * these with a string `code` (a SQLSTATE, or a PGRSTxxx) rather than an HTTP
 * status, so the status check alone would retry a permanent failure until it
 * timed out. A view, a missing relation or a constraint violation is skipped
 * instead of aborting the run.
 */
const PERMANENT = /cannot delete from view|is not a table|does not exist|permission denied|violates|invalid |not a relation|cannot truncate/i;

function isPermanent(error) {
    const status = error?.status ?? error?.code;
    if (typeof status === 'number' && status >= 400 && status < 500) return true;
    if (typeof status === 'string' && /^(PGRST|22|23|25|28|42|55|2F|3D|3F|40|54|XX)/.test(status)) return true;
    return PERMANENT.test(error?.message || '');
}

/**
 * Retries on the failure mode that actually happens here: a transient DNS miss
 * on the Supabase hostname, or a connection dropped mid-request. A permanent
 * error is returned to the caller so it can skip that one table and carry on.
 */
async function withRetry(label, fn) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            if (isPermanent(error)) throw Object.assign(error, { permanent: true });
            lastError = error;
            const wait = Math.min(1000 * 2 ** (attempt - 1), 15000);
            const reason = error?.cause?.code || error?.message || String(error);
            console.log(`  retry ${attempt}/${MAX_ATTEMPTS} ${label}: ${reason}`);
            await sleep(wait);
        }
    }
    throw lastError;
}

async function countRows(table) {
    const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
    if (error) throw Object.assign(new Error(error.message), { status: error.code });
    return count ?? 0;
}

async function deleteAll(table, key) {
    // Track keys seen rather than rows deleted: when `key` is not unique (a
    // composite-key table filtered on one column), a single `.in()` can remove
    // several rows, so counting keys would under-report. The caller verifies
    // with a real count afterwards.
    const seen = new Set();
    for (;;) {
        const { data, error } = await supabase.from(table).select(key).limit(BATCH);
        if (error) throw Object.assign(new Error(error.message), { status: error.code });
        if (!data || data.length === 0) break;

        const keys = [...new Set(data.map((row) => row[key]).filter((v) => v !== null))];
        if (keys.length === 0) break;

        const { error: delError } = await supabase.from(table).delete().in(key, keys);
        if (delError) throw Object.assign(new Error(delError.message), { status: delError.code });

        for (const value of keys) seen.add(value);
        if (data.length < BATCH) break;
    }
    return seen.size;
}

async function main() {
    console.log(confirmed ? 'MODE: DELETE (--yes)' : 'MODE: dry run (pass --yes to delete)\n');

    // Count first, so the dry run reports something meaningful and the
    // destructive run can show what it is about to touch.
    const plan = [];
    for (const { table, key } of TABLES) {
        let count;
        try {
            count = await withRetry(`count ${table}`, () => countRows(table));
        } catch (error) {
            // A view or a table the service role cannot read is not a failure
            // of this script; report and move on.
            console.log(`  ${table.padEnd(20)} skipped: ${error.message}`);
            continue;
        }
        plan.push({ table, key, count });
        console.log(`  ${table.padEnd(20)} ${String(count).padStart(6)} rows`);
    }

    const total = plan.reduce((sum, entry) => sum + entry.count, 0);
    console.log(`\n  ${total} rows across ${plan.length} tables`);

    if (!confirmed) {
        console.log('\nDry run only. Re-run with --yes to delete these rows.');
        return;
    }

    if (total === 0) {
        console.log('\nNothing to delete.');
        return;
    }

    console.log('\nDeleting...');
    const skipped = [];
    for (const { table, key, count } of plan) {
        if (count === 0) continue;
        try {
            await withRetry(`delete ${table}`, () => deleteAll(table, key));
            const remaining = await withRetry(`recount ${table}`, () => countRows(table));
            console.log(`  ${table.padEnd(20)} removed ${count - remaining}`);
        } catch (error) {
            if (!error.permanent) throw error;
            // A view, or something this key cannot address. Not worth losing
            // the rest of the run over.
            skipped.push(`${table} (${error.message})`);
            console.log(`  ${table.padEnd(20)} skipped: ${error.message}`);
        }
    }
    if (skipped.length) {
        console.log(`\n  ${skipped.length} table(s) skipped: ${skipped.join('; ')}`);
    }

    console.log('\nVerifying...');
    for (const { table } of plan) {
        const remaining = await withRetry(`verify ${table}`, () => countRows(table));
        console.log(`  ${table.padEnd(20)} ${remaining === 0 ? 'empty' : `WARNING ${remaining} left`}`);
    }

    console.log('\nTruncate complete. Run `npm run seed` to repopulate.');
}

main().catch((error) => {
    console.error(`\ntruncate failed: ${error.message}`);
    console.error('The script is idempotent — re-run it once the connection is stable.');
    process.exit(1);
});
