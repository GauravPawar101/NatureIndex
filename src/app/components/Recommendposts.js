'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function RecommendedPosts({
    initialPosts = [],
    limit = 6,
    excludeSlug,
    userId,
    userVector,
    title = 'Recommended for You',
}) {
    // The server already rendered recommendations (see getRecommendedPosts in
    // blog/page.js). Seed state from that and only reach for the API when the
    // server had nothing — mirroring `initialPosts` back into state inside an
    // effect would just cause a redundant second render.
    const hasServerPosts = initialPosts.length > 0;
    const [posts, setPosts] = useState(initialPosts);
    const [status, setStatus] = useState(hasServerPosts ? 'ready' : 'loading');

    useEffect(() => {
        // Server already gave us recommendations — nothing to fetch.
        if (hasServerPosts) return;

        let cancelled = false;

        async function load() {
            setStatus('loading');
            try {
                const params = new URLSearchParams({ limit: String(limit) });
                if (excludeSlug) params.set('exclude', excludeSlug);

                const res = await fetch(`/api/recommendations?${params.toString()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, userVector }),
                });

                if (!res.ok) throw new Error('Failed to fetch recommendations');
                const data = await res.json();

                if (cancelled) return;
                const nextPosts = Array.isArray(data.posts) ? data.posts : [];
                setPosts(nextPosts);
                setStatus(nextPosts.length ? 'ready' : 'empty');
            } catch (err) {
                if (!cancelled) {
                    console.error('Recommendations UI error:', err);
                    setStatus('error');
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
        // `hasServerPosts` is derived from initialPosts, which is read once on
        // purpose: re-running when it changes would refetch and discard the
        // server-rendered data.
    }, [limit, excludeSlug, userId, userVector, hasServerPosts]);

    if (status === 'empty' || status === 'error') return null;

    return (
        <section className="mt-16">
            <h2 className="mb-2 text-[20px] font-bold text-[var(--ink)]">{title}</h2>

            <div className="mt-4 flex flex-col">
                {status === 'loading'
                    ? Array.from({ length: limit }).map((_, i) => (
                        <div key={i} className="h-[100px] border-b border-[var(--line)] py-6">
                            <div className="skeleton h-full w-full" />
                        </div>
                    ))
                    : posts.map((post) => (
                        <Link
                            key={post.slug || post.id}
                            href={`/blog/${post.slug || post.id}`}
                            className="group flex gap-6 border-b border-[var(--line)] py-6"
                        >
                            <div className="min-w-0 flex-1">
                                {post.topic && (
                                    <span className="eyebrow mb-1 block">{post.topic}</span>
                                )}
                                <h3 className="text-[16px] font-bold leading-[1.3] text-[var(--ink)]">
                                    {post.title || 'Untitled Post'}
                                </h3>
                            </div>
                            {post.image_url && (
                                <div className="relative h-[100px] w-[150px] shrink-0 overflow-hidden bg-[var(--surface-sunken)]">
                                    <Image
                                        src={post.image_url}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="150px"
                                        unoptimized
                                    />
                                </div>
                            )}
                        </Link>
                    ))}
            </div>
        </section>
    );
}
