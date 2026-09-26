import { getBlogPostBySlug } from '../../lib/blog';
import { incrementPostViews } from '../../lib/actions/posts';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import CommentsSection from './CommentSection';
import TableOfContents from '../../components/TableOfContents';
import ReadingProgress from '../../components/ReadingProgress';
import ArticleActions from '../../components/ArticleActions';
import RecommendedPosts from '../../components/Recommendposts';
import { extractHeadings, slugifyHeading } from '../../lib/headings';
import { formatCompactNumber, formatDate, formatReadingTime, toISODate } from '../../lib/format';

export const revalidate = 60;

/**
 * Heading renderers that stamp each heading with the id the table of contents
 * links to.
 *
 * The id is resolved by *source line number* rather than by an incrementing
 * counter: a counter would depend on render order, which breaks when React
 * double-invokes a render or retries a suspended one, silently producing
 * mismatched anchors. Line numbers are stable across any number of renders.
 */
function buildMarkdownComponents(idByLine) {
    const withId = (Tag) => {
        const Heading = ({ node, children, ...props }) => {
            const line = node?.position?.start?.line;
            const id = (line !== undefined && idByLine.get(line)) || slugifyHeading(flattenChildren(children));

            return (
                <Tag id={id} {...props}>
                    {children}
                </Tag>
            );
        };

        // Without this, React logs "Component definition is missing display
        // name" for every heading in dev, drowning out real warnings.
        Heading.displayName = `Markdown(${Tag})`;
        return Heading;
    };

    return {
        h1: withId('h1'),
        h2: withId('h2'),
        h3: withId('h3'),
        h4: withId('h4'),
        h5: withId('h5'),
        h6: withId('h6'),
    };
}

/** Best-effort plain text of a React node, for the slug fallback. */
function flattenChildren(children) {
    if (children === null || children === undefined || typeof children === 'boolean') return '';
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(flattenChildren).join('');
    if (children.props?.children) return flattenChildren(children.props.children);
    return '';
}

/**
 * Next.js 15 passes `params` (and `searchParams`) as a Promise, so it must
 * be awaited before its properties are read. Awaiting a plain object (as
 * older Next.js versions used to pass) also works fine, so this is safe on
 * both 14 and 15.
 */
async function resolvePost(paramsPromise) {
    const { slug } = await paramsPromise;
    if (!slug) return null;
    return getBlogPostBySlug(slug);
}

export async function generateMetadata({ params }) {
    const post = await resolvePost(params);

    if (!post) {
        return { title: 'Post not found' };
    }

    const description = post.excerpt || post.content?.replace(/[#*_`>[\]()]/g, '').slice(0, 160);

    return {
        title: post.title,
        description,
        openGraph: {
            type: 'article',
            title: post.title,
            description,
            images: post.image_url ? [{ url: post.image_url }] : undefined,
            publishedTime: post.date,
            authors: post.profiles?.username ? [`/profile/${post.profiles.username}`] : undefined,
        },
    };
}

export default async function BlogPostPage({ params }) {
    const post = await resolvePost(params);

    if (!post) {
        notFound();
    }

    // View counts are a side effect, not something the page depends on to
    // render. If this write fails (network blip, RLS rule, etc.) the reader
    // should still see the article rather than getting a crashed page.
    try {
        await incrementPostViews(post.id);
    } catch (error) {
        console.error(`Failed to increment views for post ${post.id}:`, error);
    }

    const authorUsername = post.profiles?.username;
    const authorName = post.profiles?.full_name || authorUsername || 'Unknown author';
    const formattedDate = formatDate(post.date);
    const readingTime = formatReadingTime(post.content);
    const headings = extractHeadings(post.content, { maxLevel: 3 });
    const markdownComponents = buildMarkdownComponents(new Map(headings.map((h) => [h.line, h.id])));
    const comments = Array.isArray(post.comments) ? post.comments : [];

    return (
        <article className="page-shell">
            <ReadingProgress />

            <div className="container mx-auto max-w-6xl px-6">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0 max-w-3xl">
                        <nav aria-label="Breadcrumb" className="mb-6">
                            <ol className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <li>
                                    <Link href="/" className="transition-colors hover:text-white">Home</Link>
                                </li>
                                <li aria-hidden="true">/</li>
                                <li>
                                    <Link href="/blog" className="transition-colors hover:text-white">Field Journal</Link>
                                </li>
                                {post.topic && (
                                    <>
                                        <li aria-hidden="true">/</li>
                                        <li>
                                            <Link
                                                href={`/blog?topic=${encodeURIComponent(post.topic)}`}
                                                className="transition-colors hover:text-white"
                                            >
                                                {post.topic}
                                            </Link>
                                        </li>
                                    </>
                                )}
                            </ol>
                        </nav>

                        {post.image_url && (
                            <div className="relative mb-8 h-64 w-full overflow-hidden rounded-2xl border border-white/20 md:h-80">
                                <Image
                                    src={post.image_url}
                                    alt={post.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 768px"
                                    className="object-cover"
                                    // Cover URLs are user-supplied at publish time, so they
                                    // can point at any host. Without this, next/image
                                    // throws on hosts missing from images.remotePatterns
                                    // and takes the whole article page down with it.
                                    unoptimized
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            </div>
                        )}

                        {post.topic && (
                            <Link href={`/blog?topic=${encodeURIComponent(post.topic)}`} className="eyebrow mb-4 inline-block hover:text-white">
                                {post.topic}
                            </Link>
                        )}

                        <h1 className="mb-6 break-words text-4xl font-bold leading-tight text-white lg:text-5xl">
                            {post.title}
                        </h1>

                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                                <span>By</span>
                                {authorUsername ? (
                                    <Link href={`/profile/${authorUsername}`} className="link-accent">
                                        {authorName}
                                    </Link>
                                ) : (
                                    <span>{authorName}</span>
                                )}
                                {formattedDate && (
                                    <>
                                        <span className="text-gray-600" aria-hidden="true">•</span>
                                        <time dateTime={toISODate(post.date)}>{formattedDate}</time>
                                    </>
                                )}
                                {readingTime && (
                                    <>
                                        <span className="text-gray-600" aria-hidden="true">•</span>
                                        <span>{readingTime}</span>
                                    </>
                                )}
                                {Number(post.views) > 0 && (
                                    <>
                                        <span className="text-gray-600" aria-hidden="true">•</span>
                                        <span>{formatCompactNumber(post.views)} views</span>
                                    </>
                                )}
                            </div>

                            <ArticleActions postId={post.id} title={post.title} />
                        </div>

                        <TableOfContents headings={headings} variant="accordion" />

                        {/* Comments are already nested by CommentSection, so a flat
                            <ReactMarkdown> here would render nothing for them —
                            instead make the article body markdown fully styled. */}
                        <div id="article-body" className="glass-card mb-12 p-6 md:p-8">
                            <div className="prose-nature">
                                {post.content ? (
                                    <ReactMarkdown components={markdownComponents}>{post.content}</ReactMarkdown>
                                ) : (
                                    <p className="text-gray-400">This post has no content yet.</p>
                                )}
                            </div>
                        </div>

                        <CommentsSection postId={post.id} initialComments={comments} />
                    </div>

                    {/* Only the desktop sidebar lives here; the mobile TOC is
                        rendered inline above the article, so the list and its
                        scroll-spy are never duplicated. */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pb-8">
                            <TableOfContents headings={headings} variant="sidebar" />
                        </div>
                    </aside>
                </div>

                <RecommendedPosts
                    excludeSlug={post.slug}
                    title="Related reading"
                    limit={3}
                />
            </div>
        </article>
    );
}
