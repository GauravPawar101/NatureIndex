/**
 * Client-side search / filter / sort over an already-loaded post catalogue.
 *
 * This is the fallback tier: `/api/search` and the server component use
 * Postgres full-text search, but the blog page always ships the full
 * catalogue to the browser anyway (the app is small enough that this is a few
 * KB), so a client pass gives instant, zero-latency results while a network
 * round trip is in flight — and keeps the UI usable if the search endpoint is
 * down entirely.
 *
 * Everything here is pure so it can be tested without a DOM.
 */

import { countWords } from './format';

/**
 * Split a query into meaningful terms, dropping filler words.
 *
 * Splits on whitespace and trims *edge* punctuation only. Stripping every
 * non-alphanumeric character would be wrong: it turns "c++" into "c", which
 * then matches any post containing the letter c, so a search for a term with a
 * symbol in it silently returns the whole catalogue instead of nothing.
 */
export function parseQuery(query) {
    const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will', 'with']);

    return String(query ?? '')
        .trim()
        .split(/\s+/)
        // Strip punctuation from the ends only, so "forest." finds "forest"
        // while "c++" stays intact.
        .map((term) => term.replace(/^[^\p{L}\p{N}+#]+|[^\p{L}\p{N}+#]+$/gu, ''))
        .filter((term) => term.length > 1 && !STOP_WORDS.has(term.toLowerCase()));
}

/**
 * Field weights. Title matches are worth far more than a body match — a post
 * whose *title* is "Ocean Plastic" is a much better answer for the query
 * "ocean plastic" than one that happens to mention both words in paragraph six.
 */
const WEIGHTS = {
    title: 12,
    topic: 8,
    excerpt: 4,
    author: 5,
    content: 1,
};

function normalize(value) {
    return String(value ?? '').toLowerCase();
}

/**
 * Score a single post against the parsed terms. Every term must appear
 * somewhere (AND semantics) for the post to be a result at all.
 *
 * @returns {number} 0 means "no match".
 */
export function scorePost(post, terms) {
    if (!terms.length) return 1;

    const fields = {
        title: normalize(post?.title),
        topic: normalize(post?.topic),
        excerpt: normalize(post?.excerpt),
        author: normalize(post?.profiles?.username || post?.profiles?.full_name),
        content: normalize(post?.content),
    };

    let total = 0;

    for (const term of terms) {
        let termScore = 0;

        for (const [field, weight] of Object.entries(WEIGHTS)) {
            const value = fields[field];
            if (!value) continue;

            const occurrences = value.split(term).length - 1;
            if (occurrences === 0) continue;

            // Diminishing returns: the 10th occurrence of a word says much less
            // than the first, so log-ish scaling instead of a raw count.
            termScore += weight * (1 + Math.log2(occurrences));

            // Whole-word bonus, so "plastic" does not match "plastics" equally.
            if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(value)) {
                termScore += weight / 2;
            }
        }

        // AND semantics: a post missing any one term is not a result.
        if (termScore === 0) return 0;
        total += termScore;
    }

    return total;
}

/**
 * @param {Array<object>} posts
 * @param {{ query?: string, topic?: string, sort?: string }} options
 * @returns {Array<object>} posts annotated with `_score`
 */
export function searchPosts(posts, options = {}) {
    const { query = '', topic = 'All', sort = 'newest' } = options;
    const terms = parseQuery(query);

    // A query with no letters or digits at all — "()", "..." — produces no
    // terms, which would otherwise mean "no filter" and return the entire
    // catalogue in response to something the reader typed deliberately. A query
    // made only of stop words ("the") is different: it does carry a real
    // intention, so it falls through and shows everything.
    const hasQuery = String(query ?? '').trim().length > 0;
    const hasSearchableText = /[\p{L}\p{N}]/u.test(String(query ?? ''));
    if (hasQuery && !hasSearchableText) return [];

    const scored = [];

    for (const post of Array.isArray(posts) ? posts : []) {
        if (!post || !post.slug || !post.title) continue;
        // `published` is undefined on some shapes (e.g. cached payloads); only
        // exclude when it is explicitly false.
        if (post.published === false) continue;

        if (topic && topic !== 'All' && post.topic !== topic) continue;

        const score = scorePost(post, terms);
        if (score === 0) continue;

        scored.push({ post, score });
    }

    scored.sort((a, b) => {
        // Relevance first whenever there is a query; it is the reason someone
        // typed. Falls through to the chosen sort for an empty query.
        if (terms.length && a.score !== b.score) return b.score - a.score;

        switch (sort) {
            case 'oldest':
                return timestamp(a.post.date) - timestamp(b.post.date);
            case 'popular':
                return (b.post.views || 0) - (a.post.views || 0);
            case 'discussed':
                return countComments(b.post) - countComments(a.post);
            case 'reading-time':
                return readingMinutes(a.post.content) - readingMinutes(b.post.content);
            case 'newest':
            default:
                return timestamp(b.post.date) - timestamp(a.post.date);
        }
    });

    return scored.map(({ post }) => post);
}

function timestamp(value) {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function countComments(post) {
    const counts = post?.comments;
    if (Array.isArray(counts)) return counts.length;
    const parsed = Number(counts);
    return Number.isFinite(parsed) ? parsed : 0;
}

function readingMinutes(content) {
    return countWords(content) / 220;
}
