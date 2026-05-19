'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '../lib/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHero from '../components/PageHero';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

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
          description="Join our community of conservation researchers and storytellers."
        />
        <div className="glass-card p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#ffffff',
                    brandAccent: '#e5e5e5',
                    brandButtonText: '#000000',
                    inputText: 'white',
                    inputBackground: 'rgba(0,0,0,0.4)',
                    inputBorder: 'rgba(255,255,255,0.2)',
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={`${process.env.NEXT_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/auth/callback`}
          />
        </div>
      </div>
    </div>
  );
}
