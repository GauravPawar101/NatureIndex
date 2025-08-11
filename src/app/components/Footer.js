import Link from 'next/link';
import { Mountain, Twitter, Linkedin, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer 
      className="relative bg-cover bg-center border-t border-white/10 py-12 text-center" 
      style={{ backgroundImage: `url("")` }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/70"></div>

      {/* Footer Content */}
      <div className="relative container mx-auto max-w-6xl px-6 text-gray-400">
        <div className="flex justify-center items-center gap-2 mb-4">
          <Mountain className="w-6 h-6 text-white" />
          <span className="text-lg font-bold text-white">Nature Index.</span>
        </div>
        <p className="mb-6">Cataloging the Wonders of the Natural World.</p>
        <div className="flex justify-center gap-6 mb-8">
          <Link href="#" className="hover:text-white transition-colors"><Twitter /></Link>
          <Link href="#" className="hover:text-white transition-colors"><Linkedin /></Link>
          <Link href="#" className="hover:text-white transition-colors"><Github /></Link>
        </div>
        <p className="text-sm">&copy; {new Date().getFullYear()} Nature Index. All Rights Reserved.</p>
      </div>
    </footer>
  );
}