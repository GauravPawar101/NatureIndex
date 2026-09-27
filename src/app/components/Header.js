'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Leaf, Menu, X, Search, LogOut } from 'lucide-react';
import { useToast } from './ToastProvider';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
    { href: '/blog', label: 'Stories' },
    { href: '/media', label: 'Media' },
    { href: '/discover', label: 'Discover' },
    { href: '/feed', label: 'Feed' },
    { href: '/leaderboards', label: 'Leaderboards' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/about', label: 'About' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Resolves the signed-in user for the header affordances. Silent on failure:
  // a header is chrome, and a logged-out visitor should see the same layout
  // rather than an error. The dashboard itself reports its own failures.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { createClient } = await import('../lib/supabase/client');
        const supabase = createClient();
        if (!supabase) return;

        const { data } = await supabase.auth.getUser();
        if (cancelled || !data?.user) return;

        setUser({
          email: data.user.email,
          username:
            data.user.user_metadata?.username ??
            data.user.email?.split('@')[0] ??
            'account',
        });
      } catch {
        // Not signed in, or Supabase unreachable. Either way, no header chrome.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    try {
      const { createClient } = await import('../lib/supabase/client');
      const supabase = createClient();
      await supabase?.auth.signOut();
      // A full navigation, not a client push: the middleware and the RLS-backed
      // server components both re-evaluate on a fresh document, and a push would
      // leave cached server components rendered under the old session.
      window.location.href = '/';
      toast.success('Signed out');
    } catch (error) {
      console.error('Sign out failed:', error);
      toast.error('Could not sign you out', {
        message: 'Check your connection and try again.',
      });
    }
  };

  const isActive = (href) => pathname === href;

  // The mobile panel is dismissed from the link handlers rather than by an
  // effect on `pathname`. An effect that closes a menu after every navigation
  // is a setState in an effect — a cascading render for something the click that
  // triggered the navigation can do directly.
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled
          ? 'border-[var(--line)] bg-[var(--surface)] backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="container-page flex h-16 items-center gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-serif)] text-lg font-semibold tracking-tight text-[var(--ink)]"
        >
          <Leaf size={20} className="text-[var(--accent)]" aria-hidden="true" />
          <span>Nature Index</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-[var(--surface-raised)] text-[var(--ink)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Site-wide search that hands off to the blog index, where the full
              filter/sort UI lives. Submitting navigates with the query in the
              URL so results stay shareable. */}
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const value = headerQuery.trim();
              router.push(value ? `/blog?q=${encodeURIComponent(value)}` : '/blog');
              setHeaderQuery('');
              setMobileMenuOpen(false);
            }}
            className="relative hidden w-56 md:block"
          >
            <label htmlFor="header-search" className="sr-only">
              Search stories
            </label>
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
            />
            <input
              id="header-search"
              type="search"
              value={headerQuery}
              onChange={(event) => setHeaderQuery(event.target.value)}
              placeholder="Search stories"
              spellCheck={false}
              className="field py-1.5 pl-9 pr-3 text-sm"
            />
          </form>

          <ThemeToggle />

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Link href="/create-post" className="btn btn btn-primary px-4 py-2 text-sm">
                  Write
                </Link>
                <Link href="/account" className="btn btn btn-ghost text-sm">
                  {user.username}
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sign out"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
                >
                  <LogOut size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn btn-ghost text-sm">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn btn-primary px-4 py-2 text-sm">
                  Start writing
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] lg:hidden"
          >
            {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* The mobile panel is a complete navigation on its own: every nav link
          plus search plus the auth actions, so nothing is only reachable at one
          breakpoint. */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="glass-raised mx-3 mb-3 overflow-hidden p-2 lg:hidden"
        >
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const value = headerQuery.trim();
              router.push(value ? `/blog?q=${encodeURIComponent(value)}` : '/blog');
              setHeaderQuery('');
              setMobileMenuOpen(false);
            }}
            className="relative mb-2 md:hidden"
          >
            <label htmlFor="mobile-search" className="sr-only">
              Search stories
            </label>
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
            />
            <input
              id="mobile-search"
              type="search"
              value={headerQuery}
              onChange={(event) => setHeaderQuery(event.target.value)}
              placeholder="Search stories"
              spellCheck={false}
              className="field py-2 pl-9 pr-3 text-sm"
            />
          </form>

          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-[var(--surface-raised)] text-[var(--ink)]'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-2 flex flex-col gap-1 border-t border-[var(--line)] pt-2 md:hidden">
            {user ? (
              <>
                <Link href="/create-post" onClick={closeMobileMenu} className="btn btn btn-primary w-full">
                  Write a story
                </Link>
                <Link href="/account" onClick={closeMobileMenu} className="btn btn btn-secondary w-full">
                  Your account
                </Link>
                <button type="button" onClick={signOut} className="btn btn btn-ghost w-full">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMobileMenu} className="btn btn btn-secondary w-full">
                  Sign in
                </Link>
                <Link href="/signup" onClick={closeMobileMenu} className="btn btn btn-primary w-full">
                  Start writing
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
