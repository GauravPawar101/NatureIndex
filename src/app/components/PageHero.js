export default function PageHero({ eyebrow, title, description, children, align = 'center' }) {
  const isCentered = align === 'center';

  return (
    <header
      className={`mb-12 md:mb-16 ${
        isCentered ? 'mx-auto max-w-3xl text-center' : 'max-w-4xl'
      }`}
    >
      {eyebrow && <span className="eyebrow mb-4 block">{eyebrow}</span>}
      {/* `display-1` is the serif scale, not a bold sans. The typeface is doing
          the work here; a heavier weight on the old sans made every headline
          shout. */}
      <h1 className="display-1 mb-5 text-[var(--ink)]">{title}</h1>
      {description && <p className="lede">{description}</p>}
      {children}
    </header>
  );
}
