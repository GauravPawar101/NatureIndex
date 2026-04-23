'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';

type ThemeChoice = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch (next-themes resolves theme on client).
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="w-10 h-10 rounded-full border border-white/15 bg-black/20"
      />
    );
  }

  const current = (theme || 'system') as ThemeChoice;
  const next: ThemeChoice = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';

  const Icon = current === 'dark' ? Moon : current === 'light' ? Sun : Monitor;
  const label = current === 'dark' ? 'Dark' : current === 'light' ? 'Light' : 'System';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}. Switch to ${next}.`}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-black/30 backdrop-blur-md text-white hover:bg-black/40 transition"
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
