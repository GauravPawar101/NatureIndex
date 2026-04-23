import { stripHtmlToText } from './readingTime';

function slugify(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'section';
}

function upsertIdAttribute(attrText, id) {
  const hasId = /\bid\s*=\s*(["']).*?\1/i.test(attrText);
  if (hasId) {
    return attrText.replace(/\bid\s*=\s*(["']).*?\1/i, `id="${id}"`);
  }
  const trimmed = (attrText || '').trim();
  if (!trimmed) return ` id="${id}"`;
  return `${attrText} id="${id}"`;
}

/**
 * Extracts all h2/h3 headings from HTML, generates unique anchor ids,
 * injects those ids into the returned HTML, and returns toc entries.
 */
export function injectHeadingIdsAndBuildToc(html) {
  const input = String(html || '');
  const used = new Map(); // base -> count
  const toc = [];

  const output = input.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, levelRaw, attrsRaw, innerRaw) => {
    const level = Number(levelRaw);
    const attrs = attrsRaw || '';
    const inner = innerRaw || '';

    const text = stripHtmlToText(inner);
    if (!text) return match;

    const base = slugify(text);
    const current = used.get(base) || 0;
    const next = current + 1;
    used.set(base, next);

    const id = next === 1 ? base : `${base}-${next}`;

    toc.push({ id, text, level });

    const newAttrs = upsertIdAttribute(attrs, id);
    return `<h${level}${newAttrs}>${inner}</h${level}>`;
  });

  return { html: output, toc };
}
