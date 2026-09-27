'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Leaf, LogOut, PlusCircle, Menu, Search, X } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { useToast } from './ToastProvider';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_AVATAR = '/images/default-avatar.svg';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const toast = useToast();
    // Memoized so it isn't recreated (and re-triggering the auth subscription
    // effect below) on every render.
    const [supabase] = useState(() => createClient());
    const [user, setUser] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [headerQuery, setHeaderQuery] = useState('');

    // The header is `fixed`, so anything scrolled underneath it sits directly
    // behind the logo and the auth buttons. Fade in an opaque backdrop once the
    // page is scrolled to keep them legible; over the home hero (at scroll
    // top) the header stays transparent so the full-bleed image shows through.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (!supabase) return;

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .single();

                setAvatarUrl(profile?.avatar_url || DEFAULT_AVATAR);
            } else {
                setAvatarUrl(DEFAULT_AVATAR);
            }
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session?.user) {
                setAvatarUrl(DEFAULT_AVATAR);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleLogout = useCallback(async () => {
        if (!supabase || loggingOut) return;

        setLoggingOut(true);
        const { error } = await supabase.auth.signOut();

        if (error) {
            // A failed signOut usually means the session was already gone
            // server-side. Clearing local state is still the right move, but say
            // what happened rather than pretending it worked.
            toast.error('Could not sign out cleanly', {
                message: 'Your session may already have expired. Try again.',
            });
            setLoggingOut(false);
            return;
        }

        toast.success('Signed out');
        // A full navigation (rather than a client push) is required: the server
        // components on the next page read the auth cookie, and a client-side
        // transition would render them with the old session.
        window.location.href = '/';
    }, [supabase, loggingOut, toast]);

    // One list drives both the desktop bar and the mobile panel, so a page can
    // never end up linked in one and missing from the other.
    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/blog', label: 'Blog' },
        { href: '/media', label: 'Media' },
        { href: '/discover', label: 'Discover' },
        { href: '/feed', label: 'Feed' },
        { href: '/leaderboards', label: 'Leaderboards' },
        { href: '/analytics', label: 'Analytics' },
        { href: '/about', label: 'About' },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled
                ? 'bg-black/80 backdrop-blur-md border-b border-white/10'
                : 'bg-transparent border-b border-transparent'
                }`}
        >
            <div className="container mx-auto flex items-center justify-between gap-4 p-4">
                <Link href="/" className="flex items-center gap-2">
                    <Leaf className="w-7 h-7 text-white drop-shadow-lg" />
                    <span className="text-xl font-bold text-white drop-shadow-lg">Nature Index</span>
                </Link>

                {/* `xl` rather than `lg`: six links at gap-6 stop fitting before
                    the auth buttons do, and wrapping the nav looks worse than
                    moving it to the mobile panel a breakpoint earlier. */}
                <div className="hidden xl:flex items-center gap-3 flex-1 justify-center px-6">
                    <nav className="flex items-center gap-5">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={pathname === link.href ? 'page' : undefined}
                                className={`font-medium transition-colors ${pathname === link.href ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Site-wide search that hands off to the blog index, where
                        the full filter/sort UI lives. Submitting navigates with
                        the query in the URL so results are shareable. */}
                    <form
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const value = headerQuery.trim();
                            router.push(value ? `/blog?q=${encodeURIComponent(value)}` : '/blog');
                            setHeaderQuery('');
                            setMobileMenuOpen(false);
                        }}
                        className="relative w-64"
                    >
                        <label htmlFor="header-search" className="sr-only">Search stories</label>
                        <Search
                            size={15}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <input
                            id="header-search"
                            type="search"
                            value={headerQuery}
                            onChange={(event) => setHeaderQuery(event.target.value)}
                            placeholder="Search stories..."
                            spellCheck={false}
                            className="w-full rounded-full border border-white/15 bg-black/30 py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-white/40 [&::-webkit-search-cancel-button]:appearance-none"
                        />
                    </form>
                </div>
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <Link href="/create-post" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors">
                                <PlusCircle size={16} />
                                Create Post
                            </Link>
                            <Link href="/account" className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-gray-200 hover:border-white/30 hover:text-white transition-colors">
                                <span className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/15">
                                    <Image src={avatarUrl || DEFAULT_AVATAR} alt="Account avatar" fill className="object-cover" sizes="32px" unoptimized />
                                </span>
                                <span>Account</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="hidden items-center gap-1.5 text-gray-300 transition-colors hover:text-white text-sm font-medium disabled:opacity-50 sm:flex"
                            >
                                <LogOut size={14} aria-hidden="true" />
                                {loggingOut ? 'Signing out...' : 'Logout'}
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="px-5 py-2 border border-white/20 text-white rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 font-medium text-sm">
                                Login
                            </Link>
                            <Link href="/signup" className="px-5 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors">
                                Sign up
                            </Link>
                        </div>
                    )}

                    {/* Mobile nav toggle — the nav links are otherwise unreachable below `xl` */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((open) => !open)}
                        className="xl:hidden flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-black/20 text-white"
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile nav panel */}
            {mobileMenuOpen && (
                <nav className="xl:hidden mx-4 mb-4 flex flex-col gap-1 bg-black/95 backdrop-blur-md rounded-2xl border border-white/10 p-3">
                    {/* Search is in the bar at every breakpoint, but the bar is
                        hidden below `lg`, so mobile gets its own field here. */}
                    <form
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const value = headerQuery.trim();
                            router.push(value ? `/blog?q=${encodeURIComponent(value)}` : '/blog');
                            setHeaderQuery('');
                            setMobileMenuOpen(false);
                        }}
                        className="relative mb-2"
                    >
                        <label htmlFor="header-search-mobile" className="sr-only">Search stories</label>
                        <Search
                            size={15}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <input
                            id="header-search-mobile"
                            type="search"
                            value={headerQuery}
                            onChange={(event) => setHeaderQuery(event.target.value)}
                            placeholder="Search stories..."
                            spellCheck={false}
                            className="w-full rounded-xl border border-white/15 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/40 [&::-webkit-search-cancel-button]:appearance-none"
                        />
                    </form>

                    {/* Every link closes the panel — otherwise it stays open on
                        top of the destination page. */}
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`px-4 py-2 rounded-xl font-medium transition-colors ${pathname === link.href ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {/* Auth actions live in the bar at every breakpoint, but on
                        small screens that bar gets crowded — repeat them here
                        so the panel is a complete navigation on its own. */}
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1">
                        {user ? (
                            <>
                                <Link href="/create-post" className="px-4 py-2 rounded-xl font-medium text-white hover:bg-white/5 transition-colors">
                                    Create Post
                                </Link>
                                <Link href="/account" className="px-4 py-2 rounded-xl font-medium text-white hover:bg-white/5 transition-colors">
                                    Account
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="px-4 py-2 rounded-xl text-left font-medium text-red-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    {loggingOut ? 'Signing out...' : 'Logout'}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="px-4 py-2 rounded-xl font-medium text-white hover:bg-white/5 transition-colors">
                                    Login
                                </Link>
                                <Link href="/signup" className="px-4 py-2 rounded-xl font-medium text-white hover:bg-white/5 transition-colors">
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}
