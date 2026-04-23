'use client';

import { useEffect, useMemo, useState } from 'react';

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  // iOS Safari
  if (window.navigator?.standalone) return true;
  // Other browsers
  return window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const canPrompt = useMemo(() => Boolean(deferredPrompt) && !isInstalled, [deferredPrompt, isInstalled]);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const handler = (e) => {
      // Allow us to show our own install UI
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!canPrompt) return null;

  return (
    <button
      type="button"
      onClick={onInstall}
      className="px-4 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors"
    >
      Install App
    </button>
  );
}
