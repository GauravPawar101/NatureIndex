import { createClient } from './supabase/server';
import { formatDuration, normaliseContentType, CONTENT_TYPES } from './media-format';

// The pure helpers live in media-format.js because PostCard is a client
// component: re-exported here so server callers have one import, while the
// client only ever touches the browser-safe module.
export { formatDuration, normaliseContentType, CONTENT_TYPES };

/**
 * Read/write helpers for photo and video posts.
 *
 * The data model is a `content_type` discriminator on `public.posts` plus a
 * `public.post_media` child table holding one row per asset. Splitting them
 * that way means a photo set is several addressable rows rather than an array
 * in a text column, so an individual file can be replaced or deleted without
 * rewriting the whole list.
 *
 * Every read degrades to empty rather than throwing: a feed that cannot reach
 * the media table should still list the posts, just without their galleries.
 */

const POST_MEDIA_FIELDS = `
  post_id, position, url, kind, duration_s, width, height, poster_url, alt_text
`;

/**
 * A post's assets, in display order.
 *
 * @param {string} postId
 * @returns {Promise<Array<object>>}
 */
export async function getPostMedia(postId) {
  if (!postId) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('post_media')
    .select(POST_MEDIA_FIELDS)
    .eq('post_id', postId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Failed to load post media:', error.message);
    return [];
  }

  return data || [];
}

/**
 * The video for a post, if it has one.
 *
 * Reads `posts.video_url` rather than scanning `post_media`, because that column
 * is the one the database constrains: a video post cannot exist without it, and
 * a non-video post cannot carry one.
 */
export async function getPostVideo(postId) {
  if (!postId) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('video_url, video_duration_s, content_type')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load post video:', error.message);
    return null;
  }
  if (!data?.video_url) return null;

  return {
    url: data.video_url,
    durationSeconds: data.video_duration_s ?? null,
    duration: formatDuration(data.video_duration_s),
  };
}

/**
 * Recent photo and video posts, for the media shelves.
 *
 * Filters in the query rather than fetching everything and discarding, so the
 * page cost does not grow with the size of the article archive.
 *
 * @param {object} options
 * @param {'photo'|'video'} [options.kind] Restrict to one kind.
 * @param {number} [options.limit]
 */
export async function getMediaPosts({ kind, limit = 24 } = {}) {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('posts')
    .select(
      `id, slug, title, excerpt, image_url, topic, views, date, content_type,
       video_url, video_duration_s,
       profiles!posts_user_id_fkey(username, full_name, avatar_url)`
    )
    .eq('published', true)
    .neq('content_type', 'article')
    .order('date', { ascending: false })
    .limit(limit);

  if (kind) query = query.eq('content_type', kind);

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load media posts:', error.message);
    return [];
  }

  return (data || [])
    .map((row) => {
      const raw = row.profiles;
      const profile = Array.isArray(raw) ? raw[0] : raw;
      return {
        ...row,
        profiles: profile
          ? {
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }
          : null,
      };
    })
    .filter(Boolean);
}

/**
 * Counts of photo and video posts, for the media index heading.
 *
 * Counts each kind independently rather than asking for a total, because
 * "total minus articles" would be wrong the moment a draft existed.
 */
export async function getMediaCounts() {
  const supabase = await createClient();
  if (!supabase) return { photo: 0, video: 0, total: 0 };

  const [photo, video] = await Promise.allSettled([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)
      .eq('content_type', 'photo'),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)
      .eq('content_type', 'video'),
  ]);

  const photoCount = photo.status === 'fulfilled' ? photo.value.count || 0 : 0;
  const videoCount = video.status === 'fulfilled' ? video.value.count || 0 : 0;

  return { photo: photoCount, video: videoCount, total: photoCount + videoCount };
}

/**
 * Replace a post's assets.
 *
 * Deletes then inserts rather than diffing, because the caller is replacing a
 * whole gallery and the rows are cheap. `onConflict` on (post_id, position)
 * makes a retry idempotent instead of failing on the primary key.
 */
export async function replacePostMedia(postId, assets) {
  if (!postId || !Array.isArray(assets) || assets.length === 0) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const rows = assets
    .filter((asset) => asset?.url)
    .map((asset, index) => ({
      post_id: postId,
      position: asset.position ?? index,
      url: asset.url,
      kind: asset.kind === 'video' ? 'video' : 'image',
      duration_s: Number.isFinite(Number(asset.durationSeconds))
        ? Number(asset.durationSeconds)
        : null,
      width: Number.isFinite(Number(asset.width)) ? Number(asset.width) : null,
      height: Number.isFinite(Number(asset.height)) ? Number(asset.height) : null,
      poster_url: asset.posterUrl || null,
      alt_text: asset.altText || null,
    }));

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('post_media')
    .upsert(rows, { onConflict: 'post_id,position' })
    .select(POST_MEDIA_FIELDS);

  if (error) {
    console.error('Failed to save post media:', error.message);
    return [];
  }

  return data || [];
}

/** Remove every asset belonging to a post. */
export async function clearPostMedia(postId) {
  if (!postId) return;

  const supabase = await createClient();
  if (!supabase) return;

  const { error } = await supabase.from('post_media').delete().eq('post_id', postId);
  if (error) console.error('Failed to clear post media:', error.message);
}
