'use client'

import { useAuth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { Database } from '../types/database.types'

export function createBrowserClient(token?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  })
}

export function useSupabase() {
  const { isLoaded, userId, getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadToken() {
      if (!isLoaded || !userId) {
        if (!cancelled) setToken(null)
        return
      }

      try {
        const t = await getToken({ template: 'supabase' })
        if (!cancelled) setToken(t || null)
      } catch {
        if (!cancelled) setToken(null)
      }
    }

    loadToken()

    return () => {
      cancelled = true
    }
  }, [getToken, isLoaded, userId])

  const client = useMemo(() => {
    try {
      return createBrowserClient(token)
    } catch {
      return null
    }
  }, [token])

  return {
    client,
    token,
    userId,
    isLoaded,
    isAuthenticated: !!userId,
  }
}
