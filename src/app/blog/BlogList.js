'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Filter, RotateCcw, SearchX, X } from 'lucide-react';
import PostCard from '../components/PostCard';
import SearchInput from '../components/SearchInput';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/ToastProvider';
import useDebouncedValue from '../hooks/useDebouncedValue';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'popular', label: 'Most read' },
];

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search, filter and sort controls for the blog index.
 *
 * The URL is the single source of truth: filters are read from props (which the
 * server component derived from `searchParams`) and written with
 * `router.replace`. That single decision buys shareable result URLs, working
 * back/forward, and server-side relevance ranking — at the cost of a round trip
 * per change, which the debounce absorbs.
 *
 * Local state still tracks the raw input so typing stays at 60fps while the
 * URL catches up 300ms later.
 */
export default function BlogList({
    initialPosts = [],
    topics = [],
    authors = [],
    initialTotal = 0,
    query = '',
    topic = 'All',
    author = 'All',
    sort = 'newest',
    degraded = false,
    failed = false,
    semantic = false,
    hasFilters = false,
    pageSize = 12,
}) {
    const router = useRouter();
    const pathname = usePathname();
    const toast = useToast();
    const [isPending, startTransition] = useTransition();

    // The input is uncontrolled-by-URL while typing; this mirrors it.
    const [inputValue, setInputValue] = useState(query);
    const debouncedQuery = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);

    const [extraPosts, setExtraPosts] = useState([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const total = initialTotal + extraPosts.length;
    const all = [...initialPosts, ...extraPosts];
    const canLoadMore = all.length < total;
    const hasResults = all.length > 0;

    // No effect resets `extraPosts` when the filters change: the page gives
    // this component a `key` built from query/topic/sort, so React remounts it
    // and state resets for free. A `useEffect` doing the same job would render
    // one frame of stale "load more" pages before correcting itself.

    const applyFilters = useCallback((next) => {
        const params = new URLSearchParams();

        const nextQuery = (next.q ?? '').trim();
        const nextTopic = next.topic ?? 'All';
        const nextAuthor = next.author ?? 'All';
        const nextSort = next.sort ?? 'newest';

        if (nextQuery) params.set('q', nextQuery);
        if (nextTopic !== 'All') params.set('topic', nextTopic);
        if (nextAuthor !== 'All') params.set('author', nextAuthor);
        if (nextSort !== 'newest') params.set('sort', nextSort);

        const search = params.toString();
        startTransition(() => {
            // `replace` rather than `push`: refining a search should not bury
            // the previous page under a dozen history entries.
            router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
        });
    }, [pathname, router]);

    // Push the debounced input into the URL.
    useEffect(() => {
        if (debouncedQuery === query) return;
        applyFilters({ q: debouncedQuery, topic, author, sort });
    }, [debouncedQuery, query, topic, author, sort, applyFilters]);

    // Report what a search actually found.
    //
    // A silent result change is the part of search that feels broken: the
    // reader types, the page updates, and nothing tells them whether it matched
    // anything or the query was too narrow. `total` is the server's count, so
    // this waits for the transition to settle rather than announcing
    // optimistically and then contradicting itself.
    const announcedFor = useRef(null);
    useEffect(() => {
        if (isPending || failed) return;
        if (!query.trim()) return;
        if (total === 0) return; // the empty state already says so, in place

        const signature = `${query}|${topic}|${author}|${sort}|${total}`;
        if (announcedFor.current === signature) return;
        announcedFor.current = signature;

        toast.success(
            total === 1 ? '1 story matches' : `${total} stories match`,
            { message: 'Ranked by keyword relevance and meaning.' }
        );
    }, [query, topic, author, sort, total, isPending, failed, toast]);

    const clearAll = useCallback(() => {
        setInputValue('');
        setExtraPosts([]);
        // Reset the announcement guard, or the next search after a clear is
        // silently swallowed as a duplicate signature.
        announcedFor.current = null;
        startTransition(() => router.replace(pathname, { scroll: false }));
    }, [pathname, router]);

    const loadMore = useCallback(async () => {
        if (loadingMore) return;
        setLoadingMore(true);

        try {
            const params = new URLSearchParams({ limit: String(pageSize), offset: String(initialPosts.length + extraPosts.length) });
            if (query) params.set('q', query);
            if (topic !== 'All') params.set('topic', topic);
            if (author !== 'All') params.set('author', author);
            if (sort) params.set('sort', sort);

            const response = await fetch(`/api/search?${params.toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const next = Array.isArray(data.posts) ? data.posts : [];

            if (next.length) {
                setExtraPosts((current) => [...current, ...next]);
                toast.success(`Loaded ${next.length} more ${next.length === 1 ? 'story' : 'stories'}`);
            }
        } catch (error) {
            // A failed "load more" must not discard what is already on screen.
            toast.error('Could not load more stories', {
                message: 'Check your connection and try again.',
            });
            console.error('Load more failed:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, pageSize, initialPosts.length, extraPosts.length, query, topic, author, sort, toast]);

    const activeFilterCount =
        (query ? 1 : 0) + (topic !== 'All' ? 1 : 0) + (author !== 'All' ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

    return (
        <div>
            {/* --- Controls --- */}
            <div className="mb-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <SearchInput
                        value={inputValue}
                        onChange={setInputValue}
                        onClear={() => setInputValue('')}
                        placeholder="Search by keyword or meaning..."
                        label="Search articles"
                        isPending={isPending}
                        className="flex-1"
                    />

                    <div className="relative sm:w-48">
                        <label htmlFor="blog-author" className="sr-only">Filter by author</label>
                        <select
                            id="blog-author"
                            value={author}
                            onChange={(event) => applyFilters({ q: inputValue, topic, author: event.target.value, sort })}
                            className="field w-full appearance-none cursor-pointer pr-10"
                        >
                            <option value="All">All authors</option>
                            {authors.map((entry) => (
                                <option key={entry.username} value={entry.username}>
                                    {entry.fullName} ({entry.count})
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
                        />
                    </div>

                    <div className="relative sm:w-48">
                        <label htmlFor="blog-sort" className="sr-only">Sort articles</label>
                        <select
                            id="blog-sort"
                            value={sort}
                            onChange={(event) => applyFilters({ q: inputValue, topic, author, sort: event.target.value })}
                            className="field w-full appearance-none cursor-pointer pr-10"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
                        />
                    </div>

                    {/* Topic pills are numerous; collapsed behind a toggle on
                        small screens where they would otherwise wrap to 4 rows. */}
                    <button
                        type="button"
                        onClick={() => setShowFilters((open) => !open)}
                        aria-expanded={showFilters}
                        aria-controls="blog-topics"
                        className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors sm:hidden ${
                            topic !== 'All' ? 'border-[var(--line-strong)] bg-white text-black' : 'border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--surface)]'
                        }`}
                    >
                        <Filter size={15} aria-hidden="true" />
                        Topics
                        {topic !== 'All' && <span className="rounded-full bg-black/20 px-1.5 text-xs">1</span>}
                    </button>
                </div>

                <div
                    id="blog-topics"
                    className={`${showFilters ? 'flex' : 'hidden'} sm:flex mt-4 flex-wrap gap-2 border-t border-[var(--line)] pt-4`}
                >
                    <TopicPill
                        label="All"
                        count={null}
                        active={topic === 'All'}
                        onClick={() => applyFilters({ q: inputValue, topic: 'All', author, sort })}
                    />
                    {topics.map(({ topic: name, count }) => (
                        <TopicPill
                            key={name}
                            label={name}
                            count={count}
                            active={topic === name}
                            onClick={() => applyFilters({ q: inputValue, topic: topic === name ? 'All' : name, author, sort })}
                        />
                    ))}
                </div>
            </div>

            {/* --- Result summary --- */}
            <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <p aria-live="polite" className="text-[var(--ink-muted)]">
                    {failed
                        ? 'Search is unavailable right now.'
                        : isPending
                            ? 'Searching...'
                            : hasResults
                                ? <>
                                    <span className="font-semibold text-[var(--ink)]">{total}</span>
                                    {` ${total === 1 ? 'story' : 'stories'}`}
                                    {query && <> matching <span className="text-[var(--ink)]">&ldquo;{query}&rdquo;</span></>}
                                    {topic !== 'All' && <> in <span className="text-[var(--ink)]">{topic}</span></>}
                                    {author !== 'All' && (
                                        <>
                                            {' by '}
                                            <span className="text-[var(--ink)]">
                                                {authors.find((a) => a.username === author)?.fullName ?? author}
                                            </span>
                                        </>
                                    )}
                                </>
                                : 'No stories found'}
                </p>

                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                    >
                        <RotateCcw size={12} aria-hidden="true" />
                        Clear filters
                    </button>
                )}

                {/* Honest about weaker results. "Basic matching" means the
                    semantic tier did not contribute — either the encoder is
                    cold, or the match_posts function is not installed — so
                    these are keyword matches only and saying nothing would
                    overstate the quality. */}
                {degraded && hasResults && !isPending && (
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                        Keyword matching only
                    </span>
                )}

                {/* Confirms the search understood meaning, not just words. */}
                {semantic && !isPending && hasResults && (
                    <span
                        className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
                        title="Results combine keyword relevance with semantic similarity"
                    >
                        Semantic search
                    </span>
                )}
            </div>

            {/* --- Active filter chips --- */}
            {hasFilters && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {query && (
                        <FilterChip
                            label={`"${query}"`}
                            onRemove={() => {
                                setInputValue('');
                                applyFilters({ q: '', topic, author, sort });
                            }}
                        />
                    )}
                    {topic !== 'All' && (
                        <FilterChip
                            label={topic}
                            onRemove={() => applyFilters({ q: inputValue, topic: 'All', author, sort })}
                        />
                    )}
                    {author !== 'All' && (
                        <FilterChip
                            label={authors.find((a) => a.username === author)?.fullName ?? author}
                            onRemove={() => applyFilters({ q: inputValue, topic, author: 'All', sort })}
                        />
                    )}
                    {sort !== 'newest' && (
                        <FilterChip
                            label={SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort}
                            onRemove={() => applyFilters({ q: inputValue, topic, author, sort: 'newest' })}
                        />
                    )}
                </div>
            )}

            {/* --- Results --- */}
            <div>
                {isPending && !hasResults ? (
                    <div className="space-y-4" aria-hidden="true">
                        <div className="glass h-72 animate-pulse sm:h-64" />
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="glass h-32 animate-pulse" />
                        ))}
                    </div>
                ) : hasResults ? (
                    <>
                        {/* Editorial layout: the newest story leads at a size
                            that makes it the obvious entry point, the rest sit
                            in tighter rows below it.

                            Suppressed while a filter is active. A lead card is
                            a judgement that one result is more important than
                            the others, which is not a claim worth making about
                            a filtered set — a search for "kelp" should look
                            like a result list, not a front page. */}
                        {/* `isPending` dims and desaturates the existing
                            results rather than replacing them with a
                            skeleton. A skeleton on every keystroke is a flash
                            of grey; the cards are already on screen and still
                            say something useful, so they stay and the dimming
                            is what communicates "this is updating". */}
                        <div
                            className={`space-y-4 transition-all duration-200 ease-out ${
                                isPending ? 'pointer-events-none opacity-40 blur-[1px]' : 'opacity-100'
                            }`}
                        >
                            {(hasFilters ? [] : all.slice(0, 1)).map((post) => (
                                <div key={post.slug} className="animate-card-in" style={{ '--card-index': 0 }}>
                                    <PostCard post={post} query={query} variant="lead" />
                                </div>
                            ))}

                            <div className="space-y-4">
                                {all
                                    .slice(hasFilters ? 0 : 1)
                                    .map((post, index) => (
                                        <div
                                            key={post.slug}
                                            className="animate-card-in"
                                            // Capped so a long list does not leave
                                            // the last card waiting a second to
                                            // appear.
                                            style={{ '--card-index': Math.min(index, 8) }}
                                        >
                                            <PostCard post={post} query={query} />
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {canLoadMore && (
                            <div className="mt-8 text-center">
                                <button
                                    type="button"
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="btn btn-secondary disabled:opacity-50"
                                >
                                    {loadingMore ? 'Loading...' : `Load more (${total - initialPosts.length - extraPosts.length} remaining)`}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <EmptyState
                        icon={failed ? RotateCcw : SearchX}
                        title={failed ? 'Search is unavailable' : hasFilters ? 'No stories match those filters' : 'No stories published yet'}
                        description={
                            failed
                                ? 'The article database could not be reached. This is usually a connection problem rather than anything about your search.'
                                : hasFilters
                                    ? 'Try a broader keyword, or clear the filters to see everything that has been published.'
                                    : 'Once a contributor publishes their first story it will appear here.'
                        }
                        action={
                            hasFilters ? (
                                <button type="button" onClick={clearAll} className="btn btn-secondary">
                                    Clear filters
                                </button>
                            ) : !failed ? (
                                <Link href="/create-post" className="btn btn-primary">Write the first story</Link>
                            ) : null
                        }
                    />
                )}
            </div>
        </div>
    );
}

function TopicPill({ label, count, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all duration-200 ${
                active ? 'pill pill-active' : 'pill'
            }`}
        >
            {label}
            {count !== null && (
                <span className={`ml-1.5 text-xs ${active ? 'text-black/60' : 'text-[var(--ink-faint)]'}`}>{count}</span>
            )}
        </button>
    );
}

function FilterChip({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] py-1 pl-3 pr-1.5 text-xs font-medium text-[var(--ink)]">
            {label}
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove filter ${label}`}
                className="rounded-full p-1 text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
            >
                <X size={12} aria-hidden="true" />
            </button>
        </span>
    );
}
