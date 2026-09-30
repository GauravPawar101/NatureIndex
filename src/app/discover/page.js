import Link from 'next/link';
import { Sparkles } from 'lucide-react';
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
          <EmptyState
            icon={Sparkles}
            title="Nothing to discover yet"
            description="Once a contributor publishes their first story it will show up here, ranked by what readers are actually opening."
          />
        ) : (
          <>
            {trending.length > 0 && (
              <section className="mb-14" aria-labelledby="trending-heading">
                <div className="mb-4 flex items-baseline gap-3 border-b border-[var(--line)] pb-3">
                  <h2 id="trending-heading" className="text-[20px] font-bold text-[var(--ink)]">
                    Trending
                  </h2>
                  <span className="text-[13px] text-[var(--ink-faint)]">recent, weighted by readership</span>
                </div>

                {/* A rank badge on each card, because "trending" is a claim and
                    the position is the evidence for it. */}
                <ol>
                  {trending.map((post, index) => (
                    <li key={post.slug}>
                      <PostCard post={post} />
                      <span className="sr-only">Rank {index + 1}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {mostRead.length > 0 && (
              <section aria-labelledby="mostread-heading">
                <div className="mb-2 flex items-baseline gap-3 border-b border-[var(--line)] pb-3">
                  <h2 id="mostread-heading" className="text-[20px] font-bold text-[var(--ink)]">
                    Most read
                  </h2>
                  <span className="text-[13px] text-[var(--ink-faint)]">all time</span>
                </div>

                <ol>
                  {mostRead.map((post, index) => (
                    <li key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="flex items-center gap-4 border-b border-[var(--line)] py-4"
                      >
                        <span
                          aria-hidden="true"
                          className="w-5 shrink-0 text-right text-[14px] text-[var(--ink-faint)]"
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-[var(--ink)]">
                          {post.title}
                        </span>
                        <span className="shrink-0 text-[13px] text-[var(--ink-faint)]">
                          {post.views.toLocaleString('en-GB')} views
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <p className="mt-10 text-[14px] text-[var(--ink-muted)]">
              Looking for everything published?{' '}
              <Link href="/blog" className="hover:underline">
                Browse the field journal
              </Link>{' '}
              or see{' '}
              <Link href="/leaderboards" className="hover:underline">
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
