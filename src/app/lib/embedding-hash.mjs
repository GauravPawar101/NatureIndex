/**
 * Deterministic 384-dimension vector derived from text — the hashing trick.
 *
 * Each token is hashed to a bucket and a sign, buckets are accumulated, and the
 * result is L2-normalised, so cosine similarity approximates weighted token
 * overlap.
 *
 * This is a *lexical* representation, not a semantic one: it matches shared
 * words, not shared meaning. "polar bear habitat" and "arctic ice loss" share
 * no tokens, so this scores them near zero even though a reader would call them
 * the same story. It exists for two reasons:
 *
 *   1. CI. `seed-sql.mjs` and the database rehearsal run with no model download
 *      and no network, so they need a vector they can compute anywhere.
 *   2. Last-resort fallback at runtime, if the real encoder cannot load.
 *
 * For actual semantic search use `embeddings.js`, which runs a real sentence
 * encoder. Kept in its own module so the scripts and the app share exactly one
 * implementation and cannot drift apart.
 */

export const EMBEDDING_DIM = 384;

export function deriveEmbedding(text, dim = EMBEDDING_DIM) {
    const vec = new Array(dim).fill(0);
    const tokens = String(text)
        .toLowerCase()
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2);

    for (const token of tokens) {
        // FNV-1a, 32-bit. Stable across runs and platforms.
        let hash = 0x811c9dc5;
        for (let i = 0; i < token.length; i += 1) {
            hash ^= token.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        const index = hash % dim;
        const sign = (hash >>> 31) & 1 ? -1 : 1;
        vec[index] += sign;
    }

    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vec;
    return vec.map((v) => Number((v / norm).toFixed(6)));
}

/** Postgres `vector` literal for an array of numbers. */
export function toVectorLiteral(vec) {
    return `[${vec.join(',')}]`;
}
