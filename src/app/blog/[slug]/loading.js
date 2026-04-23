export default function LoadingBlogPost() {
  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-zinc-900 min-h-screen pt-24 pb-20">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="relative w-full h-80 mb-8 rounded-2xl overflow-hidden border border-gray-700/50 bg-zinc-800/30 animate-pulse" />

        <div className="h-12 lg:h-16 w-3/4 rounded-xl bg-zinc-800/40 border border-gray-700/30 animate-pulse mb-6" />

        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-20 rounded bg-zinc-800/40 animate-pulse" />
          <div className="h-4 w-32 rounded bg-zinc-800/40 animate-pulse" />
          <div className="h-4 w-24 rounded bg-zinc-800/40 animate-pulse" />
          <div className="h-4 w-20 rounded bg-zinc-800/40 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30 shadow-xl">
            <div className="space-y-4">
              <div className="h-4 w-full rounded bg-zinc-800/40 animate-pulse" />
              <div className="h-4 w-11/12 rounded bg-zinc-800/40 animate-pulse" />
              <div className="h-4 w-10/12 rounded bg-zinc-800/40 animate-pulse" />
              <div className="h-4 w-full rounded bg-zinc-800/40 animate-pulse" />
              <div className="h-4 w-8/12 rounded bg-zinc-800/40 animate-pulse" />
              <div className="h-48 w-full rounded-xl bg-zinc-800/40 border border-gray-700/30 animate-pulse" />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-28 bg-zinc-800/40 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/30 shadow-xl">
              <div className="h-5 w-32 rounded bg-zinc-800/40 animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-11/12 rounded bg-zinc-800/40 animate-pulse" />
                <div className="h-4 w-10/12 rounded bg-zinc-800/40 animate-pulse" />
                <div className="h-4 w-9/12 rounded bg-zinc-800/40 animate-pulse" />
                <div className="h-4 w-10/12 rounded bg-zinc-800/40 animate-pulse" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
