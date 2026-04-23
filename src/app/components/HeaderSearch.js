'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function HeaderSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    const query = q.trim();

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
        setOpen(true);
      } catch (e) {
        if (e?.name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  const showDropdown = open && (results.length > 0 || isLoading);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Search posts..."
          className="w-full pl-10 pr-4 py-2 bg-black/30 backdrop-blur-md border border-white/10 text-white placeholder-gray-400 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
        />
      </div>

      {showDropdown && (
        <div className="absolute mt-2 w-full bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No results.</div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="max-h-96 overflow-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/blog/${r.slug}`}
                    className="block px-4 py-3 hover:bg-orange-500/10 transition"
                    onClick={() => setOpen(false)}
                  >
                    <div className="text-sm font-semibold text-gray-100 line-clamp-1">{r.title}</div>
                    {r.excerpt && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">{r.excerpt}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
