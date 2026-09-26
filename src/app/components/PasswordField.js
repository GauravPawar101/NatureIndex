'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { AlertTriangle, Check, Eye, EyeOff, X } from 'lucide-react';
import { checkPasswordRules, scorePassword } from '../lib/password';

/**
 * Password input with the live feedback people expect from a modern signup
 * form: a show/hide toggle, a Caps Lock warning, a running requirements
 * checklist and a strength meter.
 *
 * Sign-in passes no creation rules, so the meter and checklist stay hidden —
 * judging an existing password would be pointless. The Caps Lock warning and
 * reveal toggle still apply there, since both directly cause the most common
 * failed sign-in.
 */

// Hoisted so the default prop is a stable reference. An inline `= []` default
// would allocate a new array on every render and defeat the memo below.
const NO_RULES = [];

export default function PasswordField({
    id,
    label = 'Password',
    value = '',
    onChange,
    autoComplete = 'current-password',
    rules = NO_RULES,
    error = '',
    hint = '',
    disabled = false,
    required = true,
    placeholder,
    onBlur,
    className = '',
}) {
    const reactId = useId();
    const inputId = id || `password-${reactId}`;
    const rulesId = `${inputId}-rules`;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    const [revealed, setRevealed] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [focused, setFocused] = useState(false);
    const [touchedOnce, setTouchedOnce] = useState(false);

    // Memoised so the checklist does not recompute on unrelated renders.
    const results = useMemo(() => checkPasswordRules(value, rules), [value, rules]);
    const strength = useMemo(() => scorePassword(value), [value]);

    // Never scold someone about a password they have not typed yet — the
    // checklist appears once they engage with the field.
    const showGuidance = rules.length > 0 && (focused || touchedOnce || value.length > 0);
    const showStrength = showGuidance && value.length > 0;

    const handleKeyEvent = useCallback((event) => {
        setCapsLockOn(event.getModifierState?.('CapsLock') ?? false);
    }, []);

    const handleBlur = useCallback((event) => {
        setFocused(false);
        setTouchedOnce(true);
        // Caps Lock cannot be read once the field loses focus, so reset it
        // rather than leaving a stale warning on screen.
        setCapsLockOn(false);
        onBlur?.(event);
    }, [onBlur]);

    const allRulesPassed = results.every((rule) => rule.passed);
    const remainingCount = results.filter((rule) => !rule.passed).length;

    return (
        <div className={className}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
                    {label}
                </label>
                {showStrength && (
                    <span aria-live="polite" className="text-xs font-medium text-gray-400">
                        {allRulesPassed ? 'All requirements met' : `${remainingCount} to go`}
                    </span>
                )}
            </div>

            <div className="relative">
                <input
                    id={inputId}
                    type={revealed ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onKeyDown={handleKeyEvent}
                    onKeyUp={handleKeyEvent}
                    onFocus={() => setFocused(true)}
                    onBlur={handleBlur}
                    autoComplete={autoComplete}
                    required={required}
                    disabled={disabled}
                    placeholder={placeholder}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={[showGuidance ? rulesId : null, capsLockOn ? `${inputId}-caps` : null, hint ? hintId : null, error ? errorId : null]
                        .filter(Boolean)
                        .join(' ') || undefined}
                    className={`input-dark pr-12 ${error ? 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/30' : ''} ${
                        capsLockOn ? 'border-amber-400/60' : ''
                    }`}
                />
                <button
                    type="button"
                    onClick={() => setRevealed((current) => !current)}
                    // Keeps a keyboard user on the password field: otherwise
                    // tabbing out to the toggle then back re-focuses the start
                    // of the password.
                    onMouseDown={(event) => event.preventDefault()}
                    disabled={disabled}
                    aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    aria-pressed={revealed}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
                >
                    {revealed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
            </div>

            {capsLockOn && (
                <p
                    id={`${inputId}-caps`}
                    className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-300"
                >
                    <AlertTriangle size={13} aria-hidden="true" />
                    Caps Lock is on.
                </p>
            )}

            {showStrength && (
                <div className="mt-2.5">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                        {[0, 1, 2, 3].map((index) => (
                            <span
                                key={index}
                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                    index < strength.score ? strength.color : 'bg-white/15'
                                }`}
                            />
                        ))}
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
                        <span className={`font-medium ${strength.score > 0 ? 'text-gray-200' : 'text-gray-400'}`}>
                            Password strength: {strength.label || '—'}
                        </span>
                        <span className="text-gray-500">{strength.score}/4</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">{strength.hint}</p>
                </div>
            )}

            {showGuidance && (
                <ul id={rulesId} className="mt-2.5 grid gap-1 text-xs sm:grid-cols-2">
                    {results.map((rule) => (
                        <li
                            key={rule.id}
                            className={`flex items-center gap-1.5 transition-colors ${
                                rule.passed ? 'text-emerald-300' : 'text-gray-400'
                            }`}
                        >
                            <span
                                aria-hidden="true"
                                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                    rule.passed ? 'border-emerald-400/60 bg-emerald-500/20' : 'border-white/20'
                                }`}
                            >
                                {rule.passed ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} className="opacity-0" />}
                            </span>
                            {rule.label}
                            {/* Screen readers get the state without relying on colour. */}
                            <span className="sr-only">{rule.passed ? ' — met' : ' — not met yet'}</span>
                        </li>
                    ))}
                </ul>
            )}

            {hint && !error && (
                <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-gray-400">
                    {hint}
                </p>
            )}

            {error && (
                <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-red-300">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                </p>
            )}
        </div>
    );
}
