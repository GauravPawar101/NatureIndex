// Example: src/app/blog/[slug]/page.tsx
// This shows how to fetch data with proper auth checks and pass to client components

import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import CommentSection from './CommentSection'
import LikeButton from '@/app/components/LikeButton'
import BookmarkButton from '@/app/components/BookmarkButton'
import type { Metadata } from 'next'

interface PageProps {
  params: { slug: string }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const client = await createServerClient()

  const { data: post } = await client
    .from('posts')
    .select('title, summary, cover_image')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.title,
    description: post.summary || undefined,
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      images: post.cover_image ? [post.cover_image] : [],
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const client = await createServerClient()
  const { userId } = await auth()

  // Fetch post with author info
  const { data: post, error } = await client
    .from('posts')
    .select(`
      *,
      profiles:profiles!posts_author_id_fkey (
        user_id,
        username,
        avatar_url,
        bio
      )
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (error || !post) {
    notFound()
  }

  // Fetch tags
  const { data: postTags } = await client
    .from('post_tags')
    .select('tags(*)')
    .eq('post_id', post.id)

  const tags = postTags?.map(pt => (pt as any).tags).filter(Boolean) || []

  // Fetch like count
  const { count: likeCount } = await client
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post.id)

  // Fetch comment count
  const { count: commentCount } = await client
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post.id)

  // Fetch comments with author info
  const { data: comments } = await client
    .from('comments')
    .select(`
      *,
      profiles:profiles!comments_author_id_fkey (
        user_id,
        username,
        avatar_url
      )
    `)
    .eq('post_id', post.id)
    .order('created_at', { ascending: true })

  // Check if current user has liked/bookmarked (only if authenticated)
  let userLiked = false
  let userBookmarked = false

  if (userId) {
    const { data: like } = await client
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', post.id)
      .single()

    userLiked = !!like

    const { data: bookmark } = await client
      .from('bookmarks')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', post.id)
      .single()

    userBookmarked = !!bookmark
  }

  // Increment view count (fire and forget)
  client
    .from('posts')
    .update({ views: post.views + 1 })
    .eq('id', post.id)
    .then()

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      {post.cover_image && (
        <div className="relative h-96 w-full">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
        </div>
      )}

      {/* Content */}
      <article className="container mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-6">{post.title}</h1>

          {post.summary && (
            <p className="text-xl text-gray-400 mb-6">{post.summary}</p>
          )}

          {/* Author & Meta */}
          <div className="flex items-center gap-4 mb-6">
            {post.profiles?.avatar_url && (
              <img
                src={post.profiles.avatar_url}
                alt={post.profiles.username}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="text-white font-medium">
                {post.profiles?.username || 'Anonymous'}
              </p>
              <p className="text-gray-400 text-sm">
                {new Date(post.date).toLocaleDateString()} · {post.views} views
              </p>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag: any) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <LikeButton
              postId={post.id}
              initialLiked={userLiked}
              initialCount={likeCount || 0}
            />
            <BookmarkButton
              postId={post.id}
              initialBookmarked={userBookmarked}
            />
            <div className="flex items-center gap-2 text-gray-400">
              <span>{commentCount || 0} comments</span>
            </div>
          </div>
        </header>

        {/* Post Content */}
        <div
          className="prose prose-invert prose-lg max-w-none mb-16"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Comments */}
        <CommentSection
          postId={post.id}
          initialComments={comments || []}
        />
      </article>
    </div>
  )
}

// Generate static params for static generation (optional)
export async function generateStaticParams() {
  const client = await createServerClient()

  const { data: posts } = await client
    .from('posts')
    .select('slug')
    .eq('status', 'published')
    .limit(100)

  return (posts || []).map(post => ({
    slug: post.slug,
  }))
}

// Revalidate every hour
export const revalidate = 3600
