'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import {
  toggleLikeSchema,
  toggleBookmarkSchema,
  type ToggleLikeInput,
  type ToggleBookmarkInput,
} from '@/lib/validations/schemas'

type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string }

export async function toggleLike(input: ToggleLikeInput): Promise<ActionResult<{ liked: boolean }>> {
  try {
    await requireAuth()
    const { client, userId } = await getAuthenticatedClient()

    const validated = toggleLikeSchema.parse(input)

    // Check if already liked
    const { data: existing } = await client
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', validated.post_id)
      .single()

    if (existing) {
      // Unlike
      const { error } = await client
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', validated.post_id)

      if (error) {
        console.error('Unlike error:', error)
        return { success: false, error: 'Failed to unlike post' }
      }

      revalidatePath('/blog')
      return { success: true, data: { liked: false } }
    } else {
      // Like
      const { error } = await client
        .from('likes')
        .insert({
          user_id: userId,
          post_id: validated.post_id,
        })

      if (error) {
        console.error('Like error:', error)
        return { success: false, error: 'Failed to like post' }
      }

      revalidatePath('/blog')
      return { success: true, data: { liked: true } }
    }
  } catch (error) {
    console.error('Toggle like action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function toggleBookmark(input: ToggleBookmarkInput): Promise<ActionResult<{ bookmarked: boolean }>> {
  try {
    await requireAuth()
    const { client, userId } = await getAuthenticatedClient()

    const validated = toggleBookmarkSchema.parse(input)

    // Check if already bookmarked
    const { data: existing } = await client
      .from('bookmarks')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', validated.post_id)
      .single()

    if (existing) {
      // Remove bookmark
      const { error } = await client
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', validated.post_id)

      if (error) {
        console.error('Remove bookmark error:', error)
        return { success: false, error: 'Failed to remove bookmark' }
      }

      revalidatePath('/dashboard/bookmarks')
      return { success: true, data: { bookmarked: false } }
    } else {
      // Add bookmark
      const { error } = await client
        .from('bookmarks')
        .insert({
          user_id: userId,
          post_id: validated.post_id,
        })

      if (error) {
        console.error('Add bookmark error:', error)
        return { success: false, error: 'Failed to bookmark post' }
      }

      revalidatePath('/dashboard/bookmarks')
      return { success: true, data: { bookmarked: true } }
    }
  } catch (error) {
    console.error('Toggle bookmark action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}
