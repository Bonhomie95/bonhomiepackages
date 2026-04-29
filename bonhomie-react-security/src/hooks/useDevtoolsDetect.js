import { useEffect, useRef, useState } from 'react';
import { isDevtoolsOpen } from '../utils/detectDevTools.js';

/**
 * Polls for open DevTools and fires onDetect when the state changes to open.
 *
 * The onDetect callback is stored in a ref so callers do not need to memoize
 * it — the polling interval is stable regardless of callback identity changes.
 *
 * @param {{
 *   onDetect?: () => void;
 *   pollInterval?: number;
 *   enabled?: boolean;
 * }} options
 * @returns {boolean} Whether DevTools are currently detected as open
 */
export default function useDevtoolsDetect(options = {}) {
  const { onDetect, pollInterval = 1000, enabled = true } = options;

  // Store callback in a ref so the interval closure always calls the latest version
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  });

  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let prev = isDevtoolsOpen();
    setDevtoolsOpen(prev);

    const check = () => {
      const current = isDevtoolsOpen();
      if (current && !prev && typeof onDetectRef.current === 'function') {
        onDetectRef.current();
      }
      prev = current;
      setDevtoolsOpen(current);
    };

    window.addEventListener('resize', check);
    const intervalId = setInterval(check, pollInterval);

    return () => {
      window.removeEventListener('resize', check);
      clearInterval(intervalId);
    };
  }, [enabled, pollInterval]); // onDetect intentionally omitted — handled via ref

  return devtoolsOpen;
}
