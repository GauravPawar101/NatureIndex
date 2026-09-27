/**
 * Pure helpers for media posts.
 *
 * Deliberately free of any server import. `PostCard` is a client component and
 * needs `formatDuration` to label a video post; importing it from `media.js`
 * would drag that module's `next/headers` dependency into the browser bundle
 * and fail the build. Anything here must be safe to run in the browser, so it
 * is split out here rather than duplicated.
 */

/** The three kinds a post can be. Mirrors the check constraint in schema.sql. */
export const CONTENT_TYPES = ['article', 'photo', 'video'];

/** Coerce an arbitrary value to a valid content type, defaulting to article. */
export function normaliseContentType(value) {
  const candidate = String(value ?? '').trim().toLowerCase();
  return CONTENT_TYPES.includes(candidate) ? candidate : 'article';
}

/**
 * Seconds -> a short human duration.
 *
 * Returns '' for null/undefined/0 so a template can render nothing for an
 * unknown length rather than a misleading "0:00", which reads as "empty clip".
 */
export function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '';

  const rounded = Math.round(total);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}
