const DEFAULT_WPM = 200;

function decodeBasicHtmlEntities(text) {
  if (!text) return '';

  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  return text
    // numeric entities: &#123; and &#x1F600;
    .replace(/&#(x?[0-9a-fA-F]+);/g, (_match, code) => {
      try {
        const value = code.toLowerCase().startsWith('x')
          ? parseInt(code.slice(1), 16)
          : parseInt(code, 10);
        if (!Number.isFinite(value)) return '';
        return String.fromCodePoint(value);
      } catch {
        return '';
      }
    })
    // named entities: &amp; &nbsp; ... (basic set)
    .replace(/&([a-zA-Z]+);/g, (match, name) => {
      const replacement = named[name];
      return replacement !== undefined ? replacement : match;
    });
}

export function stripHtmlToText(html) {
  if (!html) return '';

  // Remove script/style blocks
  let text = String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');

  // Replace common block-ish tags with spaces to avoid word-joins
  text = text.replace(/<\s*br\s*\/?>/gi, ' ');
  text = text.replace(/<\s*\/(p|div|h1|h2|h3|h4|h5|h6|li|ul|ol|blockquote|pre)\s*>/gi, ' ');

  // Drop all remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode some entities and normalize whitespace
  text = decodeBasicHtmlEntities(text);
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export function countWords(text) {
  if (!text) return 0;
  const words = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

export function readingTimeMinutesFromHtml(html, { wpm = DEFAULT_WPM } = {}) {
  const safeWpm = typeof wpm === 'number' && Number.isFinite(wpm) && wpm > 0 ? wpm : DEFAULT_WPM;
  const text = stripHtmlToText(html);
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / safeWpm));
}

export function formatReadingTimeFromHtml(html, options) {
  const minutes = readingTimeMinutesFromHtml(html, options);
  return `${minutes} min read`;
}
