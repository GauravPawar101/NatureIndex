'use client';

import { useState, useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Light/dark toggle.
 *
 * The hard part is not the button, it is the flash. The stored theme has to be
 * applied to <html> before the first paint, which no amount of client-side
 * effect can do — an effect runs after the browser has already painted the
 * light version. So the actual application lives in a blocking inline script in
 * the root layout (see THEME_INIT_SCRIPT), and this component only reflects and
 * updates that state afterwards.
 *
 * The rendered icon is also deliberately *not* derived from state on first
 * render: the server has no idea what the stored preference is, so it renders
 * the neutral placeholder and corrects after mount. Rendering a wrong icon and
 * then swapping it is a visible flicker, which is worse than no icon for a
 * frame.
 */
export default function ThemeToggle({ className = '' }) {
  // The current theme is read from the DOM during render rather than mirrored
  // into state by an effect. The init script has already applied it to <html>
  // before React ever runs, so this is synchronous, causes no cascading render,
  // and cannot disagree with what is actually on screen.
  //
  // `null` on the server and during the first client render, because the server
  // has no document to read. The icons are cross-faded rather than swapped, so
  // the one-frame gap is invisible instead of a flicker.
  const [theme, setTheme] = useState(null);

  // Read on the client after hydration has begun. `useSyncExternalStore` is the
  // correct primitive here — it is a subscription to an external system (the
  // document), not a state mirror, and it is hydration-safe by design.
  const documentTheme = useSyncExternalStore(subscribeToTheme, readTheme, () => null);

  const current = theme ?? documentTheme;
  const isDark = current === 'dark';

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem('ni-theme', next);
    } catch {
      // Private browsing can refuse writes. The theme still applies for this
      // session, which is the part that matters; it just will not persist.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)] ${className}`}
    >
      {/* Both icons are always in the DOM and cross-faded, so the swap does not
          reflow the button or pop. */}
      <Sun
        size={16}
        aria-hidden="true"
        className={`absolute transition-all duration-200 ${
          current === null ? 'opacity-0' : isDark ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
        }`}
      />
      <Moon
        size={16}
        aria-hidden="true"
        className={`absolute transition-all duration-200 ${
          current === null ? 'opacity-0' : isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      />
    </button>
  );
}

/** Subscribes to changes on the <html> element's data-theme attribute. */
function subscribeToTheme(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

/** Reads the applied theme. Stable: returns a primitive, so no re-render loop. */
function readTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * Runs before first paint. Inlined into <head> rather than shipped as a module
 * precisely because it has to be synchronous and blocking — defer it and the
 * browser paints the wrong theme first.
 *
 * Kept as a string because it is injected with dangerouslySetInnerHTML.
 * Reads three things, in priority order: an explicit stored choice, then the
 * OS preference, then light.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('ni-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`.trim();
