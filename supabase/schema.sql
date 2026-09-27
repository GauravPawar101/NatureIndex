-- ============================================================
--  Nature Index — Supabase / PostgreSQL Schema  (v3, fixed)
--  Includes: Graph Recommendation Engine & PageRank Support
--
--  FIX NOTE: the original file had a second, conflicting block
--  (a raw "CREATE TABLE public.posts", "CREATE TABLE
--  public.cf_user_scores" with unconstrained TEXT user/author
--  ids, plus an index using the invalid identifier
--  "extensions_vector_cosine_ops") pasted in after section 9.
--  That block redefined tables that already exist from section 2
--  and would error the whole migration. It has been removed.
--  Sections 10-11 below are the correct idempotent additions —
--  they ALTER the existing posts table rather than recreating it.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ------------------------------------------------------------
-- 1. Profiles Table
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  username      text        not null unique,
  full_name     text,
  avatar_url    text,
  website       text,
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_username_length  check (char_length(username) between 3 and 30),
  constraint profiles_username_chars   check (username ~ '^[a-zA-Z0-9_-]+$'),
  constraint profiles_website_format   check (website is null or website ~ '^https?://')
);
create index if not exists idx_profiles_username   on public.profiles (username);
create index if not exists idx_profiles_created_at on public.profiles (created_at desc);

-- ------------------------------------------------------------
-- 2. Posts Table
-- ------------------------------------------------------------
create table if not exists public.posts (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  title         text        not null,
  slug          text        not null unique,
  content       text        not null default '',
  excerpt       text,
  image_url     text,
  topic         text,
  views         bigint      not null default 0,
  published     boolean     not null default true,
  date          timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint posts_title_length  check (char_length(title) between 1 and 300),
  constraint posts_slug_format   check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint posts_slug_length   check (char_length(slug) between 1 and 200),
  constraint posts_views_non_neg check (views >= 0)
);
create index if not exists idx_posts_user_id    on public.posts (user_id);
create index if not exists idx_posts_slug       on public.posts (slug);
create index if not exists idx_posts_date_desc  on public.posts (date desc);
create index if not exists idx_posts_views_desc on public.posts (views desc);
create index if not exists idx_posts_topic      on public.posts (topic) where topic is not null;
create index if not exists idx_posts_published  on public.posts (published) where published = true;
create index if not exists idx_posts_fts on public.posts
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));
create index if not exists idx_posts_title_trgm on public.posts
  using gin (title gin_trgm_ops);

-- ------------------------------------------------------------
-- 3. Comments Table
-- ------------------------------------------------------------
create table if not exists public.comments (
  id            uuid        primary key default uuid_generate_v4(),
  post_id       uuid        not null references public.posts(id) on delete cascade,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  parent_id     uuid        references public.comments(id) on delete cascade,
  content       text        not null,
  image_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint comments_content_length check (char_length(content) between 1 and 5000)
);
create index if not exists idx_comments_post_id   on public.comments (post_id);
create index if not exists idx_comments_user_id   on public.comments (user_id);
create index if not exists idx_comments_parent_id on public.comments (parent_id) where parent_id is not null;
create index if not exists idx_comments_post_time on public.comments (post_id, created_at asc);

-- ------------------------------------------------------------
-- 4. Recommendations Engine: Interactions Table
-- ------------------------------------------------------------
create table if not exists public.post_interactions (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  post_id       uuid        not null references public.posts(id) on delete cascade,
  action_type   text        not null, -- 'read', 'bookmark', 'comment', 'upvote'
  weight        float8      not null default 1.0,
  created_at    timestamptz not null default now(),
  constraint valid_action_type check (action_type in ('read', 'bookmark', 'comment', 'upvote'))
);
create index if not exists idx_interactions_user_post on public.post_interactions (user_id, post_id);
create index if not exists idx_interactions_post_id on public.post_interactions (post_id);

-- ------------------------------------------------------------
-- 5. PageRank Matrix View (For Rust Engine Fetching)
-- ------------------------------------------------------------
create or replace view public.interaction as
  select
    i1.post_id::text as source_post_id,
    i2.post_id::text as target_post_id,
    sum(i1.weight + i2.weight)::float8 as weight
  from public.post_interactions i1
  join public.post_interactions i2
    on i1.user_id = i2.user_id
   and i1.post_id <> i2.post_id
  group by i1.post_id, i2.post_id;

-- ------------------------------------------------------------
-- 6. Storage Buckets Configuration
-- ------------------------------------------------------------
-- `on conflict do update` rather than `do nothing`: with `do nothing`, editing
-- these limits and re-running this file silently leaves an existing project
-- with the old values, which looks like the change did not apply.
--
-- The size limits must stay in sync with UPLOAD_TARGETS in
-- src/app/lib/uploads.js — the client validates against those numbers, and a
-- stricter bucket than the client believes turns into an opaque storage error.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-images', 'post-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('comment-images', 'comment-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
  -- post-videos and post-photos are declared in the media addendum (10b), which
  -- needs pgvector's `extensions` schema to already exist. Kept here rather than
  -- there so the original three buckets stay readable as one block.
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- ------------------------------------------------------------
-- 7. Functions & Triggers
-- ------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
  before update on public.posts
  for each row execute procedure public.handle_updated_at();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute procedure public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  supplied_username text;
  base_username     text;
  final_username    text;
  counter           int := 0;
begin
  supplied_username := lower(
    regexp_replace(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), ''), '[^a-zA-Z0-9_-]', '', 'g')
  );
  base_username := supplied_username;
  if char_length(base_username) < 3 then
    base_username := lower(
      regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_-]', '', 'g')
    );
  end if;
  if char_length(base_username) < 3 then
    base_username := base_username || 'user';
  end if;
  final_username := base_username;
  loop
    exit when not exists (select 1 from public.profiles where username = final_username);
    counter        := counter + 1;
    final_username := base_username || counter::text;
  end loop;
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', '/images/default-avatar.svg')
  );
  update public.profiles
  set
    website = coalesce(nullif(trim(new.raw_user_meta_data->>'website'), ''), null),
    bio = coalesce(nullif(trim(new.raw_user_meta_data->>'bio'), ''), null)
  where id = new.id;
  return new;
end;
$$;
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 8. Row-Level Security (RLS)
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_interactions enable row level security;

-- Profiles Policies
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles for select using (true);
drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Posts Policies
drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read" on public.posts for select using (published = true);
drop policy if exists "posts_owner_read_own" on public.posts;
create policy "posts_owner_read_own" on public.posts for select using (auth.uid() = user_id);
drop policy if exists "posts_owner_insert" on public.posts;
create policy "posts_owner_insert" on public.posts for insert with check (auth.uid() = user_id);
drop policy if exists "posts_owner_update" on public.posts;
create policy "posts_owner_update" on public.posts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "posts_owner_delete" on public.posts;
create policy "posts_owner_delete" on public.posts for delete using (auth.uid() = user_id);

-- Comments Policies
drop policy if exists "comments_public_read" on public.comments;
create policy "comments_public_read" on public.comments for select using (true);
drop policy if exists "comments_auth_insert" on public.comments;
create policy "comments_auth_insert" on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists "comments_owner_update" on public.comments;
create policy "comments_owner_update" on public.comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "comments_owner_delete" on public.comments;
create policy "comments_owner_delete" on public.comments for delete using (auth.uid() = user_id);

-- Post Interactions Policies
drop policy if exists "interactions_auth_insert" on public.post_interactions;
create policy "interactions_auth_insert" on public.post_interactions for insert with check (auth.uid() = user_id);
drop policy if exists "interactions_owner_read" on public.post_interactions;
create policy "interactions_owner_read" on public.post_interactions for select using (auth.uid() = user_id);

-- Storage Policies
--
-- NOTE on the owner-delete policies below.
--
-- They must use `(storage.foldername(name))[1]`, which returns the first
-- *path segment* — the user id. The previous `split_part(name, '-', 1)` was
-- wrong: it splits the whole object name on hyphens, and a UUID is full of
-- them, so it returned only the first segment of the id and never equalled
-- `auth.uid()`. The effect was that no contributor could ever delete their own
-- avatar or comment image, and every replacement leaked storage forever.
drop policy if exists "post_images_public_read" on storage.objects;
create policy "post_images_public_read" on storage.objects for select using (bucket_id = 'post-images');
drop policy if exists "post_images_auth_insert" on storage.objects;
create policy "post_images_auth_insert" on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');
drop policy if exists "post_images_owner_update" on storage.objects;
create policy "post_images_owner_update" on storage.objects for update
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "post_images_owner_delete" on storage.objects;
create policy "post_images_owner_delete" on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "comment_images_public_read" on storage.objects;
create policy "comment_images_public_read" on storage.objects for select using (bucket_id = 'comment-images');
drop policy if exists "comment_images_auth_insert" on storage.objects;
create policy "comment_images_auth_insert" on storage.objects for insert
  with check (bucket_id = 'comment-images' and auth.role() = 'authenticated');
drop policy if exists "comment_images_owner_update" on storage.objects;
create policy "comment_images_owner_update" on storage.objects for update
  using (bucket_id = 'comment-images' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "comment_images_owner_delete" on storage.objects;
create policy "comment_images_owner_delete" on storage.objects for delete
  using (bucket_id = 'comment-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars_auth_insert" on storage.objects;
create policy "avatars_auth_insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ------------------------------------------------------------
-- 9. Helper Views & Functions
-- ------------------------------------------------------------
-- Columns are listed explicitly rather than `p.*` on purpose. Section 10 later
-- adds `embedding` to public.posts, which would change what `p.*` expands to;
-- `create or replace view` cannot re-order existing view columns, so a `p.*`
-- view makes this whole file fail to re-apply (CREATE OR REPLACE VIEW aborts
-- with "cannot change name of view column"). Keeping the column list fixed
-- means the file stays idempotent and can safely be re-run.
create or replace view public.posts_with_author as
  select
    p.id,
    p.user_id,
    p.title,
    p.slug,
    p.content,
    p.excerpt,
    p.image_url,
    p.topic,
    p.views,
    p.published,
    p.date,
    p.created_at,
    p.updated_at,
    pr.username    as author_username,
    pr.full_name   as author_full_name,
    pr.avatar_url  as author_avatar_url
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.published = true
  order by p.date desc;

create or replace view public.posts_comment_count as
  select post_id, count(*) as comment_count
  from public.comments
  group by post_id;

create or replace view public.post_topics as
  select distinct topic
  from public.posts
  where published = true and topic is not null
  order by topic;

create or replace function public.search_posts(query text)
returns setof public.posts language sql stable as $$
  select *
  from public.posts
  where
    published = true
    and to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
        @@ plainto_tsquery('english', query)
  order by
    ts_rank(
      to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')),
      plainto_tsquery('english', query)
    ) desc;
$$;

create or replace function public.increment_post_views(post_uuid uuid)
returns void language sql as $$
  update public.posts set views = views + 1 where id = post_uuid;
$$;

-- ============================================================
--  Vector Recommendations Addendum
--  Run after sections 1-9 above. These are ALTER/idempotent
--  additions against the existing public.posts table — no
--  table is redefined here.
-- ============================================================

-- ------------------------------------------------------------
-- 10. Embeddings on the existing posts table
-- ------------------------------------------------------------
create extension if not exists "vector" with schema extensions;

alter table public.posts
  add column if not exists embedding extensions.vector(384); -- e.g. MiniLM-L6-v2 dimensions

-- Operator class must be schema-qualified with a dot ("extensions.vector_cosine_ops"),
-- not an underscore ("extensions_vector_cosine_ops") — the underscore form is not a
-- valid identifier and errors.
create index if not exists idx_posts_embedding_hnsw
  on public.posts using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ------------------------------------------------------------
-- 10b. Media posts (photo / video)
-- ------------------------------------------------------------
-- A post is text, a photo set, or a video. `content_type` is the discriminator
-- and defaults to 'article', so every existing row keeps its current behaviour
-- and no backfill is needed — the whole addendum is additive and re-runnable.
--
-- `image_url` stays the cover for every kind, so the blog list, the profile page
-- and the trending shelves need no changes: a video post still renders exactly
-- like an article, with a poster frame as its cover.
create table if not exists public.post_media (
  -- Composite key: one row per asset, so a photo set is several rows rather than
  -- an array, which keeps each file individually addressable and deletable.
  post_id     uuid   not null references public.posts(id) on delete cascade,
  position    int    not null,
  url         text   not null,
  -- 'image' | 'video'. Kept on the row as well as on the post so a mixed set
  -- (cover photo + clips) is representable.
  kind        text   not null default 'image' check (kind in ('image', 'video')),
  -- Seconds. Null for images; used to label and sort video posts.
  duration_s  int    check (duration_s is null or duration_s >= 0),
  width       int    check (width  is null or width  > 0),
  height      int    check (height is null or height > 0),
  -- Poster frame for a video, so a card never shows a black rectangle.
  poster_url  text,
  alt_text    text,
  created_at  timestamptz not null default now(),
  primary key (post_id, position)
);

create index if not exists idx_post_media_post_id on public.post_media (post_id);

alter table public.posts
  add column if not exists content_type text not null default 'article'
    check (content_type in ('article', 'photo', 'video')),
  add column if not exists video_url text,
  add column if not exists video_duration_s int
    check (video_duration_s is null or video_duration_s >= 0);

-- A video post needs a video; anything else must not claim one. Enforced in the
-- database rather than only in the form, because RLS lets a client write any
-- column it likes and a malformed row would break every player that trusts it.
alter table public.posts
  drop constraint if exists posts_video_consistent;
alter table public.posts
  add constraint posts_video_consistent check (
    (content_type = 'video' and video_url is not null)
    or (content_type <> 'video' and video_url is null)
  );

-- Partial index: the feeds filter on this constantly, and it is true for a
-- small minority of rows, so indexing all of them would be mostly wasted space.
create index if not exists idx_posts_content_type
  on public.posts (content_type) where content_type <> 'article';

-- RLS on the child table. Without these the asset rows would be readable and
-- writable by anyone, which is why they are created here rather than relying on
-- the parent table's policies — RLS does not cascade.
alter table public.post_media enable row level security;

drop policy if exists "post_media_public_read" on public.post_media;
create policy "post_media_public_read" on public.post_media
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and (p.published = true or p.user_id = auth.uid())
    )
  );

drop policy if exists "post_media_owner_write" on public.post_media;
create policy "post_media_owner_write" on public.post_media
  for insert with check (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

drop policy if exists "post_media_owner_update" on public.post_media;
create policy "post_media_owner_update" on public.post_media
  for update using (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

drop policy if exists "post_media_owner_delete" on public.post_media;
create policy "post_media_owner_delete" on public.post_media
  for delete using (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

-- Media buckets. Separate from `post-images` so the size limit and the accepted
-- MIME list can differ per kind: a video is orders of magnitude larger than a
-- photo, and one shared limit would have to be the larger of the two for both.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-videos', 'post-videos', true, 104857600,
   array['video/mp4','video/webm','video/quicktime','video/ogg']),
  ('post-photos', 'post-photos', true, 8388608,
   array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- Storage RLS for the media buckets. Same `<userId>/<file>` shape the delete
-- policies match on: `(storage.foldername(name))[1] = auth.uid()`. The underscore
-- form is wrong here for the same reason it is wrong everywhere else — a UUID is
-- full of hyphens, so splitting on '-' never yields the id.
drop policy if exists "post_videos_owner_insert" on storage.objects;
create policy "post_videos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_videos_owner_update" on storage.objects;
create policy "post_videos_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_videos_owner_delete" on storage.objects;
create policy "post_videos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_photos_owner_insert" on storage.objects;
create policy "post_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_photos_owner_update" on storage.objects;
create policy "post_photos_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_photos_owner_delete" on storage.objects;
create policy "post_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- 11. Collaborative Filtering Scores
-- ------------------------------------------------------------
create table if not exists public.cf_user_scores (
  -- uuid + FK to match profiles.id, instead of an unconstrained text column.
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  post_id    uuid   not null references public.posts(id) on delete cascade,
  cf_score   float8 not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists idx_cf_user_scores_post_id
  on public.cf_user_scores (post_id);

alter table public.cf_user_scores enable row level security;

-- A user can see their own recommendation scores; writes are expected to
-- come from a service-role process (the recs engine), which bypasses RLS.
drop policy if exists "cf_scores_owner_read" on public.cf_user_scores;
create policy "cf_scores_owner_read" on public.cf_user_scores
  for select using (auth.uid() = user_id);

-- Note: no duplicate "public read" policy is added on public.posts here —
-- posts_public_read (published = true) and posts_owner_read_own already
-- cover it correctly. Adding using (true) again would OR in unrestricted
-- access to unpublished drafts.

create table if not exists public.pagerank_scores (
  post_id    uuid        primary key references public.posts(id) on delete cascade,
  pr_score   float8      not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_pagerank_scores_post_id on public.pagerank_scores(post_id);

create or replace function public.match_posts(
  query_embedding extensions.vector(384),
  match_count int default 20
)
returns table (id uuid, similarity float8)
language sql stable
as $$
  -- The cosine-distance operator is owned by the pgvector extension, which is
  -- installed into the `extensions` schema (section 10). Spelling it as
  -- `embedding <=> query_embedding` only resolves when `extensions` happens to
  -- be on the session search_path, so pin the operator to its schema instead.
  select
    p.id,
    1 - (p.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.posts p
  where p.published = true
    and p.embedding is not null
  order by p.embedding OPERATOR(extensions.<=>) query_embedding
  limit match_count;
$$;
