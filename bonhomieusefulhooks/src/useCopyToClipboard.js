import { useCallback, useEffect, useRef, useState } from 'react';

export default function useCopyToClipboard(delay = 1200) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  // Clear any pending reset on unmount to avoid state updates after unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const copy = useCallback(
    async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);

        // Cancel any existing reset timer before setting a new one
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), delay);

        return true;
      } catch (err) {
        console.warn('Copy failed:', err);
        setCopied(false);
        return false;
      }
    },
    [delay]
  );

  return { copied, copy };
}
