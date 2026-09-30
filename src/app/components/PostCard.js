'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Video, ImageIcon } from 'lucide-react';
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
 * A story in the stream.
 *
 * Medium's card, to the pixel, because Medium's card is the single most
 * recognisable object on the site:
 *
 *   - 200x133 cover to the RIGHT of the text, not above it;
 *   - no card chrome at all — no border around the card, no background, no
 *     shadow. Consecutive stories are separated by a 1px rgba(0,0,0,0.1) rule
 *     and 32px of vertical padding, and that rule is the only decoration;
 *   - title in the UI sans at 20px/700, rgba(0,0,0,0.9) — not the serif, which
 *     Medium reserves for the story page;
 *   - two-line excerpt at 16px, rgba(0,0,0,0.6);
 *   - byline row at 14px: a 24px avatar, the author's name, the read time, the
 *     date. No view count — Medium does not show one, and a number the reader
 *     cannot act on is noise between twelve cards.
 *
 * Two variants. `lead` is the first story on a page: a full-width cover above
 * the text at 28px. `row` is everything else.
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
    const isLead = variant === 'lead';

    // Prefer a window around the match; fall back to the stored excerpt.
    const body = query
        ? excerptAroundMatch(post.excerpt || post.content || '', query)
        : post.excerpt;

    const cover = post.image_url && (
        <Link
            href={`/blog/${post.slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className={`relative block shrink-0 overflow-hidden bg-[var(--surface-sunken)] ${
                isLead ? 'aspect-[16/9] w-full' : 'hidden sm:block w-[200px]'
            }`}
        >
            <Image
                src={post.image_url}
                alt=""
                fill
                // A lead story is usually in the first viewport, so it should
                // not wait on the lazy loader.
                priority={priority || isLead}
                sizes={isLead ? '(max-width: 700px) 100vw, 700px' : '200px'}
                className="object-cover"
                // Cover URLs are user-supplied, so they can point at any host.
                // Without `unoptimized`, next/image throws for hosts missing
                // from images.remotePatterns and takes the whole page down.
                unoptimized
            />
            {post.content_type === 'video' && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50">
                        <Video size={16} className="text-white" aria-hidden="true" />
                    </span>
                </span>
            )}
        </Link>
    );

    return (
        // The lead card stacks: cover above, text below. Every other card is a
        // row with a 200px cover on the right. Both are flex containers, but
        // the lead's cover is full-width, so it has to be a column or it
        // squeezes the text into a single character per line.
        <article
            className={`group flex gap-6 border-b border-[var(--line)] py-8 last:border-b-0 ${
                isLead ? 'flex-col' : ''
            }`}
        >
            {isLead && cover}
            <div className="flex-1 min-w-0">
                {post.topic && (
                    <Link
                        href={`/blog?topic=${encodeURIComponent(post.topic)}`}
                        className="eyebrow mb-2 inline-block hover:text-[var(--accent)]"
                    >
                        {post.topic}
                    </Link>
                )}

                <h2 className={isLead ? 'display-2' : 'display-3'}>
                    <Link href={`/blog/${post.slug}`} className="block">
                        <span className="text-[var(--ink)] transition-colors group-hover:text-[var(--ink-muted)]">
                            <Highlighted text={post.title} query={query} />
                        </span>
                    </Link>
                </h2>

                {body && !compact && (
                    <p
                        className={`mt-2 text-[16px] leading-[1.4] text-[var(--ink-muted)] ${
                            isLead ? 'line-clamp-3' : 'line-clamp-2'
                        }`}
                    >
                        <Highlighted text={body} query={query} />
                    </p>
                )}

                {/* The byline row. Everything here is 14px rgba(0,0,0,0.4)
                    except the name, which Medium keeps at 60% so it stays
                    findable. */}
                <div className="mt-4 flex flex-wrap items-center gap-x-2 text-[14px] text-[var(--ink-faint)]">
                    {authorUsername ? (
                        <Link href={`/profile/${authorUsername}`} className="group/author inline-flex items-center gap-1.5">
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
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[11px] font-bold text-[var(--ink-muted)]"
                                >
                                    {(authorName || '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                            <span className="font-medium text-[var(--ink-muted)] transition-colors group-hover/author:text-[var(--ink)]">
                                {authorName}
                            </span>
                        </Link>
                    ) : (
                        <span className="font-medium text-[var(--ink-muted)]">{authorName || 'Unknown author'}</span>
                    )}

                    {readingTime && (
                        <>
                            <span aria-hidden="true">·</span>
                            <span>{readingTime}</span>
                        </>
                    )}

                    <span aria-hidden="true">·</span>

                    <time dateTime={toISODate(post.date)} title={formatDate(post.date)}>
                        {formatRelativeTime(post.date, formatDate(post.date, ''))}
                    </time>

                    {post.content_type === 'video' && mediaDuration && (
                        <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                                <Video size={12} aria-hidden="true" />
                                {mediaDuration}
                            </span>
                        </>
                    )}

                    {post.content_type === 'photo' && (
                        <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                                <ImageIcon size={12} aria-hidden="true" />
                                Photo set
                            </span>
                        </>
                    )}

                    {commentCount > 0 && (
                        <>
                            <span aria-hidden="true">·</span>
                            <span>{formatCompactNumber(commentCount)} comments</span>
                        </>
                    )}
                </div>
            </div>

            {/* The row variant's cover sits on the right. The lead variant
                already rendered its cover above the text. */}
            {!isLead && cover}
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
