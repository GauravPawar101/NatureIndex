'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PostCard from '../components/PostCard';
import { useToast } from '../components/ToastProvider';

/**
 * Infinite-scroll feed for /discover.
 *
 * Pages by offset through /api/search, which is the same endpoint the blog list
 * uses, so a card behaves identically wherever it is found. `sort=newest` keeps
 * the order stable and predictable; "trending" is a ranking applied to the
 * server-rendered first page, and re-sorting it as you scroll would make the
 * list jump under the reader.
 *
 * An IntersectionObserver on a sentinel is used rather than a scroll handler so
 * the main thread is not doing layout maths on every frame, and the observer
 * disconnects once everything is loaded so a short page cannot keep firing.
 */
export default function DiscoverFeed({ initialPosts, pageSize = 12, hasMore: initialHasMore }) {
    const [posts, setPosts] = useState(initialPosts);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loading, setLoading] = useState(false);
    const sentinel = useRef(null);
    const toast = useToast();

    // Guards against a slow response landing after the component unmounts, and
    // against two observer callbacks firing before the first one sets state.
    const requestInFlight = useRef(false);

    const loadMore = useCallback(async () => {
        if (requestInFlight.current || !hasMore) return;
        requestInFlight.current = true;
        setLoading(true);

        try {
            const params = new URLSearchParams({
                sort: 'newest',
                limit: String(pageSize),
                offset: String(posts.length),
            });

            const response = await fetch(`/api/search?${params.toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const next = Array.isArray(data.posts) ? data.posts : [];

            if (next.length === 0) {
                // An empty page means the end even if `total` disagrees, so the
                // sentinel stops firing.
                setHasMore(false);
            } else {
                setPosts((current) => {
                    // Offset paging can repeat a row if the catalogue changes
                    // mid-scroll; de-duplicate by slug rather than showing a
                    // duplicate card.
                    const seen = new Set(current.map((p) => p.slug));
                    return [...current, ...next.filter((p) => !seen.has(p.slug))];
                });
                setHasMore(posts.length + next.length < (data.total ?? 0));
            }
        } catch (error) {
            console.error('Discover feed failed to load more:', error);
            toast.error('Could not load more stories', {
                message: 'Check your connection and try again.',
            });
        } finally {
            requestInFlight.current = false;
            setLoading(false);
        }
    }, [hasMore, pageSize, posts.length, toast]);

    useEffect(() => {
        const node = sentinel.current;
        if (!node || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) loadMore();
            },
            // Start fetching before the sentinel is actually visible so the next
            // batch is usually there by the time the reader reaches it.
            { rootMargin: '600px 0px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    return (
        <div>
            <div>
                {posts.map((post, index) => (
                    <div
                        key={post.slug}
                        className="animate-card-in"
                        // Only the first screen staggers. Re-animating appended
                        // pages on every scroll would make the feed feel like it
                        // is reloading rather than extending.
                        style={index < posts.length - pageSize ? { '--card-index': Math.min(index, 8) } : undefined}
                    >
                        <PostCard post={post} />
                    </div>
                ))}
            </div>

            {/* The sentinel is always mounted while more may exist, so scrolling
                back up and down re-triggers loading without remounting. */}
            {hasMore && (
                <div ref={sentinel} className="mt-8 text-center" aria-hidden="true">
                    {loading ? (
                        <div className="skeleton h-16 w-full" />
                    ) : (
                        <button
                            type="button"
                            onClick={loadMore}
                            className="btn btn-secondary"
                        >
                            Load more
                        </button>
                    )}
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <p className="mt-8 text-center text-[13px] text-[var(--ink-faint)]">
                    That is everything published so far.
                </p>
            )}
        </div>
    );
}
