'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowUpDown,
    ImageIcon,
    Loader2,
    MessageSquare,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/ToastProvider';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { uploadImage, validateImageFile, UPLOAD_TARGETS } from '../../lib/uploads';
import { formatBytes, formatRelativeTime, initials, toISODate } from '../../lib/format';

// Mirrors the `comments_content_length` check in the schema so the UI can
// explain the limit instead of letting Postgres reject the insert.
const MAX_COMMENT_LENGTH = 5000;
// Accepted types are checked in the file picker and again on selection, and the
// authoritative allowlist lives in lib/uploads.js alongside the bucket limits.
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

const SORT_OPTIONS = [
    { value: 'oldest', label: 'Oldest first' },
    { value: 'newest', label: 'Newest first' },
    { value: 'top', label: 'Most liked' },
];

/**
 * Turns a Supabase error into something a reader can act on. RLS and storage
 * errors surface as raw Postgres text, which is meaningless in a comment box.
 */
function describeCommentError(error) {
    const message = String(error?.message || '');

    if (/row-level security|permission denied/i.test(message)) {
        return {
            title: 'You do not have permission to do that',
            message: 'Only the author of a comment can remove it.',
        };
    }
    if (/violates row-level security policy/i.test(message)) {
        return { title: 'Not allowed', message: 'Your account cannot perform this action.' };
    }
    if (/too large|exceeds the maximum allowed size|payload/i.test(message)) {
        return { title: 'That image is too large', message: 'Comment images must be under 5MB.' };
    }
    if (/value too long|comments_content_length/i.test(message)) {
        return {
            title: 'That comment is too long',
            message: `Comments are limited to ${MAX_COMMENT_LENGTH.toLocaleString()} characters.`,
        };
    }
    if (/failed to fetch|network/i.test(message)) {
        return {
            title: 'Connection lost',
            message: 'Your comment was not sent. Check your connection and try again.',
        };
    }

    return {
        title: 'Could not post your comment',
        message: 'Something went wrong on our side. Please try again.',
    };
}

// ---------------------------------------------------------------------------
// Comment composer
// ---------------------------------------------------------------------------

function CommentForm({ postId, parentId = null, onComplete, onCancel, autoFocus = false }) {
    const [content, setContent] = useState('');
    // The object URL is created when the file is chosen rather than derived in
    // an effect: an effect would have to `setState` during the render pass, and
    // a `useMemo` would leak the URL because there is no cleanup hook.
    const [attachment, setAttachment] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [supabase] = useState(() => createClient());
    const toast = useToast();

    const trimmed = content.trim();
    const remaining = MAX_COMMENT_LENGTH - content.length;
    const canSubmit = trimmed.length > 0 && !isLoading;

    const image = attachment?.file ?? null;
    const previewUrl = attachment?.url ?? null;

    // Revoke on unmount, and whenever the attachment is replaced or cleared.
    const latestUrl = useRef(null);
    useEffect(() => {
        latestUrl.current = previewUrl;
    }, [previewUrl]);

    useEffect(() => () => {
        if (latestUrl.current) URL.revokeObjectURL(latestUrl.current);
    }, []);

    const clearAttachment = useCallback(() => {
        setAttachment((current) => {
            if (current?.url) URL.revokeObjectURL(current.url);
            return null;
        });
    }, []);

    const attachFile = useCallback((file) => {
        // Reject on selection rather than on submit, so the mistake is visible
        // before they write a paragraph and then lose it.
        if (!file) return;

        // `validateImageFile` throws a reader-facing message; catch it here to
        // show inline instead of surfacing it on submit.
        try {
            validateImageFile(file, 'comment-image');
        } catch (caught) {
            setError({ title: 'Attachment not added', message: caught.message });
            return;
        }

        setError(null);
        setAttachment((current) => {
            if (current?.url) URL.revokeObjectURL(current.url);
            return { file, url: URL.createObjectURL(file) };
        });
    }, []);

    const submit = useCallback(async (event) => {
        event.preventDefault();
        if (!trimmed || isLoading) return;

        if (!supabase) {
            setError({ title: 'Comments are unavailable', message: 'The app is not connected to the database yet.' });
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError({
                    title: 'Sign in to comment',
                    message: 'Comments are tied to your account so people know who is taking part.',
                });
                toast.info('Sign in to join the discussion', {
                    message: 'Your comment was not lost — sign in and post it again.',
                });
                return;
            }

            let imageUrl = null;
            if (image) {
                // Delegates validation and the `<userId>/...` object name to the
                // shared helper, so this path stays consistent with avatars and
                // post covers.
                imageUrl = (await uploadImage({
                    supabase,
                    userId: user.id,
                    file: image,
                    target: 'comment-image',
                })).publicUrl;
            }

            const { error: insertError } = await supabase.from('comments').insert({
                post_id: postId,
                user_id: user.id,
                content: trimmed,
                parent_id: parentId,
                image_url: imageUrl,
            });

            if (insertError) throw insertError;

            setContent('');
            clearAttachment();
            toast.success(parentId ? 'Reply posted' : 'Comment posted');
            onComplete?.();
        } catch (caught) {
            console.error('Comment submission failed:', caught);
            // `uploadImage` and `validateImageFile` already throw messages
            // written for the reader, so a validation failure is used verbatim
            // rather than being flattened into "something went wrong".
            const described = /^(Unsupported file type|.*must be under|That file is empty|No file was selected)/i.test(caught?.message || '')
                ? { title: 'Attachment not added', message: caught.message }
                : describeCommentError(caught);
            setError(described);
            // The inline error stays for detail; the toast is the ambient
            // signal, and doubling the same sentence on both is noise.
            toast.error(described.title, { message: described.message });
        } finally {
            setIsLoading(false);
        }
    }, [trimmed, isLoading, supabase, postId, parentId, image, toast, onComplete, clearAttachment]);

    return (
        <form onSubmit={submit} className="mt-4">
            {error && (
                <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs font-semibold text-red-200">{error.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-red-100/70">{error.message}</p>
                </div>
            )}

            <label htmlFor={`comment-body-${parentId || 'root'}`} className="sr-only">
                {parentId ? 'Write a reply' : 'Write a comment'}
            </label>
            <textarea
                id={`comment-body-${parentId || 'root'}`}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={parentId ? 'Write a reply...' : 'Share an observation, ask a question...'}
                className="field text-base"
                rows={parentId ? 2 : 3}
                maxLength={MAX_COMMENT_LENGTH}
                autoFocus={autoFocus}
                aria-describedby={`comment-count-${parentId || 'root'}`}
            />

            {previewUrl && (
                <div className="relative mt-3 inline-block">
                    {/* A plain <img> rather than next/image: this is a local
                        blob: URL, which the image optimiser cannot fetch. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Selected attachment preview" className="h-24 w-24 rounded-lg border border-[var(--line-strong)] object-cover" />
                    <button
                        type="button"
                        onClick={clearAttachment}
                        aria-label="Remove attachment"
                        className="absolute -right-2 -top-2 rounded-full bg-black p-1 text-[var(--ink-muted)] ring-1 ring-white/20 transition-colors hover:text-[var(--ink)]"
                    >
                        <X size={12} aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
                        <ImageIcon size={14} aria-hidden="true" />
                        {image ? 'Change image' : 'Add image'}
                        <span className="sr-only">
                            (PNG, JPEG, WebP, GIF or AVIF, up to {formatBytes(UPLOAD_TARGETS['comment-image'].maxBytes)})
                        </span>
                        <input
                            type="file"
                            accept={ACCEPTED_TYPES.join(',')}
                            className="sr-only"
                            // Reset the input so re-picking the same file fires
                            // `change` again.
                            onChange={(event) => {
                                attachFile(event.target.files?.[0] || null);
                                event.target.value = '';
                            }}
                        />
                    </label>

                    {image && <span className="text-xs text-[var(--ink-faint)]">{formatBytes(image.size)}</span>}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <span
                        id={`comment-count-${parentId || 'root'}`}
                        aria-live="polite"
                        className={`text-xs ${remaining < 200 ? 'text-amber-300' : 'text-[var(--ink-faint)]'}`}
                    >
                        {content.length > 0 ? `${remaining.toLocaleString()} left` : ''}
                    </span>

                    {onCancel && (
                        <button type="button" onClick={onCancel} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
                            Cancel
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-gray-200 disabled:opacity-40"
                    >
                        {isLoading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Send size={13} aria-hidden="true" />}
                        {isLoading ? 'Posting...' : parentId ? 'Reply' : 'Post'}
                    </button>
                </div>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Single comment
// ---------------------------------------------------------------------------

function CommentItem({
    comment,
    currentUser,
    replyingTo,
    onReplyToggle,
    onRequestDelete,
    postId,
    onActionComplete,
    depth = 0,
}) {
    const isReplying = replyingTo === comment.id;
    const username = comment.profiles?.username || 'Anonymous';
    const initial = initials(username) || '?';

    return (
        <div className="flex items-start gap-4">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/15">
                {comment.profiles?.avatar_url ? (
                    <Image
                        src={comment.profiles.avatar_url}
                        alt={`${username}'s avatar`}
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--surface)] text-sm font-bold text-[var(--ink-muted)]">
                        {initial}
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {comment.profiles?.username ? (
                        <Link href={`/profile/${comment.profiles.username}`} className="link-accent text-sm">
                            {username}
                        </Link>
                    ) : (
                        <span className="text-sm font-semibold text-[var(--ink-muted)]">{username}</span>
                    )}
                    {comment.created_at && (
                        <time dateTime={toISODate(comment.created_at)} className="text-xs text-[var(--ink-faint)]">
                            {formatRelativeTime(comment.created_at)}
                        </time>
                    )}
                </div>

                {comment.content && (
                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-[var(--ink)]">
                        {comment.content}
                    </p>
                )}

                {comment.image_url && (
                    <a href={comment.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                        {/* Comment image URLs come from the comment-images
                            bucket, which is not in images.remotePatterns, so
                            the optimiser is bypassed deliberately. */}
                        <div className="relative h-48 w-full max-w-xs overflow-hidden rounded-lg border border-[var(--line-strong)] transition-colors hover:border-[var(--line-strong)]">
                            <Image src={comment.image_url} alt="Comment attachment" fill className="object-cover" sizes="320px" unoptimized />
                        </div>
                    </a>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs font-semibold">
                    {/* Threading two replies deep is enough; deeper reply chains
                        push the conversation off-screen on mobile. */}
                    {depth < 2 ? (
                        <button
                            type="button"
                            onClick={() => onReplyToggle(isReplying ? null : comment.id)}
                            aria-expanded={isReplying}
                            className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                        >
                            {isReplying ? 'Cancel reply' : 'Reply'}
                        </button>
                    ) : (
                        <Link href={`#comment-${comment.id}`} className="text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]">
                            View in thread
                        </Link>
                    )}

                    {currentUser && currentUser.id === comment.user_id && (
                        <button
                            type="button"
                            onClick={() => onRequestDelete(comment)}
                            className="inline-flex items-center gap-1 text-[var(--ink-muted)] transition-colors hover:text-red-400"
                        >
                            <Trash2 size={12} aria-hidden="true" />
                            Delete
                        </button>
                    )}
                </div>

                {isReplying && (
                    <CommentForm
                        postId={postId}
                        parentId={comment.id}
                        onComplete={onActionComplete}
                        onCancel={() => onReplyToggle(null)}
                        autoFocus
                    />
                )}

                {comment.replies?.length > 0 && (
                    <div className="mt-4 space-y-4 border-l-2 border-[var(--line)] pl-4 sm:pl-6">
                        {comment.replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                currentUser={currentUser}
                                replyingTo={replyingTo}
                                onReplyToggle={onReplyToggle}
                                onRequestDelete={onRequestDelete}
                                postId={postId}
                                onActionComplete={onActionComplete}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

/**
 * @param {string} postId
 * @param {Array<object>} [initialComments] Seeded from the server query so the
 *   thread is visible immediately instead of appearing after a client fetch.
 */
export default function CommentsSection({ postId, initialComments }) {
    const [comments, setComments] = useState(() => (Array.isArray(initialComments) ? initialComments : []));
    const [replyingTo, setReplyingTo] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [sort, setSort] = useState('oldest');
    const [loading, setLoading] = useState(!initialComments?.length);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [supabase] = useState(() => createClient());
    const toast = useToast();

    useEffect(() => {
        if (!supabase) return;
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    }, [supabase]);

    const fetchComments = useCallback(async () => {
        if (!postId || !supabase) return;

        const { data, error } = await supabase
            .from('comments')
            .select('*, profiles(username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (!error) {
            setComments(data || []);
        } else {
            console.error('Failed to load comments:', error);
            // Only surface this when the reader is looking at an empty thread —
            // if comments already rendered, a refresh failure is not worth an
            // error banner over content they can see.
            if (!initialComments?.length) {
                toast.error('Could not load the discussion', {
                    message: 'Replies may be incomplete. Try reloading the page.',
                });
            }
        }
        setLoading(false);
    }, [supabase, postId, initialComments?.length, toast]);

    // Live updates: a refetch on any change to this post's comments keeps the
    // tree correct when someone else replies.
    useEffect(() => {
        if (!supabase) return undefined;

        let cancelled = false;

        (async () => {
            if (!initialComments?.length) await fetchComments();
        })();

        const channel = supabase
            .channel(`comments-post-${postId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
                () => fetchComments()
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [supabase, postId, fetchComments, initialComments?.length]);

    const confirmDelete = useCallback(async () => {
        if (!pendingDelete || !supabase) return;

        setDeleting(true);
        const target = pendingDelete;

        try {
            const { error } = await supabase.from('comments').delete().eq('id', target.id);
            if (error) throw error;

            // Remove locally first: the realtime subscription will confirm, but
            // waiting for it makes the dialog feel like it failed.
            setComments((current) => current.filter((comment) => comment.id !== target.id));
            toast.success('Comment deleted');
            setPendingDelete(null);
        } catch (caught) {
            console.error('Comment delete failed:', caught);
            const described = describeCommentError(caught);
            toast.error(described.title, { message: described.message });
        } finally {
            setDeleting(false);
        }
    }, [pendingDelete, supabase, toast]);

    const nestedComments = useMemo(() => {
        const byId = new Map();
        for (const comment of comments) {
            byId.set(comment.id, { ...comment, replies: [] });
        }

        const roots = [];
        for (const comment of comments) {
            const node = byId.get(comment.id);
            if (comment.parent_id && byId.has(comment.parent_id)) {
                byId.get(comment.parent_id).replies.push(node);
            } else if (!comment.parent_id) {
                // Orphaned replies (parent deleted between reads) surface as
                // top-level rather than disappearing.
                roots.push(node);
            }
        }

        return roots;
    }, [comments]);

    // `top` is a placeholder for an upvote column the schema does not have yet;
    // until then it falls back to oldest, which is the stable, useful order.
    const sortedRoots = useMemo(() => {
        const sorted = [...nestedComments];
        if (sort === 'newest') {
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
        return sorted;
    }, [nestedComments, sort]);

    const totalCount = comments.length;

    return (
        <section className="mt-16 border-t border-[var(--line)] pt-8">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-[var(--ink)]">
                    Discussion
                    <span className="ml-2 text-lg font-normal text-[var(--ink-muted)]">({totalCount})</span>
                </h2>

                {totalCount > 1 && (
                    <div className="relative">
                        <label htmlFor="comment-sort" className="sr-only">Sort comments</label>
                        <select
                            id="comment-sort"
                            value={sort}
                            onChange={(event) => setSort(event.target.value)}
                            className="field w-auto appearance-none py-1.5 pl-3 pr-9 text-xs"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <ArrowUpDown size={12} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                    </div>
                )}
            </div>

            <div className="glass mt-6 p-6">
                <h3 className="mb-2 font-semibold text-[var(--ink)]">
                    {currentUser ? 'Leave a comment' : 'Join the discussion'}
                </h3>
                {currentUser ? (
                    <CommentForm postId={postId} onComplete={fetchComments} />
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--ink-muted)]">Sign in to share an observation or ask a question.</p>
                        <Link href="/login" className="btn btn-primary !px-5 !py-2 !text-sm">Sign in</Link>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="mt-8 space-y-4" aria-hidden="true">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="glass h-28 animate-pulse" />
                    ))}
                </div>
            ) : sortedRoots.length === 0 ? (
                <EmptyState
                    icon={MessageSquare}
                    title="No comments yet"
                    description="Be the first to add an observation or question about this story."
                />
            ) : (
                <div className="mt-8 space-y-6">
                    {sortedRoots.map((comment) => (
                        <div key={comment.id} id={`comment-${comment.id}`} className="glass p-6">
                            <CommentItem
                                comment={comment}
                                currentUser={currentUser}
                                replyingTo={replyingTo}
                                onReplyToggle={setReplyingTo}
                                onRequestDelete={setPendingDelete}
                                postId={postId}
                                onActionComplete={() => {
                                    setReplyingTo(null);
                                    fetchComments();
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete this comment?"
                description="This cannot be undone. Any replies to it are removed too."
                confirmLabel="Delete"
                destructive
                pending={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </section>
    );
}
