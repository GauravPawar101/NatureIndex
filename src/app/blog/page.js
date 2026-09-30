import { getRecommendedPosts } from '../lib/recommendations';
import { getAuthors, getTopics, searchPosts } from '../lib/posts';
import BlogList from './BlogList';
import RecommendedPosts from '../components/Recommendposts';
import PageHero from '../components/PageHero';

const PAGE_SIZE = 12;

export const metadata = {
    title: 'The Field Journal',
    description:
        'Conservation science, field discoveries, and community action — documented by researchers and stewards worldwide.',
};

/**
 * Search filters live in the URL, which means this page must render per
 * request. That is deliberate: it is what makes a search shareable, lets the
 * back button undo a filter, and lets the ranking happen in Postgres against
 * the full-text index instead of in the browser over one page of results.
 */
export default async function BlogPage({ searchParams }) {
    const params = await searchParams;

    const query = (typeof params?.q === 'string' ? params.q : '').slice(0, 200);
    const topic = (typeof params?.topic === 'string' ? params.topic : 'All').slice(0, 80);
    const author = (typeof params?.author === 'string' ? params.author : 'All').slice(0, 80);
    const sort = ['newest', 'oldest', 'popular'].includes(params?.sort) ? params.sort : 'newest';

    const hasFilters = Boolean(query) || topic !== 'All' || author !== 'All';

    let posts = [];
    let topics = [];
    let authors = [];
    let total = 0;
    let degraded = false;
    let failed = false;
    let reason = null;
    let semantic = false;

    // Every source is optional: a failure in one must not blank the page, so
    // they settle independently and the component decides what to show.
    const [postsResult, topicsResult, authorsResult, recsResult] = await Promise.allSettled([
        searchPosts({ query, topic, author, sort, limit: PAGE_SIZE }),
        getTopics(),
        getAuthors(),
        // Recommendations are unrelated to the current filters — showing the
        // top PageRank stories is useful regardless of what is being searched.
        getRecommendedPosts({ limit: 6 }),
    ]);

    if (postsResult.status === 'fulfilled') {
        posts = postsResult.value.posts ?? [];
        total = postsResult.value.total ?? posts.length;
        degraded = Boolean(postsResult.value.degraded);
        reason = postsResult.value.reason ?? null;
        semantic = Boolean(postsResult.value.semantic);
    } else {
        console.error('Blog search failed:', postsResult.reason);
    }

    // `searchPosts` swallows its own database errors and reports them as a
    // reason code, so a rejected promise is not the only failure signal. A
    // query/config failure means the catalogue is unknown, not empty — the
    // component must say so rather than render "no stories found".
    failed = reason === 'query' || reason === 'config';

    if (topicsResult.status === 'fulfilled') {
        topics = topicsResult.value ?? [];
    }

    if (authorsResult.status === 'fulfilled') {
        authors = authorsResult.value ?? [];
    } else {
        // Previously silent: the dropdown just came back empty, which reads as
        // "nobody has written anything" rather than "this lookup failed".
        console.error('Author list failed:', authorsResult.reason);
    }

    const recommendations = recsResult.status === 'fulfilled' ? recsResult.value ?? [] : [];

    return (
        <div className="page-shell">
            <div className="container-page">
                <PageHero
                    eyebrow="The Field Journal"
                    title="Stories from the Frontlines"
                    description="Conservation science, field discoveries, and community action — documented by researchers and stewards worldwide."
                />

                <div className="measure mb-12">
                    <BlogList
                        key={`${query}|${topic}|${author}|${sort}`}
                        initialPosts={posts}
                        topics={topics}
                        authors={authors}
                        initialTotal={total}
                        query={query}
                        topic={topic}
                        author={author}
                        sort={sort}
                        degraded={degraded}
                        failed={failed}
                        semantic={semantic}
                        hasFilters={hasFilters}
                        pageSize={PAGE_SIZE}
                    />
                </div>

                <RecommendedPosts initialPosts={recommendations} />
            </div>
        </div>
    );
}
