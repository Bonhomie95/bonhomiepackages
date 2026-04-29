import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAsync(asyncFunction, dependencies = []) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [value, setValue] = useState(null);

  const isMounted = useRef(true);

  useEffect(() => {
    // Reset on every mount/remount (handles React 18 Strict Mode double-invoke)
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      if (isMounted.current) setValue(result);
      return result;
    } catch (err) {
      if (isMounted.current) setError(err);
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncFunction, ...dependencies]);

  return { execute, loading, error, value };
}
