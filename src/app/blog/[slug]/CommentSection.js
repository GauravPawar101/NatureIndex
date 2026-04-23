'use client';

import { useEffect, useMemo, useState } from 'react';
import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function CommentsSection({ postId }) {
  const { user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();

  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });
  }, [supabaseUrl, supabaseAnonKey, token]);

  useEffect(() => {
    if (!supabase || !postId) return;

    let cancelled = false;
    async function fetchInitial() {
      const { data, error } = await supabase
        .from('comments')
        .select('id, post_id, user_id, user_name, content, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error('Error fetching comments:', error);
        setErrorMessage('Could not load comments.');
        setComments([]);
        return;
      }

      setErrorMessage(null);
      setComments(data || []);
    }

    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [supabase, postId]);

  useEffect(() => {
    if (!supabase || !postId) return;

    const channel = supabase
      .channel(`comments:post:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const next = payload?.new;
          if (!next?.id) return;

          setComments((prev) => {
            if (prev.some((c) => c.id === next.id)) return prev;
            const merged = [...prev, next];
            merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            return merged;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const oldRow = payload?.old;
          const deletedId = oldRow?.id;
          if (!deletedId) return;
          setComments((prev) => prev.filter((c) => c.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, postId]);

  const canSubmit = Boolean(user) && Boolean(content.trim()) && Boolean(token);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase || !user || !token) return;
    if (!content.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const userName =
      user.fullName ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      'User';

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        user_name: userName,
        content: content.trim(),
      })
      .select('id, post_id, user_id, user_name, content, created_at')
      .single();

    setIsSubmitting(false);

    if (error) {
      console.error('Error creating comment:', error);
      setErrorMessage('Could not post comment.');
      return;
    }

    setContent('');

    // If Realtime is slow/disabled, ensure the new comment appears.
    if (data?.id) {
      setComments((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev;
        const merged = [...prev, data];
        merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return merged;
      });
    }
  }

  async function handleDelete(commentId) {
    if (!supabase || !user || !token) return;
    if (!window.confirm('Delete this comment?')) return;

    const target = comments.find((c) => c.id === commentId);
    if (!target || target.user_id !== user.id) return;

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      console.error('Error deleting comment:', error);
      setErrorMessage('Could not delete comment.');
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="mt-16 pt-8 border-t border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-2">Comments</h2>
        <p className="text-gray-400">Supabase environment variables are missing.</p>
      </div>
    );
  }

  return (
    <div className="mt-16 pt-8 border-t border-gray-700">
      <h2 className="text-3xl font-bold text-white mb-2">
        Comments
        <span className="text-orange-400 ml-2">({comments.length})</span>
      </h2>

      <div className="bg-zinc-800/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
        <h3 className="font-semibold text-gray-200 mb-2">Leave a comment</h3>

        {!user ? (
          <p className="text-gray-400 text-sm">
            <SignInButton mode="modal">
              <button className="font-semibold text-orange-400 hover:text-red-400 hover:underline transition-colors">
                Sign in
              </button>
            </SignInButton>{' '}
            to post a comment.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="w-full p-3 border border-gray-600 bg-black/60 text-white placeholder-gray-400 rounded-lg text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
              rows={3}
            />

            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-gray-400">
                Posting as <span className="text-gray-200 font-semibold">{user?.fullName || user?.username || 'User'}</span>
              </div>

              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-lg"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        )}

        {errorMessage && <p className="mt-3 text-sm text-red-400">{errorMessage}</p>}
      </div>

      <div className="space-y-4 mt-8">
        {comments.map((c) => {
          const isOwner = user && c.user_id === user.id;
          return (
            <div key={c.id} className="bg-zinc-800/30 rounded-xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-orange-500/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-orange-400">{c.user_name}</div>
                  <div className="text-xs text-gray-500 mt-1">{formatDate(c.created_at)}</div>
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="text-sm font-semibold text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              <p className="text-gray-200 mt-3 leading-relaxed whitespace-pre-wrap">{c.content}</p>
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="text-center py-10">
            <div className="bg-zinc-800/30 rounded-2xl p-8 border border-gray-700/30">
              <p className="text-gray-400">No comments yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}