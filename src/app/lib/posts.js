import { createClient } from './supabase/server';

/**
 * Server-side post search.
 *
 * Tiered on purpose, because the tiers fail in different ways:
 *
 *   1. `search_posts` RPC — Postgres full-text search, relevance ranked.
 *   2. `ilike` filters  — used when the RPC is missing (an older deployment)
 *                         or errors. Substring matching, so it also catches
 *                         partial words that tsquery would not match.
 *   3. `[]` + a reason  — the caller renders an honest "search unavailable"
 *                         state instead of pretending there are no results.
 *
 * Returning `[]` silently (as `getBlogPosts` does) is what made the old search
 * so confusing: a broken RPC looked identical to "no articles match".
 */

const POST_SELECT = `
    id, slug, title, excerpt, content, image_url, topic, views, date, published,
    profiles!posts_user_id_fkey(username, avatar_url, full_name)
`;

/** Columns PostCard and the profile page rely on. Supabase returns an object. */
function normaliseRow(row) {
    if (!row) return null;

    // The RPC returns the full row; the embed comes back as an array or an
    // object depending on whether the join is to-one.
    const rawProfile = row.profiles;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

    return {
        ...row,
        profiles: profile
            ? { username: profile.username, avatar_url: profile.avatar_url, full_name: profile.full_name }
            : null,
    };
}

function buildOrder(sort) {
    switch (sort) {
        case 'oldest':
            return { column: 'date', ascending: true };
        case 'popular':
            return { column: 'views', ascending: false };
        case 'newest':
        default:
            return { column: 'date', ascending: false };
    }
}

/**
 * Escape a user-typed term for a Postgres `LIKE` pattern. `%` and `_` are
 * wildcards, so an unescaped query of "a_b" matches "aXb" — and a lone `%`
 * would return the entire table.
 */
function escapeLike(term) {
    return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * @param {object} options
 * @param {string} [options.query]
 * @param {string} [options.topic]  'All' or a literal topic
 * @param {string} [options.sort]    'newest' | 'oldest' | 'popular'
 * @param {number} [options.limit]
 * @param {number} [options.offset]
 * @returns {Promise<{ posts: Array<object>, total: number, degraded: boolean }>}
 *   `degraded` is true when relevance ranking was unavailable and results came
 *   from the substring fallback — the UI surfaces this so a weaker-than-usual
 *   result set is explained rather than silently shipped.
 */
export async function searchPosts(options = {}) {
    const { query = '', topic = 'All', sort = 'newest', limit = 12, offset = 0 } = options;

    const supabase = await createClient();
    if (!supabase) {
        return { posts: [], total: 0, degraded: true, reason: 'config' };
    }

    const term = query.trim();
    const hasTopic = Boolean(topic) && topic !== 'All';
    const { column, ascending } = buildOrder(sort);

    // --- Tier 1: full-text search ------------------------------------------
    if (term) {
        const { data, error } = await supabase.rpc('search_posts', { query: term });

        if (!error && Array.isArray(data)) {
            let posts = data.map(normaliseRow).filter((row) => row && row.published !== false);

            if (hasTopic) {
                posts = posts.filter((post) => post.topic === topic);
            }

            posts.sort((a, b) => {
                const primary = ascending
                    ? new Date(a[column]).getTime() - new Date(b[column]).getTime()
                    : new Date(b[column]).getTime() - new Date(a[column]).getTime();
                return Number.isNaN(primary) ? 0 : primary;
            });

            return { posts: posts.slice(offset, offset + limit), total: posts.length, degraded: false };
        }

        if (error) {
            console.error('search_posts RPC failed, falling back to ilike:', error.message);
        }
    }

    // --- Tier 2: substring filters -----------------------------------------
    let queryBuilder = supabase
        .from('posts')
        .select(POST_SELECT, { count: 'exact' })
        .eq('published', true);

    if (term) {
        const pattern = `%${escapeLike(term)}%`;
        // `or` is the only way to search several columns at once; every branch
        // must be fully qualified so PostgREST does not guess.
        queryBuilder = queryBuilder.or(
            `title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`
        );
    }

    if (hasTopic) {
        queryBuilder = queryBuilder.eq('topic', topic);
    }

    const { data, error, count } = await queryBuilder
        .order(column, { ascending })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Post search failed:', error.message);
        return { posts: [], total: 0, degraded: true, reason: 'query' };
    }

    return {
        posts: (data || []).map(normaliseRow).filter(Boolean),
        total: count ?? (data || []).length,
        // A term with no tsquery match but ilike matches means the RPC exists
        // but ranked nothing, which is still a degraded answer.
        degraded: Boolean(term),
    };
}

/** Distinct published topics, for the filter pills. */
export async function getTopics() {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('posts')
        .select('topic')
        .eq('published', true)
        .not('topic', 'is', null);

    if (error) {
        console.error('Failed to load topics:', error.message);
        return [];
    }

    const counts = new Map();
    for (const row of data || []) {
        if (!row.topic) continue;
        counts.set(row.topic, (counts.get(row.topic) || 0) + 1);
    }

    return [...counts.entries()]
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}
