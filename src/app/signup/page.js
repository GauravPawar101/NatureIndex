'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import { createClient } from '../lib/supabase/client';

function normalizeWebsite(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue;
  return `https://${trimmedValue}`;
}

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/account');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleSignUp = async (event) => {
    event.preventDefault();

    if (!supabase) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedWebsite = normalizeWebsite(website);

    // Create the user without requesting an email redirect so no verification mail is sent
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
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Already signed in
      router.push('/account');
      router.refresh();
    } else {
      // Try to sign in immediately so the user remains logged in when server allows it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Account created but could not sign in automatically.');
      } else {
        router.push('/account');
        router.refresh();
      }
    }

    setLoading(false);
  };

  if (!supabase) {
    return (
      <div className="page-shell flex items-center justify-center px-6">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Configuration Required</h1>
          <p className="text-gray-400 text-sm">
            Set <code className="text-white">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{' '}
            <code className="text-white">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-2xl">
        <PageHero
          eyebrow="Join Nature Index"
          title="Create your contributor account"
          description="Set up your profile once, confirm your email, and add your avatar later from your profile settings."
        />
        <div className="glass-card p-8">
          <form onSubmit={handleSignUp} className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-dark"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-dark"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div>
              <label htmlFor="signup-username" className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="input-dark"
                placeholder="your-handle"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-full-name" className="block text-sm font-medium text-gray-300 mb-1">Full name</label>
              <input
                id="signup-full-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="input-dark"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="signup-website" className="block text-sm font-medium text-gray-300 mb-1">Website</label>
              <input
                id="signup-website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="input-dark"
                placeholder="https://example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="signup-bio" className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
              <textarea
                id="signup-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="input-dark min-h-28"
                placeholder="Tell people what you work on and why it matters."
                rows={4}
              />
            </div>
            {error && <p className="md:col-span-2 text-red-400 text-sm">{error}</p>}
            {success && <p className="md:col-span-2 text-emerald-300 text-sm">{success}</p>}
            <div className="md:col-span-2 flex flex-col gap-4">
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create account'}
              </button>
              <p className="text-sm text-gray-400 text-center">
                Already have an account?{' '}
                <Link href="/login" className="text-white hover:underline underline-offset-4">
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