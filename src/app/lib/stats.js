import { createClient } from './supabase/server';

/**
 * Read models for the discovery surfaces: trending, leaderboards and analytics.
 *
 * Everything here is derived from columns that already exist — `views`,
 * `pagerank_scores`, `post_interactions`, `cf_user_scores` and `comments`. No
 * migration is involved, which is deliberate: these pages ship against the
 * current schema, so they can be deployed without touching the database.
 *
 * Two rules run through all of it:
 *
 *   1. Never fail a page over a statistic. A missing score table degrades the
 *      ranking to plain recency, it does not blank the page.
 *   2. A score is a ranking signal, not a fact. `pr_score` is written by a cron
 *      that runs every 15 minutes, so a brand-new post legitimately has no row
 *      yet; it is treated as "not yet ranked" rather than "ranked last".
 *
 * The public functions never throw. Callers render whatever comes back.
 */

const POST_FIELDS = `
  id, slug, title, excerpt, image_url, topic, views, date, published,
  profiles!posts_user_id_fkey(username, full_name, avatar_url)
`;

/** Coerce a row into the shape PostCard expects, tolerating a missing embed. */
function normalise(row) {
  if (!row) return null;
  const raw = row.profiles;
  const profile = Array.isArray(raw) ? raw[0] : raw;
  return {
    ...row,
    profiles: profile
      ? {
          username: profile.username,
          avatar_url: profile.avatar_url,
          full_name: profile.full_name,
        }
      : null,
  };
}

function isPublished(post) {
  return post?.published !== false;
}

/**
 * A post is trending when it is being read *now*, not when it was read a lot
 * once. Absolute views alone would rank a post from 2019 above one published
 * this morning, which is the opposite of what "trending" means to a reader.
 *
 * So recency gates the result and engagement only breaks the tie. The decay is
 * a half-life rather than a cliff: a post is worth half as much after 7 days,
 * a quarter after 14. `views` is floored at 1 so a brand-new post with no views
 * yet is not scored at zero and therefore never appears.
 */
export function trendingScore(post, now = Date.now()) {
  if (!isPublished(post)) return -Infinity;

  const published = new Date(post.date || post.created_at || now).getTime();
  const ageMs = Math.max(0, now - published);
  const ageDays = ageMs / 86_400_000;
  const halfLife = 7;

  const recency = Math.pow(0.5, ageDays / halfLife);
  const views = Math.max(1, Number(post.views) || 0);

  return recency * Math.log10(views + 10);
}

/**
 * Trending posts, ranked by recency-weighted engagement.
 *
 * The window is a soft bound, not a hard cutoff. A site that publishes
 * irregularly can easily have nothing at all inside it, and a "trending" shelf
 * that silently shows two posts — or none — is worse than one that reaches
 * further back. So the window is tried, and if it yields fewer posts than a
 * full shelf it is widened before giving up.
 *
 * @param {object} options
 * @param {number} [options.limit]
 * @param {number} [options.windowDays] Preferred recency window.
 */
export async function getTrendingPosts({ limit = 12, windowDays = 30 } = {}) {
  const supabase = await createClient();
  if (!supabase) return [];

  const now = Date.now();
  // Widen rather than return a half-empty shelf. 30d → 90d → 180d → all.
  const windows = [windowDays, windowDays * 3, windowDays * 6, null];

  let rows = [];
  for (const days of windows) {
    let query = supabase
      .from('posts')
      .select(POST_FIELDS)
      .eq('published', true)
      .order('date', { ascending: false })
      .limit(Math.max(limit * 4, 40));

    if (days !== null) {
      query = query.gte('date', new Date(now - days * 86_400_000).toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load trending posts:', error.message);
      return [];
    }

    rows = data || [];
    if (rows.length >= limit || days === null) break;
  }

  return rows
    .map(normalise)
    .filter(Boolean)
    .map((post) => ({ ...post, trendingScore: trendingScore(post, now) }))
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, limit)
    .map(({ trendingScore, ...post }) => post);
}

/**
 * Per-author leaderboard.
 *
 * Ranked on published posts and total readership rather than the PageRank
 * table, because PageRank scores a *post*, not a person, and summing it across
 * someone's articles rewards volume without saying whether anyone read them.
 *
 * @param {object} options
 * @param {number} [options.limit]
 * @param {'posts'|'views'} [options.metric]
 */
export async function getLeaderboard({ limit = 20, metric = 'posts' } = {}) {
  const supabase = await createClient();
  if (!supabase) return [];

  // Reading authors off the post side keeps the tally honest: an account with
  // no published work cannot appear at all, and drafts never inflate a count.
  const { data, error } = await supabase
    .from('posts')
    .select(`user_id, views, ${POST_FIELDS}`)
    .eq('published', true);

  if (error) {
    console.error('Failed to load leaderboard:', error.message);
    return [];
  }

  const byAuthor = new Map();
  for (const row of data || []) {
    if (!isPublished(row)) continue;
    const key = row.user_id;
    if (!key) continue;

    const entry = byAuthor.get(key) || {
      userId: key,
      username: null,
      fullName: null,
      avatarUrl: null,
      posts: 0,
      views: 0,
    };
    const profile = normalise(row)?.profiles;
    if (profile?.username) {
      entry.username = profile.username;
      entry.fullName = profile.full_name || profile.username;
      entry.avatarUrl = profile.avatar_url || null;
    }
    entry.posts += 1;
    entry.views += Number(row.views) || 0;
    byAuthor.set(key, entry);
  }

  const entries = [...byAuthor.values()].filter((e) => e.username);

  entries.sort((a, b) => {
    if (metric === 'views' && b.views !== a.views) return b.views - a.views;
    if (b.posts !== a.posts) return b.posts - a.posts;
    return b.views - a.views;
  });

  return entries.slice(0, limit).map((entry, index) => ({
    ...entry,
    rank: index + 1,
    // Display name prefers the human one; username is the stable handle used
    // for the profile link.
    handle: entry.username,
  }));
}

/**
 * Site-wide totals for the analytics page.
 *
 * @returns {Promise<{ posts: number, authors: number, comments: number,
 *   views: number, publishedThisWeek: number, byTopic: Array }>}
 */
export async function getSiteStats() {
  const empty = {
    posts: 0,
    authors: 0,
    comments: 0,
    views: 0,
    publishedThisWeek: 0,
    byTopic: [],
  };

  const supabase = await createClient();
  if (!supabase) return empty;

  const [postsResult, commentsResult, authorsResult] = await Promise.allSettled([
    supabase.from('posts').select('id, topic, views, date, published').eq('published', true),
    supabase.from('comments').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('user_id').eq('published', true),
  ]);

  const posts = postsResult.status === 'fulfilled' ? postsResult.value.data || [] : [];
  if (!posts.length) return empty;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const topicCounts = new Map();

  let views = 0;
  let recent = 0;
  for (const post of posts) {
    views += Number(post.views) || 0;
    if (post.topic) topicCounts.set(post.topic, (topicCounts.get(post.topic) || 0) + 1);
    const when = new Date(post.date || 0).getTime();
    if (Number.isFinite(when) && when >= weekAgo) recent += 1;
  }

  const uniqueAuthors = new Set(
    (authorsResult.status === 'fulfilled' ? authorsResult.value.data || [] : [])
      .map((r) => r.user_id)
      .filter(Boolean)
  );

  return {
    posts: posts.length,
    authors: uniqueAuthors.size,
    comments: commentsResult.status === 'fulfilled' ? commentsResult.value.count || 0 : 0,
    views,
    publishedThisWeek: recent,
    byTopic: [...topicCounts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)),
  };
}

/**
 * Newest activity for the analytics page: recent posts and recent comments.
 *
 * Both are optional — a site with comments disabled should still render the
 * page, so an unreachable comments table yields an empty list, not an error.
 */
export async function getRecentActivity({ postLimit = 5, commentLimit = 5 } = {}) {
  const supabase = await createClient();
  if (!supabase) return { posts: [], comments: [] };

  const [postsResult, commentsResult] = await Promise.allSettled([
    supabase
      .from('posts')
      .select(POST_FIELDS)
      .eq('published', true)
      .order('date', { ascending: false })
      .limit(postLimit),
    supabase
      .from('comments')
      .select('id, content, created_at, posts!comments_post_id_fkey(slug, title)')
      .order('created_at', { ascending: false })
      .limit(commentLimit),
  ]);

  const posts = postsResult.status === 'fulfilled'
    ? (postsResult.value.data || []).map(normalise).filter(Boolean)
    : [];

  let comments = [];
  if (commentsResult.status === 'fulfilled' && Array.isArray(commentsResult.value.data)) {
    comments = commentsResult.value.data.map((row) => {
      const raw = row.posts;
      const post = Array.isArray(raw) ? raw[0] : raw;
      return {
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        postSlug: post?.slug || null,
        postTitle: post?.title || 'a story',
      };
    });
  } else if (commentsResult.status === 'rejected') {
    console.error('Failed to load recent comments:', commentsResult.reason?.message);
  }

  return { posts, comments };
}

/**
 * Most-read posts, with the rank the reader is actually looking for: "what has
 * been read" rather than "what is new".
 */
export async function getMostRead({ limit = 10 } = {}) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select(POST_FIELDS)
    .eq('published', true)
    .order('views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load most-read posts:', error.message);
    return [];
  }

  return (data || []).map(normalise).filter(Boolean);
}
