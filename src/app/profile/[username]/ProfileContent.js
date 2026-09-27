'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    CalendarDays,
    Copy,
    ExternalLink,
    Eye,
    FileText,
    Globe,
    Leaf,
    MessageSquare,
    TrendingUp,
} from 'lucide-react';
import PostCard from '../../components/PostCard';
import SearchInput from '../../components/SearchInput';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../components/ToastProvider';
import { searchPosts } from '../../lib/search';
import {
    formatCompactNumber,
    formatMemberSince,
    formatRelativeTime,
    toISODate,
} from '../../lib/format';

const TABS = [
    { id: 'posts', label: 'Stories', icon: FileText },
    { id: 'comments', label: 'Discussion', icon: MessageSquare },
];

/**
 * Interactive half of a contributor profile: tabbed content plus a live filter
 * over the posts and comments already sent to the browser.
 *
 * A profile's data is small and fixed at request time, so this filters locally
 * rather than round-tripping to `/api/search` — instant results, and it still
 * works if the search endpoint is unavailable.
 */
export default function ProfileContent({ username, website, posts, comments }) {
    const [tab, setTab] = useState('posts');
    const [query, setQuery] = useState('');
    const toast = useToast();

    // `searchPosts` handles title/topic/excerpt/body matching, relevance
    // ranking and AND semantics across terms.
    const filteredPosts = useMemo(() => searchPosts(posts, { query }), [posts, query]);
    const filteredComments = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return comments;
        return comments.filter((comment) =>
            `${comment.content} ${comment.postTitle}`.toLowerCase().includes(needle)
        );
    }, [comments, query]);

    const activeList = tab === 'posts' ? filteredPosts : filteredComments;
    const searching = query.trim().length > 0;

    const copyProfileUrl = async () => {
        const url = `${window.location.origin}/profile/${username}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Profile link copied');
        } catch {
            toast.info('Copy the link from your address bar', {
                message: 'Your browser blocked clipboard access.',
            });
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)]">
                <div role="tablist" aria-label="Profile content" className="flex gap-1">
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const count = id === 'posts' ? posts.length : comments.length;
                        const isActive = tab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setTab(id)}
                                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                                    isActive
                                        ? 'border-[var(--line-strong)] text-[var(--ink)]'
                                        : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
                                }`}
                            >
                                <Icon size={15} aria-hidden="true" />
                                {label}
                                <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? 'bg-[var(--surface-raised)] text-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--ink-faint)]'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 py-2">
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder={tab === 'posts' ? 'Filter stories...' : 'Filter comments...'}
                        label={`Filter ${tab}`}
                        size="sm"
                        className="w-full sm:w-64"
                    />
                    <button
                        type="button"
                        onClick={copyProfileUrl}
                        aria-label="Copy profile link"
                        title="Copy profile link"
                        className="shrink-0 rounded-lg border border-[var(--line-strong)] p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                    >
                        <Copy size={15} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <p aria-live="polite" className="mb-5 text-sm text-[var(--ink-muted)]">
                {searching
                    ? `${activeList.length} ${activeList.length === 1 ? 'result' : 'results'} for "${query.trim()}"`
                    : null}
            </p>

            {tab === 'posts' ? (
                filteredPosts.length > 0 ? (
                    <div className="space-y-4">
                        {filteredPosts.map((post) => (
                            <PostCard key={post.slug} post={post} query={query} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={searching ? FileText : Leaf}
                        title={searching ? 'No stories match that filter' : 'No stories published yet'}
                        description={
                            searching
                                ? 'Try a different keyword, or clear the filter to see everything.'
                                : 'When this contributor publishes, their work will appear here.'
                        }
                        action={searching ? (
                            <button type="button" onClick={() => setQuery('')} className="btn btn-secondary">Clear filter</button>
                        ) : null}
                    />
                )
            ) : filteredComments.length > 0 ? (
                <div className="space-y-3">
                    {filteredComments.map((comment) => (
                        <Link
                            key={comment.id}
                            href={`/blog/${comment.slug}#comment-${comment.id}`}
                            className="glass glass-hover block p-5"
                        >
                            <p className="mb-2 flex items-center gap-2 text-xs text-[var(--ink-faint)]">
                                <span className="truncate font-semibold text-[var(--ink-muted)]">{comment.postTitle}</span>
                                <span aria-hidden="true">•</span>
                                <time dateTime={toISODate(comment.created_at)}>{formatRelativeTime(comment.created_at)}</time>
                            </p>
                            <p className="line-clamp-3 text-sm leading-relaxed text-[var(--ink-muted)]">{comment.content}</p>
                        </Link>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={searching ? MessageSquare : MessageSquare}
                    title={searching ? 'No comments match that filter' : 'No comments yet'}
                    description={
                        searching
                            ? 'Try a different keyword, or clear the filter.'
                            : 'This contributor has not taken part in any discussions yet.'
                    }
                    action={searching ? (
                        <button type="button" onClick={() => setQuery('')} className="btn btn-secondary">Clear filter</button>
                    ) : null}
                />
            )}
        </div>
    );
}

/**
 * Headline numbers. Split out so the server page can render it without pulling
 * the interactive half into the server bundle.
 */
export function ProfileStats({ stats, website }) {
    const { postCount, totalViews, commentCount, topicCount, topPost } = stats;

    return (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={FileText} value={postCount} label={postCount === 1 ? 'Story' : 'Stories'} />
            <Stat icon={Eye} value={totalViews} label="Total views" />
            <Stat icon={MessageSquare} value={commentCount} label="Comments" />
            <Stat icon={Leaf} value={topicCount} label={topicCount === 1 ? 'Topic' : 'Topics'} />
        </div>
    );
}

function Stat({ icon: Icon, value, label }) {
    return (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-center">
            <Icon size={15} aria-hidden="true" className="mx-auto mb-1.5 text-[var(--ink-muted)]" />
            <div className="text-lg font-bold text-[var(--ink)]">{formatCompactNumber(value)}</div>
            <div className="text-xs text-[var(--ink-faint)]">{label}</div>
        </div>
    );
}

/** Identity block: avatar, name, handle, bio, links. */
export function ProfileHeader({ profile, websiteHref, memberSince, topPost }) {
    const displayName = profile.full_name || profile.username;

    return (
        <div className="glass p-8">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:text-left">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full bg-[var(--surface)] ring-4 ring-white/20">
                    {profile.avatar_url ? (
                        // Avatars come from arbitrary user-supplied hosts, which
                        // cannot be enumerated in next.config's
                        // images.remotePatterns, so the optimiser is bypassed.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                            width={128}
                            height={128}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <Leaf size={40} className="text-[var(--ink-faint)]" aria-hidden="true" />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1 text-center md:text-left">
                    <span className="eyebrow mb-2 block">Contributor</span>
                    <h1 className="break-words text-3xl font-bold text-[var(--ink)] md:text-4xl">{displayName}</h1>
                    <p className="mt-1 text-[var(--ink-muted)]">@{profile.username}</p>

                    {profile.bio && (
                        <p className="mt-4 max-w-2xl whitespace-pre-line text-left text-[var(--ink-muted)]">{profile.bio}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm md:justify-start">
                        {memberSince && (
                            <span className="inline-flex items-center gap-1.5 text-[var(--ink-faint)]">
                                <CalendarDays size={14} aria-hidden="true" />
                                Member since {memberSince}
                            </span>
                        )}

                        {websiteHref && (
                            <a
                                href={websiteHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link-accent inline-flex items-center gap-1.5 text-sm"
                            >
                                <Globe size={14} aria-hidden="true" />
                                {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                <ExternalLink size={12} aria-hidden="true" className="opacity-60" />
                            </a>
                        )}
                    </div>

                    {topPost && (
                        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink-muted)]">
                            <TrendingUp size={13} aria-hidden="true" className="text-emerald-300" />
                            Most read:{' '}
                            <Link href={`/blog/${topPost.slug}`} className="font-semibold text-[var(--ink)] hover:underline underline-offset-2">
                                {topPost.title}
                            </Link>
                            <span className="text-[var(--ink-faint)]">({formatCompactNumber(topPost.views)})</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
