'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';

export default function BookmarkButton({ postId, className = '', size = 16 }) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  const [bookmarked, setBookmarked] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isLoaded) return;
      if (!userId || !postId) {
        if (!cancelled) {
          setReady(true);
          setBookmarked(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/bookmarks?postId=${encodeURIComponent(postId)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          setBookmarked(Boolean(json?.bookmarked));
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, postId]);

  async function toggle(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isLoaded) return;

    if (!userId) {
      router.push('/sign-in');
      return;
    }

    if (loading) return;
    setLoading(true);

    const next = !bookmarked;
    setBookmarked(next);

    try {
      const url = `/api/bookmarks?postId=${encodeURIComponent(postId)}`;
      const res = await fetch(url, {
        method: next ? 'POST' : 'DELETE',
        headers: next ? { 'Content-Type': 'application/json' } : undefined,
        body: next ? JSON.stringify({ postId }) : undefined,
      });

      if (!res.ok) {
        setBookmarked(!next);
      }
    } finally {
      setLoading(false);
      setReady(true);
    }
  }

  const active = bookmarked;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? 'Remove bookmark' : 'Bookmark'}
      disabled={!ready || loading || !postId}
      className={
        `inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10 transition ` +
        (active ? 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15 ' : '') +
        className
      }
    >
      <Bookmark
        width={size}
        height={size}
        className={loading ? 'opacity-70' : ''}
        strokeWidth={2}
        fill={active ? 'currentColor' : 'none'}
      />
    </button>
  );
}
