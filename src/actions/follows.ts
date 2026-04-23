'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import {
  toggleFollowSchema,
  type ToggleFollowInput,
} from '@/lib/validations/schemas'

type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string }

export async function toggleFollow(input: ToggleFollowInput): Promise<ActionResult<{ following: boolean }>> {
  try {
    await requireAuth()
    const { client, userId } = await getAuthenticatedClient()

    const validated = toggleFollowSchema.parse(input)

    // Can't follow yourself
    if (userId === validated.following_id) {
      return { success: false, error: 'You cannot follow yourself' }
    }

    // Verify target user exists
    const { data: targetUser } = await client
      .from('profiles')
      .select('user_id')
      .eq('user_id', validated.following_id)
      .single()

    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if already following
    const { data: existing } = await client
      .from('follows')
      .select('follower_id')
      .eq('follower_id', userId)
      .eq('following_id', validated.following_id)
      .single()

    if (existing) {
      // Unfollow
      const { error } = await client
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', validated.following_id)

      if (error) {
        console.error('Unfollow error:', error)
        return { success: false, error: 'Failed to unfollow user' }
      }

      revalidatePath('/dashboard')
      revalidatePath(`/profile/${validated.following_id}`)
      return { success: true, data: { following: false } }
    } else {
      // Follow
      const { error } = await client
        .from('follows')
        .insert({
          follower_id: userId,
          following_id: validated.following_id,
        })

      if (error) {
        console.error('Follow error:', error)
        return { success: false, error: 'Failed to follow user' }
      }

      revalidatePath('/dashboard')
      revalidatePath(`/profile/${validated.following_id}`)
      return { success: true, data: { following: true } }
    }
  } catch (error) {
    console.error('Toggle follow action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}
