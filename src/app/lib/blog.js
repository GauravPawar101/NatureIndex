import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getBlogPosts() {
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