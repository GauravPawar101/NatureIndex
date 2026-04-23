import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function createSupabaseClerkServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { userId: null, token: null, supabase: null };
  }

  const { userId, getToken } = await auth();
  if (!userId) {
    return { userId: null, token: null, supabase: null };
  }

  const token = await getToken({ template: 'supabase' });
  if (!token) {
    return { userId, token: null, supabase: null };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return { userId, token, supabase };
}
