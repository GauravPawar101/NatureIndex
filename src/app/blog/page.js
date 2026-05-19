import { getBlogPosts } from '../lib/blog';
import BlogList from './BlogList';
import PageHero from '../components/PageHero';

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="page-shell">
      <div className="container mx-auto px-6 max-w-5xl">
        <PageHero
          eyebrow="The Field Journal"
          title="Stories from the Frontlines"
          description="Conservation science, field discoveries, and community action — documented by researchers and stewards worldwide."
        />
        <div className="glass-card p-6 md:p-10">
          <BlogList posts={posts} />
        </div>
      </div>
    </div>
  );
}
