import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';

// Module-level cache so we don't re-initialize Shiki for every request.
let processorPromise;

function getProcessor() {
  if (processorPromise) return processorPromise;

  processorPromise = Promise.resolve(
    unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeShiki, {
        // Detect language from <code class="language-..."> (or similar).
        // Unsupported/missing languages fall back to plain text.
        defaultLanguage: 'text',
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
      })
      .use(rehypeStringify)
  );

  return processorPromise;
}

export async function highlightHtmlWithShiki(html) {
  const input = String(html || '');
  if (!input.trim()) return input;

  const processor = await getProcessor();
  const file = await processor.process(input);
  return String(file);
}
