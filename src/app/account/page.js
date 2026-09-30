'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertTriangle, Camera, Loader2, Save, Trash2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { deleteOtherUploads, uploadImage, UPLOAD_TARGETS } from '../lib/uploads';
import { formatBytes } from '../lib/format';

const DEFAULT_AVATAR = '/images/default-avatar.svg';
const MAX_BIO_LENGTH = 500;
const MAX_FULL_NAME_LENGTH = 80;
const USERNAME_PATTERN = /^[a-z0-9_.]+$/;

/**
 * Postgres error text mapped to something actionable. RLS violations and
 * constraint failures are the common ones here, and both surface as raw
 * database messages otherwise.
 */
function describeProfileError(error, fallback) {
    const message = String(error?.message || '');

    if (/profiles_username_key|duplicate key.*username/i.test(message)) {
        return {
            title: 'That username is taken',
            message: 'Someone already has this handle. Try a different one.',
        };
    }
    if (/profiles_username_check|invalid input value for username/i.test(message)) {
        return {
            title: 'That username is not allowed',
            message: 'Use lowercase letters, numbers, dots and underscores only.',
        };
    }
    if (/profiles_username_format|profiles_username_regex|profiles_username_check/i.test(message)) {
        return {
            title: 'That username is not allowed',
            message: 'Use lowercase letters, numbers, dots and underscores only.',
        };
    }
    if (/profiles_full_name_length/i.test(message)) {
        return {
            title: 'Name is too long',
            message: `Keep it under ${MAX_FULL_NAME_LENGTH} characters.`,
        };
    }
    if (/profiles_bio_length/i.test(message)) {
        return {
            title: 'Bio is too long',
            message: `Keep it under ${MAX_BIO_LENGTH} characters.`,
        };
    }
    if (/row-level security|permission denied/i.test(message)) {
        return {
            title: 'You do not have permission to do that',
            message: 'You can only edit your own profile.',
        };
    }
    if (/failed to fetch|network/i.test(message)) {
        return {
            title: 'Connection lost',
            message: 'Your change was not saved. Check your connection and try again.',
        };
    }

    return { title: 'Something went wrong', message: fallback };
}

function normalizeWebsite(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        // Rejects "javascript:alert(1)" and other schemes, which would otherwise
        // be stored and later rendered as a raw <a href> on the public profile.
        const url = new URL(withScheme);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url.toString();
    } catch {
        return null;
    }
}

export default function AccountPage() {
    // createClient() was previously called on every render, so `supabase` got
    // a new identity each time. Because it's a dependency of the useEffect
    // below (and of getProfile's useCallback), that caused the effect to
    // re-subscribe/re-run on every render instead of once. Creating it lazily
    // in useState keeps a single stable instance for the component's lifetime.
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);
    // Sticky invalid fields: inline error text under the input, replaced by a
    // toast for the transient "saved" confirmation.
    const [fieldErrors, setFieldErrors] = useState({});
    const [user, setUser] = useState(null);
    const [username, setUsername] = useState(null);
    const [fullName, setFullName] = useState(null);
    const [website, setWebsite] = useState(null);
    const [bio, setBio] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

    const getProfile = useCallback(async (user) => {
        try {
            setLoading(true);

            let { data, error, status } = await supabase
                .from('profiles')
                .select(`username, full_name, website, bio, avatar_url`)
                .eq('id', user.id)
                .single();

            if (error && status !== 406) throw error;

            if (data) {
                setUsername(data.username);
                setFullName(data.full_name);
                setWebsite(data.website);
                setBio(data.bio);
                setAvatarUrl(data.avatar_url || DEFAULT_AVATAR);
            } else {
                setAvatarUrl(DEFAULT_AVATAR);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Could not load your profile', {
                message: 'Your details are unavailable right now. Try reloading the page.',
            });
        } finally {
            setLoading(false);
        }
    }, [supabase, toast]);

    useEffect(() => {
        if (!supabase) {
            router.push('/login');
            return;
        }

        let cancelled = false;

        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            if (cancelled) return;
            setUser(user);
            getProfile(user);
        }
        getUser();

        return () => {
            cancelled = true;
        };
    }, [supabase, getProfile, router]);

    /**
     * Validates before writing, so a rejected save never reaches the database.
     * @returns {boolean} whether the save may proceed.
     */
    const validate = useCallback(() => {
        const errors = {};
        const trimmedUsername = (username || '').trim().toLowerCase();

        if (!trimmedUsername) {
            errors.username = 'Choose a username.';
        } else if (!USERNAME_PATTERN.test(trimmedUsername)) {
            errors.username = 'Use lowercase letters, numbers, dots and underscores only.';
        } else if (trimmedUsername.length > 30) {
            errors.username = 'Keep it under 30 characters.';
        }

        if ((fullName || '').length > MAX_FULL_NAME_LENGTH) {
            errors.fullName = `Keep it under ${MAX_FULL_NAME_LENGTH} characters.`;
        }

        if ((bio || '').length > MAX_BIO_LENGTH) {
            errors.bio = `Keep it under ${MAX_BIO_LENGTH} characters.`;
        }

        if ((website || '').trim() && !normalizeWebsite(website)) {
            errors.website = 'Enter a valid http(s) address.';
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            const firstField = Object.keys(errors)[0];
            document.getElementById(`profile-${firstField}`)?.focus();
            return false;
        }

        return true;
    }, [username, fullName, bio, website]);

    async function updateProfile(overrides = {}) {
        if (!user) return;

        if (!validate()) {
            toast.error('Check the highlighted fields', {
                message: 'Your profile was not saved.',
            });
            return;
        }

        const next = {
            username: overrides.username ?? username,
            full_name: overrides.full_name ?? fullName,
            website: overrides.website !== undefined ? overrides.website : normalizeWebsite(website),
            bio: overrides.bio ?? bio,
            avatar_url: overrides.avatar_url ?? avatarUrl,
        };

        try {
            setSaving(true);

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                username: (next.username || '').trim().toLowerCase(),
                full_name: next.full_name,
                website: next.website,
                bio: next.bio,
                avatar_url: next.avatar_url,
                updated_at: new Date().toISOString(),
            });
            if (error) throw error;

            // Echo back the normalized values so the form shows what was stored.
            setUsername(next.username.trim().toLowerCase());
            setWebsite(next.website || '');
            setFieldErrors({});
            toast.success('Profile updated', { message: 'Your changes are live.' });
        } catch (error) {
            console.error('Error updating profile:', error);
            const described = describeProfileError(error, 'Your changes were not saved. Please try again.');
            toast.error(described.title, { message: described.message });
        } finally {
            setSaving(false);
        }
    }

    async function uploadAvatar(event) {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;

        let uploadedPath = null;

        try {
            setUploading(true);

            // `uploadImage` owns validation, the `<userId>/...` object name the
            // RLS delete policy matches on, and the content type. The previous
            // inline version took the extension from the user-supplied
            // filename, so `evil.html` became the stored extension.
            const { publicUrl, path } = await uploadImage({
                supabase,
                userId: user.id,
                file,
                target: 'avatar',
            });

            uploadedPath = path;
            setAvatarUrl(publicUrl);
            await updateProfile({ avatar_url: publicUrl });

            // Only discard the previous avatar once the new URL is persisted,
            // otherwise a failed save would leave the profile pointing at a
            // deleted file.
            const removed = await deleteOtherUploads({
                supabase,
                userId: user.id,
                target: 'avatar',
                keepPath: uploadedPath,
            });

            if (removed.length) {
                toast.success('Avatar updated', {
                    message: removed.length === 1 ? 'Your previous avatar was removed.' : `${removed.length} older avatars were cleaned up.`,
                });
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);

            // A half-finished upload: the object exists but the profile still
            // points elsewhere, so remove it rather than leak the bytes.
            if (uploadedPath) {
                await deleteOtherUploads({ supabase, userId: user.id, target: 'avatar', keepPath: null });
            }

            const described = describeProfileError(error, error?.message || 'The image could not be uploaded. Please try again.');
            toast.error(described.title, { message: described.message });
        } finally {
            setUploading(false);
            // Allow re-selecting the same file again later.
            input.value = '';
        }
    }

    const removeAvatar = useCallback(async () => {
        if (!user) return;
        setRemovingAvatar(true);

        try {
            // Remove the stored object as well as the reference. Clearing only
            // the column left the file in the bucket forever, because the old
            // delete policy could never match a UUID-prefixed name.
            await deleteOtherUploads({ supabase, userId: user.id, target: 'avatar', keepPath: null });

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (error) throw error;

            setAvatarUrl(DEFAULT_AVATAR);
            setConfirmRemoveAvatar(false);
            toast.success('Avatar removed', { message: 'Your default avatar has been restored.' });
        } catch (error) {
            console.error('Error removing avatar:', error);
            toast.error('Could not remove avatar', { message: 'Please try again in a moment.' });
        } finally {
            setRemovingAvatar(false);
        }
    }, [user, supabase, toast]);

    const hasCustomAvatar = Boolean(avatarUrl) && avatarUrl !== DEFAULT_AVATAR;

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-5">
                <div className="flex w-full max-w-lg items-center justify-center gap-3 py-20 text-[var(--ink-muted)]">
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    Loading your profile...
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="w-full max-w-lg space-y-6 px-6 mx-auto">
                <div>
                    <h1 className="display-2">Settings</h1>
                    <p className="mt-2 text-[15px] leading-[1.5] text-[var(--ink-muted)]">
                        These details appear on every story you publish.
                    </p>
                </div>

                <div className="space-y-6 border-t border-[var(--line)] pt-8">
                    <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20">
                            <Image src={avatarUrl || DEFAULT_AVATAR} alt="" fill sizes="80px" className="object-cover" unoptimized />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <label
                                    htmlFor="avatar-upload"
                                    className={`btn btn-primary cursor-pointer !px-4 !py-2 !text-sm ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Camera size={14} aria-hidden="true" />
                                            {hasCustomAvatar ? 'Change avatar' : 'Add avatar'}
                                        </>
                                    )}
                                </label>

                                {hasCustomAvatar && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmRemoveAvatar(true)}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-2 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                                    >
                                        <Trash2 size={13} aria-hidden="true" />
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-[var(--ink-muted)]">
                                PNG, JPEG, WebP, GIF or AVIF, up to {formatBytes(UPLOAD_TARGETS.avatar.maxBytes)}.
                            </p>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={uploadAvatar}
                                disabled={loading || uploading}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">Email</label>
                        {/* Supabase owns the email; editing it here would be a
                            no-op that silently discards the change. */}
                        <input id="profile-email" type="text" value={user?.email || ''} readOnly className="field cursor-not-allowed opacity-60" />
                        <p className="mt-1.5 text-xs text-[var(--ink-faint)]">
                            Your sign-in address cannot be changed here.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="profile-username" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">Username</label>
                        <input
                            id="profile-username"
                            type="text"
                            value={username || ''}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={saving}
                            autoComplete="username"
                            spellCheck={false}
                            aria-invalid={fieldErrors.username ? 'true' : undefined}
                            aria-describedby={fieldErrors.username ? 'profile-username-error' : undefined}
                            className={`field ${fieldErrors.username ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''}`}
                        />
                        {fieldErrors.username ? (
                            <FieldError id="profile-username-error">{fieldErrors.username}</FieldError>
                        ) : (
                            <p className="mt-1.5 text-xs text-[var(--ink-faint)]">
                                Your profile lives at <span className="text-[var(--ink-muted)]">/profile/{username || 'your-handle'}</span>
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="profile-fullName" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">Full name</label>
                        <input
                            id="profile-fullName"
                            type="text"
                            value={fullName || ''}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={saving}
                            maxLength={MAX_FULL_NAME_LENGTH + 20}
                            autoComplete="name"
                            aria-invalid={fieldErrors.fullName ? 'true' : undefined}
                            aria-describedby={fieldErrors.fullName ? 'profile-fullName-error' : undefined}
                            className={`field ${fieldErrors.fullName ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''}`}
                        />
                        {fieldErrors.fullName && <FieldError id="profile-fullName-error">{fieldErrors.fullName}</FieldError>}
                    </div>

                    <div>
                        <label htmlFor="profile-website" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">Website</label>
                        <input
                            id="profile-website"
                            type="url"
                            value={website || ''}
                            onChange={(e) => setWebsite(e.target.value)}
                            disabled={saving}
                            placeholder="https://example.com"
                            autoComplete="url"
                            aria-invalid={fieldErrors.website ? 'true' : undefined}
                            aria-describedby={fieldErrors.website ? 'profile-website-error' : undefined}
                            className={`field ${fieldErrors.website ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''}`}
                        />
                        {fieldErrors.website && <FieldError id="profile-website-error">{fieldErrors.website}</FieldError>}
                    </div>

                    <div>
                        <label htmlFor="profile-bio" className="mb-1 block text-sm font-medium text-[var(--ink-muted)]">Bio</label>
                        <textarea
                            id="profile-bio"
                            value={bio || ''}
                            onChange={(e) => setBio(e.target.value)}
                            disabled={saving}
                            rows={4}
                            maxLength={MAX_BIO_LENGTH + 50}
                            aria-invalid={fieldErrors.bio ? 'true' : undefined}
                            aria-describedby={`profile-bio-count${fieldErrors.bio ? ' profile-bio-error' : ''}`}
                            className={`field min-h-28 ${fieldErrors.bio ? 'border-[var(--danger)] focus:border-[var(--danger)]' : ''}`}
                        />
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                            {fieldErrors.bio ? (
                                <FieldError id="profile-bio-error">{fieldErrors.bio}</FieldError>
                            ) : (
                                <span />
                            )}
                            <span id="profile-bio-count" className={`text-xs ${(bio || '').length > MAX_BIO_LENGTH ? 'text-[var(--warn)]' : 'text-[var(--ink-faint)]'}`}>
                                {(bio || '').length}/{MAX_BIO_LENGTH}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => updateProfile()}
                        disabled={saving || uploading}
                        className="btn btn-primary w-full disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={15} aria-hidden="true" />
                                Save changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={confirmRemoveAvatar}
                title="Remove your avatar?"
                description="Your profile will fall back to the default avatar. You can upload a new one at any time."
                confirmLabel="Remove avatar"
                destructive
                pending={removingAvatar}
                onConfirm={removeAvatar}
                onCancel={() => setConfirmRemoveAvatar(false)}
            />
        </div>
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
