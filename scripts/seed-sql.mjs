/**
 * Emits the seed dataset as a plain SQL script.
 *
 * The seeder in seed.mjs talks to Supabase over the network, which makes it
 * impossible to check in CI and impossible to run without live credentials.
 * This generator produces the equivalent INSERTs so the exact same dataset can
 * be loaded into a throwaway Postgres in CI — proving the rows satisfy the
 * constraints in supabase/schema.sql (slug format, username charset, topic
 * values, FK wiring) before anyone points a real database at them.
 *
 *   node scripts/seed-sql.mjs > /tmp/seed.sql
 *
 * It is deterministic: same input, byte-identical output.
 */
import { writeFileSync } from 'node:fs';

import {
  AUTHORS,
  COMMENTS,
  POSTS,
  ACTION_TYPES,
  deriveEmbedding,
  deriveExcerpt,
  daysAgoToIso,
  makeRng,
  slugify,
  toVectorLiteral,
} from './seed-data.mjs';

const NOW = Date.UTC(2026, 0, 15); // fixed clock, so output is reproducible

function q(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Deterministic UUIDv5-shaped identifier. Not a real v5 hash, just a stable
 * unique string derived from a label — the point is that it never changes
 * between runs so the SQL is diffable.
 */
function stableId(label) {
  const rng = makeRng(`uuid:${label}`);
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i += 1) out += hex[Math.floor(rng() * 16)];
  return [
    out.slice(0, 8),
    out.slice(8, 12),
    `4${out.slice(13, 16)}`,
    ((parseInt(out[16], 16) & 0x3) | 0x8).toString(16) + out.slice(17, 20),
    out.slice(20, 32),
  ].join('-');
}

const lines = [];
const push = (s = '') => lines.push(s);

push('-- GENERATED FILE — do not edit.');
push('-- Produced by scripts/seed-sql.mjs from scripts/seed-data.mjs.');
push('-- Load after supabase/schema.sql:  psql -f schema.sql -f seed.sql');
push('begin;');
push();

// --- Profiles. Insert into auth.users first: the schema's signup trigger is
// what normally creates the profile row, so going through the trigger keeps
// this fixture honest about username normalisation.
// NOTE: supabase/tests/local_fixture.sql must be applied before
// supabase/schema.sql, since the schema installs pgvector into `extensions`
// and references auth/storage. That fixture provides these tables.
push('-- authors');
for (const author of AUTHORS) {
  push(
    `insert into auth.users (id, email, raw_user_meta_data) values (${q(stableId(`user:${author.username}`))}, ${q(author.email)}, ${q(JSON.stringify({
      username: author.username,
      full_name: author.full_name,
      website: author.website,
      bio: author.bio,
    }))}) on conflict (id) do nothing;`
  );
}
push();

// The signup trigger inserts a profile for each new auth user. Upsert
// afterwards so the curated fields (website, bio) win over the trigger's
// defaults, and so re-running is a no-op.
for (const author of AUTHORS) {
  push(
    `insert into public.profiles (id, username, full_name, website, bio, avatar_url, updated_at) values (${q(stableId(`user:${author.username}`))}, ${q(author.username)}, ${q(author.full_name)}, ${q(author.website)}, ${q(author.bio)}, ${q(author.avatar_url)}, ${q(daysAgoToIso(400, NOW))}) on conflict (id) do update set username = excluded.username, full_name = excluded.full_name, website = excluded.website, bio = excluded.bio, avatar_url = excluded.avatar_url, updated_at = excluded.updated_at;`
  );
}
push();

// --- Posts
push('-- posts');
const postIds = new Map();
POSTS.forEach((post, index) => {
  const id = stableId(`post:${index}:${slugify(post.title)}`);
  postIds.set(index, id);
  const embedding = toVectorLiteral(deriveEmbedding(`${post.title}\n${post.content}`));
  push(
    `insert into public.posts (id, user_id, title, slug, content, excerpt, image_url, topic, views, published, date, created_at, updated_at, embedding) values (${q(id)}, ${q(stableId(`user:${post.author}`))}, ${q(post.title)}, ${q(slugify(post.title))}, ${q(post.content)}, ${q(deriveExcerpt(post.content))}, ${q(post.image_url)}, ${q(post.topic)}, ${q(post.views)}, true, ${q(daysAgoToIso(post.days_ago, NOW))}, ${q(daysAgoToIso(post.days_ago, NOW))}, ${q(daysAgoToIso(post.days_ago, NOW))}, ${q(embedding)}) on conflict (slug) do update set title = excluded.title, content = excluded.content, excerpt = excluded.excerpt, image_url = excluded.image_url, topic = excluded.topic, views = excluded.views, published = excluded.published, date = excluded.date, updated_at = excluded.updated_at, embedding = excluded.embedding;`
  );
});
push();

// --- Comments
push('-- comments');
const commentIds = new Map();
COMMENTS.forEach((comment, index) => {
  const id = stableId(`comment:${index}`);
  commentIds.set(index, id);
  push(
    `insert into public.comments (id, post_id, user_id, content, created_at) values (${q(id)}, ${q(postIds.get(comment.post))}, ${q(stableId(`user:${comment.author}`))}, ${q(`Seeded comment [${index}] — ${comment.content}`)}, ${q(daysAgoToIso(comment.days_ago, NOW))}) on conflict (id) do nothing;`
  );
});
push();

// Reply links need both endpoints to exist, so set them in a second pass.
push('-- thread replies');
for (const [index, comment] of COMMENTS.entries()) {
  if (comment.parent === null || comment.parent === undefined) continue;
  push(
    `update public.comments set parent_id = ${q(commentIds.get(comment.parent))} where id = ${q(commentIds.get(index))};`
  );
}
push();

// --- Interactions. Read edges for every (user, post) pair keep the graph the
// Rust PageRank job consumes connected; without that the ranking is uniform.
push('-- post interactions');
const users = AUTHORS.map((a) => stableId(`user:${a.username}`));
const interactions = [];
const seen = new Set();
POSTS.forEach((post, index) => {
  const postId = postIds.get(index);
  for (const userId of users) interactions.push({ userId, postId, actionType: 'read', weight: 1 });
});
const rng = makeRng('nature-index-interactions-v1');
for (let i = 0; i < POSTS.length * 12; i += 1) {
  const userId = users[Math.floor(rng() * users.length)];
  const postId = postIds.get(Math.floor(rng() * POSTS.length));
  const key = `${userId}:${postId}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const actionType = ACTION_TYPES[Math.floor(rng() * ACTION_TYPES.length)];
  interactions.push({ userId, postId, actionType, weight: actionType === 'read' ? 1 : 2 + rng() * 2 });
}
for (const row of interactions) {
  push(
    `insert into public.post_interactions (user_id, post_id, action_type, weight, created_at) values (${q(row.userId)}, ${q(row.postId)}, ${q(row.actionType)}, ${row.weight.toFixed(4)}, ${q(daysAgoToIso(30, NOW))});`
  );
}
push();

// --- Recommendation scores
push('-- pagerank scores');
const ranked = POSTS.map((post, index) => ({ id: postIds.get(index), views: post.views, slug: slugify(post.title) }))
  .sort((a, b) => b.views - a.views || a.slug.localeCompare(b.slug));
const maxViews = Math.max(...ranked.map((r) => r.views), 1);
ranked.forEach((r, index) => {
  const score = 0.15 + 0.85 * (r.views / maxViews) * (1 - index / (ranked.length + 4));
  push(
    `insert into public.pagerank_scores (post_id, pr_score, updated_at) values (${q(r.id)}, ${score.toFixed(6)}, ${q(daysAgoToIso(1, NOW))}) on conflict (post_id) do update set pr_score = excluded.pr_score, updated_at = excluded.updated_at;`
  );
});
push();

push('-- cf scores');
const vectors = new Map(users.map((u) => [u, new Map()]));
for (const row of interactions) {
  const vec = vectors.get(row.userId);
  vec.set(row.postId, (vec.get(row.postId) ?? 0) + row.weight);
}
for (const [userId, vec] of vectors) {
  for (const [postId, weight] of vec) {
    push(
      `insert into public.cf_user_scores (user_id, post_id, cf_score, updated_at) values (${q(userId)}, ${q(postId)}, ${weight.toFixed(4)}, ${q(daysAgoToIso(1, NOW))}) on conflict (user_id, post_id) do update set cf_score = excluded.cf_score, updated_at = excluded.updated_at;`
    );
  }
}
push();

push('commit;');

const out = `${lines.join('\n')}\n`;

if (process.argv[1] && process.argv[1].endsWith('seed-sql.mjs')) {
  const target = process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : null;
  if (target) {
    writeFileSync(target, out);
    console.error(`Wrote ${out.split('\n').length} lines to ${target}`);
  } else {
    process.stdout.write(out);
  }
}

export { out };
