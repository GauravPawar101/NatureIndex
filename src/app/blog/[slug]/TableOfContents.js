'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function TableOfContents({ toc }) {
  const items = useMemo(() => (Array.isArray(toc) ? toc : []), [toc]);
  const [activeId, setActiveId] = useState(items[0]?.id ?? null);
  const visibleRef = useRef(new Map());

  useEffect(() => {
    if (!items.length) return;

    const targets = items
      .map((h) => document.getElementById(h.id))
      .filter(Boolean);

    if (!targets.length) return;

    visibleRef.current = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target?.id;
          if (!id) continue;

          if (entry.isIntersecting) {
            visibleRef.current.set(id, entry.boundingClientRect.top);
          } else {
            visibleRef.current.delete(id);
          }
        }

        const visible = Array.from(visibleRef.current.entries());
        if (!visible.length) return;

        visible.sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]));
        const nextActiveId = visible[0][0];
        setActiveId(nextActiveId);
      },
      {
        // Start considering a heading "active" a bit before it reaches the top.
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 1],
      }
    );

    for (const el of targets) observer.observe(el);

    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <nav aria-label="Table of contents">
      <div className="text-sm font-bold text-gray-100 mb-3">On this page</div>
      <ol className="space-y-1">
        {items.map((h) => {
          const isActive = activeId === h.id;
          const indentClass = h.level === 3 ? 'pl-4' : '';

          return (
            <li key={h.id} className={indentClass}>
              <a
                href={`#${h.id}`}
                className={
                  'block rounded-md px-2 py-1 border transition ' +
                  (isActive
                    ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                    : 'text-gray-300 border-transparent hover:bg-orange-500/5 hover:text-orange-200')
                }
                onClick={() => setActiveId(h.id)}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
