import { getBlogPostBySlug, getPublishedPostSlugs, getRelatedPosts } from '../../lib/blog';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import sanitizeHtml from 'sanitize-html';
import CommentsSection from './CommentSection';
import { formatReadingTimeFromHtml } from '../../lib/readingTime';
import { injectHeadingIdsAndBuildToc } from '../../lib/toc';
import TableOfContents from './TableOfContents';
import LikeButton from '../../components/LikeButton';
import BookmarkButton from '../../components/BookmarkButton';
import { getReactionCountByPostId } from '../../lib/reactions';
import RelatedPosts from './RelatedPosts';
import HtmlContent from '../../components/HtmlContent';
import PostViewTracker from '../../components/PostViewTracker';
import { unstable_cache } from 'next/cache';
import { highlightHtmlWithShiki } from '../../lib/rehypeShiki';
import CodeCopyButtons from '../../components/CodeCopyButtons';

export const revalidate = 60;

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return raw;

  // Vercel provides the hostname without protocol.
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return null;
}

function decodeBasicEntities(text) {
  return text
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function htmlToPlainText(html) {
  if (!html) return '';
  // Remove tags, collapse whitespace, and decode a few common HTML entities.
  const stripped = String(html).replace(/<[^>]*>/g, ' ');
  return decodeBasicEntities(stripped).replace(/\s+/g, ' ').trim();
}

const getBlogPostBySlugCached = unstable_cache(
  async (slug) => getBlogPostBySlug(slug),
  ['blog-post-by-slug'],
  { revalidate: 60 }
);

const getReactionCountByPostIdCached = unstable_cache(
  async (postId) => getReactionCountByPostId(postId),
  ['reaction-count-by-post-id'],
  { revalidate: 60 }
);

const getRelatedPostsCached = unstable_cache(
  async (postId, limit) => getRelatedPosts(postId, limit),
  ['related-posts-by-post-id'],
  { revalidate: 60 }
);

export async function generateStaticParams() {
  const slugs = await getPublishedPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const post = await getBlogPostBySlugCached(params.slug);
  if (!post) return {};

  const title = post.title;
  const plainText = htmlToPlainText(post.content);
  const descriptionSource = plainText || post.excerpt || '';
  const description = (descriptionSource || 'Read the latest on Nature Index.').slice(0, 160);

  const siteUrl = getSiteUrl();
  const canonicalPath = `/blog/${params.slug}`;
  const canonicalUrl = siteUrl ? new URL(canonicalPath, siteUrl).toString() : canonicalPath;

  const coverImageUrl = post.image_url || null;
  const fallbackOgImage = `/blog/${params.slug}/opengraph-image`;
  const ogImage = coverImageUrl || fallbackOgImage;

  const publishedDate = post.date || post.created_at;
  const publishedTime = publishedDate ? new Date(publishedDate).toISOString() : undefined;

  let metadataBase;
  try {
    if (siteUrl) metadataBase = new URL(siteUrl);
  } catch {
    metadataBase = undefined;
  }

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalUrl,
      ...(publishedTime ? { publishedTime } : {}),
      images: [
        coverImageUrl
          ? {
              url: coverImageUrl,
              alt: title,
            }
          : {
              url: fallbackOgImage,
              width: 1200,
              height: 630,
              alt: title,
            },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const post = await getBlogPostBySlugCached(params.slug);

  if (!post) {
    notFound();
  }

  const { html: htmlWithAnchors, toc } = injectHeadingIdsAndBuildToc(post.content || '');

  // 1) Sanitize user content first (keeps code language classes for highlighting).
  const sanitizedHtml = sanitizeHtml(htmlWithAnchors, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'h1',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'img',
      'a',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      pre: ['class'],
      code: ['class'],
      h1: ['id'],
      h2: ['id'],
      h3: ['id'],
    },
    allowedSchemes: ['http', 'https'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });

  // 2) Apply Shiki syntax highlighting to all code blocks.
  const highlightedHtml = await highlightHtmlWithShiki(sanitizedHtml);

  const readingTimeLabel = formatReadingTimeFromHtml(post.content);
  const initialLikeCount = await getReactionCountByPostIdCached(post.id);
  const relatedPosts = await getRelatedPostsCached(post.id, 3);
  const coverBlurDataUrl = post.cover_blur || undefined;

  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-zinc-900 min-h-screen pt-24 pb-20">
      <div className="container mx-auto max-w-6xl px-6">
        <PostViewTracker postId={post.id} />
        
        {post.image_url && (
          <div className="relative w-full h-80 mb-8 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 hover:border-orange-500/30 transition-colors">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
              placeholder={coverBlurDataUrl ? 'blur' : 'empty'}
              blurDataURL={coverBlurDataUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        )}

        <h1 className="text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-400 to-red-500 mb-6 leading-tight">
          {post.title}
        </h1>
        
        <div className="flex items-center gap-2 mb-8 text-gray-400">
          <span>By</span>
          <Link 
            href={`/authors/${post.profiles?.username || 'user'}`} 
            className="font-semibold text-orange-400 hover:text-red-400 hover:underline transition-colors"
          >
            {post.profiles?.username || 'Unknown Author'}
          </Link>
          <span className="text-gray-600">•</span>
          <span className="text-gray-500">
            {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-300">{readingTimeLabel}</span>
          <span className="text-gray-600">•</span>
          <LikeButton postId={post.id} initialCount={initialLikeCount} />
          <BookmarkButton postId={post.id} className="px-2 py-1" size={18} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30 shadow-xl">
            <div className="post-content prose prose-lg max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-a:text-orange-400 prose-a:no-underline hover:prose-a:text-red-400 prose-strong:text-gray-100 prose-code:text-yellow-400 prose-code:bg-black/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/70 prose-pre:border prose-pre:border-gray-600 prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-500/10 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:rounded-r prose-li:text-gray-300 prose-ul:marker:text-orange-400 prose-ol:marker:text-orange-400">
              <HtmlContent html={highlightedHtml} />
              <CodeCopyButtons />
            </div>
            <CommentsSection postId={post.id}/>
          </div>

          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-28 bg-zinc-800/40 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/30 shadow-xl">
                <TableOfContents toc={toc} />
              </div>
            </aside>
          )}
        </div>

        <RelatedPosts posts={relatedPosts} />
        
      </div>
    </div>
  );
}