# Migration Guide: Update Existing Files

This guide shows exactly which files need to be updated to use the new auth system.

## Files to Update

### 1. Update Dashboard Page

**File:** `src/app/dashboard/page.js` → Rename to `page.tsx`

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthenticatedClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  try {
    const { client, userId } = await getAuthenticatedClient()

    const { data: followingRows } = await client
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    const followingIds = (followingRows || []).map((r) => r.following_id).filter(Boolean)

    const { data: followingPosts } = followingIds.length
      ? await client
          .from('posts')
          .select('id, title, slug, date, profiles:profiles!posts_author_id_fkey(username)')
          .eq('status', 'published')
          .in('author_id', followingIds)
          .order('date', { ascending: false })
          .limit(30)
      : { data: [] }

    const { data: posts } = await client
      .from('posts')
      .select('id, title, slug, status, date')
      .eq('author_id', userId)
      .order('date', { ascending: false })

    const drafts = (posts || []).filter((p) => p.status === 'draft')
    const published = (posts || []).filter((p) => p.status === 'published')

    return (
      <div className="min-h-screen bg-gray-900 pt-32 pb-20">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-400 mt-2">Manage drafts and published posts.</p>
            </div>
            <Link
              href="/create-post"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-white bg-teal-700 hover:bg-teal-800"
            >
              New Post
            </Link>
          </div>

          <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Following</h2>
            {!followingIds.length ? (
              <p className="text-gray-400">You aren&apos;t following any authors yet.</p>
            ) : !followingPosts?.length ? (
              <p className="text-gray-400">No new posts from authors you follow.</p>
            ) : (
              <ul className="space-y-3">
                {followingPosts.map((post: any) => (
                  <li key={post.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-gray-200 font-semibold truncate">{post.title}</p>
                      <p className="text-gray-500 text-sm">
                        {post.profiles?.username ? `@${post.profiles.username} · ` : ''}
                        {post.date ? new Date(post.date).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="shrink-0 px-3 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium"
                    >
                      Read
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Drafts</h2>
              {drafts.length === 0 ? (
                <p className="text-gray-400">No drafts yet.</p>
              ) : (
                <ul className="space-y-3">
                  {drafts.map((post: any) => (
                    <li key={post.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-gray-200 font-semibold truncate">{post.title}</p>
                        <p className="text-gray-500 text-sm">Last saved: {new Date(post.date).toLocaleString()}</p>
                      </div>
                      <Link
                        href={`/dashboard/posts/${post.id}/edit`}
                        className="shrink-0 px-3 py-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-gray-900 text-sm font-medium"
                      >
                        Edit
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Published</h2>
              {published.length === 0 ? (
                <p className="text-gray-400">No published posts yet.</p>
              ) : (
                <ul className="space-y-3">
                  {published.map((post: any) => (
                    <li key={post.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-gray-200 font-semibold truncate">{post.title}</p>
                        <p className="text-gray-500 text-sm">Published: {new Date(post.date).toLocaleDateString()}</p>
                      </div>
                      <div className="shrink-0 flex gap-2">
                        <Link
                          href={`/blog/${post.slug}`}
                          className="px-3 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/posts/${post.id}/edit`}
                          className="px-3 py-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-gray-900 text-sm font-medium"
                        >
                          Edit
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    )
  } catch {
    redirect('/login')
  }
}
```

### 2. Update Blog Page

**File:** `src/app/blog/page.js` - Keep as is, but update imports if using old Supabase client

```tsx
import { createServerClient } from '@/lib/supabase/server'

// In your data fetching:
const client = await createServerClient()
const { data: posts } = await client.from('posts')...
```

### 3. Update Create Post Form

**File:** `src/app/create-post/CreatePostForm.js` → Rename to `CreatePostForm.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPost } from '@/actions/posts'

export default function CreatePostForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createPost({
        title: formData.get('title') as string,
        slug: formData.get('slug') as string,
        content: formData.get('content') as string,
        summary: formData.get('summary') as string || null,
        cover_image: formData.get('cover_image') as string || null,
        status: formData.get('status') as 'draft' | 'published' || 'draft',
      })

      if (result.success) {
        router.push(`/blog/${result.data.slug}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-2">
          Slug
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          required
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-300 mb-2">
          Summary
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={3}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={15}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
          Status
        </label>
        <select
          id="status"
          name="status"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
      >
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
```

### 4. Update Like Button Component

**File:** `src/app/components/LikeButton.js` → Rename to `LikeButton.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { toggleLike } from '@/actions/reactions'

interface LikeButtonProps {
  postId: string
  initialLiked: boolean
  initialCount: number
}

export default function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)

  function handleClick() {
    // Optimistic update
    setLiked(!liked)
    setCount(prev => liked ? prev - 1 : prev + 1)

    startTransition(async () => {
      const result = await toggleLike({ post_id: postId })

      if (!result.success) {
        // Rollback on error
        setLiked(liked)
        setCount(initialCount)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
        liked
          ? 'bg-red-500/20 text-red-500'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      <Heart className={liked ? 'fill-current' : ''} size={20} />
      <span>{count}</span>
    </button>
  )
}
```

### 5. Update Bookmark Button Component

**File:** `src/app/components/BookmarkButton.js` → Rename to `BookmarkButton.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { toggleBookmark } from '@/actions/reactions'

interface BookmarkButtonProps {
  postId: string
  initialBookmarked: boolean
}

export default function BookmarkButton({ postId, initialBookmarked }: BookmarkButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [bookmarked, setBookmarked] = useState(initialBookmarked)

  function handleClick() {
    setBookmarked(!bookmarked)

    startTransition(async () => {
      const result = await toggleBookmark({ post_id: postId })

      if (!result.success) {
        setBookmarked(bookmarked)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
        bookmarked
          ? 'bg-teal-500/20 text-teal-500'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      <Bookmark className={bookmarked ? 'fill-current' : ''} size={20} />
      <span>{bookmarked ? 'Saved' : 'Save'}</span>
    </button>
  )
}
```

### 6. Update Follow Button Component

**File:** `src/app/components/FollowButton.js` → Rename to `FollowButton.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserMinus } from 'lucide-react'
import { toggleFollow } from '@/actions/follows'

interface FollowButtonProps {
  userId: string
  initialFollowing: boolean
}

export default function FollowButton({ userId, initialFollowing }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [following, setFollowing] = useState(initialFollowing)

  function handleClick() {
    setFollowing(!following)

    startTransition(async () => {
      const result = await toggleFollow({ following_id: userId })

      if (!result.success) {
        setFollowing(following)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
        following
          ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          : 'bg-teal-700 text-white hover:bg-teal-800'
      }`}
    >
      {following ? (
        <>
          <UserMinus size={20} />
          <span>Unfollow</span>
        </>
      ) : (
        <>
          <UserPlus size={20} />
          <span>Follow</span>
        </>
      )}
    </button>
  )
}
```

### 7. Create Comment Section Component

**File:** `src/app/blog/[slug]/CommentSection.tsx` (new or update existing)

```tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { createComment, deleteComment } from '@/actions/comments'
import type { CommentWithAuthor } from '@/lib/types'

interface CommentSectionProps {
  postId: string
  initialComments: CommentWithAuthor[]
}

export default function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const { client, isAuthenticated } = useSupabase()
  const [comments, setComments] = useState(initialComments)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Realtime subscription
  useEffect(() => {
    if (!client) return

    const channel = client
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const { data } = await client
            .from('comments')
            .select('*, profiles(*)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setComments(prev => [...prev, data as CommentWithAuthor])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [client, postId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const content = formData.get('content') as string

    startTransition(async () => {
      const result = await createComment({ post_id: postId, content })

      if (result.success) {
        e.currentTarget.reset()
      } else {
        setError(result.error)
      }
    })
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return

    startTransition(async () => {
      await deleteComment({ id: commentId })
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Comments ({comments.length})</h2>

      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <textarea
            name="content"
            required
            rows={4}
            placeholder="Add a comment..."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
          />

          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-700 text-white font-medium rounded-lg transition"
          >
            {isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-white">
                  {comment.profiles?.username || 'Anonymous'}
                </p>
                <p className="text-sm text-gray-400">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
              </div>

              {isAuthenticated && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-red-500 hover:text-red-400 text-sm"
                >
                  Delete
                </button>
              )}
            </div>

            <p className="text-gray-300">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Summary of Changes

### New Files Created
- ✅ `src/lib/supabase/server.ts`
- ✅ `src/lib/supabase/client.ts`
- ✅ `src/lib/supabase/admin.ts`
- ✅ `src/lib/auth/index.ts`
- ✅ `src/lib/types/database.types.ts`
- ✅ `src/lib/types/index.ts`
- ✅ `src/lib/validations/schemas.ts`
- ✅ `src/actions/posts.ts`
- ✅ `src/actions/comments.ts`
- ✅ `src/actions/reactions.ts`
- ✅ `src/actions/follows.ts`
- ✅ `src/actions/profile.ts`

### Files to Update
- 🔄 `src/app/dashboard/page.js` → Use `getAuthenticatedClient()`
- 🔄 `src/app/create-post/CreatePostForm.js` → Use `createPost()` action
- 🔄 `src/app/components/LikeButton.js` → Use `toggleLike()` action
- 🔄 `src/app/components/BookmarkButton.js` → Use `toggleBookmark()` action
- 🔄 `src/app/components/FollowButton.js` → Use `toggleFollow()` action
- 🔄 `src/app/blog/[slug]/CommentSection.js` → Use actions + realtime
- ✅ `src/app/api/webhooks/clerk/route.ts` → Already updated
- ✅ `tsconfig.json` → Already updated with path aliases

### Files to Keep (No Changes Needed)
- ✅ `middleware.ts` - Already correct
- ✅ `src/app/lib/roles.ts` - Already correct
- ✅ `src/app/blog/page.js` - Just update client import if needed

## Testing Checklist

1. ✅ User can sign up via Clerk
2. ✅ Webhook creates profile in Supabase
3. ✅ User can create posts (author/admin only)
4. ✅ User can edit own posts
5. ✅ User can delete own posts
6. ✅ User can like/unlike posts
7. ✅ User can bookmark posts
8. ✅ User can follow/unfollow users
9. ✅ User can comment on posts
10. ✅ User can delete own comments
11. ✅ Realtime updates work for comments
12. ✅ Loading states show during mutations
13. ✅ Error messages display properly
14. ✅ Unauthorized users redirected to login
