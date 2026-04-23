# Architecture Diagram

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Server     │  │   Client     │  │   Server     │          │
│  │  Components  │  │  Components  │  │   Actions    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
└─────────┼──────────────────┼──────────────────┼───────────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼───────────────────┐
│                      NEXT.JS SERVER                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Auth Layer                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ requireAuth()│  │requireRole() │  │  Clerk JWT   │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 Validation Layer                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ Zod Schemas  │  │Input Parsing │  │Error Messages│     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Supabase Clients                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │Server Client │  │Browser Client│  │ Admin Client │     │ │
│  │  │(with JWT)    │  │(with JWT)    │  │(Service Role)│     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼───────────────────┐
│                      SUPABASE                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    RLS Policies                              │ │
│  │  auth.jwt()->>'sub' = user_id                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Database Tables                           │ │
│  │  profiles │ posts │ comments │ likes │ follows │ bookmarks  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Realtime                                  │ │
│  │  WebSocket subscriptions for live updates                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
          │
          │
┌─────────▼──────────────────────────────────────────────────────────┐
│                         CLERK                                       │
├─────────────────────────────────────────────────────────────────────┤
│  User Management │ JWT Tokens │ Webhooks │ Roles                   │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Patterns

### Pattern 1: Server Component Data Fetching (Read)

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ 1. Request page
       ▼
┌──────────────┐
│Server Comp.  │
└──────┬───────┘
       │ 2. createServerClient()
       ▼
┌──────────────┐
│  Clerk Auth  │ 3. Get JWT token
└──────┬───────┘
       │ 4. Token in headers
       ▼
┌──────────────┐
│  Supabase    │ 5. Verify JWT
└──────┬───────┘
       │ 6. Check RLS
       │ 7. Return data
       ▼
┌──────────────┐
│   Browser    │ 8. Render HTML
└──────────────┘
```

### Pattern 2: Server Action Mutation (Write)

```
┌──────────────┐
│   Browser    │ 1. User clicks button
└──────┬───────┘
       │ 2. Call Server Action
       ▼
┌──────────────┐
│Server Action │
└──────┬───────┘
       │ 3. requireAuth()
       ▼
┌──────────────┐
│  Clerk Auth  │ 4. Verify user
└──────┬───────┘
       │ 5. userId
       ▼
┌──────────────┐
│Zod Validation│ 6. Validate input
└──────┬───────┘
       │ 7. Validated data
       ▼
┌──────────────┐
│  Ownership   │ 8. Check permissions
│    Check     │
└──────┬───────┘
       │ 9. Authorized
       ▼
┌──────────────┐
│  Supabase    │ 10. Mutate data
└──────┬───────┘
       │ 11. Success/Error
       ▼
┌──────────────┐
│Revalidate    │ 12. Clear cache
│   Paths      │
└──────┬───────┘
       │ 13. Return result
       ▼
┌──────────────┐
│   Browser    │ 14. Update UI
└──────────────┘
```

### Pattern 3: Realtime Subscription (Live Updates)

```
┌──────────────┐
│   Browser    │ 1. Component mounts
└──────┬───────┘
       │ 2. useSupabase()
       ▼
┌──────────────┐
│Browser Client│ 3. Get JWT token
└──────┬───────┘
       │ 4. Subscribe to channel
       ▼
┌──────────────┐
│  Supabase    │ 5. WebSocket connection
│  Realtime    │
└──────┬───────┘
       │ 6. Listen for changes
       │
       │ ┌─────────────────┐
       │ │ Another user    │
       │ │ creates comment │
       │ └────────┬────────┘
       │          │
       ▼          ▼
┌──────────────────┐
│  Database        │ 7. INSERT event
│  Trigger         │
└──────┬───────────┘
       │ 8. Broadcast to subscribers
       ▼
┌──────────────┐
│   Browser    │ 9. Update UI instantly
└──────────────┘
```

### Pattern 4: Webhook Sync (User Creation)

```
┌──────────────┐
│   Browser    │ 1. User signs up
└──────┬───────┘
       │ 2. Create account
       ▼
┌──────────────┐
│    Clerk     │ 3. User created
└──────┬───────┘
       │ 4. Trigger webhook
       ▼
┌──────────────┐
│   Webhook    │ 5. POST /api/webhooks/clerk
│   Endpoint   │
└──────┬───────┘
       │ 6. Verify signature
       ▼
┌──────────────┐
│Admin Client  │ 7. Service role key
└──────┬───────┘
       │ 8. Insert profile
       ▼
┌──────────────┐
│  Supabase    │ 9. Profile created
└──────┬───────┘
       │ 10. Success
       ▼
┌──────────────┐
│    Clerk     │ 11. Webhook confirmed
└──────────────┘
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Request Flow                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Middleware (Route Protection)                      │
│ - Check if route requires auth                              │
│ - Redirect to login if needed                               │
│ - Check role requirements                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Server Action Auth (Operation Protection)          │
│ - requireAuth() or requireRole()                            │
│ - Verify user is authenticated                              │
│ - Check user has required role                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Input Validation (Data Protection)                 │
│ - Zod schema validation                                     │
│ - Type checking                                             │
│ - Format validation                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Ownership Check (Resource Protection)              │
│ - Verify user owns the resource                             │
│ - Check if user can modify                                  │
│ - Prevent unauthorized access                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: RLS Policies (Database Protection)                 │
│ - Supabase verifies JWT                                     │
│ - Check auth.jwt()->>'sub' = user_id                        │
│ - Enforce row-level security                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        ✅ Authorized
```

## 📊 Component Hierarchy

```
App
├── Server Components (Data Fetching)
│   ├── Blog Page
│   │   └── createServerClient()
│   ├── Blog Post Page
│   │   └── createServerClient()
│   └── Dashboard Page
│       └── getAuthenticatedClient()
│
├── Client Components (Interactivity)
│   ├── LikeButton
│   │   ├── useTransition()
│   │   └── toggleLike()
│   ├── BookmarkButton
│   │   ├── useTransition()
│   │   └── toggleBookmark()
│   ├── FollowButton
│   │   ├── useTransition()
│   │   └── toggleFollow()
│   ├── CommentSection
│   │   ├── useSupabase()
│   │   ├── createComment()
│   │   └── deleteComment()
│   └── ProfileForm
│       ├── useTransition()
│       └── updateProfile()
│
└── Server Actions (Mutations)
    ├── posts.ts
    │   ├── createPost()
    │   ├── updatePost()
    │   └── deletePost()
    ├── comments.ts
    │   ├── createComment()
    │   └── deleteComment()
    ├── reactions.ts
    │   ├── toggleLike()
    │   └── toggleBookmark()
    ├── follows.ts
    │   └── toggleFollow()
    └── profile.ts
        └── updateProfile()
```

## 🗄️ Database Schema

```
┌─────────────┐
│  profiles   │
├─────────────┤
│ id          │◄─────┐
│ user_id     │      │
│ username    │      │
│ email       │      │
│ bio         │      │
│ avatar_url  │      │
└─────────────┘      │
                     │
┌─────────────┐      │
│    posts    │      │
├─────────────┤      │
│ id          │      │
│ author_id   │──────┘
│ title       │
│ slug        │
│ content     │
│ status      │
└──────┬──────┘
       │
       ├──────┐
       │      │
       ▼      ▼
┌──────────┐ ┌──────────┐
│ comments │ │  likes   │
├──────────┤ ├──────────┤
│ post_id  │ │ post_id  │
│ author_id│ │ user_id  │
│ content  │ └──────────┘
└──────────┘
       │
       ▼
┌──────────┐
│post_tags │
├──────────┤
│ post_id  │
│ tag_id   │
└──────────┘
       │
       ▼
┌──────────┐
│   tags   │
├──────────┤
│ id       │
│ name     │
│ slug     │
└──────────┘

┌──────────┐
│ follows  │
├──────────┤
│follower  │
│following │
└──────────┘

┌──────────┐
│bookmarks │
├──────────┤
│ user_id  │
│ post_id  │
└──────────┘
```

## 🎯 Key Principles

1. **Server Components** for data fetching (no client state)
2. **Server Actions** for all mutations (secure by default)
3. **Client Components** only for interactivity
4. **Zod validation** on all inputs
5. **RLS policies** as final security layer
6. **Optimistic updates** for instant UX
7. **Realtime subscriptions** for live data
8. **Type safety** throughout the stack

---

For implementation details, see [AUTH_SETUP.md](./AUTH_SETUP.md)
