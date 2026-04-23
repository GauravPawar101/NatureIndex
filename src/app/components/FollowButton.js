'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function FollowButton({ followingId }) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isLoaded) return;
      if (!userId || !followingId || userId === followingId) {
        if (!cancelled) {
          setReady(true);
          setIsFollowing(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/follows?followingId=${encodeURIComponent(followingId)}`, {
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          setIsFollowing(Boolean(json?.following));
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
  }, [followingId, isLoaded, userId]);

  if (!ready) {
    return (
      <button
        type="button"
        className="px-4 py-2 rounded-full border border-white/15 bg-white/5 text-gray-200"
        disabled
      >
        Follow
      </button>
    );
  }

  if (!userId) {
    return (
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="px-4 py-2 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-semibold"
      >
        Follow
      </button>
    );
  }

  if (userId === followingId) {
    return null;
  }

  async function toggle() {
    if (loading) return;
    setLoading(true);

    const next = !isFollowing;
    setIsFollowing(next);

    try {
      const url = `/api/follows?followingId=${encodeURIComponent(followingId)}`;
      const res = await fetch(url, {
        method: next ? 'POST' : 'DELETE',
        headers: next ? { 'Content-Type': 'application/json' } : undefined,
        body: next ? JSON.stringify({ followingId }) : undefined,
      });

      if (!res.ok) {
        setIsFollowing(!next);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={
        isFollowing
          ? 'px-4 py-2 rounded-full border border-white/20 bg-white/10 text-gray-100 font-semibold hover:bg-white/15'
          : 'px-4 py-2 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-semibold'
      }
    >
      {loading ? '…' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
