/**
 * The heading block at the top of a listing page.
 *
 * Medium does not have one: its section pages open straight into the stream,
 * with a "Latest" label and nothing else. This exists because the old design
 * had a full-bleed photographic hero on every page, and several listings still
 * expect a title. It is now the smallest thing that does the job — a 28px
 * title, a 14px subtitle, and a hairline underneath.
 */
export default function PageHero({ eyebrow, title, description, children, align = 'left' }) {
  const isCentered = align === 'center';

  return (
    <header
      className={`mb-8 border-b border-[var(--line)] pb-6 ${
        isCentered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'
      }`}
    >
      {eyebrow && <span className="eyebrow mb-2 block">{eyebrow}</span>}
      <h1 className="display-2">{title}</h1>
      {description && <p className="mt-2 text-[15px] leading-[1.5] text-[var(--ink-muted)]">{description}</p>}
      {children}
    </header>
  );
}
