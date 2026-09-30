import Link from 'next/link';
import { ImageIcon, Video, Play, Clock } from 'lucide-react';
import { getMediaCounts, getMediaPosts, formatDuration } from '../lib/media';
import PageHero from '../components/PageHero';
import EmptyState from '../components/EmptyState';

export const metadata = {
  title: 'Media — Photos and Videos from the Field',
  description:
    'Field photography and video from conservation scientists and stewards: restoration sites, species surveys, and monitoring in progress.',
};

/**
 * Media index: photo sets and video, newest first.
 *
 * Separate from the field journal on purpose. A reader opening the journal
 * wants writing; a reader opening this page has come for a picture or a clip.
 * Mixing the two makes the article feed worse for everyone to serve the other
 * audience.
 *
 * The page is honest about being empty. With no media posts yet it says so and
 * explains what would appear here, rather than rendering a broken grid of
 * placeholders.
 */
export default async function MediaPage() {
  const [counts, photos, videos] = await Promise.all([
    getMediaCounts(),
    getMediaPosts({ kind: 'photo', limit: 24 }),
    getMediaPosts({ kind: 'video', limit: 24 }),
  ]);

  const nothing = counts.total === 0;

  return (
    <div className="page-shell">
      <div className="container-page">
        <PageHero
          eyebrow="Media"
          title="From the field"
          description="Photographs and video from the people doing this work — what a site looks like before, during, and after."
        />

        {nothing ? (
          <div>
            <EmptyState
              icon={ImageIcon}
              title="No media published yet"
              description="When a contributor publishes a photo set or a video it appears here. Written field reports stay in the journal."
              action={
                <Link href="/blog" className="btn btn-primary">
                  Read the field journal
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {videos.length > 0 && (
              <section className="mb-14" aria-labelledby="video-heading">
                <div className="mb-4 flex items-baseline gap-2 border-b border-[var(--line)] pb-3">
                  <h2 id="video-heading" className="text-[20px] font-bold text-[var(--ink)]">
                    Video
                  </h2>
                  <span className="text-[13px] text-[var(--ink-faint)]">{counts.video}</span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {videos.map((post) => (
                    <MediaCard key={post.slug} post={post} />
                  ))}
                </div>
              </section>
            )}

            {photos.length > 0 && (
              <section aria-labelledby="photo-heading">
                <div className="mb-4 flex items-baseline gap-2 border-b border-[var(--line)] pb-3">
                  <h2 id="photo-heading" className="text-[20px] font-bold text-[var(--ink)]">
                    Photographs
                  </h2>
                  <span className="text-[13px] text-[var(--ink-faint)]">{counts.photo}</span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((post) => (
                    <MediaCard key={post.slug} post={post} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * One media card.
 *
 * The cover uses the post's `image_url`, which for a video is its poster frame
 * — so a card is never a black rectangle waiting for a play click it cannot
 * receive in a grid.
 */
function MediaCard({ post }) {
  const isVideo = post.content_type === 'video';
  const duration = formatDuration(post.video_duration_s);

  return (
    <article className="group">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-sunken)]">
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--ink-faint)]">
              {isVideo ? <Video size={32} aria-hidden="true" /> : <ImageIcon size={32} aria-hidden="true" />}
            </div>
          )}

          {isVideo && (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50">
                  <Play size={18} className="text-white" />
                </span>
              </span>
              {duration && (
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                  {duration}
                </span>
              )}
            </>
          )}
        </div>

        <div className="pt-2">
          {post.topic && <span className="eyebrow mb-1 block">{post.topic}</span>}
          <h3 className="text-[16px] font-bold leading-[1.3] text-[var(--ink)]">
            {post.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--ink-faint)]">
            {post.profiles?.full_name && <span>by {post.profiles.full_name}</span>}
            {isVideo && duration && (
              <span className="inline-flex items-center gap-1">
                <Clock size={11} aria-hidden="true" />
                {duration}
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
