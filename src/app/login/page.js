'use client';

export const dynamic = 'force-dynamic';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabase =
    typeof window === 'undefined' || !hasSupabaseEnv ? null : createClientComponentClient();
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

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-black rounded-2xl border border-white/10">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Welcome to Summit Co.</h1>
        {!hasSupabaseEnv || !supabase ? (
          <p className="text-gray-300 text-sm">
            Missing <code>NEXT_PUBLIC_SUPABASE_URL</code> / <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Login is unavailable.
          </p>
        ) : (
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#101010',
                    brandAccent: '#333333',
                    inputText: 'white',
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={`${process.env.NEXT_PUBLIC_URL || ''}/auth/callback`}
          />
        )}
      </div>
    </div>
  );
}
