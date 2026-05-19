import { createClient } from './supabase/server';

export async function getBlogPosts() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username)')
    .eq('published', true)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data || [];
}

export async function getBlogPostBySlug(slug) {
  if (!slug) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username), comments(*, profiles(username, avatar_url))')
    .eq('slug', slug)
    .eq('published', true)
    .order('created_at', { foreignTable: 'comments', ascending: true })
    .single();

  if (error) {
    console.error(`Error fetching post with slug "${slug}":`, error);
    return null;
  }

  return data;
}
