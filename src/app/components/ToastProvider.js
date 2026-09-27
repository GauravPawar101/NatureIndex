'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

/**
 * Minimal toast system.
 *
 * Toasts are for things that happened; inline `role="alert"` text is for things
 * the person must act on. Auth screens use both — a toast for "signed in", an
 * inline banner for "we could not reach the server" — because an error the user
 * needs to read carefully should not vanish after a few seconds.
 */

const ToastContext = createContext(null);

const VARIANTS = {
    success: {
        Icon: CheckCircle2,
        ring: 'border-emerald-400/30 bg-emerald-500/10',
        icon: 'text-emerald-300',
        bar: 'bg-emerald-400',
        // Errors stay up longer — they usually carry something to act on.
        duration: 5000,
    },
    error: {
        Icon: AlertTriangle,
        ring: 'border-red-400/30 bg-red-500/10',
        icon: 'text-red-300',
        bar: 'bg-red-400',
        duration: 9000,
    },
    info: {
        Icon: Info,
        ring: 'border-[var(--line-strong)] bg-[var(--surface)]',
        icon: 'text-[var(--ink)]',
        bar: 'bg-white/60',
        duration: 5000,
    },
};

const MAX_VISIBLE = 3;
const EXIT_ANIMATION_MS = 200;
const DEFAULT_DURATION = 5000;

// Monotonic id. A module-level counter (rather than Math.random) keeps React
// keys stable and avoids duplicate-key warnings when two toasts land at once.
let nextToastId = 0;

function ToastItem({ toast, onDismiss }) {
    const variant = VARIANTS[toast.type] || VARIANTS.info;
    const { Icon } = variant;
    const duration = toast.duration ?? variant.duration ?? DEFAULT_DURATION;

    const [leaving, setLeaving] = useState(false);
    const [paused, setPaused] = useState(false);

    // Milliseconds left before auto-dismiss. Lives in a ref because it is only
    // ever read inside timers and event handlers, never during render.
    const remaining = useRef(duration);
    const startedAt = useRef(null);
    const autoTimer = useRef(null);
    const exitTimer = useRef(null);
    const mounted = useRef(true);
    // Mirrors `leaving` so `close` can stay referentially stable. If `close`
    // depended on the `leaving` state it would change identity on dismiss,
    // which would restart the auto-dismiss effect and leave a stray timer.
    const leavingRef = useRef(false);

    useEffect(() => () => {
        mounted.current = false;
        clearTimeout(autoTimer.current);
        clearTimeout(exitTimer.current);
    }, []);

    const close = useCallback(() => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        setLeaving(true);
        clearTimeout(autoTimer.current);
        // Wait out the exit animation so the toast does not vanish mid-fade.
        exitTimer.current = setTimeout(() => {
            if (mounted.current) onDismiss(toast.id);
        }, EXIT_ANIMATION_MS);
    }, [onDismiss, toast.id]);

    const startTimer = useCallback((ms) => {
        clearTimeout(autoTimer.current);
        startedAt.current = Date.now();
        autoTimer.current = setTimeout(close, ms);
    }, [close]);

    // Auto-dismiss, pausing while hovered/focused so the toast cannot be
    // yanked away from someone who is reaching for it (or tabbing to it).
    useEffect(() => {
        startTimer(duration);
        return () => clearTimeout(autoTimer.current);
    }, [startTimer, duration]);

    const pause = useCallback(() => {
        if (paused) return;
        setPaused(true);
        clearTimeout(autoTimer.current);
        if (startedAt.current) {
            remaining.current = Math.max(600, remaining.current - (Date.now() - startedAt.current));
        }
    }, [paused]);

    const resume = useCallback(() => {
        if (!paused) return;
        setPaused(false);
        startTimer(remaining.current);
    }, [paused, startTimer]);

    return (
        <div
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocusCapture={pause}
            onBlurCapture={resume}
            className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border px-4 py-3 pr-10 shadow-2xl backdrop-blur-md ${variant.ring} ${
                leaving ? 'toast-leave' : 'toast-enter'
            }`}
        >
            <div className="flex items-start gap-3">
                <Icon size={18} className={`mt-0.5 shrink-0 ${variant.icon}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    {toast.title && <p className="text-sm font-semibold text-[var(--ink)]">{toast.title}</p>}
                    <p className={`text-sm leading-relaxed ${toast.title ? 'mt-0.5 text-[var(--ink-muted)]' : 'text-[var(--ink)]'}`}>
                        {toast.message}
                    </p>
                    {toast.hint && <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">{toast.hint}</p>}
                </div>
            </div>

            <button
                type="button"
                onClick={close}
                aria-label="Dismiss notification"
                className="absolute right-2 top-2 rounded-md p-1 text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
                <X size={14} aria-hidden="true" />
            </button>

            {/* Remaining-time bar. Frozen with `animation-play-state` while
                paused, so it holds its position instead of snapping back. */}
            <div
                aria-hidden="true"
                className={`toast-progress absolute bottom-0 left-0 h-0.5 w-full ${variant.bar}`}
                style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
            />
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const show = useCallback((options) => {
        // Accept `toast('Saved')` as well as `toast({ message, type })`.
        const normalized = typeof options === 'string' ? { message: options } : options || {};
        if (!normalized.message && !normalized.title) return null;

        const id = ++nextToastId;
        setToasts((current) => [...current, { id, type: 'info', ...normalized }]);
        return id;
    }, []);

    const toast = useMemo(() => ({
        show,
        success: (message, options = {}) => show({ ...options, message, type: 'success' }),
        error: (message, options = {}) => show({ ...options, message, type: 'error' }),
        info: (message, options = {}) => show({ ...options, message, type: 'info' }),
    }), [show]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div
                // A landmark rather than a live region itself: each toast
                // announces itself, so the container stays quiet.
                role="region"
                aria-label="Notifications"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-3 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
            >
                {/* Cap the stack at render time rather than in state: anything
                    pushed past the cap simply never mounts, so it can never
                    leak a timer. */}
                {toasts.slice(-MAX_VISIBLE).map((item) => (
                    <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

/**
 * @returns {{ success: Function, error: Function, info: Function, show: Function }}
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used inside a <ToastProvider>.');
    }
    return context;
}

export default ToastProvider;
