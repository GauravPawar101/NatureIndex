import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PostSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  content: z
    .string({ required_error: 'Content is required' })
    .min(50, 'Content must be at least 50 characters'),
  slug: z
    .string({ required_error: 'Slug is required' })
    .trim()
    .toLowerCase()
    .regex(slugRegex, 'Slug must be URL-safe (lowercase letters, numbers, hyphens)'),
  tags: z
    .array(z.string().trim().min(1, 'Tag cannot be empty'))
    .max(5, 'You can add up to 5 tags')
    .default([]),
  image_url: z
    .string()
    .trim()
    .url('Cover image must be a valid URL')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
});
