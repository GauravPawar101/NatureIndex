'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, X, FileText, User, BarChart3, Settings, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
    { href: '/blog', label: 'Stories' },
    { href: '/discover', label: 'Discover' },
    { href: '/feed', label: 'Feed' },
    { href: '/media', label: 'Media' },
    { href: '/leaderboards', label: 'Leaderboards' },
    { href: '/about', label: 'About' },
];

const DEFAULT_AVATAR = '/images/default-avatar.svg';

/**
 * The top bar.
 *
 * Medium's bar carries almost nothing: the wordmark on the left, and on the
 * right a search affordance, a Write link, and either an avatar or a pair of
 * pill buttons. There is no horizontal nav — on Medium the sections live in a
 * left sidebar that this app does not have, so the links are rendered inline
 * here instead, between the wordmark and the actions, at Medium's 14px.
 */
export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);

  // Resolves the signed-in user for the header affordances. Silent on failure:
  // a header is chrome, and a logged-out visitor should see the same layout
  // rather than an error. The pages themselves report their own failures.
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
          id: data.user.id,
          email: data.user.email,
          avatarUrl: data.user.user_metadata?.avatar_url || null,
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

  // The avatar menu is Medium's dropdown: click the circle, get your own
  // profile, settings, and sign out. Dismissed on outside click and on Escape,
  // because a menu that only closes on its own trigger is a menu that traps
  // people on touch.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const signOut = async () => {
    try {
      const { createClient } = await import('../lib/supabase/client');
      const supabase = createClient();
      await supabase?.auth.signOut();
      // A full navigation, not a client push: the middleware and the RLS-backed
      // server components both re-evaluate on a fresh document, and a push would
      // leave cached server components rendered under the old session.
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const value = headerQuery.trim();
    router.push(value ? `/blog?q=${encodeURIComponent(value)}` : '/blog');
    setHeaderQuery('');
    setMobileMenuOpen(false);
  };

  const isActive = (href) => pathname === href;
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 h-16 bg-[var(--bg)]">
      <div className="mx-auto flex h-16 max-w-[1012px] items-center gap-3 px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[22px] font-bold tracking-[-0.02em] text-[var(--ink)]"
        >
          <span className="text-[var(--accent)]">Nature</span>
          <span>Index</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-4 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`text-sm transition-colors ${
                isActive(link.href) ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Search hands off to the blog index, where the full filter and sort
              UI lives. Submitting navigates with the query in the URL so
              results stay shareable. */}
          <form role="search" onSubmit={submitSearch} className="relative hidden w-52 md:block">
            <label htmlFor="header-search" className="sr-only">
              Search stories
            </label>
            <input
              id="header-search"
              type="search"
              value={headerQuery}
              onChange={(event) => setHeaderQuery(event.target.value)}
              placeholder="Search"
              spellCheck={false}
              className="field py-2 pl-3 pr-3 text-sm"
            />
          </form>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setHeaderQuery('');
            }}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] md:hidden"
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          <ThemeToggle />

          {user ? (
            <div className="hidden md:block" ref={menuRef}>
              <Link href="/create-post" className="btn btn-ghost">
                Write
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className="ml-1 block h-8 w-8 overflow-hidden rounded-full"
              >
                <Image
                  src={user.avatarUrl || DEFAULT_AVATAR}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 rounded-full object-cover"
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-5 top-[60px] z-50 w-56 overflow-hidden rounded border border-[var(--line)] bg-[var(--bg)] py-1"
                >
                  <MenuLink href={`/profile/${user.username}`} icon={User} onNavigate={() => setMenuOpen(false)}>
                    Your profile
                  </MenuLink>
                  <MenuLink href="/create-post" icon={FileText} onNavigate={() => setMenuOpen(false)}>
                    New story
                  </MenuLink>
                  <MenuLink href="/analytics" icon={BarChart3} onNavigate={() => setMenuOpen(false)}>
                    Analytics
                  </MenuLink>
                  <MenuLink href="/account" icon={Settings} onNavigate={() => setMenuOpen(false)}>
                    Settings
                  </MenuLink>
                  <div className="my-1 h-px bg-[var(--line)]" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)]"
                  >
                    <LogOut size={16} aria-hidden="true" className="text-[var(--ink-faint)]" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="btn btn-ghost">
                Sign In
              </Link>
              <Link href="/signup" className="btn btn-secondary">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* The mobile panel is a complete navigation on its own: search, every
          section, and the auth actions, so nothing is only reachable at one
          breakpoint. */}
      {mobileMenuOpen && (
        <div id="mobile-nav" className="border-b border-[var(--line)] bg-[var(--bg)] md:hidden">
          <div className="mx-auto max-w-[1012px] px-5 py-3">
            <form role="search" onSubmit={submitSearch} className="relative mb-3">
              <label htmlFor="mobile-search" className="sr-only">
                Search stories
              </label>
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
              />
              <input
                id="mobile-search"
                type="search"
                value={headerQuery}
                onChange={(event) => setHeaderQuery(event.target.value)}
                placeholder="Search"
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
                  className={`border-b border-[var(--line)] py-3 text-sm ${
                    isActive(link.href) ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-3 flex items-center gap-2 pb-1 md:hidden">
              {user ? (
                <>
                  <Link href="/create-post" onClick={closeMobileMenu} className="btn btn-secondary flex-1">
                    Write
                  </Link>
                  <button type="button" onClick={signOut} className="btn btn-ghost flex-1">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMobileMenu} className="btn btn-ghost flex-1">
                    Sign In
                  </Link>
                  <Link href="/signup" onClick={closeMobileMenu} className="btn btn-secondary flex-1">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon: Icon, onNavigate, children }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)]"
    >
      <Icon size={16} aria-hidden="true" className="text-[var(--ink-faint)]" />
      {children}
    </Link>
  );
}
