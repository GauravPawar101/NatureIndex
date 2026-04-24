'use client';

import { UserProfile } from '@clerk/nextjs';

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-gray-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <UserProfile
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-2xl',
            },
          }}
          routing="path"
          path="/account"
        />
      </div>
    </div>
  );
}