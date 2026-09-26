import { createBrowserClient } from '@supabase/ssr';
import {
  getConfigProblem,
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabaseConfig,
} from './config';

export { hasSupabaseConfig, getConfigProblem } from './config';

/**
 * Browser Supabase client.
 *
 * Returns `null` when the configuration is missing *or malformed*, which is the
 * signal every caller checks. Wrapped for the same reason as the server
 * client: a bad URL or key makes the constructor throw, and that would surface
 * as a React error boundary instead of the "Configuration Required" screen.
 */
export function createClient() {
  if (!hasSupabaseConfig()) return null;

  try {
    return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  } catch (error) {
    const problem = getConfigProblem();
    console.error(
      problem
        ? `Supabase browser client not created (${problem.code}): ${problem.message}`
        : 'Supabase browser client could not be created:',
      error
    );
    return null;
  }
}

