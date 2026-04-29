import { useEffect, useRef } from 'react';

/**
 * Detects suspiciously fast keystroke bursts that are characteristic of
 * automated input (bots typing faster than any human can).
 *
 * The callback is stored in a ref so callers don't need to memoize it.
 *
 * @param {{
 *   enabled?: boolean;
 *   minIntervalMs?: number;  Keystrokes faster than this are flagged (default: 20ms)
 *   burstThreshold?: number; How many consecutive fast keys trigger detection (default: 15)
 *   onTamper?: () => void;
 * }} options
 */
export default function useKeystrokeTamper(options = {}) {
  const { enabled = true, minIntervalMs = 20, burstThreshold = 15, onTamper } = options;

  const onTamperRef = useRef(onTamper);
  useEffect(() => {
    onTamperRef.current = onTamper;
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let last = performance.now();
    let rapidCount = 0;

    const onType = () => {
      const now = performance.now();
      const diff = now - last;

      if (diff < minIntervalMs) {
        rapidCount++;
      } else {
        // Reset streak on any normal-speed keypress
        rapidCount = 0;
      }

      if (rapidCount >= burstThreshold && typeof onTamperRef.current === 'function') {
        onTamperRef.current();
        rapidCount = 0; // reset after firing to avoid repeated triggers
      }

      last = now;
    };

    window.addEventListener('keydown', onType);
    return () => window.removeEventListener('keydown', onType);
  }, [enabled, minIntervalMs, burstThreshold]);
}
