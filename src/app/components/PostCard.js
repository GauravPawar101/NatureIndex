'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, MessageSquare, Video, ImageIcon } from 'lucide-react';
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
 * The post card used by the blog index, the discovery shelves, the feed and
 * related-post rails.
 *
 * Three variants, because the same component in three densities is what made
 * the old index feel like a list of a database rather than a front page:
 *
 *   lead    One large story, image above the text. Used for the first result
 *           only, so the page has a focal point instead of twelve peers.
 *   row     Image beside the text. The dense default; fits far more stories in
 *           the same scroll.
 *   grid    Image above the text, tight. For shelves where the images are the
 *           point, like /discover and the profile page.
 *
 * Metadata is `text-gray-400`, not gray-500: gray-500 on a card surface is
 * 3.6:1, which fails WCAG AA for body text, and it is where the author name and
 * reading time live. See the contrast note in globals.css.
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

    // Type scale per variant. The lead is the only place a title is allowed to
    // be large; everything else stays at or below text-lg so the page keeps a
    // single dominant voice.
    const titleClass = isLead
        ? 'text-2xl md:text-3xl line-clamp-3'
        : isGrid
            ? 'text-base line-clamp-2 leading-snug'
            : 'text-lg line-clamp-2 leading-snug';

    const labelClass = 'text-[11px] font-medium';
    const metaClass = 'text-xs text-gray-400';

    const imageWrap = post.image_url && (
        <div
            className={`relative shrink-0 overflow-hidden bg-white/5 ${
                isLead
                    ? 'aspect-[16/9] w-full'
                    : isGrid
                        ? 'aspect-[4/3] w-full'
                        : 'w-full sm:w-44 aspect-[4/3] sm:aspect-auto sm:min-h-full'
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
                        ? '(max-width: 768px) 100vw, 900px'
                        : isGrid
                            ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                            : '(max-width: 640px) 100vw, 176px'
                }
                className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                    className="absolute inset-0 flex items-center justify-center bg-black/25"
                >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm">
                        <Video size={18} />
                    </span>
                </span>
            )}
        </div>
    );

    return (
        <article
            className={`glass-card-hover group overflow-hidden ${
                isLead ? 'sm:grid sm:grid-cols-2 sm:items-stretch' : ''
            }`}
        >
            <div
                className={
                    isLead
                        ? 'flex h-full flex-col'
                        : isGrid
                            ? 'flex h-full flex-col'
                            : 'flex h-full flex-col sm:flex-row'
                }
            >
                {imageWrap}

                <div
                    className={`flex flex-1 flex-col ${
                        isLead ? 'p-6 md:p-8' : isGrid ? 'p-4' : 'p-5'
                    }`}
                >
                    <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {post.topic && <span className="eyebrow text-[11px]">{post.topic}</span>}
                        {readingTime && (
                            <span className={`${labelClass} text-gray-400`}>{readingTime}</span>
                        )}
                        {post.content_type === 'video' && (
                            <span className={`inline-flex items-center gap-1 ${labelClass} text-red-300`}>
                                <Video size={11} aria-hidden="true" />
                                Video{mediaDuration ? ` · ${mediaDuration}` : ''}
                            </span>
                        )}
                        {post.content_type === 'photo' && (
                            <span className={`inline-flex items-center gap-1 ${labelClass} text-emerald-300`}>
                                <ImageIcon size={11} aria-hidden="true" />
                                Photo set
                            </span>
                        )}
                    </div>

                    <Link href={`/blog/${post.slug}`} className="block">
                        <h2
                            className={`font-bold text-white transition-colors group-hover:text-white/90 break-words ${titleClass}`}
                        >
                            <Highlighted text={post.title} query={query} />
                        </h2>
                    </Link>

                    {body && !compact && (
                        <p
                            className={`mt-2 leading-relaxed text-gray-400 ${
                                isLead ? 'line-clamp-4 text-[15px]' : 'line-clamp-2 text-sm'
                            }`}
                        >
                            <Highlighted text={body} query={query} />
                        </p>
                    )}

                    {/* mt-auto pins the meta row to the bottom so cards in a grid
                        line up regardless of excerpt length. */}
                    <div className={`mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 ${metaClass}`}>
                        {authorUsername ? (
                            <>
                                <span>
                                    By{' '}
                                    <Link
                                        href={`/profile/${authorUsername}`}
                                        className="font-medium text-gray-300 transition-colors hover:text-white hover:underline underline-offset-2"
                                    >
                                        {authorName}
                                    </Link>
                                </span>
                                <span aria-hidden="true">•</span>
                            </>
                        ) : (
                            <>
                                <span>By {authorName || 'Unknown author'}</span>
                                <span aria-hidden="true">•</span>
                            </>
                        )}

                        <time dateTime={toISODate(post.date)} title={formatDate(post.date)}>
                            {formatRelativeTime(post.date, formatDate(post.date, ''))}
                        </time>

                        <span className="ml-auto flex items-center gap-3">
                            {Number(post.views) > 0 && (
                                <span className="inline-flex items-center gap-1" title={`${post.views} views`}>
                                    <Eye size={12} aria-hidden="true" />
                                    {formatCompactNumber(post.views)}
                                    <span className="sr-only">views</span>
                                </span>
                            )}
                            {commentCount > 0 && (
                                <span className="inline-flex items-center gap-1" title={`${commentCount} comments`}>
                                    <MessageSquare size={12} aria-hidden="true" />
                                    {formatCompactNumber(commentCount)}
                                    <span className="sr-only">comments</span>
                                </span>
                            )}
                        </span>
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
            <mark key={index} className="rounded bg-white/20 px-0.5 text-white">
                {token.text}
            </mark>
        ) : (
            <span key={index}>{token.text}</span>
        )
    );
}
