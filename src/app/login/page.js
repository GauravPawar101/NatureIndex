'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect old /login route to new /sign-in route
    router.replace('/sign-in');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
      </div>
    </div>
  );
}
