import { z } from 'zod'

// Post schemas
export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200, 'Slug too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().max(500, 'Summary too long').optional().nullable(),
  cover_image: z.string().url('Invalid image URL').optional().nullable(),
  cover_blur: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  date: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
})

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.string().uuid('Invalid post ID'),
})

export const deletePostSchema = z.object({
  id: z.string().uuid('Invalid post ID'),
})

// Comment schemas
export const createCommentSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
})

export const deleteCommentSchema = z.object({
  id: z.string().uuid('Invalid comment ID'),
})

// Reaction schemas
export const toggleLikeSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
})

export const toggleBookmarkSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
})

// Follow schemas
export const toggleFollowSchema = z.object({
  following_id: z.string().min(1, 'User ID is required'),
})

// Profile schemas
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .optional(),
  bio: z.string().max(500, 'Bio too long').optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  twitter: z.string().max(50, 'Twitter handle too long').optional().nullable(),
  full_name: z.string().max(100, 'Name too long').optional().nullable(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type DeletePostInput = z.infer<typeof deletePostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>
export type ToggleLikeInput = z.infer<typeof toggleLikeSchema>
export type ToggleBookmarkInput = z.infer<typeof toggleBookmarkSchema>
export type ToggleFollowInput = z.infer<typeof toggleFollowSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
