import Link from 'next/link';
import { Leaf, Twitter, Linkedin, Github } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Explore',
    links: [
      { href: '/blog', label: 'Field Journal' },
      { href: '/blog?sort=popular', label: 'Most read' },
      { href: '/blog?q=conservation', label: 'Conservation' },
    ],
  },
  {
    title: 'Contribute',
    links: [
      { href: '/signup', label: 'Create an account' },
      { href: '/login', label: 'Sign in' },
      { href: '/create-post', label: 'Publish a story' },
    ],
  },
  {
    title: 'About',
    links: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'Our mission' },
    ],
  },
];

const SOCIALS = [
  { href: 'https://x.com/GauravPawar1001', label: 'Twitter', Icon: Twitter },
  { href: 'https://www.linkedin.com/in/gaurav-pawar-471933298/', label: 'LinkedIn', Icon: Linkedin },
  { href: 'https://github.com/GauravPawar101', label: 'GitHub', Icon: Github },
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-14">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="text-center md:text-left">
            <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
              <Leaf className="w-6 h-6 text-white" />
              <span className="text-lg font-bold text-white">Nature Index</span>
            </div>
            <p className="text-sm text-gray-400 md:max-w-xs">
              An open platform for conservation science, field discoveries, and community action.
            </p>
            <div className="mt-5 flex justify-center gap-4 md:justify-start">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {SECTIONS.map((section) => (
            <nav key={section.title} aria-labelledby={`footer-${section.title}`}>
              <h2 id={`footer-${section.title}`} className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
                {section.title}
              </h2>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-400 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Nature Index. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
