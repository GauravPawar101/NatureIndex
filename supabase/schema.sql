-- Supabase schema updates for Tiptap HTML posts + image uploads
--
-- Notes:
-- - This project currently uses Supabase Auth (via @supabase/auth-helpers-nextjs).
-- - If your `posts.content` already exists, the ALTER below is a no-op.

-- 1) Ensure the posts table has a `content` column to store HTML.
alter table public.posts
add column if not exists content text;

-- Full-text search (title + HTML content)
alter table public.posts
add column if not exists search_vector tsvector;

create or replace function public.posts_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(
      to_tsvector(
        'english',
        coalesce(regexp_replace(coalesce(new.content, ''), '<[^>]+>', ' ', 'g'), '')
      ),
      'B'
    );
  return new;
end
$$;

drop trigger if exists posts_search_vector_trg on public.posts;
create trigger posts_search_vector_trg
before insert or update of title, content
on public.posts
for each row
execute function public.posts_search_vector_update();

-- Backfill for existing rows
update public.posts
set search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g'), '')), 'B')
where search_vector is null;

create index if not exists posts_search_vector_gin_idx
on public.posts
using gin (search_vector);

-- Draft/publish status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type public.post_status as enum ('draft', 'published');
  end if;
end
$$;

alter table public.posts
add column if not exists status public.post_status;

-- Preserve existing content as published (so current public posts stay visible)
update public.posts
set status = 'published'
where status is null;

alter table public.posts
alter column status set default 'draft';

alter table public.posts
alter column status set not null;

create index if not exists posts_status_idx on public.posts(status);

-- 1a.1) Posts RLS (Clerk)
-- Assumptions:
-- - `public.posts.author_id` stores the Clerk user id (e.g., "user_...").
-- - The client passes a Clerk JWT (template "supabase") as `Authorization: Bearer <token>`.
alter table public.posts
add column if not exists author_id text;

-- View counters (for analytics)
alter table public.posts
add column if not exists views bigint not null default 0;

-- Best-effort backfill for existing rows.
-- If your legacy column was `user_id` (uuid/text), this will copy it to author_id as text.
update public.posts
set author_id = coalesce(author_id, public.posts.user_id::text)
where author_id is null;

alter table public.posts enable row level security;

-- Anyone can read published posts
drop policy if exists "public read published posts" on public.posts;
create policy "public read published posts"
on public.posts
for select
using (status = 'published');

-- Authors/admins need to be able to read their own drafts in dashboard
drop policy if exists "auth read own posts" on public.posts;
create policy "auth read own posts"
on public.posts
for select
to authenticated
using (author_id = (auth.jwt() ->> 'sub'));

-- Only the author can insert/update/delete their own posts
drop policy if exists "auth insert own posts" on public.posts;
create policy "auth insert own posts"
on public.posts
for insert
to authenticated
with check (author_id = (auth.jwt() ->> 'sub'));

-- 1a.2) Author profiles synced from Clerk
-- This extends the existing `public.profiles` table (commonly created by Supabase starters).
-- We keep legacy columns (`id`, `full_name`) and add Clerk-centric columns.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  username text,
  full_name text,
  bio text,
  avatar_url text,
  twitter text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists user_id text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists twitter text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;

update public.profiles set created_at = coalesce(created_at, now()) where created_at is null;
update public.profiles set updated_at = coalesce(updated_at, now()) where updated_at is null;

create unique index if not exists profiles_user_id_unique on public.profiles(user_id);
create unique index if not exists profiles_username_unique on public.profiles(username);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles"
on public.profiles
for select
using (true);

drop policy if exists "auth update own profile" on public.profiles;
create policy "auth update own profile"
on public.profiles
for update
to authenticated
using (user_id = (auth.jwt() ->> 'sub'))
with check (user_id = (auth.jwt() ->> 'sub'));

-- Optional: allow authenticated users to insert their own profile (webhook uses service role anyway)
drop policy if exists "auth insert own profile" on public.profiles;
create policy "auth insert own profile"
on public.profiles
for insert
to authenticated
with check (user_id = (auth.jwt() ->> 'sub'));

-- Add a relationship so you can join posts -> profiles via Clerk user id
-- (requires profiles.user_id to be unique, which is ensured above).
alter table public.posts
  drop constraint if exists posts_author_id_fkey;
alter table public.posts
  add constraint posts_author_id_fkey
  foreign key (author_id)
  references public.profiles(user_id)
  on delete set null;

drop policy if exists "auth update own posts" on public.posts;
create policy "auth update own posts"
on public.posts
for update
to authenticated
using (author_id = (auth.jwt() ->> 'sub'))
with check (author_id = (auth.jwt() ->> 'sub'));

drop policy if exists "auth delete own posts" on public.posts;
create policy "auth delete own posts"
on public.posts
for delete
to authenticated
using (author_id = (auth.jwt() ->> 'sub'));

-- 1a.1b) View analytics (daily aggregates)
-- Raw view events (for contribution-style heatmaps)
-- NOTE: This is an append-only event table; consider partitioning later if it grows large.
create table if not exists public.views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists views_post_id_viewed_at_idx on public.views(post_id, viewed_at);
create index if not exists views_viewed_at_idx on public.views(viewed_at);

alter table public.views enable row level security;

create table if not exists public.post_views_daily (
  post_id uuid not null references public.posts(id) on delete cascade,
  day date not null,
  views bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_views_daily_pk primary key (post_id, day)
);

create index if not exists post_views_daily_day_idx on public.post_views_daily(day);

drop trigger if exists post_views_daily_set_updated_at on public.post_views_daily;
create trigger post_views_daily_set_updated_at
before update on public.post_views_daily
for each row
execute function public.set_updated_at();

alter table public.post_views_daily enable row level security;

drop policy if exists "auth read own post views daily" on public.post_views_daily;
create policy "auth read own post views daily"
on public.post_views_daily
for select
to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_views_daily.post_id
      and p.author_id = (auth.jwt() ->> 'sub')
  )
);

-- Increment views securely from the client via RPC.
-- NOTE: This is a basic counter (not unique visitors).
create or replace function public.increment_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  -- Only count views for published posts. Prevents inflating drafts by guessing UUIDs.
  if not exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.status = 'published'
  ) then
    return;
  end if;

  insert into public.views (post_id, viewed_at)
  values (p_post_id, now());

  update public.posts
  set views = coalesce(views, 0) + 1
  where id = p_post_id;

  insert into public.post_views_daily (post_id, day, views)
  values (p_post_id, v_day, 1)
  on conflict (post_id, day)
  do update set views = public.post_views_daily.views + 1;
end;
$$;

grant execute on function public.increment_post_view(uuid) to anon, authenticated;

-- Heatmap aggregation: daily views for last N days for a given author.
-- Returns a complete day series (including zeros) so the client can render a GitHub-style grid.
create or replace function public.author_views_heatmap(p_author_id text, p_days int default 365)
returns table(day date, views bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_author_id is null or p_author_id = '' then
    raise exception 'p_author_id is required';
  end if;

  if (auth.jwt() ->> 'sub') is null or p_author_id <> (auth.jwt() ->> 'sub') then
    raise exception 'not authorized';
  end if;

  return query
  with days as (
    select generate_series(
      (current_date - (greatest(p_days, 1) - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date as day
  ), counts as (
    select
      (v.viewed_at at time zone 'utc')::date as day,
      count(*)::bigint as views
    from public.views v
    join public.posts p
      on p.id = v.post_id
     and p.author_id = p_author_id
    where v.viewed_at >= (current_date - (greatest(p_days, 1) - 1) * interval '1 day')
      and v.viewed_at < (current_date + 1)
    group by 1
  )
  select
    d.day,
    coalesce(c.views, 0)::bigint as views
  from days d
  left join counts c
    on c.day = d.day
  order by d.day asc;
end;
$$;

grant execute on function public.author_views_heatmap(text, int) to authenticated;

-- Aggregation RPCs for analytics dashboard
create or replace function public.author_views_timeseries(p_author_id text, p_days int default 30)
returns table(day date, views bigint)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - (greatest(p_days, 1) - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    coalesce(sum(pvd.views), 0)::bigint as views
  from days d
  left join public.post_views_daily pvd
    on pvd.day = d.day
  left join public.posts p
    on p.id = pvd.post_id
   and p.author_id = p_author_id
  group by d.day
  order by d.day asc;
$$;

grant execute on function public.author_views_timeseries(text, int) to authenticated;

create or replace function public.author_follower_timeseries(p_author_id text, p_days int default 30)
returns table(day date, follower_count bigint)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - (greatest(p_days, 1) - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    (
      select count(*)::bigint
      from public.follows f
      where f.following_id = p_author_id
        and f.created_at < (d.day + 1)
    ) as follower_count
  from days d
  order by d.day asc;
$$;

grant execute on function public.author_follower_timeseries(text, int) to authenticated;

-- 1a.3) Follow system
create table if not exists public.follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  constraint follows_pk primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id),
  constraint follows_follower_fkey foreign key (follower_id) references public.profiles(user_id) on delete cascade,
  constraint follows_following_fkey foreign key (following_id) references public.profiles(user_id) on delete cascade
);

alter table public.follows enable row level security;

drop policy if exists "auth read follows" on public.follows;
create policy "auth read follows"
on public.follows
for select
to authenticated
using (true);

drop policy if exists "auth follow" on public.follows;
create policy "auth follow"
on public.follows
for insert
to authenticated
with check (follower_id = (auth.jwt() ->> 'sub'));

drop policy if exists "auth unfollow" on public.follows;
create policy "auth unfollow"
on public.follows
for delete
to authenticated
using (follower_id = (auth.jwt() ->> 'sub'));

-- 1a.4) Bookmarks (personal reading list)
create table if not exists public.bookmarks (
  user_id text not null,
  post_id uuid not null,
  created_at timestamptz not null default now(),
  constraint bookmarks_pk primary key (user_id, post_id),
  constraint bookmarks_user_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade,
  constraint bookmarks_post_fkey foreign key (post_id) references public.posts(id) on delete cascade
);

-- 1a.5) Webhooks (external service integrations)
-- Each author can register one or more endpoints that receive a signed POST payload
-- when a post is published.
create table if not exists public.webhooks (
  user_id text not null,
  url text not null,
  secret text not null,
  created_at timestamptz not null default now(),
  constraint webhooks_pk primary key (user_id, url),
  constraint webhooks_secret_nonempty check (length(secret) > 0)
);

create index if not exists webhooks_user_id_idx on public.webhooks(user_id);

alter table public.webhooks enable row level security;

drop policy if exists "auth read own webhooks" on public.webhooks;
create policy "auth read own webhooks"
on public.webhooks
for select
to authenticated
using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "auth insert own webhooks" on public.webhooks;
create policy "auth insert own webhooks"
on public.webhooks
for insert
to authenticated
with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "auth update own webhooks" on public.webhooks;
create policy "auth update own webhooks"
on public.webhooks
for update
to authenticated
using (user_id = (auth.jwt() ->> 'sub'))
with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "auth delete own webhooks" on public.webhooks;
create policy "auth delete own webhooks"
on public.webhooks
for delete
to authenticated
using (user_id = (auth.jwt() ->> 'sub'));

-- 1a.6) Post version history
-- Stores snapshots of previous title/content whenever an author updates a post.
create table if not exists public.post_versions (
  id bigint generated by default as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  title text,
  content text,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists post_versions_post_id_updated_at_idx
on public.post_versions(post_id, updated_at desc);

alter table public.post_versions enable row level security;

drop policy if exists "auth read own post versions" on public.post_versions;
create policy "auth read own post versions"
on public.post_versions
for select
to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_versions.post_id
      and p.author_id = (auth.jwt() ->> 'sub')
  )
);

-- Trigger to snapshot old versions
create or replace function public.save_post_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_by text := coalesce((auth.jwt() ->> 'sub'), old.author_id, new.author_id);
begin
  -- Only snapshot when content-bearing fields change.
  if (old.title is distinct from new.title) or (old.content is distinct from new.content) then
    insert into public.post_versions (post_id, title, content, updated_at, updated_by)
    values (old.id, old.title, old.content, now(), v_updated_by);
  end if;

  return new;
end;
$$;

drop trigger if exists posts_save_version_trg on public.posts;
create trigger posts_save_version_trg
before update on public.posts
for each row
execute function public.save_post_version();

create index if not exists bookmarks_user_created_at_idx on public.bookmarks(user_id, created_at desc);
create index if not exists bookmarks_post_id_idx on public.bookmarks(post_id);

alter table public.bookmarks enable row level security;

drop policy if exists "auth read own bookmarks" on public.bookmarks;
create policy "auth read own bookmarks"
on public.bookmarks
for select
to authenticated
using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "auth bookmark" on public.bookmarks;
create policy "auth bookmark"
on public.bookmarks
for insert
to authenticated
with check (
  user_id = (auth.jwt() ->> 'sub')
  and exists (
    select 1 from public.posts p
    where p.id = bookmarks.post_id
      and p.status = 'published'
  )
);

drop policy if exists "auth unbookmark" on public.bookmarks;
create policy "auth unbookmark"
on public.bookmarks
for delete
to authenticated
using (user_id = (auth.jwt() ->> 'sub'));

-- 1b) Tagging system
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint tags_name_unique unique (name),
  constraint tags_slug_unique unique (slug)
);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag_id)
);

create index if not exists post_tags_post_id_idx on public.post_tags(post_id);
create index if not exists post_tags_tag_id_idx on public.post_tags(tag_id);

-- 1c) Comments (Clerk-auth + Supabase Realtime)
-- Matches required columns: id, post_id, user_id, user_name, content, created_at
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- If an existing comments table already exists, ensure required columns exist.
alter table public.comments add column if not exists post_id uuid;
alter table public.comments add column if not exists user_id text;
alter table public.comments add column if not exists user_name text;
alter table public.comments add column if not exists content text;
alter table public.comments add column if not exists created_at timestamptz;

create index if not exists comments_post_id_created_at_idx on public.comments(post_id, created_at);

-- RLS policies
alter table public.comments enable row level security;

-- Public can read comments for published posts
drop policy if exists "public read comments for published posts" on public.comments;
create policy "public read comments for published posts"
on public.comments
for select
using (
  exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and p.status = 'published'
  )
);

-- Authenticated users can create comments as themselves
drop policy if exists "auth insert own comments" on public.comments;
create policy "auth insert own comments"
on public.comments
for insert
to authenticated
with check (
  user_id = (auth.jwt() ->> 'sub')
  and user_name is not null
  and length(trim(user_name)) > 0
  and content is not null
  and length(trim(content)) > 0
);

-- (Optional) Authors can delete their own comments
drop policy if exists "auth delete own comments" on public.comments;
create policy "auth delete own comments"
on public.comments
for delete
to authenticated
using (user_id = (auth.jwt() ->> 'sub'));

-- Enable Supabase Realtime for this table (required for live updates)
do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end$$;

-- 1d) Reactions / Likes (one like per user per post)
create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists reactions_post_id_idx on public.reactions(post_id);

alter table public.reactions enable row level security;

-- Allow authenticated users to view their own reactions (for "liked" state)
drop policy if exists "auth read own reactions" on public.reactions;
create policy "auth read own reactions"
on public.reactions
for select
to authenticated
using (user_id = (auth.jwt() ->> 'sub'));

-- Allow authenticated users to like as themselves
drop policy if exists "auth insert own reactions" on public.reactions;
create policy "auth insert own reactions"
on public.reactions
for insert
to authenticated
with check (
  user_id = (auth.jwt() ->> 'sub')
  and exists (
    select 1 from public.posts p
    where p.id = reactions.post_id
      and p.status = 'published'
  )
);

-- Allow authenticated users to unlike their own reactions
drop policy if exists "auth delete own reactions" on public.reactions;
create policy "auth delete own reactions"
on public.reactions
for delete
to authenticated
using (user_id = (auth.jwt() ->> 'sub'));

-- Public count helpers (do NOT expose user_id to anon)
create or replace function public.reaction_count(p_post_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.reactions r
  join public.posts p on p.id = r.post_id
  where r.post_id = p_post_id
    and p.status = 'published';
$$;

create or replace function public.reaction_counts(p_post_ids uuid[])
returns table (post_id uuid, count bigint)
language sql
security definer
set search_path = public
as $$
  select r.post_id, count(*)::bigint as count
  from public.reactions r
  join public.posts p on p.id = r.post_id
  where r.post_id = any(p_post_ids)
    and p.status = 'published'
  group by r.post_id;
$$;

grant execute on function public.reaction_count(uuid) to anon, authenticated;
grant execute on function public.reaction_counts(uuid[]) to anon, authenticated;

-- 1e) Related posts (by shared tags)
create or replace function public.related_posts(p_post_id uuid, p_limit int default 3)
returns table (
  id uuid,
  slug text,
  title text,
  excerpt text,
  date timestamptz,
  image_url text,
  username text,
  match_count bigint
)
language sql
security definer
set search_path = public
as $$
  with current_tags as (
    select pt.tag_id
    from public.post_tags pt
    where pt.post_id = p_post_id
  )
  select
    p.id,
    p.slug,
    p.title,
    p.excerpt,
    p.date,
    p.image_url,
    pr.username,
    count(*)::bigint as match_count
  from public.post_tags pt
  join current_tags ct on ct.tag_id = pt.tag_id
  join public.posts p on p.id = pt.post_id
  left join public.profiles pr on pr.id = p.user_id
  where pt.post_id <> p_post_id
    and p.status = 'published'
  group by p.id, pr.username
  order by match_count desc, p.date desc
  limit greatest(0, least(coalesce(p_limit, 3), 10));
$$;

grant execute on function public.related_posts(uuid, int) to anon, authenticated;

-- 1f) Search RPC (uses to_tsquery)
create or replace function public.search_posts(p_query text, p_limit int default 8)
returns table (
  id uuid,
  slug text,
  title text,
  excerpt text,
  date timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw text;
  token text;
  tokens text[];
  tsq text;
begin
  raw := coalesce(trim(p_query), '');
  if raw = '' then
    return;
  end if;

  tokens := regexp_split_to_array(lower(raw), '\s+');
  tsq := '';

  foreach token in array tokens loop
    token := regexp_replace(token, '[^a-z0-9_]+', '', 'g');
    if token is null or length(token) < 2 then
      continue;
    end if;

    if tsq <> '' then
      tsq := tsq || ' & ';
    end if;
    tsq := tsq || token || ':*';
  end loop;

  if tsq = '' then
    return;
  end if;

  return query
  select
    p.id,
    p.slug,
    p.title,
    p.excerpt,
    p.date
  from public.posts p
  where p.status = 'published'
    and p.search_vector @@ to_tsquery('english', tsq)
  order by ts_rank_cd(p.search_vector, to_tsquery('english', tsq)) desc, p.date desc
  limit greatest(0, least(coalesce(p_limit, 8), 20));
end;
$$;

grant execute on function public.search_posts(text, int) to anon, authenticated;

-- 1f) Search RPC (uses to_tsquery)
create or replace function public.search_posts(p_query text, p_limit int default 8)
returns table (
  id uuid,
  slug text,
  title text,
  excerpt text,
  date timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw text;
  token text;
  tokens text[];
  tsq text;
begin
  raw := coalesce(trim(p_query), '');
  if raw = '' then
    return;
  end if;

  tokens := regexp_split_to_array(lower(raw), '\s+');
  tsq := '';

  foreach token in array tokens loop
    token := regexp_replace(token, '[^a-z0-9_]+', '', 'g');
    if token is null or length(token) < 2 then
      continue;
    end if;

    if tsq <> '' then
      tsq := tsq || ' & ';
    end if;
    tsq := tsq || token || ':*';
  end loop;

  if tsq = '' then
    return;
  end if;

  return query
  select
    p.id,
    p.slug,
    p.title,
    p.excerpt,
    p.date
  from public.posts p
  where p.status = 'published'
    and p.search_vector @@ to_tsquery('english', tsq)
  order by ts_rank_cd(p.search_vector, to_tsquery('english', tsq)) desc, p.date desc
  limit greatest(0, least(coalesce(p_limit, 8), 20));
end;
$$;

grant execute on function public.search_posts(text, int) to anon, authenticated;

-- Optional RLS policies (enable if you use RLS on these tables)
-- alter table public.tags enable row level security;
-- alter table public.post_tags enable row level security;
--
-- -- Allow anyone to read tags (for typeahead)
-- drop policy if exists "public read tags" on public.tags;
-- create policy "public read tags"
-- on public.tags
-- for select
-- using (true);
--
-- -- Allow authenticated users to create tags
-- drop policy if exists "auth insert tags" on public.tags;
-- create policy "auth insert tags"
-- on public.tags
-- for insert
-- to authenticated
-- with check (true);
--
-- -- Allow authors to manage their post_tags rows
-- drop policy if exists "author manage post_tags" on public.post_tags;
-- create policy "author manage post_tags"
-- on public.post_tags
-- for all
-- to authenticated
-- using (
--   exists (
--     select 1 from public.posts p
--     where p.id = post_id
--       and p.user_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1 from public.posts p
--     where p.id = post_id
--       and p.user_id = auth.uid()
--   )
-- );

-- (Optional, but common)
-- alter table public.posts
-- alter column content set not null;

-- 2) Supabase Storage bucket for uploaded images.
-- Create the bucket in the dashboard OR via SQL below.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

-- 3) Storage policies
-- Enable RLS for storage.objects (usually enabled by default in Supabase projects)
alter table storage.objects enable row level security;

-- Allow authenticated users to upload into their own folder: `{auth.uid()}/{uuid}.{ext}`
drop policy if exists "upload own post images" on storage.objects;
create policy "upload own post images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own uploads
drop policy if exists "delete own post images" on storage.objects;
create policy "delete own post images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
