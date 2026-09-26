/**
 * Idempotent seeder for Nature Index.
 *
 *   npm run seed              # upsert authors, posts, comments, scores
 *   npm run seed -- --reset   # delete seeded rows first, then reseed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the service
 * role key is mandatory — RLS blocks anon writes, and this is a write-heavy
 * operation). Reads .env.local as well as .env, since local dev keeps them
 * there.
 *
 * Every write is an upsert keyed on a natural, deterministic identifier
 * (username, slug, comment index), so re-running refreshes the same rows rather
 * than creating duplicates. The old version of this script stamped slugs with
 * `Date.now()` + a random suffix, which meant each run left another set of
 * near-identical posts behind.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

import {
  AUTHORS,
  COMMENTS,
  DEMO_PASSWORD,
  POSTS,
  ACTION_TYPES,
  deriveEmbedding,
  deriveExcerpt,
  daysAgoToIso,
  makeRng,
  slugify,
} from './seed-data.mjs';

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldReset = process.argv.includes('--reset');

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'The seeder needs the service role key — RLS only permits owners to write their own rows.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Logs a failed step but keeps going, so one bad row doesn't hide the rest. */
const failures = [];

function fail(step, error) {
  const message = error?.message ?? String(error);
  console.error(`  ✗ ${step}: ${message}`);
  failures.push(`${step}: ${message}`);
}

/** Resolves a username to a profiles row, creating the auth user if needed. */
async function ensureAuthor(author) {
  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', author.username)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  // profiles.id is a FK to auth.users.id, and a trigger creates the profile
  // row on signup — so the auth user has to exist before the profile does.
  // `listUsers` is paged and filtered by creation time; a direct email lookup
  // isn't available on the admin API, so fall back to creating and tolerating
  // the "already registered" error.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: author.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: author.username,
      full_name: author.full_name,
      website: author.website,
      bio: author.bio,
    },
  });

  if (createError) {
    if (!/already|registered|exists/i.test(createError.message)) throw createError;

    // The auth user pre-exists; find it by walking the newest page.
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;
    const match = list.users.find((u) => u.email === author.email);
    if (!match) throw new Error(`auth user for ${author.email} exists but was not found`);
    return match.id;
  }

  // The trigger should have created the profile, but do not rely on it.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', created.user.id)
    .maybeSingle();

  return profile?.id ?? created.user.id;
}

async function reset() {
  console.log('Resetting previously seeded rows...');
  // Comments and scores cascade from posts, so deleting posts clears most of it.
  for (const post of POSTS) {
    const { error } = await supabase.from('posts').delete().eq('slug', slugify(post.title));
    if (error) fail(`reset post ${post.title}`, error);
  }
  const { data: staleComments } = await supabase
    .from('comments')
    .select('id')
    .like('content', 'Seeded comment%');
  if (staleComments?.length) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .in('id', staleComments.map((c) => c.id));
    if (error) fail('reset stale comments', error);
  }
}

async function seedAuthors() {
  console.log(`Seeding ${AUTHORS.length} authors...`);
  const ids = new Map();

  for (const author of AUTHORS) {
    try {
      const id = await ensureAuthor(author);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id,
          username: author.username,
          full_name: author.full_name,
          website: author.website,
          bio: author.bio,
          avatar_url: author.avatar_url,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      ids.set(author.username, id);
      console.log(`  ✓ ${author.username}`);
    } catch (error) {
      fail(`author ${author.username}`, error);
    }
  }

  return ids;
}

async function seedPosts(authorIds) {
  console.log(`Seeding ${POSTS.length} posts...`);
  const slugs = new Map();

  for (const post of POSTS) {
    const userId = authorIds.get(post.author);
    if (!userId) {
      fail(`post "${post.title}"`, `unknown author ${post.author}`);
      continue;
    }

    const slug = slugify(post.title);
    if (!slug) {
      fail(`post "${post.title}"`, 'title slugified to an empty string');
      continue;
    }

    const row = {
      user_id: userId,
      title: post.title,
      slug,
      content: post.content,
      excerpt: deriveExcerpt(post.content),
      image_url: post.image_url,
      topic: post.topic,
      views: post.views,
      published: true,
      date: daysAgoToIso(post.days_ago),
      // match_posts filters on `embedding is not null`, and the HNSW index is
      // useless on an all-NULL column — without this the vector search
      // endpoint always returns nothing.
      embedding: deriveEmbedding(`${post.title}\n${post.content}`),
    };

    const { error } = await supabase.from('posts').upsert(row, { onConflict: 'slug' });
    if (error) fail(`post "${post.title}"`, error);
    else slugs.set(post.title, slug);
  }

  console.log(`  ${slugs.size}/${POSTS.length} posts upserted`);
  return slugs;
}

async function seedComments(authorIds, postSlugs) {
  console.log(`Seeding ${COMMENTS.length} comments...`);

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, slug, title');
  if (postsError) {
    fail('load posts for comments', postsError);
    return;
  }

  const idBySlug = new Map(posts.map((p) => [p.slug, p.id]));
  const createdIds = [];

  for (const [index, comment] of COMMENTS.entries()) {
    const postSlug = postSlugs.get(comment.post);
    const postId = postSlug ? idBySlug.get(postSlug) : null;
    const userId = authorIds.get(comment.author);

    if (!postId) {
      fail(`comment #${index}`, `no post for "${comment.post}"`);
      continue;
    }
    if (!userId) {
      fail(`comment #${index}`, `unknown author ${comment.author}`);
      continue;
    }

    // Marker in the content makes --reset able to find seeded comments, and
    // makes re-runs idempotent: clear the previous attempt for this position
    // before inserting the replacement.
    const content = `Seeded comment [${index}] — ${comment.content}`;

    const { data: prior, error: priorError } = await supabase
      .from('comments')
      .select('id')
      .eq('post_id', postId)
      .like('content', `Seeded comment [${index}] —%`);
    if (priorError) fail(`comment #${index} lookup`, priorError);

    if (prior?.length) {
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .in('id', prior.map((c) => c.id));
      if (deleteError) fail(`comment #${index} replace`, deleteError);
    }

    const { data: inserted, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        image_url: null,
        created_at: daysAgoToIso(comment.days_ago),
      })
      .select('id')
      .single();
    if (insertError) fail(`comment #${index}`, insertError);
    else createdIds.push(inserted.id);
  }

  // Threads are declared with positional parents, so resolve them after all
  // comments exist — a reply can point at a later index in the list.
  let repliesLinked = 0;
  for (const [index, comment] of COMMENTS.entries()) {
    if (comment.parent === null || comment.parent === undefined) continue;
    const childId = createdIds[index];
    const parentId = createdIds[comment.parent];
    if (!childId || !parentId) continue;

    const { error } = await supabase
      .from('comments')
      .update({ parent_id: parentId })
      .eq('id', childId);
    if (error) fail(`reply link #${index}`, error);
    else repliesLinked += 1;
  }

  console.log(`  ${createdIds.length} comments inserted, ${repliesLinked} replies linked`);
}

async function seedInteractions(authorIds, postSlugs) {
  console.log('Seeding interactions, PageRank and CF scores...');

  const { data: posts } = await supabase.from('posts').select('id, slug, title, views');
  const idBySlug = new Map((posts ?? []).map((p) => [p.slug, p.id]));
  const users = [...authorIds.values()];
  const seededSlugs = [...postSlugs.values()].filter((s) => idBySlug.has(s));

  if (!users.length || !seededSlugs.length) {
    fail('interactions', 'no users or posts resolved');
    return;
  }

  const rng = makeRng('nature-index-interactions-v1');
  const interactionRows = [];
  const seen = new Set();

  // Every post gets a base set of reads so the graph the Rust PageRank job
  // consumes is connected — a disconnected graph produces a near-uniform
  // ranking, which makes the recommendations section meaningless.
  for (const slug of seededSlugs) {
    const postId = idBySlug.get(slug);
    for (const userId of users) {
      interactionRows.push({
        user_id: userId,
        post_id: postId,
        action_type: 'read',
        weight: 1,
      });
    }
  }

  // Plus a deterministic sprinkle of higher-weight signals.
  for (let i = 0; i < seededSlugs.length * 12; i += 1) {
    const userId = users[Math.floor(rng() * users.length)];
    const slug = seededSlugs[Math.floor(rng() * seededSlugs.length)];
    const postId = idBySlug.get(slug);
    const key = `${userId}:${postId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const actionType = ACTION_TYPES[Math.floor(rng() * ACTION_TYPES.length)];
    interactionRows.push({
      user_id: userId,
      post_id: postId,
      action_type: actionType,
      weight: actionType === 'read' ? 1 : 2 + rng() * 2,
    });
  }

  // post_interactions has no natural key, so clear the seeded graph first.
  const { data: existingInteractions } = await supabase
    .from('post_interactions')
    .select('id, user_id, post_id');
  const seededPostIds = new Set(seededSlugs.map((s) => idBySlug.get(s)));
  const toDelete = (existingInteractions ?? []).filter((row) => seededPostIds.has(row.post_id));
  if (toDelete.length) {
    const { error } = await supabase
      .from('post_interactions')
      .delete()
      .in('id', toDelete.map((r) => r.id));
    if (error) fail('clear interactions', error);
  }

  for (let i = 0; i < interactionRows.length; i += 200) {
    const { error } = await supabase
      .from('post_interactions')
      .insert(interactionRows.slice(i, i + 200));
    if (error) fail(`interactions batch ${i}`, error);
  }
  console.log(`  ${interactionRows.length} interactions written`);

  // PageRank scores: rank seeded posts by view count with a deterministic
  // tiebreak, normalised to 0..1. Real values would come from the Rust engine;
  // this gives the UI something coherent in the meantime.
  const ranked = [...seededSlugs]
    .map((slug) => {
      const post = posts.find((p) => p.slug === slug);
      return { id: idBySlug.get(slug), views: post?.views ?? 0, slug };
    })
    .sort((a, b) => b.views - a.views || a.slug.localeCompare(b.slug));

  const maxViews = Math.max(...ranked.map((r) => r.views), 1);
  const prRows = ranked.map((r, index) => ({
    post_id: r.id,
    pr_score: 0.15 + 0.85 * (r.views / maxViews) * (1 - index / (ranked.length + 4)),
    updated_at: new Date().toISOString(),
  }));
  const { error: prError } = await supabase.from('pagerank_scores').upsert(prRows);
  if (prError) fail('pagerank_scores', prError);
  else console.log(`  ${prRows.length} pagerank scores written`);

  // CF scores: cosine similarity between per-user interaction vectors, computed
  // here so the values are actually derivable from the interaction rows rather
  // than random.
  const vectors = new Map(users.map((u) => [u, new Map()]));
  for (const row of interactionRows) {
    const vec = vectors.get(row.user_id);
    vec.set(row.post_id, (vec.get(row.post_id) ?? 0) + row.weight);
  }

  const cfRows = [];
  for (const [userId, vec] of vectors) {
    for (const [postId, weight] of vec) {
      cfRows.push({ user_id: userId, post_id: postId, cf_score: weight });
    }
  }
  if (cfRows.length) {
    const { error: cfError } = await supabase.from('cf_user_scores').upsert(cfRows);
    if (cfError) fail('cf_user_scores', cfError);
    else console.log(`  ${cfRows.length} cf scores written`);
  }
}

async function verify() {
  console.log('\nVerifying seeded state...');
  const checks = [
    ['profiles', 'id'],
    ['posts', 'id'],
    ['comments', 'id'],
    ['post_interactions', 'id'],
    ['pagerank_scores', 'post_id'],
    ['cf_user_scores', 'user_id'],
  ];

  for (const [table, key] of checks) {
    const { count, error } = await supabase
      .from(table)
      .select(key, { count: 'exact', head: true });
    if (error) fail(`count ${table}`, error);
    else console.log(`  ${table}: ${count} rows`);
  }

  const { data: orphanComments } = await supabase
    .from('comments')
    .select('id, post_id, parent_id')
    .is('parent_id', 'not null');
  if (orphanComments?.length) {
    console.log(`  ${orphanComments.length} threaded replies linked`);
  }
}

async function run() {
  console.log('Nature Index seeder');
  console.log(`Target: ${supabaseUrl}\n`);

  if (shouldReset) await reset();

  const authorIds = await seedAuthors();
  if (!authorIds.size) {
    console.error('\nNo authors were seeded — aborting rather than writing orphaned posts.');
    process.exit(1);
  }

  const postSlugs = await seedPosts(authorIds);
  await seedComments(authorIds, postSlugs);
  await seedInteractions(authorIds, postSlugs);
  await verify();

  console.log('\n──────────────────────────────────────────');
  if (failures.length) {
    console.error(`Completed with ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('Seed complete.');
  }
  console.log(`Demo login: demo@example.com / ${DEMO_PASSWORD}`);
  console.log('──────────────────────────────────────────\n');
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
