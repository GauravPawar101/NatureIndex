'use client';

import { useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';

export function createSupabaseClientWithClerkToken(token) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

export function useSupabaseWithClerk() {
  const { isLoaded, userId, getToken } = useAuth();
  const [token, setToken] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isLoaded || !userId) {
        if (!cancelled) setToken(null);
        return;
      }

      try {
        const t = await getToken({ template: 'supabase' });
        if (!cancelled) setToken(t || null);
      } catch {
        if (!cancelled) setToken(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, userId]);

  const supabase = useMemo(() => {
    try {
      return createSupabaseClientWithClerkToken(token);
    } catch {
      return null;
    }
  }, [token]);

  return { supabase, token, userId, isLoaded };
}
