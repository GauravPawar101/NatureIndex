import { getBlogPostBySlug } from '../../lib/blog';
import { incrementPostViews } from '../../lib/actions/posts';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import CommentsSection from './CommentSection';
import TableOfContents from '../../components/TableOfContents';
import PostMedia from '../../components/PostMedia';
import { getPostMedia, getPostVideo } from '../../lib/media';
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

    // Only fetched for posts that can actually have media. Both helpers degrade
    // to empty, so an unreachable media table leaves an article rendering
    // normally rather than failing the page.
    const [media, video] = post.content_type && post.content_type !== 'article'
        ? await Promise.all([getPostMedia(post.id), getPostVideo(post.id)])
        : [[], null];

    return (
        <article className="pb-16">
            {/* Medium's story page is a single 700px column. No breadcrumb, no
                table of contents in the margin, no reading-progress bar — the
                title, the byline, the actions, the cover, the body, in that
                order, and nothing else competing for attention. */}
            <div className="mx-auto max-w-[700px] px-5 pt-10">
                {post.topic && (
                    <Link
                        href={`/blog?topic=${encodeURIComponent(post.topic)}`}
                        className="eyebrow mb-3 inline-block hover:text-[var(--accent)]"
                    >
                        {post.topic}
                    </Link>
                )}

                <h1 className="display-1">{post.title}</h1>

                {/* Byline on the left, actions on the right — Medium's split.
                    The author is 20px bold sans with a 48px avatar above the
                    name, because that is how Medium renders the byline block. */}
                <div className="mt-8 flex items-start justify-between gap-6">
                    <div className="flex items-center gap-3">
                        {authorUsername && post.profiles?.avatar_url && (
                            <Link href={`/profile/${authorUsername}`} aria-label={authorName}>
                                <Image
                                    src={post.profiles.avatar_url}
                                    alt=""
                                    width={48}
                                    height={48}
                                    unoptimized
                                    className="h-12 w-12 rounded-full bg-[var(--surface-raised)] object-cover"
                                />
                            </Link>
                        )}

                        <div className="text-[14px] leading-[1.4]">
                            <div className="font-bold text-[var(--ink)]">
                                {authorUsername ? (
                                    <Link href={`/profile/${authorUsername}`} className="hover:underline">
                                        {authorName}
                                    </Link>
                                ) : (
                                    <span>{authorName}</span>
                                )}
                            </div>
                            <div className="text-[var(--ink-faint)]">
                                {formattedDate && <time dateTime={toISODate(post.date)}>{formattedDate}</time>}
                                {readingTime && (
                                    <>
                                        <span aria-hidden="true"> · </span>
                                        <span>{readingTime}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <ArticleActions postId={post.id} title={post.title} />
                </div>

                {/* The cover sits between the byline and the text, edge to edge
                    across the 700px column — not in a rounded frame with a
                    gradient over it, which is what the old layout did. */}
                {post.content_type === 'video' ? (
                    <div className="mt-8">
                        <PostMedia media={media} video={video} title={post.title} />
                    </div>
                ) : (
                    post.image_url && (
                        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden bg-[var(--surface-sunken)]">
                            <Image
                                src={post.image_url}
                                alt={post.title}
                                fill
                                sizes="(max-width: 720px) 100vw, 700px"
                                className="object-cover"
                                // Cover URLs are user-supplied at publish time, so they
                                // can point at any host. Without this, next/image
                                // throws on hosts missing from images.remotePatterns
                                // and takes the whole article page down with it.
                                unoptimized
                                priority
                            />
                        </div>
                    )
                )}

                {/* Photo posts get their gallery after the header. A video post
                    already rendered its player at the top, so it is not
                    repeated here. */}
                {post.content_type === 'photo' && media.length > 0 && (
                    <div className="mt-8">
                        <PostMedia media={media} title={post.title} />
                    </div>
                )}

                {headings.length > 2 && (
                    <div className="mt-8">
                        <TableOfContents headings={headings} variant="accordion" />
                    </div>
                )}

                {/* The body. 680px of 20px serif at 1.58, no card, no padding
                    box — Medium's text starts on the same left edge as the
                    title and ends on the same measure. */}
                <div id="article-body" className="measure mt-10">
                    <div className="prose-nature">
                        {post.content ? (
                            <ReactMarkdown components={markdownComponents}>{post.content}</ReactMarkdown>
                        ) : (
                            <p className="text-[var(--ink-muted)]">This post has no content yet.</p>
                        )}
                    </div>
                </div>

                <div className="measure mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4 text-[14px] text-[var(--ink-faint)]">
                    {post.topic && (
                        <Link
                            href={`/blog?topic=${encodeURIComponent(post.topic)}`}
                            className="pill"
                        >
                            {post.topic}
                        </Link>
                    )}
                    {Number(post.views) > 0 && (
                        <span>{formatCompactNumber(post.views)} views</span>
                    )}
                </div>

                <CommentsSection postId={post.id} initialComments={comments} />
            </div>

            <div className="mx-auto max-w-[1012px] px-5">
                <RecommendedPosts excludeSlug={post.slug} title="More from Nature Index" limit={3} />
            </div>
        </article>
    );
}
