import { getTrendingPosts } from '../lib/stats';
import { searchPosts } from '../lib/posts';
import DiscoverFeed from './DiscoverFeed';
import PageHero from '../components/PageHero';
import EmptyState from '../components/EmptyState';
import { Flame } from 'lucide-react';

export const metadata = {
  title: 'Feed — Nature Index',
  description:
    'A continuous scroll through everything published on Nature Index, newest first, with the stories moving fastest right at the top.',
};

const PAGE_SIZE = 12;

/**
 * Continuous-scroll feed.
 *
 * The first page is server-rendered with the same trending ranking the
 * /discover shelf uses, so a reader arriving with a shared link sees the
 * editorial selection rather than a raw list. Subsequent pages append in
 * publication order, which is what a scrolling feed should do.
 *
 * The initial total is fetched with an exact count so the client knows whether
 * more exists; without it the feed cannot tell "end of list" from "not loaded
 * yet" and either loops or truncates.
 */
export default async function FeedPage() {
  const [trending, everything] = await Promise.all([
    getTrendingPosts({ limit: PAGE_SIZE }),
    searchPosts({ sort: 'newest', limit: PAGE_SIZE }),
  ]);

  const initialPosts = trending.length > 0 ? trending : everything.posts;
  const total = Math.max(everything.total, initialPosts.length);

  return (
    <div className="page-shell">
      <div className="container-page">
        <PageHero
          eyebrow="Feed"
          title="Everything, newest first"
          description="Keep scrolling. New field reports appear here as they are published."
        />

        {initialPosts.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="The feed is empty"
            description="Once a contributor publishes their first story it will appear here."
          />
        ) : (
          <DiscoverFeed
            initialPosts={initialPosts}
            pageSize={PAGE_SIZE}
            hasMore={initialPosts.length < total}
          />
        )}
      </div>
    </div>
  );
}
