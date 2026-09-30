'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlertTriangle, ChevronDown, ImageIcon, Loader2, Send, X } from 'lucide-react';
import "easymde/dist/easymde.min.css";
import { useToast } from '../components/ToastProvider';
import { uploadImage, UPLOAD_TARGETS } from '../lib/uploads';
import { formatBytes } from '../lib/format';
import { POST_TOPICS } from '../lib/topics';

const SimpleMdeEditor = dynamic(() => import("react-simplemde-editor"), { ssr: false });

const MAX_TITLE_LENGTH = 300; // matches posts_title_length in the schema
const MIN_CONTENT_LENGTH = 50;
const EXCERPT_LENGTH = 200;

function slugify(title) {
    return title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Strips markdown syntax so the derived excerpt reads as prose. */
function toPlainText(markdown) {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[#>*_`~|-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function describePostError(error) {
    const message = String(error?.message || '');

    if (/posts_title_length/i.test(message)) {
        return { title: 'That title is too long', message: `Keep it under ${MAX_TITLE_LENGTH} characters.` };
    }
    if (/posts_slug_format|posts_slug_length/i.test(message)) {
        return { title: 'Could not build a valid link', message: 'Try a title with more letters or numbers in it.' };
    }
    if (/row-level security|permission denied/i.test(message)) {
        return {
            title: 'You do not have permission to publish',
            message: 'Only signed-in contributors can publish stories.',
        };
    }
    if (/failed to fetch|network/i.test(message)) {
        return {
            title: 'Connection lost',
            message: 'Your story was not published and nothing was saved. Copy your text somewhere safe, then try again.',
        };
    }
    if (/storage|upload|bucket/i.test(message)) {
        return { title: 'Image upload failed', message: 'Try a smaller image, or publish without one.' };
    }

    return { title: 'Could not publish your story', message: 'Something went wrong. Please try again.' };
}

export default function CreatePostForm({ userId }) {
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [dirty, setDirty] = useState(false);

    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const toast = useToast();
    const headingRef = useRef(null);

    // Warn before a navigation or refresh silently discards a draft. Only
    // registered once something has actually been typed.
    useEffect(() => {
        if (!dirty) return undefined;

        const onBeforeUnload = (event) => {
            event.preventDefault();
            // Browsers ignore the text; the prompt itself is the signal.
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const plainText = useMemo(() => toPlainText(content), [content]);
    const wordCount = useMemo(() => plainText ? plainText.split(/\s+/).filter(Boolean).length : 0, [plainText]);

    const uploadImageToStorage = useCallback(async (file) => {
        // The shared helper validates, derives the extension from the MIME type
        // (never the user-supplied filename, which could carry a path or an
        // unexpected extension), and builds the `<userId>/...` object name the
        // RLS delete policy matches on.
        const { publicUrl } = await uploadImage({
            supabase,
            userId,
            file,
            target: 'post-image',
        });
        return publicUrl;
    }, [supabase, userId]);

    const handleImageUpload = useCallback(async (file, onSuccess, onError) => {
        try {
            const publicUrl = await uploadImageToStorage(file);
            onSuccess(publicUrl);
            toast.success('Image uploaded');
        } catch (err) {
            const message = err.message || 'Please choose an image file.';
            console.error('Editor image upload failed:', err);
            onError(message);
            setError({ title: 'Image upload failed', message });
            toast.error('Image upload failed', { message });
        }
    }, [uploadImageToStorage, toast]);

    const handleCoverImageUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadingImage(true);
            setError(null);
            const publicUrl = await uploadImageToStorage(file);
            setImageUrl(publicUrl);
            toast.success('Cover image uploaded');
        } catch (err) {
            const message = err.message || 'The image could not be uploaded.';
            console.error('Cover image upload failed:', err);
            setError({ title: 'Cover image upload failed', message });
            toast.error('Cover image upload failed', { message });
        } finally {
            setUploadingImage(false);
            event.target.value = '';
        }
    }, [uploadImageToStorage, toast]);

    const validate = useCallback(() => {
        const errors = {};
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            errors.title = 'Give your story a title.';
        } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
            errors.title = `Keep it under ${MAX_TITLE_LENGTH} characters.`;
        } else if (!slugify(trimmedTitle)) {
            errors.title = 'The title needs at least one letter or number.';
        }

        if (!topic) {
            errors.topic = 'Pick the topic that fits best — it is how readers find your work.';
        }

        if (!content.trim()) {
            errors.content = 'Your story is empty.';
        } else if (plainText.length < MIN_CONTENT_LENGTH) {
            errors.content = `Add a little more — stories under ${MIN_CONTENT_LENGTH} characters tend to get skipped.`;
        }

        if (imageUrl.trim() && !/^https?:\/\/\S+$/i.test(imageUrl.trim())) {
            errors.imageUrl = 'Enter a full image URL starting with http:// or https://.';
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length === 0) return true;

        // Send focus to the first problem so the fix is obvious.
        const order = ['title', 'topic', 'imageUrl', 'content'];
        const first = order.find((field) => errors[field]);
        if (first === 'content') headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else document.getElementById(`post-${first}`)?.focus();

        return false;
    }, [title, topic, content, plainText, imageUrl]);

    const editorOptions = useMemo(() => ({
        spellChecker: false,
        uploadImage: true,
        imageUploadFunction: handleImageUpload,
        placeholder: 'Set the scene. What did you observe, measure, or find?',
        toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'side-by-side', 'fullscreen'],
    }), [handleImageUpload]);

    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        if (isLoading) return;

        if (!supabase) {
            const message = { title: 'Publishing is unavailable', message: 'Supabase is not configured on this deployment.' };
            setError(message);
            toast.error(message.title, { message: message.message });
            return;
        }

        if (!validate()) {
            toast.error('Check the highlighted fields', { message: 'Your story was not published.' });
            return;
        }

        const trimmedTitle = title.trim();
        const baseSlug = slugify(trimmedTitle);
        // A short random suffix avoids collisions between posts that share a
        // title (and the ugly "duplicate key" error that a bare slug clash
        // would otherwise surface as).
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

        // posts.excerpt is nullable and the cards only render it when present,
        // so derive one from the body rather than leaving every new post
        // without a summary.
        const excerpt = plainText.length > EXCERPT_LENGTH
            ? `${plainText.slice(0, EXCERPT_LENGTH).trimEnd()}…`
            : plainText || null;

        setError(null);
        setIsLoading(true);

        try {
            const { data: postData, error: insertError } = await supabase
                .from('posts')
                .insert({
                    title: trimmedTitle,
                    content,
                    excerpt,
                    slug,
                    user_id: userId,
                    date: new Date().toISOString(),
                    topic: topic || null,
                    image_url: imageUrl.trim() || null,
                    published: true,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Clear the draft guard before navigating, otherwise the browser
            // prompts about losing work that was successfully published.
            setDirty(false);
            toast.success('Story published', { message: 'It is now live in the Field Journal.' });
            router.push(`/blog/${postData.slug}`);
            router.refresh();
        } catch (caught) {
            console.error('Publish failed:', caught);
            const described = describePostError(caught);
            setError(described);
            toast.error(described.title, { message: described.message, duration: 12000 });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, supabase, validate, title, plainText, content, userId, topic, imageUrl, toast, router]);

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            onChange={() => setDirty(true)}
            className="space-y-6"
        >
            <div>
                <label htmlFor="post-title" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">
                    Title
                </label>
                <input
                    type="text"
                    id="post-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`field ${fieldErrors.title ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''}`}
                    maxLength={MAX_TITLE_LENGTH}
                    required
                    disabled={isLoading}
                    placeholder="What did you find?"
                    aria-invalid={fieldErrors.title ? 'true' : undefined}
                    aria-describedby={fieldErrors.title ? 'post-title-error' : 'post-title-hint'}
                />
                {fieldErrors.title ? (
                    <FieldError id="post-title-error">{fieldErrors.title}</FieldError>
                ) : (
                    <p id="post-title-hint" className="mt-1.5 text-xs text-[var(--ink-faint)]">
                        {slugify(title) ? (
                            <>Your link will be <span className="text-[var(--ink-muted)]">/blog/{slugify(title)}-…</span></>
                        ) : (
                            'A clear, specific title is the single biggest factor in whether a story gets read.'
                        )}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="post-topic" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">Topic</label>
                <div className="relative">
                    <select
                        id="post-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className={`field appearance-none cursor-pointer pr-10 ${fieldErrors.topic ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''}`}
                        required
                        disabled={isLoading}
                        aria-invalid={fieldErrors.topic ? 'true' : undefined}
                        aria-describedby={fieldErrors.topic ? 'post-topic-error' : undefined}
                    >
                        <option value="">Select a topic</option>
                        {POST_TOPICS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                </div>
                {fieldErrors.topic && <FieldError id="post-topic-error">{fieldErrors.topic}</FieldError>}
            </div>

            <div>
                <label htmlFor="post-imageUrl" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">Cover image</label>
                <input
                    type="url"
                    id="post-imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className={`field ${fieldErrors.imageUrl ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''}`}
                    disabled={isLoading}
                    aria-invalid={fieldErrors.imageUrl ? 'true' : undefined}
                    aria-describedby={fieldErrors.imageUrl ? 'post-imageUrl-error' : 'post-imageUrl-hint'}
                />

                {imageUrl && !fieldErrors.imageUrl && (
                    <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                    >
                        <X size={12} aria-hidden="true" />
                        Remove cover image
                    </button>
                )}

                <p id="post-imageUrl-hint" className="mt-2 text-xs text-[var(--ink-faint)]">
                    Paste a link, or upload — uploading is more reliable than hotlinking.
                </p>

                <label
                    htmlFor="post-cover"
                    className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--line-strong)] px-4 py-2 text-xs font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface)] ${
                        uploadingImage || isLoading ? 'pointer-events-none opacity-50' : ''
                    }`}
                >
                    {uploadingImage ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                        <ImageIcon size={13} aria-hidden="true" />
                    )}
                    {uploadingImage ? 'Uploading...' : 'Upload an image'}
                </label>
                <input
                    id="post-cover"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={handleCoverImageUpload}
                    disabled={uploadingImage || isLoading}
                    className="hidden"
                />
                <p className="mt-2 text-xs text-[var(--ink-faint)]">
                    Up to {formatBytes(UPLOAD_TARGETS['post-image'].maxBytes)}.
                </p>

                {fieldErrors.imageUrl && <FieldError id="post-imageUrl-error">{fieldErrors.imageUrl}</FieldError>}
            </div>

            <div ref={headingRef}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                    <label htmlFor="post-content" className="block text-sm font-medium text-[var(--ink-muted)]">Content</label>
                    <span className="text-xs text-[var(--ink-faint)]" aria-live="polite">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    </span>
                </div>
                {/* EasyMDE ships light-theme styles; scope overrides to the
                    editor so it matches the rest of the dark UI. */}
                {/* `editor-dark` is now a misnomer: it is the token-driven theme
                    for the editor, and it resolves correctly in both modes. The
                    rounded corners are 4px to match `.field`. */}
                <div className="editor-dark overflow-hidden rounded">
                    <SimpleMdeEditor
                        value={content}
                        onChange={setContent}
                        options={editorOptions}
                    />
                </div>
                {fieldErrors.content && <FieldError id="post-content-error">{fieldErrors.content}</FieldError>}
            </div>

            {error && (
                <div role="alert" className="rounded border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-4 py-3">
                    <p className="flex items-start gap-2 text-sm font-semibold text-[var(--danger)]">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {error.title}
                    </p>
                    <p className="mt-1 pl-[23px] text-sm leading-relaxed text-red-100/80">{error.message}</p>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button type="submit" disabled={isLoading} className="btn btn-primary w-full disabled:opacity-50 disabled:hover:scale-100">
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            Publishing...
                        </>
                    ) : (
                        <>
                            <Send size={16} aria-hidden="true" />
                            Publish story
                        </>
                    )}
                </button>
                <p className="text-center text-xs text-[var(--ink-faint)]">
                    Your draft stays in this tab until you publish. Leaving now will lose it.
                </p>
            </div>
        </form>
    );
}

function FieldError({ id, children }) {
    return (
        <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--danger)]">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {children}
        </p>
    );
}
