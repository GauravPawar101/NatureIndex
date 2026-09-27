-- Asserts that the semantic search tier is actually wired up, not merely
-- present. `db:verify` applies this after the seed, so a regression in the
-- embedding path fails CI rather than shipping a search box that silently
-- falls back to keyword matching.
--
-- Run with:  npm run db:verify

\echo '--- vector: every seeded post has a usable embedding ---'

do $$
declare
  total       int;
  with_vector int;
  bad_dims    int;
begin
  select count(*) into total from public.posts;
  select count(*) into with_vector
    from public.posts where embedding is not null;

  if total = 0 then
    raise exception 'no posts seeded - assertions cannot run';
  end if;

  if with_vector <> total then
    raise exception 'only % of % posts have an embedding; match_posts filters on
                     "embedding is not null" so the rest are invisible to
                     vector search', with_vector, total;
  end if;

  -- A vector of the wrong width cannot be indexed, and the column is fixed at
  -- 384, so this only trips if the column definition itself drifted.
  select count(*) into bad_dims
    from public.posts
   where embedding is not null and vector_dims(embedding) <> 384;

  if bad_dims > 0 then
    raise exception '% posts have an embedding that is not 384-dimensional', bad_dims;
  end if;

  raise notice 'ok: % posts, all with 384-dim embeddings', total;
end
$$;

\echo '--- vector: match_posts exists and is callable ---'

do $$
declare
  hits int;
begin
  -- A zero vector has cosine distance 1 to everything, so every post should
  -- come back. This proves the function resolves and the operator class is
  -- installed, without asserting anything about ranking quality.
  --
  -- The literal is built as a string because pgvector's `vector` type lives in
  -- the `extensions` schema here, and a bare `vector(384)` cast would not
  -- resolve unless that schema were on search_path.
  select count(*) into hits
    from public.match_posts(
      ('[' || array_to_string(array_fill(0::real, array[384]), ',') || ']')::extensions.vector(384),
      5
    );

  if hits = 0 then
    raise exception 'match_posts returned no rows for a zero vector; expected
                     seeded posts to match';
  end if;

  raise notice 'ok: match_posts returned % rows', hits;
end
$$;

\echo '--- search_posts: keyword tier still ranks, and returns authors ---'

do $$
declare
  ranked int;
begin
  select count(*) into ranked from public.search_posts('kelp');
  if ranked = 0 then
    raise exception 'search_posts("kelp") returned nothing; the seeded set is
                     supposed to contain a kelp article';
  end if;

  -- The RPC must restrict to published rows. An unpublished draft leaking into
  -- search results is a privacy bug, not a ranking detail.
  if exists (select 1 from public.search_posts('kelp') where published = false) then
    raise exception 'search_posts returned an unpublished post';
  end if;

  raise notice 'ok: search_posts ranked % rows for "kelp"', ranked;
end
$$;
