import Image from 'next/image';
import parse from 'html-react-parser';

function toInt(value) {
  if (value == null) return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function HtmlContent({ html }) {
  const input = String(html || '');

  return parse(input, {
    replace(node) {
      if (node?.type !== 'tag' || node?.name !== 'img') return;

      const attribs = node.attribs || {};
      const src = attribs.src;
      if (!src) return;

      const alt = attribs.alt || '';
      const width = toInt(attribs.width) || 1200;
      const height = toInt(attribs.height) || 800;

      return (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 1024px) 100vw, 800px"
          style={{ width: '100%', height: 'auto' }}
        />
      );
    },
  });
}
