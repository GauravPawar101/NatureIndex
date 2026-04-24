# ✅ YOUR DEPLOYMENT CHECKLIST

Use this checklist to deploy your project step-by-step.

## 🎯 Pre-Deployment (Complete ✅)

- [x] All code written and tested
- [x] Build passes without errors
- [x] TypeScript compiles successfully
- [x] Loading animations implemented
- [x] Optimistic updates working
- [x] Error handling in place
- [x] Documentation complete

## 🔧 Vercel Setup (Do This Now)

### 1. Push to GitHub
```bash
git add .
git commit -m "Production-ready: Auth system with loading animations"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Click "Deploy"

### 3. Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```bash
# Clerk (Get from clerk.com dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase (Get from supabase.com dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Important:** Add these to all environments (Production, Preview, Development)

## 🔐 Clerk Configuration (Do This Now)

### 1. Create JWT Template
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to: JWT Templates
3. Click "New template"
4. Name it: `supabase`
5. Add this claim:
   ```json
   {
     "sub": "{{user.id}}"
   }
   ```
6. Save template

### 2. Set Up Webhook
1. In Clerk Dashboard → Webhooks
2. Click "Add Endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/clerk`
4. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the "Signing Secret"
6. Add it to Vercel as `CLERK_WEBHOOK_SECRET`

### 3. Set User Roles (Optional)
For each user who should be an author or admin:
1. Go to Users in Clerk Dashboard
2. Click on a user
3. Go to "Metadata" tab
4. Add to Public Metadata:
   ```json
   {
     "role": "author"
   }
   ```
   Options: `admin`, `author`, `reader` (default)

## 🗄️ Supabase Configuration (Do This Now)

### 1. Enable RLS Policies
Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.jwt()->>'sub');

-- Posts: Anyone can read published, authors can manage own
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (status = 'published' OR author_id = auth.jwt()->>'sub');

CREATE POLICY "Authors can create posts"
  ON posts FOR INSERT
  WITH CHECK (author_id = auth.jwt()->>'sub');

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (author_id = auth.jwt()->>'sub');

CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE
  USING (author_id = auth.jwt()->>'sub');

-- Comments: Anyone can read, authenticated users can create, authors can delete own
CREATE POLICY "Anyone can read comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (author_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (author_id = auth.jwt()->>'sub');

-- Likes: Users can manage own likes
CREATE POLICY "Users can read all likes"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create own likes"
  ON likes FOR INSERT
  WITH CHECK (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete own likes"
  ON like