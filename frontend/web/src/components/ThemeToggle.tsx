'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Single global theme switch. Reads data-theme stamped on <html> by the
 * pre-paint bootstrap in layout.tsx, flips the attribute on click, persists
 * the choice (localStorage.tp_theme). Everything in the app consumes CSS
 * variables, so one toggle re-skins the entire product.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      window.localStorage.setItem('tp_theme', next);
    } catch {
      /* localStorage unavailable (private mode) — theme still flips in-memory */
    }
    setTheme(next);
  };

  // Render a stable neutral button on the server render / first paint to avoid
  // a hydration mismatch on the icon.
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle color theme"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-muted"
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-accent-amber" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-accent-indigo" aria-hidden="true" />
      )}
    </button>
  );
}
