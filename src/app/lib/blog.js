import { createClient } from '@supabase/supabase-js';

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabase = hasSupabaseEnv
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  : null;

export async function getBlogPosts() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username)')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return []; 
  }

  return data || [];
}

export async function getBlogPostBySlug(slug) {
  if (!slug) return null;
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username), comments(*, profiles(username, avatar_url))')
    .eq('slug', slug)
    .order('created_at', { foreignTable: 'comments', ascending: true })
    .single();

  if (error) {
    console.error(`Error fetching post with slug "${slug}":`, error);
    return null;
  }
  
  return data;
}