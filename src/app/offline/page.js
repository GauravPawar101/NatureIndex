export const dynamic = 'force-static';

import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-zinc-900 pt-32 pb-20">
      <div className="container mx-auto max-w-2xl px-6">
        <div className="bg-zinc-800/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30 shadow-xl text-center">
          <h1 className="text-3xl font-bold text-white mb-3">You’re offline</h1>
          <p className="text-gray-300">
            This page is available offline. You can still read posts you opened recently.
          </p>
          <div className="mt-6">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center px-5 py-2 rounded-full text-sm font-semibold border bg-black/40 text-white border-white/10 hover:bg-white/10 hover:border-white/20 transition"
            >
              Go to Blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
