'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly-changing value.
 *
 * Used by every search input so a keystroke does not immediately re-query the
 * database — typing "reforestation" is ten keystrokes, and without this that
 * is ten round trips for one search.
 *
 * @param {*} value
 * @param {number} [delay] ms to wait after the last change
 */
export default function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}
