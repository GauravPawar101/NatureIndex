import Link from 'next/link';
import { Home, Search } from 'lucide-react';

/**
 * Static by design: this must render even when the database is unreachable,
 * which is exactly when someone is most likely to land here. So it links to
 * the search page rather than querying anything itself.
 */
export default function NotFound() {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center flex flex-col items-center justify-center text-center px-4"
      style={{
        backgroundImage: `url("https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg?auto=compress&cs=tinysrgb&w=2100")`,
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 max-w-lg">
        <span className="eyebrow mb-6 block">404</span>
        <h1 className="text-5xl md:text-7xl font-bold text-[var(--ink)] tracking-tight mb-4">
          Page not found
        </h1>
        <p className="text-xl text-[var(--ink-muted)] font-medium mb-8">
          The path you followed has gone quiet — but there is still work to do.
        </p>

        {/* Recovery paths, not just a dead end. */}
        <form
          action="/blog"
          role="search"
          className="mb-8 flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="notfound-search" className="sr-only">Search stories</label>
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
            />
            <input
              id="notfound-search"
              name="q"
              type="search"
              placeholder="Search the Field Journal..."
              spellCheck={false}
              className="field pl-10 [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>
          <button type="submit" className="btn btn-primary !px-6 !py-2.5">Search</button>
        </form>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/" className="btn btn-primary">
            <Home className="w-5 h-5" />
            Return Home
          </Link>
        </div>

        <nav aria-label="Popular sections" className="mt-10">
          <p className="mb-3 text-sm text-[var(--ink-faint)]">Or try one of these:</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            {[
              { href: '/blog', label: 'All stories' },
              { href: '/blog?sort=popular', label: 'Most read' },
              { href: '/about', label: 'Our mission' },
              { href: '/signup', label: 'Become a contributor' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[var(--ink-muted)] underline underline-offset-4 transition-colors hover:text-[var(--ink)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
