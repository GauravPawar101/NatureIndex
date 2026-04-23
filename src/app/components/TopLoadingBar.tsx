'use client';

import { animate, motion, useMotionValue } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function TopLoadingBar() {
  const pathname = usePathname();

  const progress = useMotionValue(0);
  const [visible, setVisible] = useState(false);

  const startedRef = useRef(false);
  const firstRenderRef = useRef(true);
  const startAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const finishAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  const start = () => {
    if (startedRef.current) return;

    startedRef.current = true;
    setVisible(true);

    finishAnimRef.current?.stop();
    startAnimRef.current?.stop();

    progress.set(0);
    startAnimRef.current = animate(progress, 0.9, {
      duration: 0.6,
      ease: 'easeOut',
    });
  };

  const finish = () => {
    if (!startedRef.current) return;

    startAnimRef.current?.stop();
    finishAnimRef.current?.stop();

    finishAnimRef.current = animate(progress, 1, {
      duration: 0.2,
      ease: 'linear',
      onComplete: () => {
        window.setTimeout(() => {
          setVisible(false);
          progress.set(0);
          startedRef.current = false;
        }, 150);
      },
    });
  };

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      if (anchor.hasAttribute('download')) return;
      const targetAttr = anchor.getAttribute('target');
      if (targetAttr && targetAttr !== '_self') return;

      if (href.startsWith('#')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      // If it doesn't actually change the route, skip.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      start();
    };

    const onPopState = () => {
      start();
    };

    document.addEventListener('click', onClickCapture, true);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('popstate', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] pointer-events-none">
      <motion.div
        aria-hidden="true"
        className="h-0.5 origin-left bg-gradient-to-r from-orange-500 to-red-600"
        style={{ scaleX: progress }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ opacity: { duration: 0.2 } }}
      />
    </div>
  );
}
