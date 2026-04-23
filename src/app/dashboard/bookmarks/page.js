import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createSupabaseClerkServerClient } from '../../lib/supabaseClerkServer';
import BookmarkButton from '../../components/BookmarkButton';

export default async function BookmarksPage() {
  const { userId, supabase } = await createSupabaseClerkServerClient();

  if (!userId || !supabase) {
    redirect('/login');
  }

  const { data: rows, error } = await supabase
    .from('bookmarks')
    .select(
      [
        'created_at',
        'posts:posts(id,slug,title,excerpt,image_url,cover_blur,date,profiles:profiles!posts_author_id_fkey(username))',
      ].join(',')
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading bookmarks:', error);
  }

  const items = (rows || []).map((r) => r.posts).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-900 pt-32 pb-20">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-white">Bookmarks</h1>
            <p className="text-gray-400 mt-2">Your saved posts reading list.</p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-white bg-teal-700 hover:bg-teal-800"
          >
            Browse
          </Link>
        </div>

        {!items.length ? (
          <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30 shadow-xl">
            <p className="text-gray-400">No bookmarks yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((post) => (
              <div
                key={post.id}
                className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 shadow-xl overflow-hidden"
              >
                <div className="flex gap-4 p-6">
                  {post.image_url ? (
                    <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-gray-700/40 shrink-0">
                      <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                        placeholder={post.cover_blur ? 'blur' : 'empty'}
                        blurDataURL={post.cover_blur || undefined}
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/blog/${post.slug}`} className="block">
                          <h2 className="text-lg font-bold text-gray-100 hover:text-orange-400 transition-colors truncate">
                            {post.title}
                          </h2>
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {post.profiles?.username ? `@${post.profiles.username}` : 'Unknown Author'}
                          {post.date ? ` • ${new Date(post.date).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <BookmarkButton postId={post.id} className="px-2 py-1" size={18} />
                    </div>

                    {post.excerpt ? (
                      <p className="text-gray-400 text-sm mt-3 line-clamp-2">{post.excerpt}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
