'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Leaf, PlusCircle } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { useEffect, useState } from 'react';

const DEFAULT_AVATAR = '/images/default-avatar.svg';

export default function Header() {
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

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

  const handleLogout = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="w-7 h-7 text-white drop-shadow-lg" />
          <span className="text-xl font-bold text-white drop-shadow-lg">Nature Index</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-6 bg-black/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`font-medium transition-colors ${pathname === link.href ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/create-post" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors">
                <PlusCircle size={16} />
                Create Post
              </Link>
              <Link href="/account" className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-gray-200 hover:border-white/30 hover:text-white transition-colors">
                <span className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/15">
                  <Image src={avatarUrl || DEFAULT_AVATAR} alt="Account avatar" fill className="object-cover" />
                </span>
                <span>Account</span>
              </Link>
              <button onClick={handleLogout} className="text-gray-300 hover:text-white text-sm font-medium">Logout</button>
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
        </div>
      </div>
    </header>
  );
}