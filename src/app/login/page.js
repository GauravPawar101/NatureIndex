'use client';
import { createClient } from '../lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHero from '../components/PageHero';
import Link from 'next/link';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/account');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleSignIn = async (event) => {
    event.preventDefault();

    if (!supabase) return;

    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      router.push('/account');
      router.refresh();
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
    <div className="page-shell flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <PageHero
          eyebrow="Welcome back"
          title="Sign in to Nature Index"
          description="Access your account, publish articles, and manage your profile."
        />
        <div className="glass-card p-8">
          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-dark"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-dark"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="text-sm text-gray-400 text-center">
              New here?{' '}
              <Link href="/signup" className="text-white hover:underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
