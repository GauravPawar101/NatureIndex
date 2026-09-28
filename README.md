# 🌱 Nature Index

An open platform for conservation science, field discoveries, and community action.
Contributors publish field reports and research; readers follow, discuss, and share them.

---

## ✨ Features

- 📝 Publish and manage posts on environmental topics
- 🧭 Browse and filter by topic, keyword, and popularity
- 🔐 Supabase email/password auth with profile editing and avatars
- 💬 Threaded comments with realtime updates and image attachments
- 🧮 Recommendation engine — PageRank, collaborative filtering, and pgvector
  similarity over a hybrid ranking
- 🔎 Full-text and vector search backed by Postgres
- 🖼️ Responsive, accessible dark UI

---

## 🛠 Tech stack

**Frontend** — [Next.js 16](https://nextjs.org/) (App Router, Turbopack), React 19,
[Tailwind CSS 4](https://tailwindcss.com/), [lucide-react](https://lucide.dev/) icons,
EasyMDE for post authoring.

**Backend** — [Supabase](https://supabase.com/) (Postgres, GoTrue auth, Storage),
`pgvector` for embeddings, `pg_trgm` and `tsvector` for search.

**Recommendation engine** — a Rust service in [`pagerank/`](pagerank) that recomputes
PageRank over the interaction graph and writes through to Postgres and Upstash Redis.
It is currently switched off in CI by a flag file, so nothing is recomputed until
that is enabled — see [The engine is switched off by a flag file](#the-engine-is-switched-off-by-a-flag-file).

**CI/CD** — GitHub Actions runs lint, build, database rehearsal, and Rust checks on
every push. [Vercel](https://vercel.com/) is connected to the repository and builds
from GitHub on its own: every pull request gets a preview deployment, and `main`
goes to production. There is no deploy workflow, so nothing in the repository
holds a Vercel token.

---

## 🚀 Getting started

### Prerequisites

- Node.js **20.9+** (see `engines` in `package.json`)
- Docker — only needed for the local database rehearsal (`npm run db:verify`)

### Installation

```bash
git clone https://github.com/Gauravpawar101/NatureIndex.git
cd NatureIndex
npm install
cp .env.example .env.local     # then fill in your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Check the connection

```bash
npm run check:env
```

Validates both env files, checks the URL and key shapes, resolves the project
hostname in DNS, and calls the auth endpoint with your key. Run this first
whenever login or uploads fail — the browser only ever reports `Failed to
fetch`, which cannot distinguish a wrong URL from a deleted project from an ad
blocker. It exits non-zero on failure, so it is also usable in CI.

### Database setup

Apply [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor
(Dashboard → SQL Editor → New query → paste → Run). It is fully idempotent, so
re-running it is safe — you do not have to track which sections you have applied.

Then seed realistic content:

```bash
npm run seed          # upsert authors, posts, comments, recommendation scores
npm run seed -- --reset   # wipe the seeded rows first, then reseed
```

The seeder needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (RLS correctly blocks
the anon key from writing). It is idempotent too — every write is keyed on a
natural identifier, so re-running refreshes rows instead of duplicating them.

Demo login after seeding: `demo@example.com` / `DemoPassword123!`

> ⚠️ The demo credentials are committed in the repository. Rotate or remove them
> before seeding anything you care about.

### Storage buckets

Uploads need three public buckets, which `supabase/schema.sql` creates:
`avatars`, `post-images` and `comment-images`.

Each has a `file_size_limit` and an `allowed_mime_types` list that **must stay
in sync** with `UPLOAD_TARGETS` in [`src/app/lib/uploads.js`](src/app/lib/uploads.js).
The client validates a file against those numbers before sending it, so a bucket
limit stricter than the app's own turns into an opaque storage error instead of
a readable "too large" message.

Objects are stored as `<userId>/<timestamp>-<random>.<ext>`. The first path
segment **must** be the user id, because the RLS delete policies authorise
removal with `(storage.foldername(name))[1] = auth.uid()`. Note that
`split_part(name, '-', 1)` is *not* equivalent — it splits on hyphens, and a
UUID is full of them, so it returns only the first fragment of the id and never
matches. `supabase/tests/verify.sql` asserts against that regression.

### Verifying the database without a Supabase project

```bash
npm run db:verify
```

This starts a throwaway `pgvector/pgvector:pg16` container, applies the local
fixture, then `supabase/schema.sql` **twice** (to prove it is re-appliable),
loads the seed data, and runs the assertion suite in
[`supabase/tests/verify.sql`](supabase/tests/verify.sql). No credentials and no
network access required — the same command CI runs.

---

## 🧪 Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint across the repo |
| `npm run check:env` | Diagnose the Supabase configuration and connectivity |
| `npm run db:verify` | Local schema + seed rehearsal in Docker |
| `npm run seed` | Seed the connected Supabase project |
| `npm run seed:sql` | Emit the seed dataset as SQL on stdout |

Rust engine (`pagerank/pageRankEngine`):

```bash
cargo test     # PageRank unit tests
cargo clippy --all-targets -- -D warnings
cargo fmt --check
cargo run --release   # requires DB_URL and REDIS_URL
```

---

## 🔁 CI/CD

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [`ci.yml`](.github/workflows/ci.yml) | pushes and pull requests | lint, production build, database rehearsal, Rust clippy + tests |
| [`pagerank.yml`](.github/workflows/pagerank.yml) | every 15 min, on engine changes | recompute PageRank and write through to Postgres + Redis — **off by default**, see below |

### The engine is switched off by a flag file

`pagerank.yml` never runs the engine unless [`pagerank/flags.json`](pagerank/flags.json)
says so:

```json
{ "pagerankEnabled": false }
```

Every trigger — the 15-minute schedule, `workflow_dispatch`, and pushes under
`pagerank/**` — goes through a `flag` job first, and the `compute` job is
skipped when the flag is `false`. To turn the engine on, set it to `true` and
push: `pagerank/**` already matches the flag file, so the same push that flips
it also triggers a run. Nothing else is needed, and no GitHub setting or secret
is involved.

Two deliberate details. A malformed flag (missing file, missing key, a value
other than `true`/`false`) **fails** the run instead of being read as `false`, so
a typo cannot masquerade as a deliberate switch-off. And the schedule still
fires every 15 minutes while disabled — it costs one short-lived runner for the
`flag` job, and skipping the schedule itself is impossible, because path filters
do not apply to `schedule` events. `ci.yml` keeps running clippy and the unit
tests on every push regardless, so the engine does not rot while it is off.

The gate lives in the workflow, not in the binary: `cargo run --release` locally
still runs whenever you invoke it, because the flag is a CI concern and reading
it from the working directory would make a deployed build depend on where it
happens to be started from.

### Required repository secrets

| Secret | Used by |
| --- | --- |
| `DB_URL`, `REDIS_URL` | `pagerank.yml` |

No secrets are needed for `ci.yml` — it builds with a placeholder Supabase URL
and runs entirely against a local container. No secrets are needed for
deployment either, because Vercel holds its own token and reads the repository
directly.

> **CI is advisory, not a gate.** Vercel builds from Git as soon as a commit
> lands, without waiting for `ci.yml`, and blocking on required status checks is
> a paid feature. So a migration that breaks the database rehearsal can still
> reach production. Watch the `ci.yml` result on each pull request and do not
> merge a red one. If you would rather have the rehearsal genuinely block, the
> alternative is deploying from `deploy.yml` with a `VERCEL_TOKEN` secret and
> giving that workflow an `if: success()` on the CI jobs.


---

## ☁️ Deployment

Vercel's Git integration does the deploying, so there is no deploy workflow to
maintain and no CI secrets to rotate.

1. In Vercel, **Add New → Project** and import this repository. The framework
   preset is detected as Next.js; accept the defaults for install, build
   (`npm run build`) and output.
2. Add the environment variables below under **Settings → Environment Variables**.
   Mark the two `NEXT_PUBLIC_SUPABASE_*` variables for **all** environments.
3. Deploy. Every later push to `main` deploys to production, and every pull
   request gets a preview URL automatically.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | build + runtime | Project URL from Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build + runtime | The publishable (`sb_publishable_…`) or legacy anon key |
| `NEXT_PUBLIC_URL` | runtime | The production origin, e.g. `https://natureindex.vercel.app`. Falls back to the request origin, but email confirmation links are built from this, so set it once the domain is known. |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime, server only | Never prefix this with `NEXT_PUBLIC_`; it bypasses row level security. Only needed if you run the seeder against the deployed project. |

`NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**, so a
value that is missing from the build environment is baked into the JavaScript and
fixing it later requires a rebuild, not just a restart. A build with no Supabase
configuration succeeds and renders a "Supabase is not configured" notice, which
is deliberate: it fails loudly at the UI rather than as a `Failed to fetch`.

> Vercel's Hobby plan is for personal, non-commercial use, and hard-caps usage
> instead of billing it. This site is well inside every cap, but a project that
> earns revenue needs Pro.


---

## 📂 Project layout

```
src/app/                 routes, components, and the Supabase data layer
scripts/
  seed-data.mjs          the seed dataset (authors, posts, comments)
  seed.mjs               idempotent seeder, talks to Supabase
  seed-sql.mjs           emits the same dataset as SQL, for CI
  check-env.mjs          Supabase config + connectivity diagnostics
  verify-db.sh           local/CI database rehearsal
supabase/
  schema.sql             tables, RLS policies, functions, views, pgvector
  tests/local_fixture.sql  stand-ins for Supabase-managed schemas
  tests/verify.sql       assertion suite
pagerank/pageRankEngine/ Rust PageRank + hybrid ranking service
```

---

## 🩺 Troubleshooting

**`Failed to fetch` on login, or a permanent "Cannot reach the sign-in service"
banner.** The request never left the browser. Run `npm run check:env`. If it
reports that the project hostname does not resolve, `NEXT_PUBLIC_SUPABASE_URL`
points at a project that no longer exists — copy the current Project URL from
Supabase → Project Settings → Data API and restart the dev server. Retyping
credentials will not help, because they are never sent.

**Sign-in works, uploads fail with "bucket not found".** The storage buckets
have not been created. Re-run `supabase/schema.sql`. Note that the bucket
insert is `on conflict do update`, so re-running also pushes changed size and
MIME limits to a project that already has the buckets.

**Uploads fail with a size error for a file the app says is fine.** The bucket's
`file_size_limit` disagrees with `UPLOAD_TARGETS`. Re-run `supabase/schema.sql`
to resync, and keep the two in step in future.

**A contributor cannot delete their own avatar or comment image.** The delete
policies are the pre-fix version using `split_part`. Re-run
`supabase/schema.sql`; `npm run db:verify` asserts the corrected form.

**"That sign-in link did not work" right after clicking an email link.** The
auth callback could not exchange the code. Check `NEXT_PUBLIC_URL` — it must be
the origin the email links point at, not an internal address, which is a common
problem behind a reverse proxy or on preview deployments.

**Edits to `.env.local` have no effect.** Next.js reads env files at startup.
Restart the dev server.

---

## 📄 License

All rights reserved.
