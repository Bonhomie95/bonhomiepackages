import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {string} url
 * @param {RequestInit} [options]   Memoize this with useMemo if it changes — unstable references
 *                                  trigger a re-fetch on every render.
 * @param {any[]} [dependencies]
 */
export default function useFetch(url, options = {}, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const controller = useRef(null);
  // Keep a stable ref to options so the fetch always uses the latest value
  // without requiring it to be in the dependency array (avoiding infinite loops
  // when the caller creates a new options object on every render).
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    controller.current = new AbortController();

    try {
      const res = await fetch(url, {
        ...optionsRef.current,
        signal: controller.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setData(json);
      return json;
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...dependencies]);

  useEffect(() => {
    fetchData();
    return () => controller.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
