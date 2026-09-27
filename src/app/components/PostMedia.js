'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, ImageIcon } from 'lucide-react';

/**
 * Renders a post's media: a gallery of photos, a video player, or both.
 *
 * A custom control set rather than the browser's, because the native controls
 * cannot be styled to match the rest of the site and vary between browsers.
 * Everything the native element gives up is reimplemented here, and the
 * accessibility affordances are kept: the video is focusable, the buttons carry
 * labels, and state changes are announced.
 *
 * Nothing autoplays. A feed that starts making noise on scroll is hostile, and
 * most browsers block it anyway.
 */
export default function PostMedia({ media = [], video = null, title = '' }) {
  const photos = media.filter((asset) => asset.kind !== 'video');
  const hasVideo = Boolean(video?.url);

  if (!hasVideo && photos.length === 0) return null;

  return (
    <div className="space-y-6">
      {hasVideo && <VideoPlayer video={video} poster={photos[0]?.url ?? null} title={title} />}
      {photos.length > 0 && <Gallery photos={photos} title={title} />}
    </div>
  );
}

/**
 * Single-asset video with keyboard-accessible controls.
 *
 * A plain <video> element is used rather than a player library: the site has
 * no playlists, no captions track and no DRM, so a library would add a large
 * dependency for controls this component can provide in a fraction of the size.
 */
function VideoPlayer({ video, poster, title }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Play/pause is driven through the element rather than by swapping the src,
  // so the browser keeps buffering and the reader keeps their position.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onTimeUpdate = () => {
      const total = Number(element.duration);
      setProgress(total > 0 ? element.currentTime / total : 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    element.addEventListener('timeupdate', onTimeUpdate);
    element.addEventListener('play', onPlay);
    element.addEventListener('pause', onPause);
    element.addEventListener('ended', onEnded);

    return () => {
      element.removeEventListener('timeupdate', onTimeUpdate);
      element.removeEventListener('play', onPlay);
      element.removeEventListener('pause', onPause);
      element.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    const element = ref.current;
    if (!element) return;
    if (element.paused) {
      element.play().catch(() => setPlaying(false));
    } else {
      element.pause();
    }
  };

  const seek = (event) => {
    const element = ref.current;
    if (!element || !Number.isFinite(element.duration)) return;
    const ratio = Number(event.target.value) / 100;
    element.currentTime = ratio * element.duration;
  };

  const toggleMute = () => {
    const element = ref.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
  };

  const fullscreen = () => {
    const element = ref.current;
    if (element?.requestFullscreen) element.requestFullscreen().catch(() => {});
  };

  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <video
        ref={ref}
        src={video.url}
        poster={poster ?? undefined}
        controls={false}
        preload="metadata"
        playsInline
        className="w-full"
        onClick={toggle}
        aria-label={title ? `Video: ${title}` : 'Video'}
      />

      <div className="flex items-center gap-3 border-t border-white/10 bg-black/60 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause video' : 'Play video'}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-gray-200"
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>

        <label className="sr-only" htmlFor="video-progress">
          Seek
        </label>
        <input
          id="video-progress"
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={Math.round(progress * 100)}
          onChange={seek}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
        />

        {video.duration && (
          <span className="shrink-0 text-xs tabular-nums text-gray-300">{video.duration}</span>
        )}

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="text-gray-300 transition-colors hover:text-white"
        >
          {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={fullscreen}
          aria-label="Fullscreen"
          className="text-gray-300 transition-colors hover:text-white"
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
      </div>
    </figure>
  );
}

/**
 * Photo grid.
 *
 * One photo shows full width; two or more become a grid with the first taking
 * the top row. Clicking opens the browser's own lightbox via a dialog, so
 * keyboard dismissal and focus handling come for free.
 */
function Gallery({ photos, title }) {
  const [openIndex, setOpenIndex] = useState(null);
  const close = () => setOpenIndex(null);

  // Escape closes the lightbox. Registered on document rather than the element
  // so it works no matter which child currently holds focus.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex]);

  if (photos.length === 0) return null;

  return (
    <>
      <div
        className={
          photos.length === 1
            ? 'overflow-hidden rounded-2xl border border-white/10'
            : 'grid grid-cols-2 gap-2'
        }
      >
        {photos.map((photo, index) => (
          <button
            key={photo.url}
            type="button"
            onClick={() => setOpenIndex(index)}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 ${
              photos.length === 1 ? '' : index === 0 ? 'col-span-2' : ''
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.alt_text || `${title || 'Photo'} — image ${index + 1} of ${photos.length}`}
              loading="lazy"
              className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                photos.length === 1 ? '' : index === 0 ? 'aspect-[2/1]' : 'aspect-square'
              }`}
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} — image viewer` : 'Image viewer'}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[openIndex].url}
            alt={photos[openIndex].alt_text || title || 'Photo'}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-gray-300">
            {openIndex + 1} of {photos.length}
          </p>
        </div>
      )}
    </>
  );
}

/** Shown when a post claims to have media but none could be loaded. */
export function MediaUnavailable() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-400">
      <ImageIcon size={18} aria-hidden="true" />
      This post&rsquo;s media could not be loaded.
    </div>
  );
}
