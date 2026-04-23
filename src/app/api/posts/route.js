import { NextResponse } from 'next/server';
import { createSupabaseClerkServerClient } from '../../lib/supabaseClerkServer';

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

export async function GET() {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('posts')
    .select('id,title,slug,status,date')
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ posts: data || [] });
}

export async function POST(req) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = (body.title || '').trim();
  const content = body.content || '';
  const requestedStatus = body.status === 'published' ? 'published' : 'draft';
  const tagNames = normalizeTags(body.tags);

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const slug = slugify(title);
  const nowIso = new Date().toISOString();

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      slug,
      status: requestedStatus,
      author_id: userId,
      date: nowIso,
    })
    .select('id,slug,status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    const tags = await ensureTags(supabase, tagNames);
    if (tags.length > 0) {
      const joinRows = tags.map((t) => ({ post_id: post.id, tag_id: t.id }));
      const { error: joinError } = await supabase.from('post_tags').insert(joinRows);
      if (joinError) {
        return NextResponse.json({ error: joinError.message }, { status: 400 });
      }
    }
  } catch (tagError) {
    return NextResponse.json({ error: tagError.message || 'Failed to save tags' }, { status: 400 });
  }

  return NextResponse.json({ post });
}
