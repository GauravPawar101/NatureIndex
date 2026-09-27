import Link from 'next/link';
import { Leaf, Twitter, Linkedin, Github } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Read',
    links: [
      { href: '/blog', label: 'Field journal' },
      { href: '/discover', label: 'Discover' },
      { href: '/feed', label: 'Feed' },
      { href: '/media', label: 'Photos and video' },
    ],
  },
  {
    title: 'Contribute',
    links: [
      { href: '/signup', label: 'Create an account' },
      { href: '/login', label: 'Sign in' },
      { href: '/create-post', label: 'Publish a story' },
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

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] py-14">
      <div className="container-page">
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="text-center md:text-left">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 font-[family-name:var(--font-serif)] text-lg font-semibold text-[var(--ink)]"
            >
              <Leaf size={20} className="text-[var(--accent)]" aria-hidden="true" />
              <span>Nature Index</span>
            </Link>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-[var(--ink-muted)] md:mx-0">
              An open platform for conservation science, field discoveries, and
              community action.
            </p>
            <div className="mt-5 flex justify-center gap-3 md:justify-start">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink-muted)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
                >
                  <Icon size={15} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {SECTIONS.map((section) => (
            <nav key={section.title} aria-labelledby={`footer-${section.title}`}>
              <h2
                id={`footer-${section.title}`}
                className="eyebrow mb-4"
              >
                {section.title}
              </h2>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--line)] pt-6 text-xs text-[var(--ink-faint)] sm:flex-row">
          <p>© {new Date().getFullYear()} Nature Index. All rights reserved.</p>
          <p>Field reports are published by their authors.</p>
        </div>
      </div>
    </footer>
  );
}
