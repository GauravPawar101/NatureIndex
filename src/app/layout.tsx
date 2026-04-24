import './globals.css';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import TopLoadingBar from './components/TopLoadingBar';
import { ThemeProvider } from './theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Nature Index. - Engineered for Adventure',
  description: 'Curated alpine experiences for the modern adventurer.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport = {
  themeColor: '#000000',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#0f766e',
          colorBackground: '#ffffff',
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard'}
      afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard'}
    >
      <html lang={locale} suppressHydrationWarning>
        <body className={`${inter.className} bg-[var(--background)] text-[var(--foreground)] font-sans antialiased`}>
          <ThemeProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <TopLoadingBar />
              <Header />
              <main>{children}</main>
              <Footer />
            </NextIntlClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
