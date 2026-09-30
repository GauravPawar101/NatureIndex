import Link from 'next/link';
import Image from 'next/image';
import { getMostRead, getTrendingPosts } from './lib/stats';
import { getTopics } from './lib/posts';
import PostCard from './components/PostCard';
import EmptyState from './components/EmptyState';

const DEFAULT_AVATAR = '/images/default-avatar.svg';

export const metadata = {
  title: 'Nature Index — Conservation Science & Community',
  description:
    'An open platform for conservation science, field discoveries, and community action.',
};

/**
 * The front page, laid out the way Medium lays out its own: a 700px stream on
 * the left, a 48px gutter, and a 264px rail on the right. The rail is not an
 * afterthought — the two columns are why the page reads as a publication
 * rather than a blog index.
 */
export default async function HomePage() {
  const [featured, mostRead, topics] = await Promise.all([
    getTrendingPosts({ limit: 10, windowDays: 45 }),
    getMostRead({ limit: 3 }),
    getTopics(),
  ]);

  // "Who to follow" is derived from the stories already loaded rather than
  // from a second author query: the rail is a suggestion, and a suggestion
  // drawn from what the reader is already looking at is a better one.
  const authors = [];
  const seen = new Set();
  for (const post of featured) {
    const profile = post.profiles;
    if (!profile?.username || seen.has(profile.username)) continue;
    seen.add(profile.username);
    authors.push({
      username: profile.username,
      fullName: profile.full_name || profile.username,
      avatarUrl: profile.avatar_url,
    });
    if (authors.length === 3) break;
  }

  const nothingPublished = featured.length === 0;

  return (
    <div className="mx-auto flex max-w-[1012px] gap-12 px-5 pb-16 pt-10">
      <div className="stream">
        <h1 className="display-2 mb-2">Latest</h1>
        <p className="mb-2 text-[14px] text-[var(--ink-faint)]">
          Field reports from the people doing the work, published without a paywall.
        </p>

        {nothingPublished ? (
          <EmptyState
            title="Nothing published yet"
            description="Once a contributor publishes their first story it will appear here."
            action={
              <Link href="/create-post" className="btn btn-primary">
                Write the first story
              </Link>
            }
          />
        ) : (
          <div className="mt-4">
            {featured.map((post, index) => (
              <PostCard key={post.slug} post={post} variant={index === 0 ? 'lead' : 'row'} />
            ))}

            <div className="pt-6 text-center">
              <Link href="/blog" className="btn btn-secondary">
                See all stories
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* The rail. Medium's right column: a short recommendation list, then the
          topic index, then writers worth following — each separated by a 1px
          rule, never by a card. */}
      <aside className="rail hidden lg:block">
        {mostRead.length > 0 && (
          <section aria-labelledby="rail-recommended">
            <h2 id="rail-recommended" className="mb-4 border-b border-[var(--line)] pb-3 text-[14px] font-bold text-[var(--ink)]">
              Recommended for you
            </h2>
            <ul>
              {mostRead.map((post) => (
                <li key={post.slug} className="border-b border-[var(--line)] py-4 last:border-b-0">
                  <Link href={`/blog/${post.slug}`} className="block">
                    <span className="block text-[16px] font-bold leading-[1.3] text-[var(--ink)]">
                      {post.title}
                    </span>
                  </Link>
                  {post.profiles?.full_name && (
                    <span className="mt-2 block text-[13px] text-[var(--ink-faint)]">
                      {post.profiles.full_name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {topics.length > 0 && (
          <section aria-labelledby="rail-topics" className="mt-8">
            <h2 id="rail-topics" className="mb-4 border-b border-[var(--line)] pb-3 text-[14px] font-bold text-[var(--ink)]">
              Explore topics
            </h2>
            <ul className="flex flex-col gap-2">
              {topics.slice(0, 8).map(({ topic, count }) => (
                <li key={topic}>
                  <Link
                    href={`/blog?topic=${encodeURIComponent(topic)}`}
                    className="text-[14px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                  >
                    {topic}
                    <span className="ml-1 text-[var(--ink-faint)]">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {authors.length > 0 && (
          <section aria-labelledby="rail-authors" className="mt-8">
            <h2 id="rail-authors" className="mb-4 border-b border-[var(--line)] pb-3 text-[14px] font-bold text-[var(--ink)]">
              Who to follow
            </h2>
            <ul>
              {authors.map((author) => (
                <li key={author.username} className="flex items-center gap-3 border-b border-[var(--line)] py-4 last:border-b-0">
                  <Image
                    src={author.avatarUrl || DEFAULT_AVATAR}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-full bg-[var(--surface-raised)] object-cover"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${author.username}`}
                      className="block truncate text-[14px] font-medium text-[var(--ink)] hover:underline"
                    >
                      {author.fullName}
                    </Link>
                    <Link
                      href={`/blog?author=${encodeURIComponent(author.username)}`}
                      className="block truncate text-[13px] text-[var(--ink-faint)] hover:text-[var(--ink-muted)]"
                    >
                      Read their stories
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href="/leaderboards" className="mt-8 block text-[14px] text-[var(--ink-muted)] hover:text-[var(--ink)]">
          See the leaderboards →
        </Link>
      </aside>
    </div>
  );
}
