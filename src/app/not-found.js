import Link from 'next/link';
import { Search } from 'lucide-react';

/**
 * Static by design: this must render even when the database is unreachable,
 * which is exactly when someone is most likely to land here. So it links to
 * the search page rather than querying anything itself.
 *
 * Flat white, centred, no photograph — Medium's 404 is a plain page with a
 * search box, and a full-bleed image behind an error message is precisely the
 * kind of thing this design system no longer does.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-20 text-center">
      <div className="w-full max-w-md">
        <span className="eyebrow mb-3 block">404</span>
        <h1 className="display-1 mb-3">Page not found</h1>
        <p className="mb-8 text-[16px] leading-[1.5] text-[var(--ink-muted)]">
          The path you followed has gone quiet — but there is still work to do.
        </p>

        {/* Recovery paths, not just a dead end. */}
        <form action="/blog" role="search" className="mb-6 flex gap-2">
          <label htmlFor="notfound-search" className="sr-only">Search stories</label>
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
            />
            <input
              id="notfound-search"
              name="q"
              type="search"
              placeholder="Search stories"
              spellCheck={false}
              className="field pl-9 [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <Link href="/" className="btn btn-secondary">
          Go to the home page
        </Link>

        <nav aria-label="Popular sections" className="mt-10 border-t border-[var(--line)] pt-6">
          <p className="mb-3 text-[13px] text-[var(--ink-faint)]">Or try one of these:</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px]">
            {[
              { href: '/blog', label: 'All stories' },
              { href: '/blog?sort=popular', label: 'Most read' },
              { href: '/about', label: 'Our mission' },
              { href: '/signup', label: 'Become a contributor' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
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
