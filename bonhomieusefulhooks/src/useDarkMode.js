import { useEffect, useState } from 'react';

export default function useDarkMode() {
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return false;

    // Prefer saved theme
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';

    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [dark, setDark] = useState(getInitialTheme);

  // Update HTML class + localStorage on toggle
  useEffect(() => {
    const root = window.document.documentElement;

    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // Sync with system theme updates — but only when the user hasn't made an
  // explicit manual choice. If they have, respect that preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e) => {
      const stored = localStorage.getItem('theme');
      // A stored value means the user toggled manually — don't override it.
      if (!stored) {
        setDark(e.matches);
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { dark, setDark };
}
