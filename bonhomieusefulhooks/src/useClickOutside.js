import { useEffect, useRef } from 'react';

/**
 * Fires handler when the user clicks outside ref.
 *
 * The handler is stored in a ref internally, so callers don't need to wrap
 * it in useCallback — the event listener is stable and won't churn on every
 * render even if the callback identity changes.
 */
export default function useClickOutside(ref, handler) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener = (e) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      handlerRef.current(e);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref]); // ref is the only dep — listener is stable
}
