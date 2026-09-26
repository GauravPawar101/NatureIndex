/**
 * Search-term highlighting for result titles and excerpts.
 *
 * Returns a token list rather than an HTML string on purpose: the matched
 * segments are wrapped in React elements by the caller, so a post titled
 * `<script>alert(1)</script>` renders as literal text. Building an HTML string
 * and using dangerouslySetInnerHTML here would reintroduce exactly the XSS this
 * project has been careful to avoid elsewhere.
 */

/**
 * Escape a user-typed query for safe use inside a RegExp.
 * Without this, searching for "c++" or "(" throws a SyntaxError and takes the
 * whole results list down.
 */
export function escapeRegExp(value) {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split `text` into `{ text, match }` tokens for every occurrence of `query`.
 *
 * @param {string} text
 * @param {string} query  One or more whitespace-separated terms; all must match
 *                        (AND), which is what people expect from a search box.
 * @returns {Array<{ text: string, match: boolean }>}
 */
export function tokenizeMatches(text, query) {
    const source = typeof text === 'string' ? text : '';
    if (!source) return [];

    const terms = String(query ?? '')
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean);

    if (!terms.length) return [{ text: source, match: false }];

    // Longest first so "conserv" wins over "con" when both are present,
    // otherwise the shorter term splits the longer one into unusable pieces.
    const pattern = new RegExp(`(${terms.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'gi');

    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
        // Zero-length match guard: can only happen with an empty term, which is
        // already filtered out, but `exec` would spin forever if it slipped in.
        if (match.index === pattern.lastIndex) pattern.lastIndex += 1;

        if (match.index > lastIndex) {
            tokens.push({ text: source.slice(lastIndex, match.index), match: false });
        }
        tokens.push({ text: match[0], match: true });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < source.length) {
        tokens.push({ text: source.slice(lastIndex), match: false });
    }

    return tokens;
}

/**
 * Pull a window of `text` around the first match, with ellipses, so a long
 * excerpt shows *why* it matched instead of only its first 200 characters.
 *
 * @param {string} text
 * @param {string} query
 * @param {{ radius?: number, maxLength?: number }} [options]
 */
export function excerptAroundMatch(text, query, options = {}) {
    const { radius = 90, maxLength = 220 } = options;
    const source = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
    if (!source) return '';

    const terms = String(query ?? '').split(/\s+/).filter(Boolean);
    if (!terms.length || source.length <= maxLength) {
        return source.length > maxLength ? `${source.slice(0, maxLength).trimEnd()}…` : source;
    }

    const lowerSource = source.toLowerCase();
    const index = terms.reduce((best, term) => {
        const found = lowerSource.indexOf(term.toLowerCase());
        if (found === -1) return best;
        return best === -1 ? found : Math.min(best, found);
    }, -1);

    if (index === -1) return `${source.slice(0, maxLength).trimEnd()}…`;

    const start = Math.max(0, index - radius);
    const end = Math.min(source.length, start + maxLength);
    const slice = source.slice(start, end).trim();

    return `${start > 0 ? '…' : ''}${slice}${end < source.length ? '…' : ''}`;
}
