import { redirect } from 'next/navigation';
import AnalyticsClient from './AnalyticsClient';
import { createSupabaseClerkServerClient } from '../../lib/supabaseClerkServer';

export default async function AnalyticsPage() {
  const { userId, supabase } = await createSupabaseClerkServerClient();

  if (!userId || !supabase) {
    redirect('/login');
  }

  // Posts owned by the author (views per post + top 5)
  const { data: posts } = await supabase
    .from('posts')
    .select('id,slug,title,views')
    .eq('author_id', userId)
    .order('views', { ascending: false });

  const safePosts = posts || [];
  const postIds = safePosts.map((p) => p.id).filter(Boolean);

  const viewsByPost = safePosts
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title || 'Untitled',
      views: Number(p.views || 0),
    }))
    .sort((a, b) => b.views - a.views);

  const topPosts = viewsByPost.slice(0, 5);
  const totalViews = viewsByPost.reduce((sum, p) => sum + (Number(p.views) || 0), 0);

  // Total likes for this author's posts
  const { count: totalLikes } = postIds.length
    ? await supabase
        .from('reactions')
        .select('post_id', { count: 'exact', head: true })
        .in('post_id', postIds)
    : { count: 0 };

  // Total comments for this author's posts
  const { count: totalComments } = postIds.length
    ? await supabase
        .from('comments')
        .select('post_id', { count: 'exact', head: true })
        .in('post_id', postIds)
    : { count: 0 };

  // Views over the last 30 days (aggregated across this author's posts)
  const { data: viewsLast30Days } = await supabase.rpc('author_views_timeseries', {
    p_author_id: userId,
    p_days: 30,
  });

  // Views per day for last 12 months (heatmap)
  const { data: heatmapDays } = await supabase.rpc('author_views_heatmap', {
    p_author_id: userId,
    p_days: 365,
  });

  // Follower count over time (cumulative)
  const { data: followerCountOverTime } = await supabase.rpc('author_follower_timeseries', {
    p_author_id: userId,
    p_days: 30,
  });

  // Current follower count
  const { count: followerCount } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('following_id', userId);

  return (
    <div className="min-h-screen bg-gray-900 pt-32 pb-20">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-2">Views, engagement, and audience growth.</p>
        </div>

        <AnalyticsClient
          viewsByPost={viewsByPost}
          viewsLast30Days={(viewsLast30Days || []).map((r) => ({
            day: r.day,
            views: Number(r.views || 0),
          }))}
          heatmapDays={(heatmapDays || []).map((r) => ({
            day: r.day,
            views: Number(r.views || 0),
          }))}
          followerCountOverTime={(followerCountOverTime || []).map((r) => ({
            day: r.day,
            follower_count: Number(r.follower_count || 0),
          }))}
          topPosts={topPosts}
          totals={{
            totalViews: Number(totalViews || 0),
            totalLikes: Number(totalLikes || 0),
            totalComments: Number(totalComments || 0),
            followerCount: Number(followerCount || 0),
          }}
        />
      </div>
    </div>
  );
}
