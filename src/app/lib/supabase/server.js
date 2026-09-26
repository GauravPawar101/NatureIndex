import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getConfigProblem, getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig } from './config';

export { hasSupabaseConfig } from './config';

/**
 * Server-side Supabase client bound to the request cookies.
 *
 * Returns `null` when Supabase is not configured, which is the signal every
 * caller already checks. The `createServerClient` call is wrapped because a
 * malformed URL or key makes the constructor itself throw, and this runs inside
 * page renders — an uncaught throw there is a 500 for the whole page rather than
 * the "configuration required" screen the app is trying to show.
 */
export async function createClient() {
  if (!hasSupabaseConfig()) return null;

  // `cookies()` is called *outside* the try on purpose. During static
  // generation it throws Next's DynamicServerError to signal "this route needs
  // per-request rendering" — that is control flow, not a failure, and catching
  // it would mark cookie-reading routes as static and log a bogus error on every
  // build.
  const cookieStore = await cookies();

  try {
    return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. Next re-runs this for the
            // middleware and Route Handlers, which can — so swallowing it here
            // is correct rather than a lost error.
          }
        },
      },
    });
  } catch (error) {
    const problem = getConfigProblem();
    console.error(
      problem
        ? `Supabase client not created (${problem.code}): ${problem.message}`
        : 'Supabase client could not be created:',
      error
    );
    return null;
  }
}
