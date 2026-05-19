'use server';

import { createClient } from '../supabase/server';

export async function incrementPostViews(postId) {
  if (!postId) return;

  const supabase = await createClient();
  if (!supabase) return;

  const { error } = await supabase.rpc('increment_post_views', { post_uuid: postId });

  if (error) {
    console.error('Failed to increment post views:', error);
  }
}
