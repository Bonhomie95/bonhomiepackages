import { useEffect, useRef, useState } from 'react';

export default function useThrottle(value, delay = 300) {
  const [throttled, setThrottled] = useState(value);
  const lastExec = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now - lastExec.current >= delay) {
      lastExec.current = now;
      setThrottled(value);
    } else {
      const remaining = delay - (now - lastExec.current);
      const timer = setTimeout(() => {
        lastExec.current = Date.now();
        setThrottled(value);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttled;
}
