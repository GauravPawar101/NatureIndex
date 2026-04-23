import { NextResponse } from 'next/server';
import { createSupabaseClerkServerClient } from '../../../lib/supabaseClerkServer';

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
  if (!Array.isArray(input)) return null;
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

export async function PATCH(req, { params }) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'Missing post id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('posts')
    .select('id,author_id,status')
    .eq('id', id)
    .single();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  if (existing.author_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nextTitle = typeof body.title === 'string' ? body.title.trim() : undefined;
  const nextContent = typeof body.content === 'string' ? body.content : undefined;
  const nextStatus = body.status === 'published' ? 'published' : body.status === 'draft' ? 'draft' : undefined;
  const nextTags = normalizeTags(body.tags);

  const updatePayload = {};
  if (nextTitle !== undefined) {
    if (!nextTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    updatePayload.title = nextTitle;
    updatePayload.slug = slugify(nextTitle);
  }
  if (nextContent !== undefined) updatePayload.content = nextContent;
  if (nextStatus !== undefined) updatePayload.status = nextStatus;

  if (existing.status !== 'published' && nextStatus === 'published') {
    updatePayload.date = new Date().toISOString();
  }

  const { data: post, error } = await supabase
    .from('posts')
    .update(updatePayload)
    .eq('id', id)
    .select('id,slug,status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (nextTags) {
    try {
      const { error: deleteError } = await supabase.from('post_tags').delete().eq('post_id', id);
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }

      const tags = await ensureTags(supabase, nextTags);
      if (tags.length > 0) {
        const joinRows = tags.map((t) => ({ post_id: id, tag_id: t.id }));
        const { error: joinError } = await supabase.from('post_tags').insert(joinRows);
        if (joinError) {
          return NextResponse.json({ error: joinError.message }, { status: 400 });
        }
      }
    } catch (tagError) {
      return NextResponse.json({ error: tagError.message || 'Failed to save tags' }, { status: 400 });
    }
  }

  return NextResponse.json({ post });
}
