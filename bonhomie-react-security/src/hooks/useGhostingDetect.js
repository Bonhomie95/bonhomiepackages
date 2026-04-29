import { useEffect, useRef } from 'react';

/**
 * Detects simultaneous key presses that exceed what a human can comfortably
 * produce (keyboard ghosting heuristic), which is a signal of automated input.
 *
 * The callback is stored in a ref so callers don't need to memoize it.
 *
 * @param {{
 *   enabled?: boolean;
 *   threshold?: number;  Number of simultaneous keys that triggers detection (default: 4)
 *   onGhost?: () => void;
 * }} options
 */
export default function useGhostingDetect(options = {}) {
  const { enabled = true, threshold = 4, onGhost } = options;

  const onGhostRef = useRef(onGhost);
  useEffect(() => {
    onGhostRef.current = onGhost;
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const keys = new Set();

    const down = (e) => {
      keys.add(e.key);
      if (keys.size >= threshold && typeof onGhostRef.current === 'function') {
        onGhostRef.current();
      }
    };

    const up = (e) => {
      keys.delete(e.key);
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [enabled, threshold]);
}
