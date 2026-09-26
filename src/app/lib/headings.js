/**
 * Heading extraction and slugging, shared by the server page (which renders the
 * article) and the client table of contents (which scrolls to it).
 *
 * These two must agree exactly: if the page slugs a heading one way and the TOC
 * looks for another, every link silently fails to scroll. That is why the slug
 * function lives here rather than being duplicated.
 */

/**
 * Matches ATX headings (`## Title`) but not inside fenced code blocks — a
 * markdown sample containing "## Install" should not become a chapter of the
 * article.
 */
const FENCE_SPLIT = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/;

/**
 * GitHub-compatible slug: lowercase, strip anything that is not a letter,
 * number, space or hyphen, then collapse spaces to hyphens.
 *
 * @returns {string}
 */
export function slugifyHeading(text) {
    return String(text ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * @param {string} markdown
 * @param {{ maxLevel?: number }} [options] Only headings at or above this level
 *   are included, so `####` sub-sub-sections do not flood the sidebar.
 * @returns {Array<{ id: string, text: string, level: number, line: number }>}
 *   `line` is the 1-based line in the source markdown. The article renderer uses
 *   it to look up the exact same id, which avoids any render-order-dependent
 *   counter — those misbehave under React's double-invoked renders and
 *   Suspense retries.
 */
export function extractHeadings(markdown, options = {}) {
    const { maxLevel = 3 } = options;

    if (!markdown || typeof markdown !== 'string') return [];

    const headings = [];
    // Track duplicates so `## Setup` twice yields `setup` and `setup-1`,
    // matching how GitHub and react-markdown disambiguate anchors.
    const seen = new Map();

    // Line numbers must be counted across the whole document, including the
    // code fences that are skipped below, so walk the original string rather
    // than the segments.
    const lineOffsets = [];
    let cursor = 0;
    for (const segment of markdown.split(FENCE_SPLIT)) {
        lineOffsets.push(cursor);
        cursor += segment.length;
    }

    const segments = markdown.split(FENCE_SPLIT);

    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        // Odd-indexed segments are the code fences themselves.
        if (segment.startsWith('```') || segment.startsWith('~~~')) continue;

        const startLine = markdown.slice(0, lineOffsets[index]).split('\n').length;

        segment.split('\n').forEach((line, lineIndex) => {
            const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
            if (!match) return;

            const level = match[1].length;
            if (level > maxLevel) return;

            const text = match[2].replace(/[*_`~]/g, '').trim();
            if (!text) return;

            const base = slugifyHeading(text);
            if (!base) return;

            const count = seen.get(base) || 0;
            seen.set(base, count + 1);

            headings.push({
                id: count === 0 ? base : `${base}-${count}`,
                text,
                level,
                line: startLine + lineIndex,
            });
        });
    }

    return headings;
}

/**
 * Strips the heading markers from a heading line, leaving the text.
 * Used to render a plain-text outline without markdown syntax.
 */
export function stripHeadingMarkers(text) {
    return String(text ?? '').replace(/[*_`~]/g, '').trim();
}
