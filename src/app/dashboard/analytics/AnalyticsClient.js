'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import ViewsHeatmap from './ViewsHeatmap';

function formatDayLabel(day) {
  try {
    const d = new Date(`${day}T00:00:00Z`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return String(day);
  }
}

export default function AnalyticsClient({
  viewsByPost,
  viewsLast30Days,
  followerCountOverTime,
  topPosts,
  totals,
  heatmapDays,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <p className="text-gray-400 text-sm">Total Views</p>
          <p className="text-3xl font-bold text-white mt-1">{totals.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <p className="text-gray-400 text-sm">Likes</p>
          <p className="text-3xl font-bold text-white mt-1">{totals.totalLikes.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <p className="text-gray-400 text-sm">Comments</p>
          <p className="text-3xl font-bold text-white mt-1">{totals.totalComments.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <p className="text-gray-400 text-sm">Followers</p>
          <p className="text-3xl font-bold text-white mt-1">{totals.followerCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Total Views Per Post</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsByPost} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="title" tick={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="views" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-gray-500 text-xs mt-3">(Hover bars to see exact counts)</p>
        </section>

        <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Top 5 Posts By Views</h2>
          {topPosts.length === 0 ? (
            <p className="text-gray-400">No posts yet.</p>
          ) : (
            <ol className="space-y-3">
              {topPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-100 font-semibold truncate">{p.title}</p>
                    <p className="text-gray-500 text-sm">{p.views.toLocaleString()} views</p>
                  </div>
                  <a
                    href={`/blog/${p.slug}`}
                    className="shrink-0 px-3 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium"
                  >
                    View
                  </a>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <ViewsHeatmap days={heatmapDays} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Views (Last 30 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsLast30Days} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDayLabel}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(v) => formatDayLabel(v)}
                  contentStyle={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Follower Count (Last 30 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={followerCountOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDayLabel}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(v) => formatDayLabel(v)}
                  contentStyle={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="follower_count"
                  name="Followers"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
