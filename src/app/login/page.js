'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient, hasSupabaseConfig } from '../lib/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const hasSupabaseEnv = Boolean(
    hasSupabaseConfig()
  );
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

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-black rounded-2xl border border-white/10">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Welcome to Summit Co.</h1>
        {supabase ? (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa,
              variables: {
                  default: {
                      colors: {
                          brand: '#101010',
                          brandAccent: '#333333',
                          inputText: 'white',
                      }
                    }
              }
            }}
            providers={[]} 
            redirectTo={`${process.env.NEXT_PUBLIC_URL || window.location.origin}/auth/callback`}
          />
        ) : (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Supabase environment variables are missing. Add them to enable login.
          </div>
        )}
      </div>
    </div>
  );
}
