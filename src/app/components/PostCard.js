'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, MessageSquare, Video, ImageIcon, Clock } from 'lucide-react';
import { excerptAroundMatch, tokenizeMatches } from '../lib/highlight';
import { formatDuration } from '../lib/media-format';
import {
    formatCompactNumber,
    formatDate,
    formatReadingTime,
    formatRelativeTime,
    toISODate,
} from '../lib/format';

/**
 * The post card, used by the blog index, the discovery shelves, the feed and
 * the related-post rails.
 *
 * Built on Medium's card rather than a generic one. The things that matter:
 *
 *   the image leads, because a story is identified by its picture before its
 *     title is read;
 *   the title is set in the editorial serif at a fixed size per variant, so a
 *     grid has a consistent voice rather than twelve different ones;
 *   the author is a real link with an avatar, not a grey byline string;
 *   metadata is quiet — read time and date only, small and low contrast. Medium
 *     deliberately does not put view counts on a card, and neither do we: a
 *     number nobody can act on is noise.
 *
 * Three variants, because the same component at three densities is what made
 * the old index feel like a list of a database:
 *
 *   lead    One large story. Used for the first result only.
 *   row     Image beside the text. The dense default.
 *   grid    Image above the text, tight. For image-led shelves.
 */
export default function PostCard({
    post,
    query = '',
    variant = 'row',
    compact = false,
    priority = false,
}) {
    if (!post || !post.slug) return null;

    const authorName = post.profiles?.full_name || post.profiles?.username;
    const authorUsername = post.profiles?.username;
    const readingTime = formatReadingTime(post.content);
    const commentCount = Array.isArray(post.comments) ? post.comments.length : Number(post.comment_count) || 0;
    const mediaDuration = formatDuration(post.video_duration_s);

    // Prefer a window around the match; fall back to the stored excerpt.
    const body = query
        ? excerptAroundMatch(post.excerpt || post.content || '', query)
        : post.excerpt;

    const isLead = variant === 'lead';
    const isGrid = variant === 'grid';

    const titleClass = isLead
        ? 'display-1'
        : isGrid
            ? 'display-3'
            : 'display-3';

    const imageWrap = post.image_url && (
        <div
            className={`relative shrink-0 overflow-hidden bg-[var(--surface-sunken)] ${
                isLead
                    ? 'aspect-[16/10] w-full sm:aspect-auto sm:min-h-full'
                    : isGrid
                        ? 'aspect-[4/3] w-full'
                        : 'aspect-[4/3] w-full sm:aspect-auto sm:min-h-full sm:w-56'
            }`}
        >
            <Image
                src={post.image_url}
                alt={post.title}
                fill
                // A lead story is usually in the first viewport, so it should
                // not wait on the lazy loader.
                priority={priority || isLead}
                sizes={
                    isLead
                        ? '(max-width: 640px) 100vw, 640px'
                        : isGrid
                            ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                            : '(max-width: 640px) 100vw, 224px'
                }
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                // Cover URLs are user-supplied, so they can point at any host.
                // Without `unoptimized`, next/image throws for hosts missing
                // from images.remotePatterns and takes the whole page down.
                unoptimized
            />

            {/* A play affordance on a video cover, so the type of post is
                legible from the image alone in a dense grid. */}
            {post.content_type === 'video' && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30"
                >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-[var(--ink)] backdrop-blur-sm">
                        <Video size={20} />
                    </span>
                </span>
            )}
        </div>
    );

    return (
        <article className="glass glass-hover group relative overflow-hidden">
            <div
                className={
                    isLead
                        ? 'flex h-full flex-col sm:grid sm:grid-cols-2'
                        : 'flex h-full flex-col sm:flex-row'
                }
            >
                {imageWrap}

                <div
                    className={`flex flex-1 flex-col ${isLead ? 'p-6 md:p-8' : 'p-5 md:p-6'}`}
                >
                    <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        {post.topic && (
                            <Link
                                href={`/blog?topic=${encodeURIComponent(post.topic)}`}
                                className="eyebrow transition-colors hover:text-[var(--accent)]"
                            >
                                {post.topic}
                            </Link>
                        )}
                        {post.content_type === 'video' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ink-faint)]">
                                <Video size={11} aria-hidden="true" />
                                Video{mediaDuration ? ` · ${mediaDuration}` : ''}
                            </span>
                        )}
                        {post.content_type === 'photo' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ink-faint)]">
                                <ImageIcon size={11} aria-hidden="true" />
                                Photo set
                            </span>
                        )}
                    </div>

                    <h2 className={titleClass}>
                        <Link href={`/blog/${post.slug}`} className="block">
                            {/* No underline on hover: on a serif display face it
                                looks like a mistake. The card lift and the
                                title colour shift carry the affordance. */}
                            <span className="text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
                                <Highlighted text={post.title} query={query} />
                            </span>
                        </Link>
                    </h2>

                    {body && !compact && (
                        <p
                            className={`mt-3 leading-relaxed text-[var(--ink-muted)] ${
                                isLead ? 'line-clamp-4 text-base' : 'line-clamp-2 text-sm'
                            }`}
                        >
                            <Highlighted text={body} query={query} />
                        </p>
                    )}

                    {/* mt-auto pins the meta row to the bottom so cards in a grid
                        line up regardless of excerpt length. */}
                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-5 text-[13px] text-[var(--ink-faint)]">
                        {authorUsername ? (
                            <Link
                                href={`/profile/${authorUsername}`}
                                className="group/author inline-flex items-center gap-2"
                            >
                                {post.profiles?.avatar_url ? (
                                    <Image
                                        src={post.profiles.avatar_url}
                                        alt=""
                                        width={24}
                                        height={24}
                                        unoptimized
                                        className="h-6 w-6 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[10px] font-semibold text-[var(--ink-muted)]"
                                    >
                                        {(authorName || '?').charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <span className="font-medium text-[var(--ink-muted)] transition-colors group-hover/author:text-[var(--ink)]">
                                    {authorName}
                                </span>
                            </Link>
                        ) : (
                            <span className="font-medium text-[var(--ink-muted)]">
                                {authorName || 'Unknown author'}
                            </span>
                        )}

                        <span aria-hidden="true">·</span>

                        {readingTime && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} aria-hidden="true" />
                                {readingTime}
                            </span>
                        )}

                        <span aria-hidden="true">·</span>

                        <time
                            dateTime={toISODate(post.date)}
                            title={formatDate(post.date)}
                        >
                            {formatRelativeTime(post.date, formatDate(post.date, ''))}
                        </time>

                        {/* View counts are deliberately absent from the card.
                            Medium omits them, and a number the reader cannot act
                            on is noise in a grid of twelve. */}
                        {commentCount > 0 && (
                            <span className="ml-auto inline-flex items-center gap-1">
                                <MessageSquare size={13} aria-hidden="true" />
                                {formatCompactNumber(commentCount)}
                                <span className="sr-only">comments</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

/**
 * Renders `text` with search matches wrapped in <mark>. Returns React nodes, so
 * a post title containing markup is displayed literally rather than executed.
 */
export function Highlighted({ text, query }) {
    if (!query) return text;

    return tokenizeMatches(text, query).map((token, index) =>
        token.match ? (
            <mark
                key={index}
                className="rounded bg-[var(--accent-dim)] px-0.5 text-[var(--ink)]"
            >
                {token.text}
            </mark>
        ) : (
            <span key={index}>{token.text}</span>
        )
    );
}
