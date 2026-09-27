'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, UserPlus } from 'lucide-react';
import PageHero from '../components/PageHero';
import PasswordField from '../components/PasswordField';
import ConnectionNotice from '../components/ConnectionNotice';
import ConfigurationRequired from '../components/ConfigurationRequired';
import { useToast } from '../components/ToastProvider';
import { describeAuthError } from '../lib/authErrors';
import { createClient } from '../lib/supabase/client';
import { MIN_PASSWORD_LENGTH, isPasswordValid, PASSWORD_RULES } from '../lib/password';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
const MAX_USERNAME_LENGTH = 30;

function validateEmail(value) {
    const trimmed = value.trim();
    if (!trimmed) return 'Enter your email address.';
    if (!EMAIL_PATTERN.test(trimmed)) return 'That does not look like an email address yet.';
    return '';
}

function validateUsername(value) {
    const trimmed = value.trim();
    if (!trimmed) return 'Choose a username.';
    if (trimmed.length > MAX_USERNAME_LENGTH) return `Keep it under ${MAX_USERNAME_LENGTH} characters.`;
    if (!USERNAME_PATTERN.test(trimmed)) return 'Use lowercase letters, numbers, dots and underscores only.';
    return '';
}

function normalizeWebsite(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;
    if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue;
    return `https://${trimmedValue}`;
}

export default function SignupPage() {
    // Lazily created once and kept stable — see AccountPage for why a fresh
    // client on every render would make the effect below misbehave.
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const toast = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [website, setWebsite] = useState('');
    const [bio, setBio] = useState('');
    const [formError, setFormError] = useState(null); // { title, message, hint }
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [recheckToken, setRecheckToken] = useState(0);

    useEffect(() => {
        if (!supabase) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                router.push('/account');
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);

    const markTouched = (field) => setTouched((current) => ({ ...current, [field]: true }));
    const show = (field) => touched[field] || submitAttempted;

    const emailError = show('email') ? validateEmail(email) : '';
    const usernameError = show('username') ? validateUsername(username) : '';
    const passwordError = show('password')
        ? (!password
            ? 'Choose a password.'
            : isPasswordValid(password, PASSWORD_RULES)
                ? ''
                : `Password does not meet all ${PASSWORD_RULES.length} requirements yet.`)
        : '';

    const websiteError = show('website') && website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(website.trim())
        ? 'Include the https:// prefix so the link works.'
        : '';

    const formReady = !validateEmail(email)
        && !validateUsername(username)
        && isPasswordValid(password, PASSWORD_RULES);

    const reportError = (error, action) => {
        const described = describeAuthError(error, { action });
        setFormError(described);
        toast.error(described.title, { message: described.hint || described.message });
        if (described.kind === 'network') setRecheckToken((token) => token + 1);
        return described;
    };

    const handleSignUp = async (event) => {
        event.preventDefault();
        if (!supabase || loading) return;

        setSubmitAttempted(true);
        setFormError(null);
        setSuccess('');

        if (!formReady) {
            toast.error('Check the highlighted fields', {
                message: !validateEmail(email)
                    ? 'Your email address is missing or mistyped.'
                    : !validateUsername(username)
                        ? 'Pick a username using letters, numbers, dots or underscores.'
                        : `Your password needs at least ${MIN_PASSWORD_LENGTH} characters and a mix of cases, a number and a symbol.`,
            });
            document.getElementById(!validateEmail(email) ? 'signup-email' : !validateUsername(username) ? 'signup-username' : 'signup-password')?.focus();
            return;
        }

        setLoading(true);

        const normalizedUsername = username.trim().toLowerCase();
        const normalizedWebsite = normalizeWebsite(website);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        username: normalizedUsername,
                        full_name: fullName.trim() || null,
                        website: normalizedWebsite,
                        bio: bio.trim() || null,
                    },
                },
            });

            if (signUpError) {
                reportError(signUpError, 'sign-up');
                return;
            }

            // Supabase returns a 200 with a "fake" user object (empty `identities`)
            // for an email that's already registered, rather than an error — this
            // is deliberate on their end, to avoid leaking which emails exist. The
            // original code didn't check for this, so a repeat signup silently
            // looked successful instead of telling the person to sign in instead.
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                const message = 'An account with this email already exists.';
                setFormError({
                    kind: 'email-taken',
                    title: 'That email is already registered',
                    message,
                    hint: 'Sign in instead, or reset the password if you have lost access.',
                });
                toast.error('That email is already registered', {
                    message: 'Sign in instead — nothing was created twice.',
                });
                return;
            }

            if (data.session) {
                // Email confirmation is off for this project — already signed in.
                toast.success('Account created', { message: 'Welcome to Nature Index.' });
                router.push('/account');
                router.refresh();
                return;
            }

            // No session yet. If email confirmation is required this sign-in
            // attempt will fail with an "email not confirmed"-style error, which is
            // expected and not a real problem — the account was still created.
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (!signInError) {
                toast.success('Account created', { message: 'Welcome to Nature Index.' });
                router.push('/account');
                router.refresh();
                return;
            }

            if (/confirm/i.test(signInError.message)) {
                setSuccess('Account created! Check your inbox to confirm your email before signing in.');
                toast.success('Confirm your email', {
                    message: 'We sent a confirmation link. Open it, then sign in.',
                    duration: 10000,
                });
                return;
            }

            reportError(signInError, 'sign-up');
        } catch (unexpected) {
            reportError(unexpected, 'sign-up');
        } finally {
            setLoading(false);
        }
    };

    if (!supabase) {
        return <ConfigurationRequired />;
    }

    return (
        <div className="page-shell flex items-center justify-center px-6 py-20">
            <div className="w-full max-w-2xl">
                <PageHero
                    eyebrow="Join Nature Index"
                    title="Create your contributor account"
                    description="Set up your profile once, confirm your email, and add your avatar later from your profile settings."
                />
                <div className="glass p-8">
                    <ConnectionNotice enabled={!!supabase} recheckToken={recheckToken} />

                    <form onSubmit={handleSignUp} className="grid gap-5 md:grid-cols-2" noValidate>
                        <div>
                            <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--ink-muted)] mb-1">Email</label>
                            <input
                                id="signup-email"
                                type="email"
                                inputMode="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                onBlur={() => markTouched('email')}
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                disabled={loading}
                                required
                                aria-invalid={emailError ? 'true' : undefined}
                                aria-describedby={emailError ? 'signup-email-error' : undefined}
                                className={`field ${emailError ? 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/30' : ''}`}
                            />
                            {emailError && (
                                <p id="signup-email-error" role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-red-300">
                                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    {emailError}
                                </p>
                            )}
                        </div>

                        <PasswordField
                            id="signup-password"
                            label="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onBlur={() => markTouched('password')}
                            autoComplete="new-password"
                            rules={PASSWORD_RULES}
                            error={passwordError}
                            disabled={loading}
                        />

                        <div>
                            <label htmlFor="signup-username" className="block text-sm font-medium text-[var(--ink-muted)] mb-1">Username</label>
                            <input
                                id="signup-username"
                                type="text"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                onBlur={() => markTouched('username')}
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                disabled={loading}
                                placeholder="your-handle"
                                required
                                aria-invalid={usernameError ? 'true' : undefined}
                                aria-describedby={usernameError ? 'signup-username-error' : 'signup-username-hint'}
                                className={`field ${usernameError ? 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/30' : ''}`}
                            />
                            {usernameError ? (
                                <p id="signup-username-error" role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-red-300">
                                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    {usernameError}
                                </p>
                            ) : (
                                <p id="signup-username-hint" className="mt-1.5 text-xs text-[var(--ink-muted)]">
                                    Lowercase letters, numbers, dots and underscores. This becomes your profile URL.
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="signup-full-name" className="block text-sm font-medium text-[var(--ink-muted)] mb-1">Full name</label>
                            <input
                                id="signup-full-name"
                                type="text"
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                autoComplete="name"
                                disabled={loading}
                                className="field"
                            />
                        </div>

                        <div>
                            <label htmlFor="signup-website" className="block text-sm font-medium text-[var(--ink-muted)] mb-1">Website</label>
                            <input
                                id="signup-website"
                                type="url"
                                value={website}
                                onChange={(event) => setWebsite(event.target.value)}
                                onBlur={() => markTouched('website')}
                                autoComplete="url"
                                placeholder="https://example.com"
                                disabled={loading}
                                aria-invalid={websiteError ? 'true' : undefined}
                                aria-describedby={websiteError ? 'signup-website-error' : undefined}
                                className={`field ${websiteError ? 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/30' : ''}`}
                            />
                            {websiteError && (
                                <p id="signup-website-error" role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-red-300">
                                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    {websiteError}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="signup-bio" className="block text-sm font-medium text-[var(--ink-muted)] mb-1">Bio</label>
                            <textarea
                                id="signup-bio"
                                value={bio}
                                onChange={(event) => setBio(event.target.value)}
                                disabled={loading}
                                className="field min-h-28"
                                placeholder="Tell people what you work on and why it matters."
                                rows={4}
                            />
                        </div>

                        {formError && (
                            <div role="alert" className="md:col-span-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3">
                                <p className="flex items-start gap-2 text-sm font-semibold text-red-200">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    {formError.title}
                                </p>
                                <p className="mt-1 pl-[23px] text-sm leading-relaxed text-red-100/80">{formError.message}</p>
                                {formError.hint && (
                                    <p className="mt-1.5 pl-[23px] text-xs leading-relaxed text-red-100/60">{formError.hint}</p>
                                )}
                            </div>
                        )}

                        {success && (
                            <div role="status" className="md:col-span-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                {success}
                            </div>
                        )}

                        <div className="md:col-span-2 flex flex-col gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} aria-hidden="true" />
                                        Create account
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-[var(--ink-faint)]" aria-live="polite">
                                {loading
                                    ? 'Setting up your account...'
                                    : formReady
                                        ? 'Everything looks good.'
                                        : `${MIN_PASSWORD_LENGTH}+ characters and a mix of cases, numbers and symbols.`}
                            </p>

                            <p className="text-sm text-[var(--ink-muted)] text-center">
                                Already have an account?{' '}
                                <Link href="/login" className="text-[var(--ink)] hover:underline underline-offset-4">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
