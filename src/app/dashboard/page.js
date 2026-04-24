import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  try {
    const { client: supabase, userId } = await getAuthenticatedClient();
  } catch {
    redirect('/sign-in');
  }

  const { client: supabase, userId } = await getAuthenticatedClient();

  const { data: followingRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = (followingRows || []).map((r) => r.following_id).filter(Boolean);

  const { data: followingPosts } = followingIds.length
    ? await supabase
        .from('posts')
        .select('id,title,slug,date,profiles:profiles!posts_author_id_fkey(username)')
        .eq('status', 'published')
        .in('author_id', followingIds)
        .order('date', { ascending: false })
        .limit(30)
    : { data: [] };

  const { data: posts } = await supabase
    .from('posts')
    .select('id,title,slug,status,date')
    .eq('author_id', userId)
    .order('date', { ascending: false });

  const drafts = (posts || []).filter((p) => p.status === 'draft');
  const published = (posts || []).filter((p) => p.status === 'published');

  return (
    <div className="min-h-screen bg-gray-900 pt-32 pb-20">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-2">Manage drafts and published posts.</p>
          </div>
          <Link
            href="/create-post"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-white bg-teal-700 hover:bg-teal-800"
          >
            New Post
          </Link>
        </div>

        <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Following</h2>
          {!followingIds.length ? (
            <p className="text-gray-400">You aren&apos;t following any authors yet.</p>
          ) : !followingPosts?.length ? (
            <p className="text-gray-400">No new posts from authors you follow.</p>
          ) : (
            <ul className="space-y-3">
              {followingPosts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-200 font-semibold truncate">{post.title}</p>
                    <p className="text-gray-500 text-sm">
                      {post.profiles?.username ? `@${post.profiles.username} · ` : ''}
                      {post.date ? new Date(post.date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="shrink-0 px-3 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium"
                  >
                    Read
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4">Drafts</h2>
            {drafts.length === 0 ? (
              <p className="text-gray-400">No drafts yet.</p>
            ) : (
              <ul className="space-y-3">
                {drafts.map((post) => (
                  <li key={post.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-gray-200 font-semibold truncate">{post.title}</p>
                      <p className="text-gray-500 text-sm">Last saved: {new Date(post.date).toLocaleString()}</p>
                    </div>
                    <Link
                      href={`/dashboard/posts/${post.id}/edit`}
                      className="shrink-0 px-3 py-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-gray-900 text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4">Published</h2>
            {published.length === 0 ? (
              <p className="text-gray-400">No published posts yet.</p>
            ) : (
              <ul className="space-y-3">
                {published.map((post) => (
                  <li key={post.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-gray-200 font-semibold truncate">{post.title}</p>
                      <p className="text-gray-500 text-sm">Published: {new Date(post.date).toLocaleDateString()}</p>
                    </div>
                    <div className="shrink-0 flex gap-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="px-3 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium"
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/posts/${post.id}/edit`}
                        className="px-3 py-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-gray-900 text-sm font-medium"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
