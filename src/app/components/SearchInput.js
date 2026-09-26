'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Search box with the two shortcuts people already expect from every good
 * search field: "/" to jump to it, Escape to clear or leave it.
 *
 * The listener is attached to `document` and skips when focus is already in a
 * text field, so typing "/" into the comment box does not yank focus.
 */
export default function SearchInput({
    value,
    onChange,
    placeholder = 'Search…',
    label = 'Search',
    autoFocus = false,
    size = 'md',
    resultCount = null,
    isPending = false,
    className = '',
    inputRef,
    onClear,
}) {
    const localRef = useRef(null);
    const ref = inputRef || localRef;

    useEffect(() => {
        const onKeyDown = (event) => {
            const target = event.target;
            const tag = target?.tagName;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

            const isSlash = event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey;
            const isCommandK = (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);

            if (isSlash || isCommandK) {
                event.preventDefault();
                ref.current?.focus();
                ref.current?.select();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [ref]);

    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
            // First Escape clears, second one releases focus. Matches how native
            // search inputs behave, and avoids a dead key.
            if (value) {
                event.preventDefault();
                event.stopPropagation();
                (onClear || (() => onChange('')))();
            } else {
                ref.current?.blur();
            }
        }
    }, [value, onChange, onClear, ref]);

    const hasValue = value.length > 0;

    return (
        <div className={`relative ${className}`}>
            <label htmlFor="site-search-input" className="sr-only">{label}</label>
            <Search
                size={size === 'sm' ? 15 : 18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
                ref={ref}
                id="site-search-input"
                type="search"
                role="searchbox"
                value={value}
                autoFocus={autoFocus}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoComplete="off"
                placeholder={placeholder}
                aria-label={label}
                aria-describedby={resultCount ? 'site-search-count' : undefined}
                className={`input-dark pl-11 ${hasValue ? 'pr-11' : ''} ${
                    size === 'sm' ? 'py-1.5 text-sm' : ''
                } [&::-webkit-search-cancel-button]:appearance-none`}
            />

            {hasValue && (
                <button
                    type="button"
                    onClick={() => (onClear || (() => onChange('')))()}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X size={14} aria-hidden="true" />
                </button>
            )}

            {resultCount !== null && (
                <p
                    id="site-search-count"
                    aria-live="polite"
                    // `opacity` rather than `hidden` so the row does not reflow
                    // the card on every keystroke.
                    className={`mt-2 text-xs transition-opacity ${isPending ? 'text-gray-500 opacity-60' : 'text-gray-400'}`}
                >
                    {resultCount}
                </p>
            )}
        </div>
    );
}
