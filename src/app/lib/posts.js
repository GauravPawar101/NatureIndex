import { createClient } from './supabase/server';
import { embedOne, isReady, toVectorLiteral } from './embeddings';

/**
 * Server-side post search.
 *
 * Two independent notions of "relevant" are combined, because each misses what
 * the other finds:
 *
 *   keyword   `search_posts` — Postgres full-text, `ts_rank` ordered. Precise,
 *             but needs the words to be present. Searching "polar bear habitat"
 *             will not find "Arctic Ice at the Tipping Point".
 *   semantic  `match_posts` — pgvector cosine distance over a sentence
 *             encoder's embeddings. Finds by meaning, so that same query does
 *             surface the Arctic post, but it is fuzzy and will occasionally
 *             return something loosely related.
 *
 * They are fused with Reciprocal Rank Fusion rather than by adding scores
 * together. `ts_rank` and cosine similarity are on unrelated scales, so any
 * weighted sum needs per-corpus tuning to avoid one tier dominating; RRF only
 * cares about each tier's ordering, which is stable and needs no constants
 * beyond a damping factor.
 *
 * Every tier fails differently, so each is optional and the reason is reported
 * rather than swallowed:
 *
 *   1. hybrid        — both tiers answered
 *   2. one tier      — the other RPC is missing or failed; still ranked, but
 *                      `degraded` is true so the UI can say results are partial
 *   3. `ilike`       — no RPC available; substring match, weakest answer
 *   4. `[]` + reason — the caller renders an honest "search unavailable" state
 *                      instead of pretending there were no matches
 */

/**
 * Columns PostCard and the profile page rely on. Supabase returns an object.
 *
 * `content_type` and `video_duration_s` are NOT selected here. PostgREST fails
 * the *whole* select with PGRST204 when a requested column is missing, and
 * until schema addendum 10b is applied those two columns do not exist — which
 * took the whole blog index down to "Search is unavailable" rather than
 * degrading. The media labels read `undefined` safely, so the rows are simply
 * unlabelled until the migration lands.
 *
 * If you add them back, gate the query on a capability check first.
 */
const POST_SELECT = `
    id, slug, title, excerpt, content, image_url, topic, views, date, published,
    profiles!posts_user_id_fkey(username, avatar_url, full_name)
`;

/**
 * How many candidates to pull before filtering and paging.
 *
 * Filters have to be applied before the page window is cut, otherwise a page
 * can come back short even though later matches existed. The catalogue is
 * small, so fetching generously and slicing in JS costs nothing and keeps the
 * ordering identical between the server render and the load-more endpoint.
 */
const CANDIDATE_LIMIT = 200;

/** Damping constant for Reciprocal Rank Fusion. 60 is the value from the paper. */
const RRF_K = 60;

/**
 * Cosine similarity below which a vector match is not worth showing. The
 * `match_posts` RPC has no threshold of its own, so without this every search
 * returns the whole catalogue ranked by a number nobody asked for.
 *
 * Deliberately low. all-MiniLM-L6-v2 is a plain sentence encoder, not an
 * instruction-tuned one, so its scores are compressed: across this corpus
 * genuinely related pairs land around 0.15-0.45 while unrelated ones sit near
 * 0.05-0.20. There is no threshold that separates those cleanly, so this only
 * trims the clearly-hopeless tail and the ranking does the rest. Precision comes
 * from the keyword tier and from the fusion below; a higher floor would throw
 * away true matches rather than remove noise.
 */
const SIMILARITY_FLOOR = 0.1;

/** Columns PostCard and the profile page rely on. Supabase returns an object. */
function normaliseRow(row) {
    if (!row) return null;

    // The join comes back as an array or an object depending on whether
    // PostgREST inferred a to-one relationship.
    const rawProfile = row.profiles;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

    return {
        ...row,
        profiles: profile
            ? { username: profile.username, avatar_url: profile.avatar_url, full_name: profile.full_name }
            : null,
    };
}

function buildOrder(sort) {
    switch (sort) {
        case 'oldest':
            return { column: 'date', ascending: true };
        case 'popular':
            return { column: 'views', ascending: false };
        case 'newest':
        default:
            return { column: 'date', ascending: false };
    }
}

/**
 * Escape a user-typed term for a Postgres `LIKE` pattern. `%` and `_` are
 * wildcards, so an unescaped query of "a_b" matches "aXb" — and a lone `%`
 * would return the entire table.
 */
function escapeLike(term) {
    return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function compareBy(column, ascending) {
    return (a, b) => {
        const primary = ascending
            ? new Date(a[column]).getTime() - new Date(b[column]).getTime()
            : new Date(b[column]).getTime() - new Date(a[column]).getTime();
        return Number.isNaN(primary) ? 0 : primary;
    };
}

/** Applies the topic/author facets that both the listing and search paths share. */
function matchesFacets(post, { topic, author }) {
    if (topic && topic !== 'All' && post.topic !== topic) return false;
    if (author && author !== 'All') {
        const username = post.profiles?.username;
        if (username !== author) return false;
    }
    return true;
}

/**
 * How many posts an author has published, or null when unknown.
 *
 * Needed because the author facet cannot be pushed into the query as a filter.
 * PostgREST will happily filter an embedded resource with
 * `profiles.username=eq.…`, but that only filters the *embed* — the parent rows
 * still come back, so the count stays at the whole table and pagination lies.
 * The fix is `!inner`, which is rejected here because the relationship is
 * many-to-one (`PGRST201`). So the count is fetched from the profiles side,
 * which is a genuine many-to-one reverse lookup and does aggregate correctly.
 */
async function resolveAuthorId(supabase, username) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

    if (error) {
        console.error('Failed to resolve an author:', error.message);
        return null;
    }
    return data?.id ?? null;
}

async function countPostsByAuthor(supabase, username, topic) {
    const id = await resolveAuthorId(supabase, username);
    if (id === null) return 0;

    let query = supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('published', true)
        .eq('user_id', id);

    // The topic facet has to be part of the count, not applied afterwards:
    // filtering the rows in JS and leaving the count at "all this author's
    // posts" makes the header claim results that the topic filter removed.
    if (topic && topic !== 'All') query = query.eq('topic', topic);

    const { count, error } = await query;
    if (error) {
        console.error('Failed to count an author\'s posts:', error.message);
        return null;
    }
    return count ?? 0;
}

/**
 * Keyword tier. Returns id -> rank (0 = best), or null if the RPC is unusable.
 *
 * The RPC already orders by `ts_rank` descending, so the array position *is*
 * the relevance rank. An earlier version re-sorted these rows by date and threw
 * that ordering away, which made relevance search silently do nothing.
 */
async function keywordRanks(supabase, term) {
    const { data, error } = await supabase.rpc('search_posts', { query: term });
    if (error || !Array.isArray(data)) {
        if (error) console.error('search_posts RPC failed:', error.message);
        return null;
    }

    const ranks = new Map();
    data.slice(0, CANDIDATE_LIMIT).forEach((row, index) => {
        if (row?.id) ranks.set(row.id, index);
    });
    return ranks;
}

/**
 * Semantic tier. Returns id -> { rank, similarity }, or null if unavailable.
 *
 * Returns null rather than an empty map when the encoder is cold or the RPC is
 * missing, so the caller can tell "no semantic matches" apart from "semantic
 * search is not available" and report the difference.
 */
async function semanticRanks(supabase, term) {
    // A cold model would add a ~90MB download to a page render, so the server
    // path only uses semantics once something has already warmed it. The
    // client-side endpoint is what warms it.
    if (!isReady()) return null;

    let vector;
    try {
        vector = await embedOne(term);
    } catch (error) {
        console.error('embedding the query failed:', error.message);
        return null;
    }
    if (!Array.isArray(vector) || vector.length === 0) return null;

    const { data, error } = await supabase.rpc('match_posts', {
        query_embedding: toVectorLiteral(vector),
        match_count: CANDIDATE_LIMIT,
    });

    if (error || !Array.isArray(data)) {
        if (error) console.error('match_posts RPC failed:', error.message);
        return null;
    }

    const hits = new Map();
    let rank = 0;
    for (const row of data) {
        const similarity = Number(row?.similarity);
        if (!row?.id || !Number.isFinite(similarity)) continue;
        if (similarity < SIMILARITY_FLOOR) break; // rows arrive best-first
        hits.set(row.id, { rank: rank++, similarity });
    }
    return hits;
}

/**
 * Loads full post rows for a set of ids, with the author embed.
 *
 * Necessary because both RPCs return bare table rows: `search_posts` is
 * `setof public.posts` and `match_posts` returns only (id, similarity), so
 * neither carries the `profiles` join PostCard needs to name the author.
 */
async function hydrate(supabase, ids) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .in('id', ids)
        .eq('published', true);

    if (error) {
        console.error('Failed to hydrate search results:', error.message);
        return [];
    }
    return (data || []).map(normaliseRow).filter(Boolean);
}

/**
 * @param {object} options
 * @param {string} [options.query]
 * @param {string} [options.topic]    'All' or a literal topic
 * @param {string} [options.author]   'All' or a username
 * @param {string} [options.sort]     'newest' | 'oldest' | 'popular'
 * @param {number} [options.limit]
 * @param {number} [options.offset]
 * @returns {Promise<{ posts: Array<object>, total: number, degraded: boolean,
 *   reason?: string, semantic?: boolean }>}
 */
export async function searchPosts(options = {}) {
    const {
        query = '',
        topic = 'All',
        author = 'All',
        sort = 'newest',
        limit = 12,
        offset = 0,
    } = options;

    const supabase = await createClient();
    if (!supabase) {
        return { posts: [], total: 0, degraded: true, reason: 'config' };
    }

    const term = query.trim();
    const hasTopic = Boolean(topic) && topic !== 'All';
    const hasAuthor = Boolean(author) && author !== 'All';
    const facets = { topic, author };

    // --- No query: a plain listing. No ranking machinery needed. -------------
    if (!term) {
        let builder = supabase
            .from('posts')
            .select(POST_SELECT, { count: 'exact' })
            .eq('published', true);

        if (hasTopic) builder = builder.eq('topic', topic);

        const { column, ascending } = buildOrder(sort);
        const { data, error, count } = await builder
            .order(column, { ascending })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Post listing failed:', error.message);
            return { posts: [], total: 0, degraded: true, reason: 'query' };
        }

        let posts = (data || []).map(normaliseRow).filter(Boolean);
        let total = count ?? posts.length;

        // The author facet is applied in JS because it lives on the embedded
        // profile rather than the posts row, and PostgREST cannot filter the
        // parent set that way (see countPostsByAuthor). So the row window above
        // is the wrong size whenever this is active: fetch that author's posts
        // explicitly, then sort and page them here.
        if (hasAuthor) {
            const authorTotal = await countPostsByAuthor(supabase, author, topic);
            if (authorTotal === null) {
                // Could not establish the real count; showing the unfiltered
                // total would be worse than reporting what we actually have.
                return { posts: [], total: 0, degraded: true, reason: 'query' };
            }

            const authorId = await resolveAuthorId(supabase, author);
            const { data: mine, error: mineError } = await supabase
                .from('posts')
                .select(POST_SELECT)
                .eq('published', true)
                .eq('user_id', authorId ?? '00000000-0000-0000-0000-000000000000');

            if (mineError) {
                console.error('Author listing failed:', mineError.message);
                return { posts: [], total: 0, degraded: true, reason: 'query' };
            }

            let all = (mine || []).map(normaliseRow).filter(Boolean);
            if (hasTopic) all = all.filter((p) => p.topic === topic);

            const { column, ascending } = buildOrder(sort);
            all.sort(compareBy(column, ascending));

            posts = all.slice(offset, offset + limit);
            total = authorTotal;
        } else {
            posts = posts.filter((p) => matchesFacets(p, facets));
        }

        return { posts, total, degraded: false };
    }

    // --- With a query: fuse the keyword and semantic tiers. -----------------
    const [keyword, semantic] = await Promise.all([
        keywordRanks(supabase, term),
        semanticRanks(supabase, term),
    ]);

    if (keyword || semantic) {
        // Reciprocal Rank Fusion: each tier contributes 1/(k + rank). A post
        // that both tiers like wins, which is the behaviour worth having — a
        // keyword hit that also means the right thing should outrank either
        // alone.
        const fused = new Map();
        const add = (id, rank) => {
            fused.set(id, (fused.get(id) || 0) + 1 / (RRF_K + rank));
        };
        if (keyword) for (const [id, rank] of keyword) add(id, rank);
        if (semantic) for (const [id, { rank }] of semantic) add(id, rank);

        const ordered = [...fused.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);

        const rows = await hydrate(supabase, ordered);
        const byId = new Map(rows.map((row) => [row.id, row]));
        const matched = ordered.map((id) => byId.get(id)).filter(Boolean);
        const filtered = matched.filter((post) => matchesFacets(post, facets));

        return {
            posts: filtered.slice(offset, offset + limit),
            total: filtered.length,
            // One tier answering is a real, usable answer — but say so, rather
            // than implying a blended relevance the reader did not get.
            degraded: !(keyword && semantic),
            reason: keyword && semantic ? undefined : keyword ? 'keyword-only' : 'semantic-only',
            semantic: Boolean(semantic),
        };
    }

    // --- Neither tier: substring fallback. ---------------------------------
    console.warn('Neither search RPC answered; falling back to substring matching.');
    let builder = supabase
        .from('posts')
        .select(POST_SELECT, { count: 'exact' })
        .eq('published', true);

    const pattern = `%${escapeLike(term)}%`;
    // `or` is the only way to search several columns at once; every branch must
    // be fully qualified so PostgREST does not guess.
    builder = builder.or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`);

    if (hasTopic) builder = builder.eq('topic', topic);

    const { column, ascending } = buildOrder(sort);
    const { data, error, count } = await builder
        .order(column, { ascending })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Post search failed:', error.message);
        return { posts: [], total: 0, degraded: true, reason: 'query' };
    }

    let posts = (data || []).map(normaliseRow).filter(Boolean);
    let total = count ?? posts.length;

    if (hasAuthor) {
        // Same limitation as the listing path: the author lives on the embed, so
        // it cannot filter the query. Count and page it explicitly.
        const authorTotal = await countPostsByAuthor(supabase, author, topic);
        if (authorTotal === null) {
            return { posts: [], total: 0, degraded: true, reason: 'query' };
        }
        const authorId = await resolveAuthorId(supabase, author);
        const { data: mine } = await supabase
            .from('posts')
            .select(POST_SELECT)
            .eq('published', true)
            .eq('user_id', authorId ?? '00000000-0000-0000-0000-000000000000');

        let all = (mine || []).map(normaliseRow).filter(Boolean);
        if (hasTopic) all = all.filter((p) => p.topic === topic);

        const order = buildOrder(sort);
        all.sort(compareBy(order.column, order.ascending));

        posts = all.slice(offset, offset + limit);
        total = authorTotal;
    } else {
        posts = posts.filter((p) => matchesFacets(p, facets));
    }

    return { posts, total, degraded: true, reason: 'substring' };
}

/** Distinct published topics with counts, for the filter pills. */
export async function getTopics() {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('posts')
        .select('topic')
        .eq('published', true)
        .not('topic', 'is', null);

    if (error) {
        console.error('Failed to load topics:', error.message);
        return [];
    }

    const counts = new Map();
    for (const row of data || []) {
        if (!row.topic) continue;
        counts.set(row.topic, (counts.get(row.topic) || 0) + 1);
    }

    return [...counts.entries()]
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}

/**
 * Authors who have at least one published post, with counts, for the author
 * filter. Counted over the posts table rather than the profiles table so an
 * account with nothing published never appears as a dead-end filter option.
 */
export async function getAuthors() {
    const supabase = await createClient();
    if (!supabase) return [];

    // Selected through profiles rather than embedded into posts: the
    // relationship is many-to-one, and reading the author list off the post
    // side meant a failure here silently emptied the dropdown while the post
    // list kept working. `posts!inner` is not usable here because the count
    // would then include unpublished drafts.
    const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, posts!posts_user_id_fkey(id, published)');

    if (error) {
        console.error('Failed to load authors:', error.message);
        return [];
    }

    const authors = [];
    for (const row of data || []) {
        if (!row?.username) continue;
        const raw = row.posts;
        const posts = Array.isArray(raw) ? raw : raw ? [raw] : [];
        // Count only published work, so the number beside each name matches what
        // selecting that author will actually return.
        const published = posts.filter((p) => p?.published !== false).length;
        // An account with nothing published would be a dead-end filter option.
        if (published === 0) continue;
        authors.push({
            username: row.username,
            fullName: row.full_name || row.username,
            count: published,
        });
    }

    return authors.sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
}
