# 🌱 Nature Conservation Blog

A modern, community-driven blog platform dedicated to raising awareness about environmental issues and inspiring action for a greener planet.  
Built for concerned citizens of the world who want to share knowledge, ideas, and solutions for protecting our natural resources.

---

## ✨ Features

- 📝 **Create, Read, Update, Delete** blog posts on environmental topics  
- 🌍 User-friendly interface for **global contributors**  
- 🔍 **Search** and **filter** posts by topic or keyword  
- 📅 Automatic date tracking for posts  
- 🔒 Secure authentication for contributors  
- 📱 Fully **responsive** design for mobile, tablet, and desktop  
- ♻ Focus on **sustainability, conservation, and community**

---

## 🛠 Tech Stack

**Frontend:**
- [Next.js](https://nextjs.org/) – React framework for a fast, SEO-friendly UI
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS for rapid design
- [React Icons](https://react-icons.github.io/react-icons/) – Icons for better UX

**Backend:**
- [Supabase](https://supabase.com/) – Auth & storage

**Deployment:**
- [Vercel](https://vercel.com/) – Frontend hosting
- [Render](https://render.com/) / [Heroku](https://www.heroku.com/) – Backend hosting

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ installed
- PostgreSQL or MongoDB database
- npm or yarn package manager

### Installation
```bash
# Clone the repo
git clone https://github.com/yourusername/nature-conservation-blog.git

# Navigate to project directory
cd nature-conservation-blog

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Start development server
npm run dev

```

## 🧬 Supabase TypeScript Types (Auto-Generated)

This project can generate a strongly-typed `Database` type from your Supabase schema, so `.from('posts')...` queries become fully typed in TypeScript.

### 1) Install Supabase CLI

- https://supabase.com/docs/guides/cli

### 2) Generate types

Set your Supabase project id and run the generator:

PowerShell:
```powershell
$env:SUPABASE_PROJECT_ID = "YOUR_PROJECT_ID"
npm run supabase:types
```

This writes the generated types to:

- src/app/lib/database.types.ts

If you prefer running the raw command yourself:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/app/lib/database.types.ts
```

### 3) Use the generated `Database` type with Supabase client

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/app/lib/database.types';

const supabase = createClient<Database>(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fully typed table helper
export type Post = Database['public']['Tables']['posts']['Row'];
```

## 👤 Public Author Pages + Follows

This project includes public author pages at `/authors/[username]` backed by a `profiles` table (synced from Clerk) and a `follows` table.

### 1) Apply Supabase schema

Run the SQL in:

- supabase/schema.sql

This adds/extends:

- `public.profiles.user_id` (Clerk user id)
- `public.follows` (follower/following graph)
- a foreign key `posts.author_id -> profiles.user_id` (used for joins)

### 2) Configure Clerk webhook

Create a Clerk webhook pointing to:

- `POST /api/webhooks/clerk`

Enable at least:

- `user.created`
- `user.updated`
- `user.deleted`

Add env vars:

- `CLERK_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; do not expose as `NEXT_PUBLIC_*`)
