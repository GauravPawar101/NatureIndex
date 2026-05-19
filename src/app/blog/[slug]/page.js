import { getBlogPostBySlug } from '../../lib/blog';
import { incrementPostViews } from '../../lib/actions/posts';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import CommentsSection from './CommentSection';

export default async function BlogPostPage({ params }) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  await incrementPostViews(post.id);

  return (
    <article className="page-shell">
      <div className="container mx-auto max-w-3xl px-6">
        {post.image_url && (
          <div className="relative w-full h-72 md:h-80 mb-8 rounded-2xl overflow-hidden border border-white/20">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {post.topic && <span className="eyebrow mb-4">{post.topic}</span>}

        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 mb-10 text-sm text-gray-400">
          <span>By</span>
          <Link href={`/profile/${post.profiles?.username || 'user'}`} className="link-accent">
            {post.profiles?.username || 'Unknown Author'}
          </Link>
          <span className="text-gray-600">•</span>
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
        </div>

        <div className="glass-card p-6 md:p-8 mb-12">
          <div className="prose-nature">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </div>

        <CommentsSection postId={post.id} />
      </div>
    </article>
  );
}
