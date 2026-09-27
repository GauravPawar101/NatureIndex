-- ============================================================
--  LOCAL TEST FIXTURE — NOT A MIGRATION
--
--  supabase/schema.sql is written for Supabase, where the `auth`,
--  `storage` and `extensions` schemas already exist. To apply and test
--  that schema against a plain Postgres (CI, local development), this
--  file recreates the minimum surface the schema depends on:
--
--    * auth.users      — the GoTrue table public.profiles FKs to
--    * storage.buckets / storage.objects — referenced by the bucket
--                        inserts and the storage RLS policies
--    * storage.foldername() — Supabase builtin the delete policies call
--    * auth.uid() / auth.role() — read from GUCs so RLS policies are
--                        testable by setting them per session
--    * the `extensions` schema that section 10 installs pgvector into
--
--  Load order for a full local rehearsal:
--    psql -f supabase/tests/local_fixture.sql \
--         -f supabase/schema.sql \
--         -f <generated seed.sql>
--
--  NEVER run this against a real Supabase project — it would shadow the
--  platform-managed objects.
-- ============================================================

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text not null,
  owner     uuid
);

-- On Supabase this returns text[]; the storage delete policies index into
-- element [1] to compare against auth.uid()::text.
create or replace function storage.foldername(name text)
returns text[] language sql immutable as $$
  select string_to_array(name, '/');
$$;

-- Set these per session to exercise RLS:
--   set local request.jwt.claim.sub = '<uuid>';
--   set local request.jwt.claim.role = 'authenticated';
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

-- pg_catalog views the assertion suite reads to prove RLS is actually enabled
-- and policies actually exist. They are views over pg_class/pg_policy rather
-- than tables, so a plain CREATE TABLE would break the column shapes the
-- assertions select. Defining them as views keeps the assertions identical
-- whether they run here or against a real Supabase project.
create or replace view pg_policies as
  select
    n.nspname as schemaname,
    c.relname as tablename,
    p.polname as policyname,
    p.polcmd as cmd,
    p.polpermissive as permissive,
    p.polroles::text[] as roles
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace;

create or replace view pg_tables as
  select
    n.nspname as schemaname,
    c.relname as tablename,
    c.relrowsecurity as rowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r';
