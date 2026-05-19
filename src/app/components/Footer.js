import Link from 'next/link';
import { Leaf, Twitter, Linkedin, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-12">
      <div className="container mx-auto max-w-6xl px-6 text-center">
        <div className="flex justify-center items-center gap-2 mb-4">
          <Leaf className="w-6 h-6 text-white" />
          <span className="text-lg font-bold text-white">Nature Index</span>
        </div>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          An open platform for conservation science, field discoveries, and community action.
        </p>
        <nav className="flex justify-center gap-6 mb-8 text-sm">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
          <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link>
        </nav>
        <div className="flex justify-center gap-6 mb-8">
          <Link href="https://x.com/GauravPawar1001" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter">
            <Twitter className="w-5 h-5" />
          </Link>
          <Link href="https://www.linkedin.com/in/gaurav-pawar-471933298/" className="text-gray-400 hover:text-white transition-colors" aria-label="LinkedIn">
            <Linkedin className="w-5 h-5" />
          </Link>
          <Link href="https://github.com/GauravPawar101" className="text-gray-400 hover:text-white transition-colors" aria-label="GitHub">
            <Github className="w-5 h-5" />
          </Link>
        </div>
        <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Nature Index. All rights reserved.</p>
      </div>
    </footer>
  );
}
