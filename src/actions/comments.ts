'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import {
  createCommentSchema,
  deleteCommentSchema,
  type CreateCommentInput,
  type DeleteCommentInput,
} from '@/lib/validations/schemas'

type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string }

export async function createComment(input: CreateCommentInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth()
    const { client, userId } = await getAuthenticatedClient()

    const validated = createCommentSchema.parse(input)

    // Verify post exists
    const { data: post } = await client
      .from('posts')
      .select('id, slug')
      .eq('id', validated.post_id)
      .single()

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    // Create comment
    const { data: comment, error } = await client
      .from('comments')
      .insert({
        post_id: validated.post_id,
        author_id: userId,
        content: validated.content,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Create comment error:', error)
      return { success: false, error: 'Failed to create comment' }
    }

    revalidatePath(`/blog/${post.slug}`)

    return { success: true, data: { id: comment.id } }
  } catch (error) {
    console.error('Create comment action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function deleteComment(input: DeleteCommentInput): Promise<ActionResult> {
  try {
    await requireAuth()
    const { client, userId } = await getAuthenticatedClient()

    const validated = deleteCommentSchema.parse(input)

    // Check ownership
    const { data: comment, error: fetchError } = await client
      .from('comments')
      .select('author_id, post_id, posts(slug)')
      .eq('id', validated.id)
      .single()

    if (fetchError || !comment) {
      return { success: false, error: 'Comment not found' }
    }

    if (comment.author_id !== userId) {
      return { success: false, error: 'You do not have permission to delete this comment' }
    }

    // Delete comment
    const { error: deleteError } = await client
      .from('comments')
      .delete()
      .eq('id', validated.id)

    if (deleteError) {
      console.error('Delete comment error:', deleteError)
      return { success: false, error: 'Failed to delete comment' }
    }

    const postSlug = (comment.posts as any)?.slug
    if (postSlug) {
      revalidatePath(`/blog/${postSlug}`)
    }

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Delete comment action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}
