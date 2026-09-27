/**
 * Image upload logic shared by avatars, post covers and comment attachments.
 *
 * This exists because the three call sites had drifted into three slightly
 * different, individually broken implementations. Everything that has to agree
 * with the database — size limits, accepted types, the object path shape that
 * the RLS delete policies match on — is defined once, here.
 *
 * Two invariants the storage policies depend on:
 *
 *   1. Every object lives at `<userId>/<file>`. The delete policies compare
 *      `(storage.foldername(name))[1]` to `auth.uid()`, so a flat filename can
 *      never be removed by its owner.
 *   2. The extension is derived from the MIME type via an allowlist, never from
 *      the user-supplied filename. That removes path traversal and surprise
 *      extensions (`.html`, `.svg`) in one step.
 */

import { formatBytes } from './format';

/** Kept in sync with the `file_size_limit` on each bucket in schema.sql. */
export const UPLOAD_TARGETS = {
    avatar: {
        bucket: 'avatars',
        maxBytes: 5 * 1024 * 1024,
        label: 'avatar',
        accepts: 'image',
    },
    'post-image': {
        bucket: 'post-images',
        maxBytes: 8 * 1024 * 1024,
        label: 'image',
        accepts: 'image',
    },
    'comment-image': {
        bucket: 'comment-images',
        maxBytes: 5 * 1024 * 1024,
        label: 'image',
        accepts: 'image',
    },
    // Separate buckets from the images above, because a video is two orders of
    // magnitude larger than a photo. Sharing one bucket would force the limit
    // for both to be whichever is larger, which would let a 100MB "image"
    // through to be rejected by the MIME list.
    'post-photo': {
        bucket: 'post-photos',
        maxBytes: 8 * 1024 * 1024,
        label: 'photo',
        accepts: 'image',
    },
    'post-video': {
        bucket: 'post-videos',
        // Matches the 104857600 on the post-videos bucket in schema.sql.
        maxBytes: 100 * 1024 * 1024,
        label: 'video',
        accepts: 'video',
    },
};

/**
 * MIME type -> extension. The buckets also enforce an `allowed_mime_types`
 * list, but failing here first produces a message a person can act on instead
 * of a raw storage error.
 *
 * Split by media kind because the accepted sets are disjoint: no container is
 * both a still image and a video, and `video/mp4` must not resolve to a `.mp4`
 * that some image decoder later tries to parse.
 */
const IMAGE_EXTENSIONS = new Map([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
    ['image/avif', 'avif'],
]);

const VIDEO_EXTENSIONS = new Map([
    ['video/mp4', 'mp4'],
    ['video/webm', 'webm'],
    ['video/quicktime', 'mov'],
    ['video/ogg', 'ogv'],
]);

const HUMAN_IMAGE_TYPES = 'PNG, JPEG, WebP, GIF or AVIF';
const HUMAN_VIDEO_TYPES = 'MP4, WebM, QuickTime or Ogg';

function humanTypesFor(accepts) {
    return accepts === 'video' ? HUMAN_VIDEO_TYPES : HUMAN_IMAGE_TYPES;
}

// One year. Object names embed a timestamp and random suffix, so a given URL
// always refers to the same bytes and is safe to cache indefinitely.
const CACHE_CONTROL = '31536000';

/**
 * Validate before any bytes are sent.
 *
 * @throws {Error} with a message written for the reader, not the logs.
 */
export function validateImageFile(file, targetKey) {
    const target = UPLOAD_TARGETS[targetKey];
    if (!target) throw new Error(`Unknown upload target "${targetKey}".`);

    if (!file) throw new Error('No file was selected.');

    const allowed = target.accepts === 'video' ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;

    if (!allowed.has(file.type)) {
        // A video arriving at an image target is the most likely mistake, so it
        // gets a message that says so rather than a generic "unsupported type".
        const wrongKind = target.accepts === 'image' && VIDEO_EXTENSIONS.has(file.type);
        if (wrongKind) {
            throw new Error(`That is a video. ${label(target.label)}s must be a ${humanTypesFor('image')} image.`);
        }
        throw new Error(`Unsupported file type. Use a ${humanTypesFor(target.accepts)} file.`);
    }

    if (file.size === 0) {
        throw new Error('That file is empty.');
    }

    if (file.size > target.maxBytes) {
        throw new Error(`${label(target.label)}s must be under ${formatBytes(target.maxBytes)}.`);
    }

    return file;
}

function label(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Build the storage object name: `<userId>/<timestamp>-<random>.<ext>`.
 *
 * The user id comes from the session, not from input. The extension comes from
 * the MIME allowlist. The random suffix means two uploads in the same
 * millisecond cannot collide — which would otherwise fail the second one with
 * "The resource already exists".
 */
export function buildObjectName(userId, file, targetKey) {
    const target = UPLOAD_TARGETS[targetKey];
    const allowed = target?.accepts === 'video' ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;

    const extension = allowed.get(file.type);
    if (!extension) {
        throw new Error(`Unsupported file type. Use a ${humanTypesFor(target?.accepts)} file.`);
    }

    const safeUserId = String(userId || '').replace(/[^a-zA-Z0-9-]/g, '');
    if (!safeUserId) throw new Error('Could not determine your user id.');

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${safeUserId}/${unique}.${extension}`;
}

/**
 * Upload media and return its public URL.
 *
 * @param {object} args
 * @param {object} args.supabase
 * @param {string} args.userId
 * @param {File}   args.file
 * @param {'avatar'|'post-image'|'comment-image'|'post-photo'|'post-video'} args.target
 * @param {(path: string) => void} [args.onUploaded] receives the object name so
 *   the caller can clean up the object it is replacing.
 * @returns {Promise<{ publicUrl: string, path: string }>}
 */
export async function uploadImage({ supabase, userId, file, target, onUploaded }) {
    if (!supabase) throw new Error('Uploads are unavailable: the app is not connected to the database.');

    const config = UPLOAD_TARGETS[target];
    if (!config) throw new Error(`Unknown upload target "${target}".`);

    validateImageFile(file, target);

    const objectName = buildObjectName(userId, file, target);

    const { error } = await supabase.storage
        .from(config.bucket)
        .upload(objectName, file, {
            contentType: file.type,
            cacheControl: CACHE_CONTROL,
            // The name embeds a random suffix so it is always new; without this
            // an accidental retry would fail rather than overwrite.
            upsert: false,
        });

    if (error) {
        // Nothing to clean up: a failed upload does not leave a partial object
        // behind in Supabase Storage.
        throw new Error(cleanStorageError(error, config));
    }

    const { data: { publicUrl } } = supabase.storage.from(config.bucket).getPublicUrl(objectName);

    onUploaded?.(objectName);
    return { publicUrl, path: objectName };
}

/**
 * Delete every object in this user's folder except `keepPath`.
 *
 * This is how a replaced avatar stops leaking storage. Listing the folder also
 * repairs files orphaned by earlier broken delete policies, which could never
 * be removed by their owner.
 *
 * @returns {Promise<string[]>} the paths that were removed
 */
export async function deleteOtherUploads({ supabase, userId, target, keepPath = null }) {
    if (!supabase) return [];

    const config = UPLOAD_TARGETS[target];
    if (!config) return [];

    const safeUserId = String(userId || '').replace(/[^a-zA-Z0-9-]/g, '');
    if (!safeUserId) return [];

    const removed = [];

    try {
        const { data, error } = await supabase.storage
            .from(config.bucket)
            .list(safeUserId, { limit: 100 });

        if (error || !data?.length) return removed;

        const stale = data
            .filter((entry) => entry && entry.name)
            // `keepPath` is a full "<userId>/<file>" key; compare on the file
            // name so the two forms line up.
            .filter((entry) => (keepPath ? keepPath.split('/').pop() : null) !== entry.name)
            .map((entry) => `${safeUserId}/${entry.name}`);

        if (!stale.length) return removed;

        const { error: removeError } = await supabase.storage
            .from(config.bucket)
            .remove(stale);

        if (removeError) {
            // A failure here is cosmetic (orphaned bytes), never a reason to
            // fail the user's actual request.
            console.warn(`Could not remove old ${config.bucket} files:`, removeError.message);
            return removed;
        }

        return stale;
    } catch (error) {
        console.warn(`Could not list ${config.bucket} files:`, error);
        return removed;
    }
}

/** Turn a storage error into something worth showing a person. */
function cleanStorageError(error, config) {
    const message = String(error?.message || '');

    if (/row-level security|permission denied|not allowed/i.test(message)) {
        return 'Your account is not allowed to upload here. Sign in again and retry.';
    }
    if (/exceeds the maximum allowed size|too large|413/i.test(message)) {
        return `${label(config.label)}s must be under ${formatBytes(config.maxBytes)}.`;
    }
    if (/mime type|not allowed|invalid/i.test(message)) {
        return `Unsupported file type. Use a ${humanTypesFor(config.accepts)} file.`;
    }
    if (/bucket not found/i.test(message)) {
        return `The "${config.bucket}" storage bucket is missing. Run supabase/schema.sql against this project.`;
    }
    if (/already exists/i.test(message)) {
        return 'That file name was taken. Please try again.';
    }
    if (/failed to fetch|network/i.test(message)) {
        return 'The upload did not complete. Check your connection and try again.';
    }

    return `The ${config.label} could not be uploaded. Please try again.`;
}
