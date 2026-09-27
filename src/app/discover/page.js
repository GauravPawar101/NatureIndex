import Link from 'next/link';
import { Flame, Sparkles, Eye } from 'lucide-react';
import { getTrendingPosts, getMostRead } from '../lib/stats';
import PostCard from '../components/PostCard';
import PageHero from '../components/PageHero';
import EmptyState from '../components/EmptyState';

export const metadata = {
  title: 'Discover — What People Are Reading',
  description:
    'Trending field reports, most-read stories, and the newest work from conservation scientists and stewards worldwide.',
};

/**
 * Discovery surface: what is worth reading right now.
 *
 * Split into three ranked shelves rather than one list, because "trending" and
 * "most read" and "new" answer different questions and mixing them produces a
 * feed where nothing is ever first. Each is ranked independently and each says
 * so, so a reader can tell why something is here.
 *
 * The page renders from data that degrades to empty rather than throwing: on a
 * site with no posts yet every shelf shows its own empty state.
 */
export default async function DiscoverPage() {
  const [trending, mostRead] = await Promise.all([
    // The window is a preference, not a promise: `getTrendingPosts` widens it
    // rather than returning a half-empty shelf, so the caption says "recent"
    // instead of naming a span that may not be the one that was used.
    getTrendingPosts({ limit: 6, windowDays: 30 }),
    getMostRead({ limit: 5 }),
  ]);

  const nothing = trending.length === 0 && mostRead.length === 0;

  return (
    <div className="page-shell">
      <div className="container-page">
        <PageHero
          eyebrow="Discover"
          title="What people are reading"
          description="Field reports moving through the community right now, and the stories that have held attention the longest."
        />

        {nothing ? (
          <div className="glass p-8">
            <EmptyState
              icon={Sparkles}
              title="Nothing to discover yet"
              description="Once a contributor publishes their first story it will show up here, ranked by what readers are actually opening."
            />
          </div>
        ) : (
          <>
            {trending.length > 0 && (
              <section className="mb-14" aria-labelledby="trending-heading">
                <div className="mb-6 flex items-center gap-3">
                  <Flame size={20} className="text-orange-400" aria-hidden="true" />
                  <h2 id="trending-heading" className="text-2xl font-bold text-[var(--ink)]">
                    Trending
                  </h2>
                  <span className="text-sm text-[var(--ink-faint)]">recent, weighted by readership</span>
                </div>

                {/* A rank badge on each card, because "trending" is a claim and
                    the position is the evidence for it. */}
                <ol className="space-y-6">
                  {trending.map((post, index) => (
                    <li key={post.slug} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-1 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-black"
                      >
                        {index + 1}
                      </span>
                      <div className="pl-9">
                        <PostCard post={post} />
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {mostRead.length > 0 && (
              <section aria-labelledby="mostread-heading">
                <div className="mb-6 flex items-center gap-3">
                  <Eye size={20} className="text-sky-400" aria-hidden="true" />
                  <h2 id="mostread-heading" className="text-2xl font-bold text-[var(--ink)]">
                    Most read
                  </h2>
                  <span className="text-sm text-[var(--ink-faint)]">all time</span>
                </div>

                <div className="glass divide-y divide-white/10">
                  {mostRead.map((post, index) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--surface)]"
                    >
                      <span
                        aria-hidden="true"
                        className="w-6 shrink-0 text-right font-bold text-[var(--ink-faint)]"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--ink)]">{post.title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-faint)]">
                          {post.topic && <span>{post.topic}</span>}
                          {post.profiles?.full_name && <span>by {post.profiles.full_name}</span>}
                          <span className="inline-flex items-center gap-1">
                            <Eye size={11} aria-hidden="true" />
                            {post.views} views
                          </span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <p className="mt-10 text-center text-sm text-[var(--ink-faint)]">
              Looking for everything published?{' '}
              <Link href="/blog" className="font-semibold text-[var(--ink)] underline underline-offset-4">
                Browse the field journal
              </Link>{' '}
              or see{' '}
              <Link href="/leaderboards" className="font-semibold text-[var(--ink)] underline underline-offset-4">
                who is writing it
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
