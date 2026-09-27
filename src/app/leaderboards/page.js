import Link from 'next/link';
import { Trophy, FileText, Eye } from 'lucide-react';
import { getLeaderboard } from '../lib/stats';
import PageHero from '../components/PageHero';
import EmptyState from '../components/EmptyState';

export const metadata = {
  title: 'Leaderboards — Nature Index Contributors',
  description:
    'The researchers, stewards and volunteers publishing the most field reports on Nature Index, ranked by work published and readership.',
};

/**
 * Contributor leaderboards.
 *
 * Public by design: every post on the site is already public, so a ranking of
 * who wrote them is public information too. There is no gate here and no
 * personal data beyond the display name and username a contributor already
 * chose to publish.
 *
 * Two boards rather than one combined score, because "most posts" and "most
 * read" reward different things. Blending them into a single number would hide
 * which one a contributor actually leads, and a prolific author with a small
 * readership would be indistinguishable from a widely-read one.
 */
export default async function LeaderboardsPage() {
  const [byPosts, byViews] = await Promise.all([
    getLeaderboard({ limit: 20, metric: 'posts' }),
    getLeaderboard({ limit: 20, metric: 'views' }),
  ]);

  if (byPosts.length === 0) {
    return (
      <div className="page-shell">
        <div className="container mx-auto max-w-5xl px-6">
          <PageHero
            eyebrow="Leaderboards"
            title="Who is writing"
            description="The contributors behind the field reports on this site."
          />
          <div className="glass-card p-8">
            <EmptyState
              icon={Trophy}
              title="No contributors yet"
              description="Leaderboards appear once contributors publish. The first story published by anyone will put them here."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container mx-auto max-w-5xl px-6">
        <PageHero
          eyebrow="Leaderboards"
          title="Who is writing"
          description="Ranked by what they have published, and separately by how much of it people have read."
        />

        <div className="grid gap-8 md:grid-cols-2">
          <Board
            title="Most published"
            icon={FileText}
            caption="Field reports written"
            entries={byPosts}
            metric="posts"
          />
          <Board
            title="Most read"
            icon={Eye}
            caption="Total readership"
            entries={byViews}
            metric="views"
          />
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          These rankings count published stories only. Drafts are never included.
        </p>
      </div>
    </div>
  );
}

/** One leaderboard table. `metric` decides which number is emphasised. */
function Board({ title, icon: Icon, caption, entries, metric }) {
  return (
    <section className="glass-card overflow-hidden" aria-labelledby={`board-${metric}`}>
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <Icon size={18} className="text-amber-400" aria-hidden="true" />
        <h2 id={`board-${metric}`} className="text-lg font-bold text-white">
          {title}
        </h2>
      </div>

      <ol className="divide-y divide-white/5">
        {entries.map((entry) => {
          const primary = metric === 'views' ? entry.views : entry.posts;
          const secondary = metric === 'views' ? entry.posts : entry.views;

          return (
            <li key={entry.userId}>
              <Link
                href={`/profile/${entry.handle}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-white/5"
              >
                <span
                  aria-hidden="true"
                  className={`w-7 shrink-0 text-center font-bold ${
                    entry.rank <= 3 ? 'text-amber-400' : 'text-gray-600'
                  }`}
                >
                  {entry.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{entry.fullName}</p>
                  <p className="truncate text-xs text-gray-500">@{entry.handle}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold text-white">
                    {primary.toLocaleString('en-GB')}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {metric === 'views'
                      ? `${secondary} ${secondary === 1 ? 'story' : 'stories'}`
                      : `${secondary.toLocaleString('en-GB')} views`}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-white/10 p-3 text-center text-xs text-gray-500">{caption}</p>
    </section>
  );
}
