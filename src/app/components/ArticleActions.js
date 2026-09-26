'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Bookmark, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { useToast } from './ToastProvider';
import CopyButton from './CopyButton';

const noopSubscribe = () => () => {};

/**
 * Whether the browser exposes the native share sheet. This is a capability, not
 * app state: it cannot change while the page is open, so it is read through
 * `useSyncExternalStore` with a `false` server snapshot rather than being
 * mirrored into `useState` from an effect (which would render once with the
 * wrong value and cause a hydration mismatch).
 */
function useNativeShare() {
    return useSyncExternalStore(
        noopSubscribe,
        () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
        () => false
    );
}

/**
 * Bookmark + share controls for an article.
 *
 * The bookmark writes to `post_interactions` with `action_type = 'bookmark'`,
 * which the schema already defines and constrains — so this feeds the same
 * collaborative-filtering signal as reads and comments rather than inventing a
 * parallel store.
 *
 * Updates are optimistic with a rollback: the toggle is instant, and if the
 * write fails the UI snaps back and says why.
 */
export default function ArticleActions({ postId, title }) {
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const toast = useToast();

    const [bookmarked, setBookmarked] = useState(false);
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);

    const canNativeShare = useNativeShare();
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    useEffect(() => {
        if (!supabase || !postId) return;

        let cancelled = false;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) {
                if (!cancelled) setReady(true);
                return;
            }

            const { data } = await supabase
                .from('post_interactions')
                .select('id')
                .eq('user_id', user.id)
                .eq('post_id', postId)
                .eq('action_type', 'bookmark')
                .maybeSingle();

            if (!cancelled) {
                setBookmarked(Boolean(data));
                setReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [supabase, postId]);

    const toggleBookmark = useCallback(async () => {
        if (!supabase) {
            toast.error('Bookmarks are unavailable', {
                message: 'The app is not connected to the database yet.',
            });
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.info('Sign in to save this story', {
                message: 'Bookmarks are tied to your account so you can find them on any device.',
            });
            router.push('/login');
            return;
        }

        if (busy) return;
        setBusy(true);

        const wasBookmarked = bookmarked;
        setBookmarked(!wasBookmarked);

        try {
            if (wasBookmarked) {
                const { error } = await supabase
                    .from('post_interactions')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('post_id', postId)
                    .eq('action_type', 'bookmark');

                if (error) throw error;
                toast.success('Removed from your saved stories');
            } else {
                const { error } = await supabase
                    .from('post_interactions')
                    .insert({ user_id: user.id, post_id: postId, action_type: 'bookmark' });

                if (error) throw error;
                toast.success('Saved to your bookmarks', {
                    message: title ? `“${title}” is now in your saved stories.` : undefined,
                });
            }
        } catch (error) {
            // Roll back so the button never claims a state the database
            // disagrees with.
            setBookmarked(wasBookmarked);
            toast.error(wasBookmarked ? 'Could not remove bookmark' : 'Could not save bookmark', {
                message: 'Your change was not saved. Please try again.',
            });
            console.error('Bookmark toggle failed:', error);
        } finally {
            setBusy(false);
        }
    }, [supabase, postId, bookmarked, busy, toast, router, title]);

    const share = useCallback(async () => {
        // The native share sheet is the better experience on mobile — it offers
        // the reader's own apps. Desktop browsers mostly lack it.
        if (canNativeShare) {
            try {
                await navigator.share({ title, url: shareUrl });
                return;
            } catch (error) {
                // AbortError means the reader closed the sheet deliberately.
                if (error?.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied', { message: 'Share it wherever you like.' });
        } catch {
            toast.info('Copy the link from your address bar', {
                message: 'Your browser blocked clipboard access.',
            });
        }
    }, [title, shareUrl, toast, canNativeShare]);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={toggleBookmark}
                disabled={busy || !ready}
                aria-pressed={bookmarked}
                title={bookmarked ? 'Remove bookmark' : 'Save for later'}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    bookmarked
                        ? 'border-white bg-white text-black'
                        : 'border-white/20 text-gray-200 hover:bg-white/10 hover:border-white/40'
                }`}
            >
                <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
                {bookmarked ? 'Saved' : 'Save'}
            </button>

            <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:border-white/40"
            >
                <Share2 size={15} aria-hidden="true" />
                Share
            </button>

            {/* Fallback for when the share sheet is unavailable and the user
                would rather just copy the URL. */}
            {!canNativeShare && (
                <CopyButton
                    value={shareUrl}
                    label="Copy link"
                    copiedLabel="Copied"
                    onError={() => toast.info('Copy the link from your address bar', {
                        message: 'Your browser blocked clipboard access.',
                    })}
                />
            )}
        </div>
    );
}
