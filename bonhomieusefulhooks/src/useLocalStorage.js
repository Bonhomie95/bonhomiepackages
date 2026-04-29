import { useState, useEffect, useCallback } from 'react';

const isClient = typeof window !== 'undefined';

/**
 * Persists a value in localStorage and keeps it in sync across browser tabs.
 *
 * SSR-safe: falls back to initialValue on the server and during hydration.
 */
export default function useLocalStorage(key, initialValue) {
  const readValue = useCallback(() => {
    // Guard for SSR (Next.js, Remix) — window.localStorage does not exist
    // server-side. Return initialValue so the hook is safe to use in any env.
    if (!isClient) return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.warn(`useLocalStorage: Failed reading "${key}"`, err);
      return initialValue;
    }
  // initialValue intentionally excluded — callers should memoize it if needed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [value, setValue] = useState(readValue);

  // Re-read from storage whenever the key changes.
  useEffect(() => {
    setValue(readValue());
  }, [readValue]);

  useEffect(() => {
    if (!isClient) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`useLocalStorage: Failed writing "${key}"`, err);
    }
  }, [key, value]);

  // Sync across browser tabs via the storage event
  useEffect(() => {
    if (!isClient) return;
    const handler = (e) => {
      if (e.key === key) {
        setValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue];
}
