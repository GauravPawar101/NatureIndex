'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';

/**
 * Copies text to the clipboard and confirms it, without a toast when a toast
 * would be the wrong tool.
 *
 * Falls back to a hidden textarea + `document.execCommand('copy')` because
 * `navigator.clipboard` is unavailable on insecure origins — which includes
 * this app on a plain-HTTP LAN IP, exactly where a developer is most likely to
 * be testing. Copying silently failing is worse than a visible toast.
 */
export default function CopyButton({
    value,
    label = 'Copy link',
    copiedLabel = 'Copied',
    className = '',
    children,
    onCopied,
    onError,
}) {
    const [copied, setCopied] = useState(false);
    const [failed, setFailed] = useState(false);
    const timer = useRef(null);
    const mounted = useRef(true);

    useEffect(() => () => {
        mounted.current = false;
        clearTimeout(timer.current);
    }, []);

    const copy = useCallback(async () => {
        const text = typeof value === 'function' ? value() : value;
        if (!text) return;

        let succeeded = false;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                succeeded = true;
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                succeeded = document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        } catch {
            succeeded = false;
        }

        if (!mounted.current) return;

        clearTimeout(timer.current);
        setFailed(!succeeded);
        setCopied(succeeded);

        if (succeeded) onCopied?.();
        else onError?.();

        timer.current = setTimeout(() => {
            if (mounted.current) {
                setCopied(false);
                setFailed(false);
            }
        }, 2000);
    }, [value, onCopied, onError]);

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={copied ? copiedLabel : label}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                copied
                    ? 'text-[var(--accent)]'
                    : failed
                        ? 'text-[var(--warn)]'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            } ${className}`}
        >
            {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
            {children ?? (copied ? copiedLabel : failed ? 'Press Ctrl+C' : label)}
        </button>
    );
}
