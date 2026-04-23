'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/lib/validations/schemas'

type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string }

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult<{ username: string }>> {
  try {
    await requireAuth()
    const { client, userId } = await getAuthenticatedClient()

    const validated = updateProfileSchema.parse(input)

    // Get current profile
    const { data: currentProfile } = await client
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .single()

    if (!currentProfile) {
      return { success: false, error: 'Profile not found' }
    }

    // Check username uniqueness if changed
    if (validated.username && validated.username !== currentProfile.username) {
      const { data: usernameExists } = await client
        .from('profiles')
        .select('user_id')
        .eq('username', validated.username)
        .neq('user_id', userId)
        .single()

      if (usernameExists) {
        return { success: false, error: 'Username already taken' }
      }
    }

    // Build update object
    const updateData: any = {}
    if (validated.username !== undefined) updateData.username = validated.username
    if (validated.bio !== undefined) updateData.bio = validated.bio
    if (validated.website !== undefined) updateData.website = validated.website || null
    if (validated.twitter !== undefined) updateData.twitter = validated.twitter
    if (validated.full_name !== undefined) updateData.full_name = validated.full_name

    // Update profile
    const { data: updated, error } = await client
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select('username')
      .single()

    if (error) {
      console.error('Update profile error:', error)
      return { success: false, error: 'Failed to update profile' }
    }

    revalidatePath('/account')
    revalidatePath(`/profile/${updated.username}`)

    return { success: true, data: { username: updated.username } }
  } catch (error) {
    console.error('Update profile action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}
