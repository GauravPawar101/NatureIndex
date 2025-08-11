'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mountain, PlusCircle } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // Refresh to update state
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
          <Mountain className="w-7 h-7 text-white drop-shadow-lg" />
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
              <button onClick={handleLogout} className="text-gray-300 hover:text-white text-sm font-medium">Logout</button>
            </>
          ) : (
            <Link href="/login" className="px-5 py-2 border border-white/20 text-white rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 font-medium text-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}