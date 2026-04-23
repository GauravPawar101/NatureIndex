# Quick Reference Card

## 🔐 Auth Helpers

```tsx
// Require any authenticated user
import { requireAuth } from '@/lib/auth'
const userId = await requireAuth() // Redirects to /login if not authenticated

// Require specific role
import { requireRole } from '@/lib/auth'
const { userId, role } = await requireRole(['admin', 'author'])
```

## 📊 Data Fetching (Server Components)

```tsx
// Public data (no auth required)
import { createServerClient } from '@/lib/supabase/server'
const client = await createServerClient()
const { data } = await client.from('posts').select('*')

// Protected data (auth required)
import { getAuthenticatedClient } from '@/lib/supabase/server'
const { client, userId } = await getAuthenticatedClient()
const { data } = await client.from('posts').select('*').eq('author_id', userId)
```

## ✏️ Mutations (Server Actions)

```tsx
'use client'
import { useTransition } from 'react'
import { createPost } from '@/actions/posts'

const [isPending, startTransition] = useTransition()

startTransition(async () => {
  const result = await createPost({ title: '...', slug: '...', content: '...' })
  
  if (result.success) {
    console.log('Created:', result.data.id)
  } else {
    console.error('Error:', result.error)
  }
})
```

## 🔴 Realtime (Client Components)

```tsx
'use client'
import { useEffect } from 'react'
import { useSupabase } from '@/lib/supabase/client'

const { client, isAuthenticated } = useSupabase()

useEffect(() => {
  if (!client) return

  const channel = client
    .channel('my-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'comments',
      filter: `post_id=eq.${postId}`,
    }, (payload) => {
      console.log('New comment:', payload.new)
    })
    .subscribe()

  return () => channel.unsubscribe()
}, [client, postId])
```

## 📝 Available Actions

### Posts
```tsx
import { createPost, updatePost, deletePost } from '@/actions/posts'

await createPost({ title, slug, content, summary?, cover_image?, status? })
await updatePost({ id, title?, slug?, content?, summary?, status? })
await deletePost({ id })
```

### Comments
```tsx
import { createComment, deleteComment } from '@/actions/comments'

await createComment({ post_id, content })
await deleteComment({ id })
```

### Reactions
```tsx
import { toggleLike, toggleBookmark } from '@/actions/reactions'

await toggleLike({ post_id })
await toggleBookmark({ post_id })
```

### Follows
```tsx
import { toggleFollow } from '@/actions/follows'

await toggleFollow({ following_id })
```

### Profile
```tsx
import { updateProfile } from '@/actions/profile'

await updateProfile({ username?, bio?, website?, twitter?, full_name? })
```

## 🎨 UI Patterns

### Loading State
```tsx
const [isPending, startTransition] = useTransition()

<button disabled={isPending}>
  {isPending ? 'Loading...' : 'Submit'}
</button>
```

### Error Display
```tsx
const [error, setError] = useState<string | null>(null)

{error && (
  <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
    {error}
  </div>
)}
```

### Success Message
```tsx
const [success, setSuccess] = useState(false)

{success && (
  <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded">
    Success!
  </div>
)}
```

### Optimistic Update
```tsx
const [liked, setLiked] = useState(initialLiked)

function handleLike() {
  setLiked(!liked) // Optimistic
  
  startTransition(async () => {
    const result = await toggleLike({ post_id })
    if (!result.success) {
      setLiked(liked) // Rollback
    }
  })
}
```

## 🔍 Type Imports

```tsx
import type { 
  Profile, 
  Post, 
  Comment, 
  PostWithAuthor,
  CommentWithAuthor 
} from '@/lib/types'

import type { 
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput 
} from '@/lib/validations/schemas'
```

## 🛡️ Validation

```tsx
import { createPostSchema } from '@/lib/validations/schemas'

// Validate before submitting
const result = createPostSchema.safeParse(data)

if (!result.success) {
  console.error(result.error.flatten())
} else {
  await createPost(result.data)
}
```

## 🔄 Revalidation

```tsx
import { revalidatePath } from 'next/cache'

// In Server Action
revalidatePath('/blog')
revalidatePath(`/blog/${slug}`)
```

## 🌐 Environment Variables

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Webhooks only!
```

## 📁 File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── server.ts      # Server client
│   │   ├── client.ts      # Browser client
│   │   └── admin.ts       # Admin client
│   ├── auth/
│   │   └── index.ts       # Auth helpers
│   ├── validations/
│   │   └── schemas.ts     # Zod schemas
│   └── types/
│       ├── database.types.ts
│       └── index.ts
├── actions/
│   ├── posts.ts
│   ├── comments.ts
│   ├── reactions.ts
│   ├── follows.ts
│   └── profile.ts
└── app/
    ├── api/webhooks/clerk/route.ts
    └── ...
```

## ⚡ Common Commands

```bash
# Development
npm run dev

# Type generation
npm run supabase:types

# Build
npm run build

# Deploy
git push
```

## 🐛 Debug Checklist

- [ ] Environment variables set?
- [ ] Clerk JWT template configured?
- [ ] RLS policies enabled?
- [ ] User signed in?
- [ ] Correct role assigned?
- [ ] Network tab shows errors?
- [ ] Console shows errors?
- [ ] Supabase logs show errors?

## 📞 Quick Links

- [AUTH_SETUP.md](./AUTH_SETUP.md) - Full documentation
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Update existing files
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Overview
