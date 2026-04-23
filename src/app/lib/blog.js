import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function getBlogPosts() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:profiles!posts_author_id_fkey(username), post_tags(tags(name,slug))')
    .eq('status', 'published')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return []; 
  }

  return data || [];
}

export async function getBlogPostsPage({ before, after, limit = 10 } = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { posts: [], hasNext: false, hasPrev: false };
  }

  const pageSize = Math.max(1, Math.min(Number(limit) || 10, 50));
  const fetchEnd = pageSize; // inclusive index => fetch pageSize + 1

  let query = supabase
    .from('posts')
    .select('*, profiles:profiles!posts_author_id_fkey(username), post_tags(tags(name,slug))')
    .eq('status', 'published');

  if (before) {
    query = query.lt('created_at', before).order('created_at', { ascending: false });
  } else if (after) {
    // Fetch newer posts in ascending order, then reverse for display.
    query = query.gt('created_at', after).order('created_at', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.range(0, fetchEnd);

  if (error) {
    console.error('Error fetching paginated posts:', error);
    return { posts: [], hasNext: false, hasPrev: false };
  }

  const rows = data || [];
  const hasMore = rows.length > pageSize;
  let posts = hasMore ? rows.slice(0, pageSize) : rows;

  if (after) {
    posts = posts.reverse();
  }

  const hasPrev = Boolean(before) || (Boolean(after) && hasMore);
  const hasNext = Boolean(after) || (Boolean(before) && hasMore) || (!before && !after && hasMore);

  return { posts, hasNext, hasPrev };
}

export async function getBlogPostBySlug(slug) {
  if (!slug) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:profiles!posts_author_id_fkey(username), post_tags(tags(name,slug))')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    console.error(`Error fetching post with slug "${slug}":`, error);
    return null;
  }
  
  return data;
}

export async function getPublishedPostSlugs() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('slug')
    .eq('status', 'published')
    .not('slug', 'is', null);

  if (error) {
    console.error('Error fetching published slugs:', error);
    return [];
  }

  return (data || []).map((row) => row.slug).filter(Boolean);
}

export async function getRelatedPosts(postId, limit = 3) {
  if (!postId) return [];

  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('related_posts', {
    p_post_id: postId,
    p_limit: limit,
  });

  if (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }

  const items = data || [];
  if (items.length === 0) return items;

  // The RPC may not include newer columns (like cover_blur). Fetch them by id and merge.
  const ids = items.map((p) => p?.id).filter(Boolean);
  if (ids.length === 0) return items;

  const { data: blurRows } = await supabase.from('posts').select('id,cover_blur').in('id', ids);
  const blurById = new Map((blurRows || []).map((r) => [r.id, r.cover_blur]));

  return items.map((p) => ({
    ...p,
    cover_blur: blurById.get(p.id) ?? p.cover_blur ?? null,
  }));
}