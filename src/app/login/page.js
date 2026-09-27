'use client';
import { createClient } from '../lib/supabase/client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHero from '../components/PageHero';
import PasswordField from '../components/PasswordField';
import ConnectionNotice from '../components/ConnectionNotice';
import ConfigurationRequired from '../components/ConfigurationRequired';
import { useToast } from '../components/ToastProvider';
import { describeAuthError } from '../lib/authErrors';
import Link from 'next/link';
import { AlertTriangle, Loader2, LogIn } from 'lucide-react';

// Deliberately permissive: the only thing that should reject an address is
// Supabase, and a stricter client-side regex starts refusing valid ones.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmail(value) {
    const trimmed = value.trim();
    if (!trimmed) return 'Enter your email address.';
    if (!EMAIL_PATTERN.test(trimmed)) return 'That does not look like an email address yet.';
    return '';
}

export default function LoginPage() {
    return (
        // `useSearchParams` opts this page into client-side rendering of the
        // boundary, so the shell needs a Suspense fallback.
        <Suspense fallback={<div className="page-shell" />}>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    // Lazily created once and kept stable, rather than re-created on every
    // render — see AccountPage for why that matters for the effect below.
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState(null); // { title, message, hint }
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [recheckToken, setRecheckToken] = useState(0);

    // Focus the first field that needs attention, so the message is actionable
    // without anyone having to hunt for the offending input.
    const focusField = (id) => document.getElementById(id)?.focus();

    // The auth callback redirects here with ?reason= when it cannot complete a
    // sign-in. Previously the param was ignored entirely, so an expired or
    // malformed link landed on a clean, silent login form.
    const callbackReason = searchParams.get('reason');
    const callbackDetail = searchParams.get('detail');
    const redirectTo = searchParams.get('next');

    const buildCallbackNotice = (reason, detail) => {
        if (!reason) return null;
        return {
            kind: 'callback',
            title: reason === 'not_configured'
                ? 'Sign in is not available'
                : reason === 'missing_code'
                    ? 'That sign-in link was incomplete'
                    : 'That sign-in link did not work',
            // The callback supplies its own wording; it knows things the error
            // mapper cannot, such as which step failed.
            message: detail || 'The link could not be completed.',
            hint: reason === 'missing_code'
                ? 'Open the link straight from your email or password reset message, without editing it.'
                : reason === 'not_configured'
                    ? 'This deployment is missing its Supabase settings. An administrator needs to set them.'
                    : 'Request a fresh link and try again.',
        };
    };

    // Captured during render rather than in an effect: the effect below strips
    // `reason` from the URL, so deriving the notice from the query on every
    // render would make it vanish the instant it appeared. Adjusting state
    // during render (the documented pattern for reacting to a changed prop)
    // keeps it on screen and survives navigating to the URL again later.
    const [callbackNotice, setCallbackNotice] = useState(() => buildCallbackNotice(callbackReason, callbackDetail));
    const [seenReason, setSeenReason] = useState(callbackReason);

    if (seenReason !== callbackReason) {
        setSeenReason(callbackReason);
        setCallbackNotice(buildCallbackNotice(callbackReason, callbackDetail));
    }

    // The ambient signal only. The inline banner carries the detail.
    useEffect(() => {
        if (!callbackReason) return;

        toast.error('Sign-in link problem', {
            message: callbackDetail || 'The link could not be completed.',
        });

        // Replace the URL so a refresh does not replay the error.
        router.replace('/login', { scroll: false });
    }, [callbackReason, callbackDetail, toast, router]);

    useEffect(() => {
        if (!supabase) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                router.push('/account');
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);

    // Errors appear once a field has been left, or once a submit was attempted —
    // never while someone is still typing their first character.
    const emailError = (touched.email || submitAttempted) ? validateEmail(email) : '';
    const passwordError = (touched.password || submitAttempted) && !password ? 'Enter your password.' : '';
    const formReady = !validateEmail(email) && password.length > 0;

    const reportError = (error, action) => {
        const described = describeAuthError(error, { action });
        setFormError(described);
        toast.error(described.title, {
            message: described.hint || described.message,
        });
        // A network failure is worth re-probing: it may have been a blip, and
        // the banner should confirm the service is back before the next try.
        if (described.kind === 'network') setRecheckToken((token) => token + 1);
        return described;
    };

    const handleSignIn = async (event) => {
        event.preventDefault();
        if (!supabase || loading) return;

        setSubmitAttempted(true);
        setFormError(null);

        const invalidEmail = validateEmail(email);
        const missingPassword = !password;

        if (invalidEmail || missingPassword) {
            toast.error('Almost there', {
                message: invalidEmail
                    ? 'Check the email address — it is missing or mistyped.'
                    : 'Enter your password to continue.',
            });
            if (invalidEmail) focusField('email');
            else focusField('password');
            return;
        }

        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                reportError(signInError, 'sign-in');
                return;
            }

            // No error but also no session. GoTrue returns this for an account
            // that exists but is not yet confirmed, and also for a valid
            // credential pair when the project has "email confirmation" forced
            // on. Either way the reader is not signed in, and silently pushing
            // to /account would bounce them straight back here.
            if (!data?.session) {
                setFormError({
                    title: 'One more step',
                    message: 'Your account exists, but you are not signed in yet.',
                    hint: 'Confirm your email address using the link we sent you, then sign in again.',
                });
                toast.error('Email not confirmed yet', {
                    message: 'Check your inbox for the confirmation link.',
                });
                return;
            }

            toast.success('Signed in', { message: 'Taking you to your account...' });
            // Honour a same-origin `next` from the callback flow; anything else
            // (an absolute URL) is ignored rather than turned into an open
            // redirect.
            const destination = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
                ? redirectTo
                : '/account';
            router.push(destination);
            router.refresh();
        } catch (unexpected) {
            // signInWithPassword normally resolves with an `error` rather than
            // throwing, but a thrown network error would otherwise skip the
            // reset below and leave the button stuck on "Signing in...".
            reportError(unexpected, 'sign-in');
        } finally {
            setLoading(false);
        }
    };

    if (!supabase) {
        return <ConfigurationRequired />;
    }

    return (
        <div className="page-shell flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                <PageHero
                    eyebrow="Welcome back"
                    title="Sign in to Nature Index"
                    description="Access your account, publish articles, and manage your profile."
                />
                <div className="glass p-8">
                    {/* Probes Supabase on mount, and again after a network
                        failure, so a broken URL is named up front. */}
                    <ConnectionNotice enabled={!!supabase} recheckToken={recheckToken} />

                    <form onSubmit={handleSignIn} className="space-y-5" noValidate>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--ink-muted)] mb-1">Email</label>
                            <input
                                id="email"
                                type="email"
                                inputMode="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                disabled={loading}
                                required
                                aria-invalid={emailError ? 'true' : undefined}
                                aria-describedby={emailError ? 'email-error' : undefined}
                                className={`field ${emailError ? 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/30' : ''}`}
                            />
                            {emailError && (
                                <p id="email-error" role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-red-300">
                                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    {emailError}
                                </p>
                            )}
                        </div>

                        <PasswordField
                            id="password"
                            label="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                            autoComplete="current-password"
                            error={passwordError}
                            hint={!passwordError ? 'Caps Lock is detected live, and you can reveal what you typed.' : ''}
                            disabled={loading}
                        />

                        {(formError || callbackNotice) && (() => {
                            const banner = formError || callbackNotice;
                            return (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3"
                                >
                                    <p className="flex items-start gap-2 text-sm font-semibold text-red-200">
                                        <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                                        {banner.title}
                                    </p>
                                    <p className="mt-1 pl-[23px] text-sm leading-relaxed text-red-100/80">
                                        {banner.message}
                                    </p>
                                    {banner.hint && (
                                        <p className="mt-1.5 pl-[23px] text-xs leading-relaxed text-red-100/60">
                                            {banner.hint}
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="space-y-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={16} aria-hidden="true" />
                                        Sign in
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-[var(--ink-faint)]" aria-live="polite">
                                {loading
                                    ? 'Checking your details...'
                                    : formReady
                                        ? 'Ready when you are.'
                                        : ''}
                            </p>

                            <p className="text-sm text-[var(--ink-muted)] text-center">
                                New here?{' '}
                                <Link href="/signup" className="text-[var(--ink)] hover:underline underline-offset-4">
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
