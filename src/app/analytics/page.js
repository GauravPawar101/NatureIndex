import Link from 'next/link';
import { BarChart3, FileText, Users, Eye, MessageSquare, Clock } from 'lucide-react';
import { getSiteStats, getRecentActivity } from '../lib/stats';
import PageHero from '../components/PageHero';
import EmptyState from '../components/EmptyState';
import { formatRelativeTime } from '../lib/format';

export const metadata = {
  title: 'Analytics — Nature Index',
  description:
    'Publication volume, readership and topic coverage across the Nature Index field journal.',
};

/**
 * Site-wide analytics.
 *
 * Every number here is a plain aggregate over rows the public can already read,
 * so nothing on this page requires authentication or a privileged role. The
 * counters are whole-site rather than per-visitor on purpose: there is no
 * per-user tracking in this app, and inventing one to fill out a dashboard
 * would be a change of policy, not a change of code.
 *
 * All queries are best-effort. A failure yields zeros and the page still
 * renders, because a dashboard that 500s tells an operator less than one that
 * admits it has nothing to show.
 */
export default async function AnalyticsPage() {
  const [stats, activity] = await Promise.all([
    getSiteStats(),
    getRecentActivity({ postLimit: 5, commentLimit: 5 }),
  ]);

  if (stats.posts === 0) {
    return (
      <div className="page-shell">
        <div className="container mx-auto max-w-5xl px-6">
          <PageHero
            eyebrow="Analytics"
            title="How the journal is doing"
            description="Publication volume, readership and topic coverage across the whole site."
          />
          <div className="glass-card p-8">
            <EmptyState
              icon={BarChart3}
              title="No data to report yet"
              description="These figures fill in as stories are published and read."
            />
          </div>
        </div>
      </div>
    );
  }

  const topTopic = stats.byTopic[0];
  const busiest = topTopic ? topTopic.count : 0;

  return (
    <div className="page-shell">
      <div className="container mx-auto max-w-5xl px-6">
        <PageHero
          eyebrow="Analytics"
          title="How the journal is doing"
          description="Publication volume, readership and topic coverage across the whole site."
        />

        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            icon={FileText}
            label="Published stories"
            value={stats.posts}
            hint={`${stats.publishedThisWeek} in the last 7 days`}
          />
          <Stat icon={Users} label="Contributors" value={stats.authors} hint="with published work" />
          <Stat icon={Eye} label="Total views" value={stats.views} hint="all time, all stories" />
          <Stat icon={MessageSquare} label="Comments" value={stats.comments} hint="across every story" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="glass-card p-6" aria-labelledby="topics-heading">
            <h2 id="topics-heading" className="mb-1 text-lg font-bold text-white">
              Topic coverage
            </h2>
            <p className="mb-6 text-sm text-gray-400">
              How the catalogue is distributed across subjects.
            </p>

            {stats.byTopic.length === 0 ? (
              <p className="text-sm text-gray-500">No topics assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {stats.byTopic.map((entry) => {
                  // Bars are scaled against the busiest topic, so the fullest
                  // row always fills the width regardless of absolute volume.
                  const share = busiest > 0 ? Math.round((entry.count / busiest) * 100) : 0;
                  return (
                    <li key={entry.topic}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-gray-300">{entry.topic}</span>
                        <span className="shrink-0 tabular-nums text-gray-500">
                          {entry.count}
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-white/10"
                        role="img"
                        aria-label={`${entry.topic}: ${entry.count} stories`}
                      >
                        <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="glass-card p-6" aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="mb-1 text-lg font-bold text-white">
              Latest activity
            </h2>
            <p className="mb-6 text-sm text-gray-400">The most recent posts and replies.</p>

            <div className="space-y-6">
              <div>
                <h3 className="eyebrow mb-3">Newest stories</h3>
                {activity.posts.length === 0 ? (
                  <p className="text-sm text-gray-500">Nothing published yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {activity.posts.map((post) => (
                      <li key={post.slug}>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="block rounded-lg p-3 transition-colors hover:bg-white/5"
                        >
                          <p className="truncate font-medium text-white">{post.title}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                            {post.topic && <span>{post.topic}</span>}
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} aria-hidden="true" />
                              {formatRelativeTime(post.date, '')}
                            </span>
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="eyebrow mb-3">Recent replies</h3>
                {activity.comments.length === 0 ? (
                  <p className="text-sm text-gray-500">No comments yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {activity.comments.map((comment) => (
                      <li key={comment.id} className="border-l-2 border-white/10 pl-3">
                        <p className="line-clamp-2 text-sm text-gray-300">{comment.content}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          on{' '}
                          {comment.postSlug ? (
                            <Link href={`/blog/${comment.postSlug}`} className="underline underline-offset-2">
                              {comment.postTitle}
                            </Link>
                          ) : (
                            comment.postTitle
                          )}{' '}
                          · {formatRelativeTime(comment.createdAt, '')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Figures are whole-site aggregates over public data.{' '}
          <Link href="/leaderboards" className="font-semibold text-white underline underline-offset-4">
            See contributor rankings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="glass-card p-5">
      <Icon size={18} className="mb-3 text-emerald-400" aria-hidden="true" />
      <p className="text-2xl font-bold text-white tabular-nums">
        {value.toLocaleString('en-GB')}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-300">{label}</p>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
