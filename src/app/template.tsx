'use client';

import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import PageTransition from './components/PageTransition';

export default function RootTemplate({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();

  const key = pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={key}>{children}</PageTransition>
    </AnimatePresence>
  );
}
