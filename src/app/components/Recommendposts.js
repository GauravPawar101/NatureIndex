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
            <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">{title}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {status === 'loading'
                    ? Array.from({ length: limit }).map((_, i) => (
                        <div key={i} className="glass h-48 animate-pulse" />
                    ))
                    : posts.map((post) => (
                        <Link
                            key={post.slug || post.id}
                            href={`/blog/${post.slug || post.id}`}
                            className="glass glass-hover overflow-hidden group block"
                        >
                            {post.image_url && (
                                <div className="relative w-full h-36">
                                    <Image
                                        src={post.image_url}
                                        alt={post.title || 'Recommended post'}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 640px) 100vw, 33vw"
                                        unoptimized
                                    />
                                </div>
                            )}
                            <div className="p-4">
                                {post.topic && (
                                    <span className="eyebrow text-[10px] mb-2 block w-fit">{post.topic}</span>
                                )}
                                <h3 className="text-base font-semibold text-[var(--ink)] group-hover:underline underline-offset-4 line-clamp-2">
                                    {post.title || 'Untitled Post'}
                                </h3>
                            </div>
                        </Link>
                    ))}
            </div>
        </section>
    );
}
