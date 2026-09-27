/**
 * Text embeddings for semantic search.
 *
 * Three providers behind one interface, chosen at runtime:
 *
 *   local  A real sentence encoder (Xenova/all-MiniLM-L6-v2, 384-dim) run
 *          in-process via @huggingface/transformers. Free, no API key, and the
 *          text never leaves the server. This is the default.
 *   api    Any HTTP service that accepts {input} and returns OpenAI-shaped
 *          {data:[{embedding}]}. Opt-in via EMBEDDING_API_URL/KEY.
 *   hash   The deterministic hashing trick in embedding-hash.mjs. Lexical only,
 *          but free, instant and offline — the safety net that keeps search
 *          working when the model cannot load.
 *
 * Selection is explicit via EMBEDDING_PROVIDER, otherwise local is tried and
 * the next best thing is used if it is unavailable. Every path returns a
 * 384-dimension L2-normalised vector, which is what public.posts.embedding
 * and the HNSW cosine index expect.
 *
 * Server-only. Importing this from a client component would ship the model
 * loader to the browser; search embeds on the server for that reason.
 */

import { deriveEmbedding, EMBEDDING_DIM } from './embedding-hash.mjs';

export { EMBEDDING_DIM };

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

/**
 * Loading the model costs a ~90MB download the first time, so the pipeline is
 * created once per process and reused. `null` until the first call resolves.
 */
let pipelinePromise = null;
let pipelineReady = false;
let activeProvider = null;

function configuredProvider() {
    const requested = (process.env.EMBEDDING_PROVIDER || '').trim().toLowerCase();
    if (['local', 'api', 'hash'].includes(requested)) return requested;
    // No explicit choice: prefer whichever can actually work right now.
    if (process.env.EMBEDDING_API_URL) return 'api';
    return 'local';
}

/** Lazily builds the local encoder. Rejects rather than throwing on import. */
async function getLocalPipeline() {
    if (!pipelinePromise) {
        pipelinePromise = (async () => {
            console.log(`[embeddings] loading ${MODEL_ID}...`);
            const { pipeline } = await import('@huggingface/transformers');
            console.log('[embeddings] module imported, building pipeline...');
            const built = await pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' });
            pipelineReady = true;
            console.log('[embeddings] local encoder ready');
            return built;
        })().catch((error) => {
            // Clear the memo so a later call can retry rather than replaying
            // this rejection forever.
            pipelinePromise = null;
            pipelineReady = false;
            throw error;
        });
    }
    return pipelinePromise;
}

async function embedLocal(texts) {
    const pipe = await getLocalPipeline();
    const output = await pipe(texts, { pooling: 'mean', normalize: true });
    const [count, dim] = output.dims;
    const rows = [];
    for (let i = 0; i < count; i += 1) {
        rows.push(Array.from(output.data.slice(i * dim, (i + 1) * dim)));
    }
    return rows;
}

async function embedApi(texts) {
    const url = process.env.EMBEDDING_API_URL;
    const key = process.env.EMBEDDING_API_KEY;
    if (!url) throw new Error('EMBEDDING_API_URL is not set');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({ input: texts, model: process.env.EMBEDDING_API_MODEL || undefined }),
        signal: AbortSignal.timeout(Number(process.env.EMBEDDING_API_TIMEOUT_MS) || 20000),
    });

    if (!response.ok) {
        throw new Error(`embedding API responded ${response.status}`);
    }

    const payload = await response.json();
    const rows = (payload.data || []).map((item) => item.embedding);
    if (rows.length !== texts.length) {
        throw new Error(`embedding API returned ${rows.length} vectors for ${texts.length} inputs`);
    }
    return rows;
}

/**
 * Rescales a vector to unit length. A provider that does not normalise would
 * otherwise produce cosine distances that are not comparable, and the HNSW
 * index is built on the assumption of unit vectors.
 */
function l2Normalise(vec) {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (!norm) return vec;
    return vec.map((v) => v / norm);
}

/**
 * Embeds one or more strings. Always returns one vector per input, in order.
 *
 * Never throws: a failure degrades to the hash provider so that a search box
 * keeps working. The result is weaker, so callers that care should read
 * `getActiveProvider()` and can surface that in the UI.
 *
 * @param {string|string[]} input
 * @returns {Promise<number[][]>}
 */
export async function embed(input) {
    const texts = (Array.isArray(input) ? input : [input]).map((t) => String(t ?? ''));
    if (texts.length === 0) return [];

    const order = [configuredProvider(), 'local', 'api', 'hash'];
    const tried = new Set();

    for (const provider of order) {
        if (tried.has(provider)) continue;
        tried.add(provider);

        try {
            if (provider === 'hash') {
                activeProvider = 'hash';
                return texts.map((t) => deriveEmbedding(t));
            }
            const rows = provider === 'api' ? await embedApi(texts) : await embedLocal(texts);
            if (!Array.isArray(rows) || rows.length !== texts.length) {
                throw new Error(`${provider} returned ${rows?.length} vectors for ${texts.length} inputs`);
            }
            activeProvider = provider;
            return rows.map((row) => l2Normalise(row.map(Number)));
        } catch (error) {
            console.warn(`[embeddings] ${provider} unavailable: ${error.message}`);
        }
    }

    // Unreachable in practice: 'hash' cannot fail. Kept so the return type holds.
    activeProvider = 'hash';
    return texts.map((t) => deriveEmbedding(t));
}

/** Convenience wrapper for the single-query case. */
export async function embedOne(text) {
    const [vector] = await embed(text);
    return vector;
}

/**
 * Which provider actually served the last `embed()` call: 'local', 'api' or
 * 'hash'. 'hash' means results are keyword-overlap only, not semantic.
 */
export function getActiveProvider() {
    return activeProvider;
}

/**
 * True when results are lexical rather than semantic, so the UI can say so
 * instead of implying a meaning-based match it did not perform.
 */
export function isSemantic() {
    return activeProvider === 'local' || activeProvider === 'api';
}

/** Postgres `vector` literal, for callers building SQL by hand. */
export { toVectorLiteral } from './embedding-hash.mjs';

/**
 * Whether a real encoder is loaded and usable right now.
 *
 * Search consults this instead of calling `embed()` blindly, because the first
 * call pays a ~90MB model download. A page render must not block on that, so
 * server-rendered requests skip the semantic tier while the model is cold and
 * report themselves as degraded; the client-side endpoint warms it in the
 * background and later searches get real semantics.
 */
export function isReady() {
    // Readiness is about the encoder being *loaded*, not about whether embed()
    // has run yet: warmup() loads the model without embedding anything, and
    // keying this off activeProvider made a warmed encoder look cold.
    if (pipelineReady) return true;
    if (activeProvider === 'api') return true;
    // An API provider needs no local model, so it is usable immediately.
    return configuredProvider() === 'api' && Boolean(process.env.EMBEDDING_API_URL);
}

/**
 * Starts loading the encoder without waiting for it. Safe to call repeatedly
 * and safe to call on a platform with no writable cache — a failure here is
 * logged by the loader and simply leaves `isReady()` false.
 */
export function warmup() {
    if (pipelinePromise) return;
    // Nothing to warm if the operator pinned a provider that needs no model.
    if (['api', 'hash'].includes(configuredProvider())) return;
    getLocalPipeline().catch((error) => {
        // Swallowing this silently is what makes a broken encoder look like a
        // slow one: search just quietly stays keyword-only forever.
        console.error(`[embeddings] local encoder failed to load: ${error.message}`);
    });
}
