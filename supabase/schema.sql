-- ============================================================
--  Nature Index — Supabase / PostgreSQL Schema  (v2)
--  Compatible with: Supabase (postgres 15+)
--  Run this in: Supabase SQL Editor (New Query)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images', 'post-images', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comment-images', 'comment-images', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 3145728,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
) on conflict (id) do nothing;

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
  base_username  text;
  final_username text;
  counter        int := 0;
begin
  base_username := lower(
    regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_-]', '', 'g')
  );
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
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select using (true);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles for update
  using     (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read"
  on public.posts for select using (published = true);

drop policy if exists "posts_owner_read_own" on public.posts;
create policy "posts_owner_read_own"
  on public.posts for select using (auth.uid() = user_id);

drop policy if exists "posts_owner_insert" on public.posts;
create policy "posts_owner_insert"
  on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "posts_owner_update" on public.posts;
create policy "posts_owner_update"
  on public.posts for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "posts_owner_delete" on public.posts;
create policy "posts_owner_delete"
  on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "comments_public_read" on public.comments;
create policy "comments_public_read"
  on public.comments for select using (true);

drop policy if exists "comments_auth_insert" on public.comments;
create policy "comments_auth_insert"
  on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "comments_owner_update" on public.comments;
create policy "comments_owner_update"
  on public.comments for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "comments_owner_delete" on public.comments;
create policy "comments_owner_delete"
  on public.comments for delete using (auth.uid() = user_id);

drop policy if exists "post_images_public_read" on storage.objects;
create policy "post_images_public_read"
  on storage.objects for select using (bucket_id = 'post-images');

drop policy if exists "post_images_auth_insert" on storage.objects;
create policy "post_images_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

drop policy if exists "post_images_owner_delete" on storage.objects;
create policy "post_images_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "comment_images_public_read" on storage.objects;
create policy "comment_images_public_read"
  on storage.objects for select using (bucket_id = 'comment-images');

drop policy if exists "comment_images_auth_insert" on storage.objects;
create policy "comment_images_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'comment-images' and auth.role() = 'authenticated');

drop policy if exists "comment_images_owner_delete" on storage.objects;
create policy "comment_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'comment-images'
    and auth.uid()::text = split_part(name, '-', 1)
  );

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_insert" on storage.objects;
create policy "avatars_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '-', 1)
  );

create or replace view public.posts_with_author as
  select
    p.*,
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
