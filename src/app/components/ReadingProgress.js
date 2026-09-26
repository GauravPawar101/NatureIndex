'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Thin reading-progress bar pinned under the fixed header.
 *
 * Uses a transform driven by a scroll listener rather than `position: sticky`
 * or a CSS scroll-timeline, both of which either need a wrapper element or are
 * not broadly supported yet. The `scaleX` write is compositor-only, so the
 * handler does not trigger layout on every frame.
 */
export default function ReadingProgress({ targetRef }) {
    const [progress, setProgress] = useState(0);
    const frame = useRef(null);

    useEffect(() => {
        const update = () => {
            frame.current = null;

            const element = targetRef?.current;
            if (!element) return;

            const start = element.offsetTop;
            const total = element.offsetHeight - window.innerHeight;
            if (total <= 0) {
                setProgress(window.scrollY > start ? 1 : 0);
                return;
            }

            const scrolled = window.scrollY - start;
            setProgress(Math.min(1, Math.max(0, scrolled / total)));
        };

        const onScroll = () => {
            // Coalesce to one measurement per frame; scroll fires far more
            // often than the display refreshes.
            if (frame.current === null) {
                frame.current = requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        };
    }, [targetRef]);

    return (
        <div
            className="fixed left-0 right-0 top-16 z-40 h-0.5 bg-transparent"
            role="progressbar"
            aria-label="Reading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
        >
            <div
                className="h-full origin-left bg-white transition-transform duration-75 ease-out"
                style={{ transform: `scaleX(${progress})` }}
            />
        </div>
    );
}
