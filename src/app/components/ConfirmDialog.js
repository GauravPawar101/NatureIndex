'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Accessible confirmation dialog, replacing `window.confirm`.
 *
 * `window.confirm` blocks the main thread, cannot be styled, renders differently
 * on every OS, and is dismissed by pressing Escape — which is the *opposite* of
 * the answer for a destructive action. This traps focus, restores it to the
 * trigger on close, and can be put into a pending state while the confirmed
 * action runs, so the button cannot be double-clicked into two deletes.
 */
export default function ConfirmDialog({
    open,
    title = 'Are you sure?',
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    pending = false,
    onConfirm,
    onCancel,
}) {
    const panelRef = useRef(null);
    const confirmRef = useRef(null);
    const previouslyFocused = useRef(null);

    // `createPortal` needs `document`, which does not exist while rendering on
    // the server. This is checked instead of the usual `useEffect(() =>
    // setMounted(true))` because it needs no state and cannot disagree with the
    // first client render. Every caller opens the dialog from a click handler,
    // so `open` is always false during SSR and hydration anyway.
    const canUsePortal = typeof document !== 'undefined';

    // Remember what had focus so it can be handed back on close — otherwise
    // keyboard users get dumped at the top of the document.
    useEffect(() => {
        if (open) {
            previouslyFocused.current = document.activeElement;
            confirmRef.current?.focus();
        } else {
            previouslyFocused.current?.focus?.();
        }
    }, [open]);

    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape' && !pending) {
            event.stopPropagation();
            onCancel?.();
            return;
        }

        if (event.key !== 'Tab') return;

        // Minimal focus trap: cycle between the two buttons.
        const focusables = panelRef.current?.querySelectorAll('button:not(:disabled)');
        if (!focusables?.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }, [onCancel, pending]);

    // Stop the page behind the dialog from scrolling.
    useEffect(() => {
        if (!open) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    if (!canUsePortal || !open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                aria-label="Close dialog"
                tabIndex={-1}
                onClick={() => !pending && onCancel?.()}
                className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            />

            <div
                ref={panelRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={description ? 'confirm-dialog-description' : undefined}
                className="toast-enter relative w-full max-w-sm rounded-2xl border border-white/20 bg-zinc-900 p-6 shadow-2xl"
            >
                <div className="flex items-start gap-3">
                    {destructive && (
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                            <AlertTriangle size={18} aria-hidden="true" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 id="confirm-dialog-title" className="text-lg font-bold text-white">{title}</h2>
                        {description && (
                            <p id="confirm-dialog-description" className="mt-1.5 text-sm leading-relaxed text-gray-300">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={pending}
                        className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={pending}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                            destructive
                                ? 'bg-red-500 text-white hover:bg-red-400'
                                : 'bg-white text-black hover:bg-gray-100'
                        }`}
                    >
                        {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                        {pending ? 'Working...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
