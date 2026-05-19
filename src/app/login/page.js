'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '../lib/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="bg-gray-900 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md p-8 bg-black rounded-2xl border border-red-500/30 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Configuration Required</h1>
          <p className="text-gray-400 text-sm">
            Set <code className="text-orange-400">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="text-orange-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{' '}
            <code className="text-orange-400">.env.local</code> to enable authentication.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-black rounded-2xl border border-white/10">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Welcome to Nature Index</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa,
            variables: {
                default: {
                    colors: {
                        brand: '#0f766e',
                        brandAccent: '#115e59',
                        inputText: 'white',
                    }
                  }
            }
          }}
          providers={[]}
          redirectTo={`${process.env.NEXT_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/auth/callback`}
        />
      </div>
    </div>
  );
}
