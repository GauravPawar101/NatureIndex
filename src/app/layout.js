import './globals.css';
import { Inter, Source_Serif_4 } from 'next/font/google';
import Header from './components/Header';
import Footer from './components/Footer';
import ToastProvider from './components/ToastProvider';
import { THEME_INIT_SCRIPT } from './components/ThemeToggle';

// Two faces, split by role. Source Serif carries every headline and the article
// body; Inter handles interface text. That split is the single biggest lever on
// whether a page looks published or assembled.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-editorial',
  display: 'swap',
  // Optical sizing is what lets one weight read correctly at both 4rem and
  // 1.3rem; without it the large sizes look thin and the small ones heavy.
  axes: ['opsz'],
});

export const metadata = {
  title: 'Nature Index — Conservation Science & Community',
  description:
    'An open platform for conservation science, field discoveries, and community action.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint. `suppressHydrationWarning`
            above covers the attribute this sets on <html>. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${serif.variable} font-sans antialiased`}>
        {/* The photographic ground every glass surface sits on. Fixed and behind
            everything, so a card always has something to blur. */}
        <div className="ground" aria-hidden="true" />

        <ToastProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
