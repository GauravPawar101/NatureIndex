import { createClient } from './supabase/server';

/**
 * Read models for a public contributor profile.
 *
 * Everything here degrades independently: a missing comments table or a failed
 * comments query should still render a profile with posts, not a 404.
 */

export function decodeUsername(raw) {
    try {
        return decodeURIComponent(raw);
    } catch {
        // `decodeURIComponent` throws on a malformed sequence like "%E0%A4%A".
        // That means a bad URL, not a missing user, so returning null here
        // would 404 and hide the real cause.
        return null;
    }
}

/**
 * profile.website is user-supplied. It is normalised to http(s) at save time,
 * but a stored "javascript:..." value (from before that validation existed, or
 * from any other write path) must never be rendered as a raw <a href>.
 */
export function safeWebsiteHref(website) {
    if (!website) return null;
    try {
        const url = new URL(website);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    } catch {
        return null;
    }
}

export async function getProfile(username) {
    if (!username) return null;

    const supabase = await createClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, website, bio, created_at')
        .eq('username', username)
        .maybeSingle();

    if (error) {
        console.error('Failed to load profile:', error.message);
        return null;
    }

    return data || null;
}

export async function getProfilePosts(userId) {
    if (!userId) return [];

    const supabase = await createClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('posts')
        .select('id, slug, title, excerpt, image_url, topic, views, date')
        .eq('user_id', userId)
        .eq('published', true)
        .order('date', { ascending: false });

    if (error) {
        console.error('Failed to load posts for profile:', error.message);
        return [];
    }

    return data || [];
}

/** The contributor's most recent comments, joined to the post they are on. */
export async function getProfileComments(userId, limit = 20) {
    if (!userId) return [];

    const supabase = await createClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, posts!inner(slug, title, published)')
        .eq('user_id', userId)
        .eq('posts.published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Failed to load comments for profile:', error.message);
        return [];
    }

    return (data || [])
        .map((row) => {
            const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
            if (!post) return null;
            return {
                id: row.id,
                content: row.content,
                created_at: row.created_at,
                slug: post.slug,
                postTitle: post.title,
            };
        })
        .filter(Boolean);
}

/**
 * Derives the headline numbers from data already loaded, so the profile costs
 * one round trip per resource rather than one per statistic.
 */
export function buildProfileStats(profile, posts, comments) {
    const totalViews = posts.reduce((sum, post) => sum + (Number(post.views) || 0), 0);
    const topics = [...new Set(posts.map((post) => post.topic).filter(Boolean))];

    // The most-read story is more interesting than a raw total, and it links
    // somewhere useful.
    const topPost = posts.reduce((best, post) => {
        if (!best) return post;
        return (Number(post.views) || 0) > (Number(best.views) || 0) ? post : best;
    }, null);

    return {
        postCount: posts.length,
        commentCount: comments.length,
        totalViews,
        topicCount: topics.length,
        topics,
        topPost,
    };
}
