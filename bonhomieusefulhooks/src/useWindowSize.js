import { useEffect, useState } from 'react';

export default function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // Call once to sync immediately
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
