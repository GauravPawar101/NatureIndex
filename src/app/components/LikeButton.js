'use client';

import { useEffect, useMemo, useState } from 'react';
import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Heart } from 'lucide-react';

export default function LikeButton({ postId, initialCount = 0, className = '' }) {
  const { user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();

  const [token, setToken] = useState(null);
  const [count, setCount] = useState(Number(initialCount || 0));
  const [liked, setLiked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    setCount(Number(initialCount || 0));
  }, [initialCount]);

  useEffect(() => {
    let cancelled = false;
    async function loadToken() {
      if (!isAuthLoaded) return;
      if (!getToken) return;

      try {
        const t = await getToken({ template: 'supabase' });
        if (!cancelled) setToken(t || null);
      } catch {
        if (!cancelled) setToken(null);
      }
    }

    loadToken();
    return () => {
      cancelled = true;
    };
  }, [getToken, isAuthLoaded]);

  const supabasePublic = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }, [supabaseUrl, supabaseAnonKey]);

  const supabaseAuthed = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    if (!token) return null;

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }, [supabaseUrl, supabaseAnonKey, token]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      if (!supabasePublic || !postId) return;

      const { data, error } = await supabasePublic.rpc('reaction_count', { p_post_id: postId });
      if (cancelled) return;
      if (error) {
        console.error('Error fetching reaction count:', error);
        return;
      }
      setCount(Number(data || 0));
    }

    fetchCount();
    return () => {
      cancelled = true;
    };
  }, [supabasePublic, postId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLiked() {
      if (!supabaseAuthed || !postId || !user) return;

      const { data, error } = await supabaseAuthed
        .from('reactions')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Error fetching user reaction:', error);
        return;
      }

      setLiked(Boolean(data));
    }

    fetchLiked();
    return () => {
      cancelled = true;
    };
  }, [supabaseAuthed, postId, user]);

  async function toggleLike() {
    if (!supabaseAuthed || !postId || !user) return;
    if (isBusy) return;

    const nextLiked = !liked;

    // Optimistic UI update
    setIsBusy(true);
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));

    let error;
    if (nextLiked) {
      ({ error } = await supabaseAuthed.from('reactions').insert({ post_id: postId, user_id: user.id }));
    } else {
      ({ error } = await supabaseAuthed
        .from('reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id));
    }

    if (error) {
      console.error('Error toggling reaction:', error);
      // Rollback
      setLiked(!nextLiked);
      setCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
    }

    setIsBusy(false);
  }

  const label = liked ? 'Unlike' : 'Like';

  const button = (
    <button
      type="button"
      onClick={toggleLike}
      disabled={isBusy}
      className={
        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border transition ' +
        (liked
          ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
          : 'bg-zinc-800/30 text-gray-300 border-gray-700/50 hover:bg-orange-500/5 hover:text-orange-200') +
        (isBusy ? ' opacity-70 cursor-not-allowed' : '') +
        (className ? ` ${className}` : '')
      }
      aria-pressed={liked}
      aria-label={label}
    >
      <Heart className={'w-4 h-4 ' + (liked ? 'fill-orange-400 text-orange-400' : 'text-gray-400')} />
      <span>{count}</span>
    </button>
  );

  const signedOutButton = (
    <SignInButton mode="modal">
      <button
        type="button"
        className={
          'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border transition bg-zinc-800/30 text-gray-300 border-gray-700/50 hover:bg-orange-500/5 hover:text-orange-200' +
          (className ? ` ${className}` : '')
        }
        aria-label="Sign in to like"
      >
        <Heart className="w-4 h-4 text-gray-400" />
        <span>{count}</span>
      </button>
    </SignInButton>
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return (
    <>
      {user ? button : signedOutButton}
    </>
  );
}
