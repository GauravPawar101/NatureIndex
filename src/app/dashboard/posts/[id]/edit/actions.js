'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseClerkServerClient } from '../../../../lib/supabaseClerkServer';
import { generateCoverBlurDataUrl } from '../../../../lib/coverBlur';

function slugify(title) {
  return (title || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-+/g, '-');
}

function slugifyTag(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-+/g, '-');
}

function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.toLowerCase());

  return Array.from(new Set(cleaned)).slice(0, 10);
}

async function ensureTags(supabase, tagNames) {
  if (tagNames.length === 0) return [];

  const upsertRows = tagNames.map((name) => ({ name, slug: slugifyTag(name) }));

  const { error: upsertError } = await supabase
    .from('tags')
    .upsert(upsertRows, { onConflict: 'name', ignoreDuplicates: false });

  if (upsertError) throw upsertError;

  const { data: tags, error: selectError } = await supabase
    .from('tags')
    .select('id,name')
    .in('name', tagNames);

  if (selectError) throw selectError;
  return tags || [];
}

const UpdatePostSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  content: z.string({ required_error: 'Content is required' }).min(50, 'Content must be at least 50 characters'),
  tags: z.array(z.string()).optional().default([]),
  image_url: z
    .string()
    .trim()
    .url('Cover image must be a valid URL')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
});

export async function updatePostAction(postId, values, intent) {
  const status = intent === 'published' ? 'published' : 'draft';

  const parsedId = Number(postId);
  if (!Number.isFinite(parsedId)) {
    return { ok: false, formError: 'Invalid post id' };
  }

  const parsed = UpdatePostSchema.safeParse(values);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = {};

    for (const [field, messages] of Object.entries(flattened.fieldErrors || {})) {
      if (messages && messages.length) fieldErrors[field] = messages[0];
    }

    return { ok: false, fieldErrors, formError: flattened.formErrors?.[0] };
  }

  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    redirect('/login');
  }

  const { data: existing, error: existingError } = await supabase
    .from('posts')
    .select('id,author_id,status,image_url,cover_blur')
    .eq('id', parsedId)
    .single();

  if (existingError || !existing) {
    return { ok: false, formError: existingError?.message || 'Post not found' };
  }

  if (existing.author_id !== userId) {
    return { ok: false, formError: 'Forbidden' };
  }

  const nextTitle = parsed.data.title;
  const nextContent = parsed.data.content;
  const nextTags = normalizeTags(parsed.data.tags);
  const nextImageUrl = parsed.data.image_url;

  const updatePayload = {
    title: nextTitle,
    slug: slugify(nextTitle),
    content: nextContent,
    status,
    image_url: nextImageUrl,
  };

  if (existing.status !== 'published' && status === 'published') {
    updatePayload.date = new Date().toISOString();
  }

  // Only regenerate blur when the cover image changes, or if it was missing.
  if (nextImageUrl && (nextImageUrl !== existing.image_url || !existing.cover_blur)) {
    updatePayload.cover_blur = await generateCoverBlurDataUrl(nextImageUrl);
  }
  if (!nextImageUrl) {
    updatePayload.cover_blur = null;
  }

  const { data: post, error: updateError } = await supabase
    .from('posts')
    .update(updatePayload)
    .eq('id', parsedId)
    .select('id,slug,status')
    .single();

  if (updateError) {
    return { ok: false, formError: updateError.message || 'Failed to save post' };
  }

  try {
    const { error: deleteError } = await supabase.from('post_tags').delete().eq('post_id', parsedId);
    if (deleteError) throw deleteError;

    const tags = await ensureTags(supabase, nextTags);
    if (tags.length > 0) {
      const joinRows = tags.map((t) => ({ post_id: parsedId, tag_id: t.id }));
      const { error: joinError } = await supabase.from('post_tags').insert(joinRows);
      if (joinError) throw joinError;
    }
  } catch (tagError) {
    return { ok: false, formError: tagError?.message || 'Failed to save tags' };
  }

  revalidatePath('/blog');
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/posts/${parsedId}/edit`);

  return { ok: true, post };
}
