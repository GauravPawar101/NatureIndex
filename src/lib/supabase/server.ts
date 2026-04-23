import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const { userId, getToken } = await auth()

  if (!userId) {
    // Return unauthenticated client for public access
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  const token = await getToken({ template: 'supabase' })

  if (!token) {
    throw new Error('Failed to get Supabase token from Clerk')
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

export async function getAuthenticatedClient() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const client = await createServerClient()
  return { client, userId }
}
