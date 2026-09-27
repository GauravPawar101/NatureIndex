'use client';

import { useEffect, useMemo, useState } from 'react';
import { List } from 'lucide-react';

/**
 * Table of contents with scroll-spy, in two presentations:
 *
 *   variant="accordion"  inline above the article, for small screens
 *   variant="sidebar"   sticky column beside the article, for large screens
 *
 * The caller picks one per breakpoint rather than rendering both and hiding
 * one with CSS, which would duplicate the list, the ids, and the scroll-spy
 * subscriptions for no benefit.
 *
 * Scroll-spy measures heading offsets rather than using an IntersectionObserver,
 * because an observer also fires for off-screen headings and for headings taller
 * than the viewport — both of which make the "current section" flicker.
 */
export default function TableOfContents({ headings = [], variant = 'accordion' }) {
    const [activeId, setActiveId] = useState(null);
    const [open, setOpen] = useState(false);

    // A flat, indent-aware list. Deeper headings are visually indented without
    // nested <ol>s, which keeps the DOM small and the scroll-spy trivial.
    const items = useMemo(() => {
        if (!headings.length) return [];
        const minLevel = Math.min(...headings.map((item) => item.level));
        return headings.map((heading) => ({ ...heading, indent: heading.level - minLevel }));
    }, [headings]);

    useEffect(() => {
        if (!headings.length) return undefined;

        const measure = () => {
            const elements = headings
                .map((heading) => document.getElementById(heading.id))
                .filter(Boolean);

            if (!elements.length) return;

            // The last heading whose top has passed the trigger line wins.
            const triggerLine = 140;
            let current = elements[0].id;

            for (const element of elements) {
                if (element.getBoundingClientRect().top <= triggerLine) {
                    current = element.id;
                } else {
                    break;
                }
            }

            // At the very bottom of the page the last section is what the reader
            // is actually looking at, even if it never crossed the line.
            const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 80;
            if (atBottom) current = elements[elements.length - 1].id;

            setActiveId(current);
        };

        let frame = null;
        const onScroll = () => {
            if (frame === null) frame = requestAnimationFrame(measure);
        };

        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame !== null) cancelAnimationFrame(frame);
        };
    }, [headings]);

    if (!headings.length) return null;

    const scrollTo = (id) => {
        const target = document.getElementById(id);
        if (!target) return;

        // The header is `fixed`, so a bare `scrollIntoView` would tuck the
        // heading underneath it. This offset clears the header plus the
        // progress bar.
        const offset = 110;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({ top, behavior: 'smooth' });
        setActiveId(id);
        setOpen(false);

        // Move keyboard focus too, otherwise the next Tab continues from the
        // trigger and the next stop is somewhere else entirely.
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    };

    const list = (
        <ul className="space-y-0.5">
            {items.map((item) => {
                const isActive = activeId === item.id;
                return (
                    <li key={item.id}>
                        <button
                            type="button"
                            onClick={() => scrollTo(item.id)}
                            aria-current={isActive ? 'location' : undefined}
                            style={{ paddingLeft: `${0.75 + item.indent * 0.85}rem` }}
                            className={`block w-full rounded-r-md py-1.5 pr-2 text-left text-sm transition-colors ${
                                isActive
                                    ? 'border-l-2 border-[var(--line-strong)] bg-[var(--surface)] font-medium text-[var(--ink)]'
                                    : 'border-l-2 border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
                            }`}
                        >
                            {item.text}
                        </button>
                    </li>
                );
            })}
        </ul>
    );

    if (variant === 'sidebar') {
        return (
            <nav aria-label="Table of contents">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--ink-faint)]">
                    <List size={13} aria-hidden="true" />
                    On this page
                </h2>
                {list}
            </nav>
        );
    }

    return (
        <div className="lg:hidden">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-controls="toc-panel"
                className="flex w-full items-center justify-between rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
            >
                <span className="flex items-center gap-2">
                    <List size={15} aria-hidden="true" />
                    On this page
                </span>
                <span className="text-xs text-[var(--ink-muted)]">{open ? 'Hide' : `${headings.length} sections`}</span>
            </button>
            {open && (
                <div id="toc-panel" className="mt-2 rounded-xl border border-[var(--line)] bg-black/40 p-3">
                    {list}
                </div>
            )}
        </div>
    );
}
