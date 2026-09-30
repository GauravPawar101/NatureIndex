import './globals.css';
import { Inter, Source_Serif_4 } from 'next/font/google';
import Header from './components/Header';
import Footer from './components/Footer';
import ToastProvider from './components/ToastProvider';
import { THEME_INIT_SCRIPT } from './components/ThemeToggle';

// Two faces, split by role, the way Medium splits them: a UI sans for every
// label, byline and card title, and a serif that only appears in the story
// title and the story body. Making the card titles serif too — which the old
// design system did — is the single most obvious tell that a page is not
// Medium.
// Inter stands in for Söhne, Medium's UI face: the same humanist skeleton, the
// same tight apertures, and — unlike a novelty serif — it renders every
// byline and timestamp at 14px without looking like a fallback.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

// Source Serif 4 stands in for medium-content-serif. Optical sizing is kept
// because the story title is 42px and the body is 20px, and one weight has to
// read correctly at both.
const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-editorial',
  display: 'swap',
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
        {/* No background layer. Medium's page is a flat field of one colour, and
            the previous fixed blurred photograph behind the whole document was
            the largest single reason this did not read as Medium. */}
        <ToastProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
