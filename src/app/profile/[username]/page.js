import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default async function ProfilePage({ params }) {
  const supabase = createServerComponentClient({ cookies });
  const username = decodeURIComponent(params.username);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', profile.id)
    .order('date', { ascending: false });

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="container mx-auto max-w-4xl py-16 px-6">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
          <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200"></div>
            )}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-800">{profile.full_name || profile.username}</h1>
            <p className="text-gray-500">@{profile.username}</p>
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline mt-2 block">
                {profile.website}
              </a>
            )}
          </div>
        </div>

        {/* User's Posts */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Articles by {profile.username}</h2>
        <div className="space-y-4">
          {posts && posts.length > 0 ? (
            posts.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
                <div className="bg-white rounded-lg p-6 border border-gray-200 hover:border-teal-600 hover:shadow-md transition-all duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-teal-700">{post.title}</h3>
                    <p className="text-gray-600 text-sm">{post.excerpt}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-gray-500">This user hasn&apos;t published any articles yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}