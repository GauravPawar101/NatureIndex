'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import {
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  type CreatePostInput,
  type UpdatePostInput,
  type DeletePostInput,
} from '@/lib/validations/schemas'

type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string }

export async function createPost(input: CreatePostInput): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    // Verify auth and role
    await requireRole(['admin', 'author'])
    const { client, userId } = await getAuthenticatedClient()

    // Validate input
    const validated = createPostSchema.parse(input)

    // Check if slug already exists
    const { data: existing } = await client
      .from('posts')
      .select('id')
      .eq('slug', validated.slug)
      .single()

    if (existing) {
      return { success: false, error: 'A post with this slug already exists' }
    }

    // Create post
    const { data: post, error } = await client
      .from('posts')
      .insert({
        author_id: userId,
        title: validated.title,
        slug: validated.slug,
        content: validated.content,
        summary: validated.summary || null,
        cover_image: validated.cover_image || null,
        cover_blur: validated.cover_blur || null,
        status: validated.status,
        date: validated.date || new Date().toISOString(),
      })
      .select('id, slug')
      .single()

    if (error) {
      console.error('Create post error:', error)
      return { success: false, error: 'Failed to create post' }
    }

    // Handle tags if provided
    if (validated.tags && validated.tags.length > 0) {
      await handlePostTags(client, post.id, validated.tags)
    }

    revalidatePath('/blog')
    revalidatePath('/dashboard')

    return { success: true, data: { id: post.id, slug: post.slug } }
  } catch (error) {
    console.error('Create post action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function updatePost(input: UpdatePostInput): Promise<ActionResult<{ slug: string }>> {
  try {
    await requireRole(['admin', 'author'])
    const { client, userId } = await getAuthenticatedClient()

    const validated = updatePostSchema.parse(input)

    // Check ownership
    const { data: existing, error: fetchError } = await client
      .from('posts')
      .select('author_id, slug')
      .eq('id', validated.id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Post not found' }
    }

    if (existing.author_id !== userId) {
      return { success: false, error: 'You do not have permission to edit this post' }
    }

    // Check slug uniqueness if changed
    if (validated.slug && validated.slug !== existing.slug) {
      const { data: slugExists } = await client
        .from('posts')
        .select('id')
        .eq('slug', validated.slug)
        .neq('id', validated.id)
        .single()

      if (slugExists) {
        return { success: false, error: 'A post with this slug already exists' }
      }
    }

    // Update post
    const updateData: any = {}
    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.slug !== undefined) updateData.slug = validated.slug
    if (validated.content !== undefined) updateData.content = validated.content
    if (validated.summary !== undefined) updateData.summary = validated.summary
    if (validated.cover_image !== undefined) updateData.cover_image = validated.cover_image
    if (validated.cover_blur !== undefined) updateData.cover_blur = validated.cover_blur
    if (validated.status !== undefined) updateData.status = validated.status
    if (validated.date !== undefined) updateData.date = validated.date

    const { data: updated, error: updateError } = await client
      .from('posts')
      .update(updateData)
      .eq('id', validated.id)
      .select('slug')
      .single()

    if (updateError) {
      console.error('Update post error:', updateError)
      return { success: false, error: 'Failed to update post' }
    }

    // Handle tags if provided
    if (validated.tags !== undefined) {
      await handlePostTags(client, validated.id, validated.tags)
    }

    revalidatePath('/blog')
    revalidatePath(`/blog/${updated.slug}`)
    revalidatePath('/dashboard')

    return { success: true, data: { slug: updated.slug } }
  } catch (error) {
    console.error('Update post action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function deletePost(input: DeletePostInput): Promise<ActionResult> {
  try {
    await requireRole(['admin', 'author'])
    const { client, userId } = await getAuthenticatedClient()

    const validated = deletePostSchema.parse(input)

    // Check ownership
    const { data: existing, error: fetchError } = await client
      .from('posts')
      .select('author_id, slug')
      .eq('id', validated.id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Post not found' }
    }

    if (existing.author_id !== userId) {
      return { success: false, error: 'You do not have permission to delete this post' }
    }

    // Delete post (cascade will handle related records)
    const { error: deleteError } = await client
      .from('posts')
      .delete()
      .eq('id', validated.id)

    if (deleteError) {
      console.error('Delete post error:', deleteError)
      return { success: false, error: 'Failed to delete post' }
    }

    revalidatePath('/blog')
    revalidatePath('/dashboard')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Delete post action error:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

async function handlePostTags(client: any, postId: string, tagNames: string[]) {
  // Remove existing tags
  await client.from('post_tags').delete().eq('post_id', postId)

  if (tagNames.length === 0) return

  // Get or create tags
  const tagIds: string[] = []

  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/\s+/g, '-')

    const { data: tag } = await client
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .single()

    if (tag) {
      tagIds.push(tag.id)
    } else {
      const { data: newTag } = await client
        .from('tags')
        .insert({ name, slug })
        .select('id')
        .single()

      if (newTag) {
        tagIds.push(newTag.id)
      }
    }
  }

  // Create post_tags relationships
  if (tagIds.length > 0) {
    await client
      .from('post_tags')
      .insert(tagIds.map(tag_id => ({ post_id: postId, tag_id })))
  }
}
