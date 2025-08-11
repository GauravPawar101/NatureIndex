'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If the user is logged in, redirect them to the home page.
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
          providers={[]} // Add providers like 'google', 'github' if you want
          redirectTo={`${process.env.NEXT_PUBLIC_URL}/auth/callback`}
        />
      </div>
    </div>
  );
}