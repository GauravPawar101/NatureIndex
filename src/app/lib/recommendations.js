import { createClient } from './supabase/server';

/**
 * Server-side fetch of hybrid recommendations, ranked by the PageRank
 * scores written by the Rust rec_service. Used for the initial SSR
 * render of the blog page so the client doesn't need to fetch on mount.
 */
export async function getRecommendedPosts({ limit = 6, excludeSlug } = {}) {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('pagerank_scores')
        .select(
            'pr_score, posts!inner(id, slug, title, excerpt, image_url, topic, date, views, published, profiles!posts_user_id_fkey(username, avatar_url, full_name))'
        )
        .eq('posts.published', true)
        .order('pr_score', { ascending: false })
        .limit(limit + (excludeSlug ? 1 : 0));

    if (error) {
        console.error('getRecommendedPosts: failed to fetch pagerank scores:', error);
        return [];
    }

    let posts = (data || []).map((row) => row.posts).filter(Boolean);

    if (excludeSlug) {
        posts = posts.filter((p) => p.slug !== excludeSlug);
    }

    return posts.slice(0, limit);
}
