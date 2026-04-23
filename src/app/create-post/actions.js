'use server';

import { PostSchema } from '../lib/postSchema';
import { createSupabaseClerkServerClient } from '../lib/supabaseClerkServer';
import { dispatchPostPublishedWebhooks } from '../actions/webhookDispatch';
import { generateCoverBlurDataUrl } from '../lib/coverBlur';

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

  return cleaned.slice(0, 5);
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

function zodFieldErrors(zodError) {
  const flattened = zodError.flatten();
  const out = {};

  for (const [field, messages] of Object.entries(flattened.fieldErrors || {})) {
    if (messages && messages.length) out[field] = messages[0];
  }

  // Optionally surface non-field issues as a form error.
  const formError = flattened.formErrors?.[0];

  return { fieldErrors: out, formError };
}

export async function createPostAction(values, intent) {
  const status = intent === 'published' ? 'published' : 'draft';

  const parsed = PostSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors, formError } = zodFieldErrors(parsed.error);
    return { ok: false, fieldErrors, formError };
  }

  const { title, content, slug, image_url } = parsed.data;
  const tagNames = normalizeTags(parsed.data.tags);

  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return { ok: false, formError: 'Unauthorized' };
  }

  const nowIso = new Date().toISOString();

  // Best-effort: generate a tiny blur placeholder for the cover image.
  // Do not block saving if the blur generation fails.
  let cover_blur = null;
  if (image_url) {
    cover_blur = await generateCoverBlurDataUrl(image_url);
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      slug,
      image_url,
      cover_blur,
      status,
      author_id: userId,
      date: status === 'published' ? nowIso : nowIso,
    })
    .select('id,slug,status')
    .single();

  if (error) {
    // Map common DB errors to field-level errors where possible.
    const message = error.message || 'Failed to save post';

    // If slug is unique in DB, this is a helpful UX.
    const fieldErrors = message.toLowerCase().includes('slug')
      ? { slug: 'That slug is already in use' }
      : {};

    return { ok: false, fieldErrors, formError: Object.keys(fieldErrors).length ? undefined : message };
  }

  try {
    const tags = await ensureTags(supabase, tagNames);
    if (tags.length > 0) {
      const joinRows = tags.map((t) => ({ post_id: post.id, tag_id: t.id }));
      const { error: joinError } = await supabase.from('post_tags').insert(joinRows);
      if (joinError) {
        return { ok: false, formError: joinError.message || 'Failed to save tags' };
      }
    }
  } catch (tagError) {
    return { ok: false, formError: tagError?.message || 'Failed to save tags' };
  }

  if (status === 'published') {
    try {
      await dispatchPostPublishedWebhooks(post.id);
    } catch {
      // Best-effort: do not fail publishing if a webhook endpoint is down.
    }
  }

  return { ok: true, post };
}
