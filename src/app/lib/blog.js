import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Fetches all blog posts directly from the Supabase database.
 * @returns {Promise<Array>} A promise that resolves to an array of posts.
 */
export async function getBlogPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data;
}

/**
 * Fetches a single blog post by its slug directly from the Supabase database.
 * @param {string} slug - The slug of the post to fetch.
 * @returns {Promise<Object|null>} A promise that resolves to the post object or null if not found.
 */
export async function getBlogPostBySlug(slug) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error(`Error fetching post with slug "${slug}":`, error);
    return null;
  }

  return data;
}