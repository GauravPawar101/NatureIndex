# Auth & Data Flow Setup Guide

This document explains the complete auth setup with Clerk + Supabase and how to use Server Actions.

## Architecture Overview

### Authentication Flow
1. User signs in via Clerk
2. Clerk webhook syncs user to Supabase `profiles` table
3. Clerk JWT template includes user ID as `sub` claim
4. Server/Client get Supabase token from Clerk
5. Supabase RLS policies verify `auth.jwt()->>'sub' = user_id`

### File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── server.ts          # Typed server client
│   │   ├── client.ts          # Typed browser client hook
│   │   └── admin.ts           # Service role client
│   ├── auth/
│   │   ├── index.ts           # Auth utilities (requireAuth, requireRole)
│   │   └── roles.ts           # Role helpers
│   ├── validations/
│   │   └── schemas.ts         # Zod validation schemas
│   └── types/
│       ├── database.types.ts  # Supabase generated types
│       └── index.ts           # App-level types
├── actions/
│   ├── posts.ts               # Post mutations
│   ├── comments.ts            # Comment mutations
│   ├── reactions.ts           # Like/bookmark mutations
│   ├── follows.ts             # Follow mutations
│   └── profile.ts             # Profile mutations
```

## Environment Variables

Required in `.env.local` and Vercel:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # For webhooks only
```

## Server Components (Data Fetching)

Use `createServerClient()` for public data or `getAuthenticatedClient()` for protected data:

```tsx
// app/blog/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function BlogPage() {
  const client = await createServerClient()
  
  const { data: posts } = await client
    .from('posts')
    .select('*, profiles(*)')
    .eq('status', 'published')
    .order('date', { ascending: false })
  
  return <PostList posts={posts} />
}
```

```tsx
// app/dashboard/page.tsx
import { getAuthenticatedClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  try {
    const { client, userId } = await getAuthenticatedClient()
    
    const { data: posts } = await client
      .from('posts')
      .select('*')
      .eq('author_id', userId)
    
    return <Dashboard posts={posts} />
  } catch {
    redirect('/login')
  }
}
```

## Server Actions (Mutations)

All mutations use Server Actions with:
- Auth verification via `requireAuth()` or `requireRole()`
- Zod validation
- Typed Supabase client
- Error handling
- Path revalidation

### Example: Create Post

```tsx
// app/create-post/CreatePostForm.tsx
'use client'

import { useTransition } from 'react'
import { createPost } from '@/actions/posts'

export function CreatePostForm() {
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
        summary: formData.get('summary') as string,
        status: 'draft',
      })
      
      if (result.success) {
        // Redirect or show success
        window.location.href = `/blog/${result.data.slug}`
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input name="title" required />
      <input name="slug" required />
      <textarea name="content" required />
      <textarea name="summary" />
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
```

### Example: Toggle Like

```tsx
// components/LikeButton.tsx
'use client'

import { useTransition } from 'react'
import { toggleLike } from '@/actions/reactions'

export function LikeButton({ postId, initialLiked }: { postId: string; initialLiked: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [liked, setLiked] = useState(initialLiked)

  function handleClick() {
    startTransition(async () => {
      const result = await toggleLike({ post_id: postId })
      
      if (result.success) {
        setLiked(result.data.liked)
      }
    })
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {liked ? '❤️' : '🤍'} {isPending && '...'}
    </button>
  )
}
```

## Client Components (Realtime)

Use `useSupabase()` hook for realtime subscriptions:

```tsx
// components/CommentList.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import type { CommentWithAuthor } from '@/lib/types'

export function CommentList({ postId, initialComments }: { 
  postId: string
  initialComments: CommentWithAuthor[] 
}) {
  const { client, isAuthenticated } = useSupabase()
  const [comments, setComments] = useState(initialComments)

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
          // Fetch full comment with author
          const { data } = await client
            .from('comments')
            .select('*, profiles(*)')
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            setComments(prev => [...prev, data])
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [client, postId])

  return (
    <div>
      {comments.map(comment => (
        <Comment key={comment.id} comment={comment} />
      ))}
    </div>
  )
}
```

## Available Server Actions

### Posts (`src/actions/posts.ts`)
- `createPost(input)` - Create new post (author/admin only)
- `updatePost(input)` - Update post (owner only)
- `deletePost(input)` - Delete post (owner only)

### Comments (`src/actions/comments.ts`)
- `createComment(input)` - Add comment (authenticated)
- `deleteComment(input)` - Delete comment (owner only)

### Reactions (`src/actions/reactions.ts`)
- `toggleLike(input)` - Like/unlike post
- `toggleBookmark(input)` - Bookmark/unbookmark post

### Follows (`src/actions/follows.ts`)
- `toggleFollow(input)` - Follow/unfollow user

### Profile (`src/actions/profile.ts`)
- `updateProfile(input)` - Update user profile

## Role-Based Access

Roles are stored in Clerk's `publicMetadata.role` and enforced in:
1. Middleware (`middleware.ts`) - Route protection
2. Server Actions - Operation protection

```tsx
// Require specific roles
import { requireRole } from '@/lib/auth'

export async function adminOnlyAction() {
  const { userId, role } = await requireRole(['admin'])
  // Only admins can reach here
}

export async function authorAction() {
  const { userId, role } = await requireRole(['admin', 'author'])
  // Admins and authors can reach here
}
```

## Error Handling

All actions return a discriminated union:

```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }
```

Always check `result.success` before accessing `result.data`:

```tsx
const result = await createPost(input)

if (result.success) {
  console.log('Created:', result.data.id)
} else {
  console.error('Error:', result.error)
}
```

## Loading & Error States

Use React's `useTransition` for pending states:

```tsx
const [isPending, startTransition] = useTransition()

startTransition(async () => {
  const result = await someAction(input)
  // Handle result
})

return <button disabled={isPending}>Submit</button>
```

## Type Safety

All Supabase queries are fully typed:

```tsx
const { client } = await getAuthenticatedClient()

// ✅ TypeScript knows the shape
const { data } = await client
  .from('posts')
  .select('id, title, profiles(username)')
  
// data is typed as:
// Array<{
//   id: string
//   title: string
//   profiles: { username: string } | null
// }>
```

## Regenerating Types

When you change your Supabase schema:

```bash
npm run supabase:types
```

This updates `src/lib/types/database.types.ts`.

## Testing Auth Locally

1. Start Clerk dev mode: User signs in
2. Webhook fires to `/api/webhooks/clerk`
3. Profile created in Supabase
4. User can now create posts, comments, etc.

## Common Patterns

### Protected Page
```tsx
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  try {
    const userId = await requireAuth()
    // Render page
  } catch {
    redirect('/login')
  }
}
```

### Optimistic Updates
```tsx
const [likes, setLikes] = useState(initialLikes)

function handleLike() {
  setLikes(prev => prev + 1) // Optimistic
  
  startTransition(async () => {
    const result = await toggleLike({ post_id })
    if (!result.success) {
      setLikes(prev => prev - 1) // Rollback
    }
  })
}
```

### Form Validation
```tsx
import { createPostSchema } from '@/lib/validations/schemas'

function validateForm(formData: FormData) {
  const result = createPostSchema.safeParse({
    title: formData.get('title'),
    // ...
  })
  
  if (!result.success) {
    return result.error.flatten()
  }
  
  return null
}
```

## Security Checklist

- ✅ All mutations use Server Actions
- ✅ Auth verified at action start
- ✅ Inputs validated with Zod
- ✅ Ownership checked before updates/deletes
- ✅ RLS policies enabled on all tables
- ✅ Service role key only in webhooks
- ✅ Clerk webhook signature verified
- ✅ Paths revalidated after mutations

## Next Steps

1. Update existing pages to use new clients
2. Replace old mutation logic with Server Actions
3. Add loading/error UI components
4. Implement realtime subscriptions
5. Add optimistic updates where needed
