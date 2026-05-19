import { createClient } from '../../lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '../../components/PageHero';

export default async function ProfilePage({ params }) {
  const supabase = await createClient();
  if (!supabase) notFound();

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
    .eq('published', true)
    .order('date', { ascending: false });

  return (
    <div className="page-shell">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-16 glass-card p-8">
          <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/20 shrink-0">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10" />
            )}
          </div>
          <div className="text-center md:text-left">
            <span className="eyebrow mb-2">Contributor</span>
            <h1 className="text-4xl font-bold text-white">{profile.full_name || profile.username}</h1>
            <p className="text-gray-400 mt-1">@{profile.username}</p>
            {profile.bio && <p className="text-gray-300 mt-4 max-w-lg">{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="link-accent mt-3 inline-block text-sm">
                {profile.website}
              </a>
            )}
          </div>
        </div>

        <PageHero
          eyebrow="Published work"
          title={`Articles by ${profile.username}`}
        />

        <div className="space-y-4">
          {posts && posts.length > 0 ? (
            posts.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
                <article className="glass-card-hover p-6">
                  {post.topic && <span className="eyebrow text-[10px] mb-2">{post.topic}</span>}
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:underline underline-offset-4">{post.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{post.excerpt}</p>
                </article>
              </Link>
            ))
          ) : (
            <p className="text-gray-500 text-center py-12">This user hasn&apos;t published any articles yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
