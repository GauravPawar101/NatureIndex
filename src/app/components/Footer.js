import Link from 'next/link';
import { Twitter, Linkedin, Github } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Read',
    links: [
      { href: '/blog', label: 'Stories' },
      { href: '/discover', label: 'Discover' },
      { href: '/feed', label: 'Feed' },
      { href: '/media', label: 'Media' },
    ],
  },
  {
    title: 'Write',
    links: [
      { href: '/create-post', label: 'Publish a story' },
      { href: '/signup', label: 'Create an account' },
      { href: '/login', label: 'Sign in' },
      { href: '/leaderboards', label: 'Leaderboards' },
    ],
  },
  {
    title: 'About',
    links: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'Our mission' },
      { href: '/analytics', label: 'Analytics' },
    ],
  },
];

const SOCIALS = [
  { href: 'https://x.com/GauravPawar1001', label: 'Twitter', Icon: Twitter },
  { href: 'https://www.linkedin.com/in/gaurav-pawar-471933298/', label: 'LinkedIn', Icon: Linkedin },
  { href: 'https://github.com/GauravPawar101', label: 'GitHub', Icon: Github },
];

/**
 * Medium's footer: three (here, three) columns of 14px links at 60% black,
 * the wordmark above them, and a hairline-separated legal row. No background
 * band, no newsletter form, no social row with borders around the icons —
 * Medium's footer is a list of links and nothing else.
 */
export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto max-w-[1012px] px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="mb-3 inline-block text-[22px] font-bold tracking-[-0.02em] text-[var(--ink)]">
              <span className="text-[var(--accent)]">Nature</span>Index
            </Link>
            <p className="max-w-xs text-[14px] leading-[1.4] text-[var(--ink-muted)]">
              An open platform for conservation science, field discoveries, and community action.
            </p>
            <div className="mt-4 flex gap-4">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
                >
                  <Icon size={18} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {SECTIONS.map((section) => (
            <nav key={section.title} aria-labelledby={`footer-${section.title}`}>
              <h2 id={`footer-${section.title}`} className="mb-3 text-[14px] font-bold text-[var(--ink)]">
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-[var(--line)] pt-5 text-[13px] text-[var(--ink-faint)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Nature Index. All rights reserved.</p>
          <p>Field reports are published by their authors.</p>
        </div>
      </div>
    </footer>
  );
}
