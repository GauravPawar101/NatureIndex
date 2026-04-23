# Migration Checklist

Use this checklist to track your progress updating the codebase.

## ✅ Phase 1: Core Setup (COMPLETED)

- [x] Create `src/lib/supabase/server.ts`
- [x] Create `src/lib/supabase/client.ts`
- [x] Create `src/lib/supabase/admin.ts`
- [x] Create `src/lib/auth/index.ts`
- [x] Create `src/lib/types/database.types.ts`
- [x] Create `src/lib/types/index.ts`
- [x] Create `src/lib/validations/schemas.ts`
- [x] Create `src/actions/posts.ts`
- [x] Create `src/actions/comments.ts`
- [x] Create `src/actions/reactions.ts`
- [x] Create `src/actions/follows.ts`
- [x] Create `src/actions/profile.ts`
- [x] Update `src/app/api/webhooks/clerk/route.ts`
- [x] Update `tsconfig.json` with path aliases
- [x] Create documentation files

## 📝 Phase 2: Update Components (TODO)

### Dashboard
- [ ] Rename `src/app/dashboard/page.js` → `page.tsx`
- [ ] Replace `createSupabaseClerkServerClient()` with `getAuthenticatedClient()`
- [ ] Add try/catch with redirect to `/login`
- [ ] Test dashboard loads correctly
- [ ] Test following section works
- [ ] Test drafts section works
- [ ] Test published section works

### Create Post
- [ ] Rename `src/app/create-post/CreatePostForm.js` → `CreatePostForm.tsx`
- [ ] Import `createPost` from `@/actions/posts`
- [ ] Add `useTransition` hook
- [ ] Replace form submission with Server Action
- [ ] Add error state display
- [ ] Add loading state to button
- [ ] Test post creation works
- [ ] Test validation errors show
- [ ] Test redirect after success

### Edit Post
- [ ] Update `src/app/dashboard/posts/[id]/edit/PostEditForm.js`
- [ ] Import `updatePost` from `@/actions/posts`
- [ ] Replace mutation with Server Action
- [ ] Add loading/error states
- [ ] Test post updates work
- [ ] Test slug uniqueness validation

### Like Button
- [ ] Rename `src/app/components/LikeButton.js` → `LikeButton.tsx`
- [ ] Import `toggleLike` from `@/actions/reactions`
- [ ] Add `useTransition` hook
- [ ] Implement optimistic update
- [ ] Add loading state
- [ ] Test like/unlike works
- [ ] Test optimistic update feels instant

### Bookmark Button
- [ ] Rename `src/app/components/BookmarkButton.js` → `BookmarkButton.tsx`
- [ ] Import `toggleBookmark` from `@/actions/reactions`
- [ ] Add `useTransition` hook
- [ ] Implement optimistic update
- [ ] Add loading state
- [ ] Test bookmark/unbookmark works

### Follow Button
- [ ] Rename `src/app/components/FollowButton.js` → `FollowButton.tsx`
- [ ] Import `toggleFollow` from `@/actions/follows`
- [ ] Add `useTransition` hook
- [ ] Implement optimistic update
- [ ] Add loading state
- [ ] Test follow/unfollow works
- [ ] Test can't follow self

### Comment Section
- [ ] Update `src/app/blog/[slug]/CommentSection.js`
- [ ] Import `createComment`, `deleteComment` from `@/actions/comments`
- [ ] Import `useSupabase` from `@/lib/supabase/client`
- [ ] Add realtime subscription for new comments
- [ ] Add realtime subscription for deleted comments
- [ ] Replace comment creation with Server Action
- [ ] Replace comment deletion with Server Action
- [ ] Test comment creation works
- [ ] Test comment deletion works
- [ ] Test realtime updates work

### Blog Post Page
- [ ] Update `src/app/blog/[slug]/page.js` if needed
- [ ] Import `createServerClient` from `@/lib/supabase/server`
- [ ] Fetch user's like/bookmark status if authenticated
- [ ] Pass initial states to client components
- [ ] Test page loads correctly
- [ ] Test authenticated vs unauthenticated views

### Account Page
- [ ] Update `src/app/account/page.js`
- [ ] Import `getAuthenticatedClient` from `@/lib/supabase/server`
- [ ] Fetch user profile
- [ ] Fetch user stats (posts, followers, following)
- [ ] Create `ProfileForm.tsx` component
- [ ] Import `updateProfile` from `@/actions/profile`
- [ ] Test profile updates work
- [ ] Test username uniqueness validation
- [ ] Test URL validation

### Profile View Page
- [ ] Update `src/app/profile/[username]/page.js`
- [ ] Import `createServerClient` from `@/lib/supabase/server`
- [ ] Fetch profile by username
- [ ] Fetch user's posts
- [ ] Check if current user follows this profile
- [ ] Add FollowButton component
- [ ] Test profile page loads
- [ ] Test follow button works

## 🧪 Phase 3: Testing (TODO)

### Authentication Flow
- [ ] Sign up new user via Clerk
- [ ] Verify webhook creates profile in Supabase
- [ ] Verify user can access dashboard
- [ ] Verify user redirected to login when not authenticated
- [ ] Test role-based access (admin, author, reader)

### Post Management
- [ ] Create draft post
- [ ] Edit draft post
- [ ] Publish draft post
- [ ] Edit published post
- [ ] Delete post
- [ ] Verify slug uniqueness
- [ ] Verify ownership checks work
- [ ] Test non-owner can't edit/delete

### Interactions
- [ ] Like a post
- [ ] Unlike a post
- [ ] Bookmark a post
- [ ] Unbookmark a post
- [ ] Follow a user
- [ ] Unfollow a user
- [ ] Verify can't follow self

### Comments
- [ ] Add comment to post
- [ ] Delete own comment
- [ ] Verify can't delete others' comments
- [ ] Test realtime updates (open in 2 tabs)
- [ ] Test comment validation (empty, too long)

### Profile
- [ ] Update username
- [ ] Update bio
- [ ] Update website
- [ ] Update Twitter handle
- [ ] Verify username uniqueness
- [ ] Verify URL validation

### Error Handling
- [ ] Test with invalid post ID
- [ ] Test with invalid user ID
- [ ] Test with missing required fields
- [ ] Test with invalid data types
- [ ] Test with unauthorized access
- [ ] Verify error messages are user-friendly

### Loading States
- [ ] Verify loading indicators show during mutations
- [ ] Verify buttons disabled during loading
- [ ] Verify optimistic updates feel instant
- [ ] Test slow network conditions

### Realtime
- [ ] Open post in 2 browser tabs
- [ ] Add comment in tab 1
- [ ] Verify comment appears in tab 2
- [ ] Delete comment in tab 1
- [ ] Verify comment removed in tab 2

## 🚀 Phase 4: Deployment (TODO)

### Pre-Deployment
- [ ] Run `npm run build` locally
- [ ] Fix any build errors
- [ ] Run `npm run lint`
- [ ] Fix any linting errors
- [ ] Test production build locally with `npm start`

### Environment Variables
- [ ] Verify all env vars set in Vercel
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Clerk Configuration
- [ ] Verify JWT template configured for Supabase
- [ ] Verify webhook endpoint configured
- [ ] Test webhook with Clerk testing tool
- [ ] Verify roles set in user metadata

### Supabase Configuration
- [ ] Verify RLS policies enabled on all tables
- [ ] Verify Realtime enabled for comments table
- [ ] Verify triggers working (search_vector, updated_at, versions)
- [ ] Test database connection from Vercel

### Deploy
- [ ] Commit all changes
- [ ] Push to GitHub
- [ ] Verify Vercel deployment succeeds
- [ ] Check deployment logs for errors

### Post-Deployment Testing
- [ ] Test signup flow in production
- [ ] Test webhook in production
- [ ] Test post creation in production
- [ ] Test all interactions in production
- [ ] Test realtime updates in production
- [ ] Monitor error logs for 24 hours

## 📊 Progress Tracking

- **Phase 1**: ✅ 100% Complete (14/14)
- **Phase 2**: ⏳ 0% Complete (0/35)
- **Phase 3**: ⏳ 0% Complete (0/35)
- **Phase 4**: ⏳ 0% Complete (0/15)

**Overall Progress**: 14/99 (14%)

## 🎯 Next Steps

1. Start with Dashboard page update
2. Then update Create Post form
3. Update all button components
4. Update Comment section
5. Test everything thoroughly
6. Deploy to production

## 📝 Notes

- Keep old files as `.backup` until confirmed working
- Test each component after updating
- Use browser DevTools to debug issues
- Check Supabase logs for RLS policy errors
- Check Clerk logs for webhook issues

## ✅ Definition of Done

A component is "done" when:
- [ ] TypeScript compiles without errors
- [ ] Component renders without errors
- [ ] All functionality works as expected
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Optimistic updates work (if applicable)
- [ ] Realtime updates work (if applicable)
- [ ] Code follows project patterns
- [ ] No console errors or warnings
