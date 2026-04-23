'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function normalizeTag(text) {
  return (text || '').trim().toLowerCase();
}

export default function TagInput({ value, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = useMemo(() => {
    const arr = Array.isArray(value) ? value : [];
    return Array.from(new Set(arr.map(normalizeTag).filter(Boolean))).slice(0, 10);
  }, [value]);

  const filteredSuggestions = useMemo(() => {
    return (suggestions || [])
      .map((t) => normalizeTag(t.name))
      .filter(Boolean)
      .filter((name) => !selected.includes(name))
      .slice(0, 10);
  }, [suggestions, selected]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();

    const run = async () => {
      const q = normalizeTag(query);
      const res = await fetch(`/api/tags?query=${encodeURIComponent(q)}`, { signal: controller.signal });
      if (!res.ok) return;
      const payload = await res.json().catch(() => ({}));
      setSuggestions(payload?.tags || []);
    };

    run().catch(() => {});
    return () => controller.abort();
  }, [query, isOpen]);

  useEffect(() => {
    const onClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const addTag = (raw) => {
    const name = normalizeTag(raw);
    if (!name) return;
    if (selected.includes(name)) return;
    if (selected.length >= 10) return;
    onChange?.([...selected, name]);
    setQuery('');
    setIsOpen(false);
  };

  const removeTag = (name) => {
    onChange?.(selected.filter((t) => t !== name));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(query);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.map((t) => (
          <span key={t} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-200 text-gray-900 text-sm">
            {t}
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeTag(t)}
              className="text-gray-700 hover:text-gray-900 disabled:opacity-50"
              aria-label={`Remove tag ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={selected.length >= 10 ? 'Max 10 tags' : 'Add tags…'}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
        />

        {isOpen && (filteredSuggestions.length > 0 || query.trim()) && (
          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {filteredSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => addTag(name)}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 disabled:opacity-50"
              >
                {name}
              </button>
            ))}
            {filteredSuggestions.length === 0 && query.trim() && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => addTag(query)}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 disabled:opacity-50"
              >
                Add “{normalizeTag(query)}”
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
