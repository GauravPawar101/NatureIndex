'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, MessageSquare } from 'lucide-react';
import { excerptAroundMatch, tokenizeMatches } from '../lib/highlight';
import {
    formatCompactNumber,
    formatDate,
    formatReadingTime,
    formatRelativeTime,
    toISODate,
} from '../lib/format';

/**
 * The one post card used by the blog list, profile pages and related-post
 * rails. Previously each page had its own near-copy with different metadata, so
 * a fix (or a missing field) had to be made three times.
 *
 * @param {object} post
 * @param {string} [query] Active search query — enables match highlighting and
 *   pulls the excerpt window around the hit instead of always showing the top.
 * @param {'row'|'grid'} [variant]
 * @param {boolean} [compact] Hide the excerpt, for dense sidebars.
 */
export default function PostCard({ post, query = '', variant = 'row', compact = false }) {
    if (!post || !post.slug) return null;

    const authorName = post.profiles?.full_name || post.profiles?.username;
    const authorUsername = post.profiles?.username;
    const readingTime = formatReadingTime(post.content);
    const commentCount = Array.isArray(post.comments) ? post.comments.length : Number(post.comment_count) || 0;

    // Prefer a window around the match; fall back to the stored excerpt.
    const body = query
        ? excerptAroundMatch(post.excerpt || post.content || '', query)
        : post.excerpt;

    return (
        <article className="glass-card-hover group overflow-hidden">
            <div className={variant === 'row' ? 'flex flex-col sm:flex-row' : 'flex flex-col h-full'}>
                {post.image_url && (
                    <div className={`relative shrink-0 overflow-hidden ${variant === 'row'
                        ? 'w-full sm:w-48 h-40 sm:h-auto sm:min-h-[160px]'
                        : 'w-full h-40'
                        }`}>
                        <Image
                            src={post.image_url}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes={variant === 'row' ? '(max-width: 640px) 100vw, 192px' : '(max-width: 640px) 100vw, 33vw'}
                            // Cover URLs are user-supplied, so they can point at
                            // any host. Without `unoptimized`, next/image throws
                            // for hosts missing from images.remotePatterns and
                            // takes the whole page down.
                            unoptimized
                        />
                    </div>
                )}

                <div className={`flex flex-1 flex-col p-6 ${variant === 'grid' ? '' : ''}`}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        {post.topic && (
                            <span className="eyebrow text-[10px]">{post.topic}</span>
                        )}
                        {readingTime && (
                            <span className="text-[10px] font-medium text-gray-500">{readingTime}</span>
                        )}
                    </div>

                    <Link href={`/blog/${post.slug}`} className="block">
                        <h2 className={`font-bold text-white group-hover:underline underline-offset-4 break-words ${
                            variant === 'grid' ? 'text-lg line-clamp-2' : 'text-xl'
                        }`}>
                            <Highlighted text={post.title} query={query} />
                        </h2>
                    </Link>

                    {body && !compact && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-400">
                            <Highlighted text={body} query={query} />
                        </p>
                    )}

                    {/* mt-auto keeps the meta row pinned to the bottom so cards
                        in a grid line up regardless of excerpt length. */}
                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-gray-500">
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
