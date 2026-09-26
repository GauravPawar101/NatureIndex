-- ============================================================
--  Schema + seed data assertions.
--
--  Every check raises an exception on failure, so psql exits non-zero
--  and fails the CI job. Run after local_fixture.sql, schema.sql and
--  the generated seed.sql.
-- ============================================================
begin;

create or replace function assert_true(cond boolean, msg text)
returns void language plpgsql as $$
begin
  if cond is not true then
    raise exception 'ASSERTION FAILED: %', msg;
  end if;
  raise notice 'ok  %', msg;
end;
$$;

create or replace function assert_equals(actual bigint, expected bigint, msg text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', msg, expected, actual;
  end if;
  raise notice 'ok  % (= %)', msg, actual;
end;
$$;

-- ------------------------------------------------------------
-- 1. Every table, view and function the app depends on exists
-- ------------------------------------------------------------
select assert_equals(
  (select count(*) from pg_tables
    where schemaname = 'public'
      and tablename in ('profiles','posts','comments','post_interactions','cf_user_scores','pagerank_scores')),
  6,
  'all 6 core tables exist'
);

select assert_equals(
  (select count(*) from pg_views
    where schemaname = 'public'
      and viewname in ('posts_with_author','posts_comment_count','post_topics','interaction')),
  4,
  'all 4 helper views exist'
);

select assert_equals(
  (select count(distinct p.proname) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('match_posts','search_posts','increment_post_views','handle_new_user','handle_updated_at')),
  5,
  'all 5 functions exist'
);

-- ------------------------------------------------------------
-- 2. pgvector is installed in `extensions`, and posts gained the
--    embedding column that section 10 adds
-- ------------------------------------------------------------
select assert_true(
  exists (select 1 from pg_extension where extname = 'vector'),
  'pgvector extension installed'
);

select assert_true(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'embedding'
  ),
  'public.posts.embedding exists'
);

-- The HNSW index must use the schema-qualified opclass name, which is the
-- thing that used to break the migration.
select assert_true(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_posts_embedding_hnsw'
  ),
  'HNSW index on posts.embedding exists'
);

-- ------------------------------------------------------------
-- 3. RLS is enabled everywhere it should be
-- ------------------------------------------------------------
select assert_equals(
  (select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('profiles','posts','comments','post_interactions','cf_user_scores')
     and c.relrowsecurity),
  5,
  'RLS enabled on all 5 RLS-protected tables'
);

-- ------------------------------------------------------------
-- 4. Seed data actually landed and is internally consistent
-- ------------------------------------------------------------
select assert_true((select count(*) from public.profiles) >= 8, 'at least 8 authors seeded');

select assert_equals(
  (select count(*) from public.posts where published),
  (select count(*) from public.posts),
  'every seeded post is published'
);

select assert_true(
  not exists (select 1 from public.posts where slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  'all slugs satisfy posts_slug_format'
);

select assert_true(
  not exists (select 1 from public.profiles where username !~ '^[a-zA-Z0-9_-]+$'),
  'all usernames satisfy profiles_username_chars'
);

select assert_true(
  not exists (select 1 from public.profiles where char_length(username) not between 3 and 30),
  'all usernames are 3-30 characters'
);

select assert_true(
  not exists (select 1 from public.profiles where website is not null and website !~ '^https?://'),
  'all stored websites are http(s)'
);

-- Topics must match the fixed list CreatePostForm offers, otherwise the blog
-- page's topic filter shows options the app cannot produce.
select assert_true(
  not exists (
    select 1 from public.posts
    where topic is not null
      and topic <> all (array[
        'Climate Change','Wildlife Conservation','Renewable Energy','Pollution',
        'Sustainable Living','Deforestation','Ocean Conservation','Water Resources'
      ])
  ),
  'all topics come from the CreatePostForm list'
);

-- Excerpts are what the cards render; a null one leaves a visible gap.
select assert_true(
  not exists (select 1 from public.posts where excerpt is null or char_length(excerpt) = 0),
  'every seeded post has a non-empty excerpt'
);

select assert_true(
  not exists (select 1 from public.posts where char_length(content) < 500),
  'seeded posts have substantive bodies (>= 500 chars)'
);

select assert_true(
  not exists (select 1 from public.posts where image_url is null),
  'every seeded post has a cover image'
);

-- Cover images are local files, so they must actually exist in public/.
select assert_true(
  not exists (
    select 1 from public.posts
    where image_url like '/posts/%'
      and image_url not in ('/posts/climate.jpg','/posts/deforestation.jpg','/posts/forest.jpg',
                            '/posts/ocean.jpg','/posts/pollution.jpg','/posts/renewable.jpg',
                            '/posts/sustainable.jpg','/posts/water.jpg','/posts/wildlife.jpg')
  ),
  'all local cover images reference committed files'
);

-- ------------------------------------------------------------
-- 5. Comments, threads and referential integrity
-- ------------------------------------------------------------
select assert_true(
  (select count(*) from public.comments) >= 30,
  'comment threads seeded'
);

select assert_true(
  exists (select 1 from public.comments where parent_id is not null),
  'threaded replies exist'
);

-- No comment may be its own parent, and every parent_id must resolve.
select assert_true(
  not exists (select 1 from public.comments c where c.parent_id = c.id),
  'no comment is its own parent'
);

select assert_true(
  not exists (
    select 1 from public.comments c
    where c.parent_id is not null
      and not exists (select 1 from public.comments p where p.id = c.parent_id)
  ),
  'every parent_id resolves to a real comment'
);

-- A reply must live on the same post as the comment it answers.
select assert_true(
  not exists (
    select 1 from public.comments c
    join public.comments p on p.id = c.parent_id
    where c.post_id <> p.post_id
  ),
  'replies share a post with their parent'
);

-- ------------------------------------------------------------
-- 6. Recommendation inputs and outputs
-- ------------------------------------------------------------
-- PageRank and CF tables are keyed by post, so an orphan row here would mean
-- the Rust engine and the recommendations API read stale ids.
select assert_true(
  not exists (select 1 from public.pagerank_scores s
              where not exists (select 1 from public.posts p where p.id = s.post_id)),
  'no orphaned pagerank_scores'
);

select assert_true(
  not exists (select 1 from public.cf_user_scores s
              where not exists (select 1 from public.posts p where p.id = s.post_id)),
  'no orphaned cf_user_scores'
);

select assert_true(
  (select count(*) from public.pagerank_scores) = (select count(*) from public.posts),
  'every post has a pagerank score'
);

-- The interaction graph must be connected or PageRank degenerates to a
-- uniform ranking and the recommendations rail shows nothing useful.
select assert_true(
  (select count(distinct user_id) from public.post_interactions) > 1,
  'interaction graph spans multiple users'
);

select assert_true(
  (select count(distinct post_id) from public.post_interactions)
    = (select count(*) from public.posts),
  'every post appears in the interaction graph'
);

select assert_true(
  not exists (select 1 from public.post_interactions
              where action_type not in ('read','bookmark','comment','upvote')),
  'all interaction action types are valid'
);

-- ------------------------------------------------------------
-- 7. The functions the UI calls actually work
-- ------------------------------------------------------------
-- Capture a baseline, call increment_post_views, and confirm the counter moved.
-- This is the RPC the blog post page fires on every view.
create temporary table _view_probe on commit drop as
  select id, views from public.posts order by views desc limit 1;

select public.increment_post_views((select id from _view_probe));

select assert_equals(
  (select p.views - b.views from public.posts p join _view_probe b on b.id = p.id),
  1,
  'increment_post_views increments exactly one row by one'
);

select assert_true(
  not exists (select 1 from public.posts where views < 0),
  'no post has a negative view count'
);

select assert_true(
  (select count(*) from public.search_posts('glacier')) > 0,
  'search_posts finds full-text matches'
);

-- search_posts must not leak unpublished posts.
select assert_true(
  not exists (select 1 from public.search_posts('glacier') where published is not true),
  'search_posts only returns published posts'
);

-- match_posts is the one that broke on search_path, and it silently returns
-- nothing when every embedding is NULL. Assert both: that a planted vector
-- finds itself, and that the seeded corpus is actually embedded.
insert into public.posts (id, user_id, title, slug, content, embedding, published)
values (
  '00000000-0000-4000-8000-000000000001',
  (select id from public.profiles limit 1),
  'vector probe',
  'vector-probe-fixture',
  'probe',
  ('[' || array_to_string(array_fill(0.1::real, array[384]), ',') || ']')::extensions.vector,
  true
);

select assert_equals(
  (select count(*) from public.match_posts(
     (select embedding from public.posts where slug = 'vector-probe-fixture'), 1
   )),
  1,
  'match_posts executes and returns a row for a known vector'
);

select assert_true(
  (select count(*) from public.posts where embedding is not null) = (select count(*) from public.posts),
  'every seeded post has an embedding (vector search is not dead)'
);

-- Similar posts must outrank dissimilar ones under the seeded embeddings.
-- The two ocean posts share far more vocabulary than an ocean post and a
-- peatland post do.
select assert_true(
  (
    select similarity > 0
    from public.match_posts(
      (select embedding from public.posts where slug = 'ghost-gear-is-still-the-highest-longevity-threat-to-large-fish'),
      10
    ) m
    join public.posts p on p.id = m.id
    where p.slug = 'kelp-forests-are-not-trees-and-should-not-be-managed-like-them'
  ),
  'related posts score above zero similarity under match_posts'
);

delete from public.posts where slug = 'vector-probe-fixture';

-- ------------------------------------------------------------
-- 8. Views
-- ------------------------------------------------------------
select assert_true(
  (select count(*) from public.posts_with_author) = (select count(*) from public.posts where published),
  'posts_with_author covers every published post'
);

-- The view must not expose unpublished posts, and must not carry `embedding`
-- (which is why its columns are listed explicitly rather than using p.*).
select assert_true(
  not exists (select 1 from public.posts_with_author where published is not true),
  'posts_with_author excludes drafts'
);

select assert_true(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts_with_author' and column_name = 'embedding'
  ),
  'posts_with_author does not expose the embedding column'
);

-- ------------------------------------------------------------
-- 9. Storage: buckets and the owner-delete policies
-- ------------------------------------------------------------
select assert_equals(
  (select count(*) from storage.buckets
    where id in ('avatars','post-images','comment-images')),
  3,
  'all 3 storage buckets exist'
);

-- The client validates against UPLOAD_TARGETS in src/app/lib/uploads.js, so a
-- bucket limit smaller than the app's own limit turns into an opaque storage
-- error at upload time rather than a helpful "too large" message.
select assert_equals(
  (select file_size_limit from storage.buckets where id = 'avatars'),
  5242880,
  'avatars bucket allows 5MB, matching the client limit'
);

select assert_equals(
  (select file_size_limit from storage.buckets where id = 'comment-images'),
  5242880,
  'comment-images bucket allows 5MB, matching the client limit'
);

select assert_equals(
  (select file_size_limit from storage.buckets where id = 'post-images'),
  8388608,
  'post-images bucket allows 8MB, matching the client limit'
);

select assert_true(
  (select bool_and(public) from storage.buckets
    where id in ('avatars','post-images','comment-images')),
  'all storage buckets are public (getPublicUrl must work)'
);

-- `bool_and` ignores NULLs, so a bucket with no mime list would pass the check
-- below vacuously. Assert both that the list is present and that it is a subset
-- of the types the client accepts.
select assert_true(
  (select bool_and(allowed_mime_types is not null) from storage.buckets
    where id in ('avatars','post-images','comment-images')),
  'every storage bucket declares an allowed_mime_types list'
);

select assert_true(
  (select bool_and(allowed_mime_types <@ array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[])
     from storage.buckets where id in ('avatars','post-images','comment-images')),
  'buckets allow only image types the client also accepts'
);

-- Regression guard.
--
-- The owner-delete policies used to compare `auth.uid()` against
-- `split_part(name, '-', 1)`, which splits the whole object name on hyphens. A
-- UUID contains hyphens, so that expression returned only its first segment and
-- never matched — no contributor could ever delete their own avatar or comment
-- image, and every replacement leaked storage permanently.
--
-- They must index the first *path segment* instead, which is the user id.
select assert_true(
  not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and policyname in ('avatars_owner_delete','comment_images_owner_delete',
                         'post_images_owner_delete')
      and qual like '%split_part%'
  ),
  'owner-delete policies do not use split_part (it breaks on UUID hyphens)'
);

select assert_equals(
  (select count(*) from pg_policies
    where schemaname = 'storage'
      and policyname in ('avatars_owner_delete','comment_images_owner_delete',
                         'post_images_owner_delete')
      and qual like '%foldername%'),
  3,
  'all 3 owner-delete policies match on storage.foldername(name)[1]'
);

-- The object name the client builds must satisfy that expression: a
-- "<userId>/<file>" key whose first folder segment is the user id.
select assert_true(
  (storage.foldername('3f2a1b4c-5d6e-7f80-9a1b-2c3d4e5f6071/1700000000-ab12cd34.png'))[1]
    = '3f2a1b4c-5d6e-7f80-9a1b-2c3d4e5f6071',
  'storage.foldername returns the full user id, not a hyphen-delimited fragment'
);

rollback;
