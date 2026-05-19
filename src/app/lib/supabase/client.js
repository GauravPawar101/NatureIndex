import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig } from './config';

export { hasSupabaseConfig } from './config';

export function createClient() {
  if (!hasSupabaseConfig()) return null;

  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  );
}
