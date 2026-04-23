import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function getReactionCountByPostId(postId) {
  if (!postId) return 0;
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  const { data, error } = await supabase.rpc('reaction_count', { p_post_id: postId });
  if (error) {
    console.error('Error fetching reaction count:', error);
    return 0;
  }

  return Number(data || 0);
}

export async function getReactionCountsByPostIds(postIds) {
  const ids = Array.isArray(postIds) ? postIds.filter(Boolean) : [];
  if (ids.length === 0) return {};

  const supabase = getSupabaseClient();
  if (!supabase) return {};

  const { data, error } = await supabase.rpc('reaction_counts', { p_post_ids: ids });
  if (error) {
    console.error('Error fetching reaction counts:', error);
    return {};
  }

  const map = {};
  for (const row of data || []) {
    if (!row?.post_id) continue;
    map[row.post_id] = Number(row.count || 0);
  }

  return map;
}
