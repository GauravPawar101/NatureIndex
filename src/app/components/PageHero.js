export default function PageHero({ eyebrow, title, description, children }) {
  return (
    <header className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
      {eyebrow && <span className="eyebrow mb-4">{eyebrow}</span>}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-gray-300 leading-relaxed">{description}</p>
      )}
      {children}
    </header>
  );
}
