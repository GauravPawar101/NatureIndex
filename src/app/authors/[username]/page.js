import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import FollowButton from '../../components/FollowButton';
import BookmarkButton from '../../components/BookmarkButton';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export default async function AuthorProfilePage({ params }) {
  const supabase = getSupabaseClient();
  if (!supabase) notFound();

  const username = decodeURIComponent(params.username);

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id,username,full_name,bio,avatar_url,twitter,website')
    .eq('username', username)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('id,slug,title,excerpt,image_url,cover_blur,date')
    .eq('status', 'published')
    .eq('author_id', profile.user_id)
    .order('date', { ascending: false });

  const displayName = profile.full_name || profile.username;

  const twitterUrl = profile.twitter
    ? profile.twitter.startsWith('http')
      ? profile.twitter
      : `https://twitter.com/${String(profile.twitter).replace(/^@/, '')}`
    : null;

  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-zinc-900 min-h-screen pt-24 pb-20">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white/10 shadow-lg bg-white/5">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-center md:justify-start">
              <div>
                <h1 className="text-4xl font-black text-white">{displayName}</h1>
                <p className="text-gray-400 mt-1">@{profile.username}</p>
              </div>
              <div className="md:ml-auto">
                <FollowButton followingId={profile.user_id} />
              </div>
            </div>

            {profile.bio && <p className="text-gray-300 mt-4 max-w-2xl">{profile.bio}</p>}

            <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-red-400 hover:underline"
                >
                  Website
                </a>
              )}
              {twitterUrl && (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-red-400 hover:underline"
                >
                  Twitter
                </a>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6">Published Posts</h2>

        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/30 shadow-xl hover:border-orange-500/30 transition-colors">
                  {post.image_url && (
                    <div className="relative w-full h-44">
                      <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                        placeholder={post.cover_blur ? 'blur' : 'empty'}
                        blurDataURL={post.cover_blur || undefined}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <BookmarkButton postId={post.id} className="px-2 py-1" size={16} />
                    </div>
                    {post.excerpt && <p className="text-gray-400 text-sm mt-2 line-clamp-3">{post.excerpt}</p>}
                    {post.date && (
                      <p className="text-gray-500 text-xs mt-4">
                        {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">This author hasn&apos;t published any posts yet.</p>
        )}
      </div>
    </div>
  );
}
