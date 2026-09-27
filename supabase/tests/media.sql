-- Asserts the media (photo/video) data model: the discriminator defaults, the
-- video consistency constraint, the child table's keys, and that RLS on
-- post_media does not inherit anything from posts.
--
-- Runs in `npm run db:verify` after the schema and seed. Uses the same role
-- setup as verify.sql.

\echo '--- media: posts default to articles ---'

do $$
declare
  bad int;
begin
  -- Every seeded post predates the addendum, so all of them must have taken the
  -- default rather than been left null. A null here would mean the column was
  -- added without its default and the backfill is missing.
  select count(*) into bad
    from public.posts
   where content_type is null or content_type <> 'article';

  if bad > 0 then
    raise exception '% seeded posts are not ''article''; the content_type default is missing', bad;
  end if;

  raise notice 'ok: all seeded posts default to article';
end
$$;

\echo '--- media: video posts require a video, others must not carry one ---'

do $$
declare
  bad int;
begin
  if exists (select 1 from public.posts where content_type = 'video' and video_url is null) then
    raise exception 'a video post exists with no video_url; the
                     posts_video_consistent constraint is not being enforced';
  end if;

  if exists (select 1 from public.posts where content_type <> 'video' and video_url is not null) then
    raise exception 'a non-video post carries a video_url';
  end if;

  -- And the constraint itself must exist, not merely be satisfied today: a
  -- future insert has to be caught too.
  if not exists (
    select 1 from pg_constraint where conname = 'posts_video_consistent'
  ) then
    raise exception 'constraint posts_video_consistent is missing';
  end if;

  select count(*) into bad from public.posts where content_type = 'video';
  raise notice 'ok: video consistency enforced (% video posts seeded)', bad;
end
$$;

\echo '--- media: the constraint actually rejects a bad row ---'

do $$
declare
  post_id uuid;
  caught  boolean := false;
begin
  select id into post_id from public.posts where published = true limit 1;
  if post_id is null then
    raise exception 'no seeded post to test against';
  end if;

  -- Deliberately try to make an article claim a video. The insert must fail;
  -- if it succeeds the constraint is not attached to the table.
  begin
    update public.posts
       set content_type = 'article', video_url = 'https://example.com/x.mp4'
     where id = post_id;
  exception when others then
    caught := true;
  end;

  if not caught then
    raise exception 'setting video_url on an article was allowed; the
                     posts_video_consistent check constraint is not enforced';
  end if;

  raise notice 'ok: invalid media rows are rejected';
end
$$;

\echo '--- media: post_media keys and ordering ---'

do $$
declare
  bad int;
begin
  -- Position must be unique per post: the primary key is (post_id, position),
  -- so a duplicate would be a hard error rather than a silent overwrite.
  select count(*) into bad
    from (
      select post_id, position
        from public.post_media
       group by post_id, position
      having count(*) > 1
    ) duplicates;

  if bad > 0 then
    raise exception '% duplicate (post_id, position) pairs in post_media', bad;
  end if;

  -- Every asset must point at a post that exists. The FK enforces it, but a
  -- seed that inserted assets before their post would fail on re-apply.
  if exists (
    select 1 from public.post_media m
     where not exists (select 1 from public.posts p where p.id = m.post_id)
  ) then
    raise exception 'post_media contains rows whose post does not exist';
  end if;

  -- kind must be one of the two the check constraint allows.
  if exists (select 1 from public.post_media where kind not in ('image', 'video')) then
    raise exception 'post_media contains an unsupported kind';
  end if;

  -- A video asset with no url is unusable, and a negative duration is a lie.
  if exists (select 1 from public.post_media where url is null or url = '') then
    raise exception 'post_media contains a row with no url';
  end if;

  if exists (select 1 from public.post_media where duration_s < 0) then
    raise exception 'post_media contains a negative duration';
  end if;

  raise notice 'ok: post_media is well formed';
end
$$;

\echo '--- media: post_media RLS is enabled and scoped ---'

do $$
declare
  policies int;
begin
  if not exists (
    select 1 from pg_tables
     where schemaname = 'public' and tablename = 'post_media' and rowsecurity
  ) then
    raise exception 'row level security is not enabled on public.post_media';
  end if;

  -- RLS does not cascade from the parent table, so the child needs its own
  -- policies. A missing read policy would make every gallery invisible.
  select count(*) into policies
    from pg_policies
   where schemaname = 'public' and tablename = 'post_media';

  if policies < 4 then
    raise exception 'public.post_media has only % policies; expected read/insert/update/delete', policies;
  end if;

  raise notice 'ok: post_media RLS enabled with % policies', policies;
end
$$;

\echo '--- media: buckets exist with distinct limits ---'

do $$
declare
  video_limit bigint;
  photo_limit bigint;
begin
  select file_size_limit into video_limit
    from storage.buckets where id = 'post-videos';
  select file_size_limit into photo_limit
    from storage.buckets where id = 'post-photos';

  if video_limit is null or photo_limit is null then
    raise exception 'post-videos / post-photos buckets are missing; re-apply schema.sql';
  end if;

  -- A shared limit would have to be the larger of the two, which would let an
  -- oversized "image" reach the MIME list before being rejected.
  if video_limit <= photo_limit then
    raise exception 'the video bucket limit (% bytes) is not larger than the photo limit (%);
                     these are meant to differ', video_limit, photo_limit;
  end if;

  if not exists (
    select 1 from storage.buckets
     where id = 'post-videos' and 'video/mp4' = any(allowed_mime_types)
  ) then
    raise exception 'post-videos does not allow video/mp4';
  end if;

  if exists (
    select 1 from storage.buckets
     where id = 'post-videos' and 'image/png' = any(allowed_mime_types)
  ) then
    raise exception 'post-videos allows an image MIME type';
  end if;

  raise notice 'ok: media buckets present (video % bytes, photo % bytes)', video_limit, photo_limit;
end
$$;
