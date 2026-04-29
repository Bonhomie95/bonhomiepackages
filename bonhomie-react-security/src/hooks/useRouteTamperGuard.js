import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function useRouteTamperGuard(options = {}) {
  const {
    allowedRoutes = [], // ["/dashboard", "/settings"]
    redirectTo = '/',
    onBlock, // callback when tamper detected
  } = options;

  const location = useLocation();
  const navigate = useNavigate();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    const current = location.pathname;

    // allowed route check
    if (allowedRoutes.length && !allowedRoutes.includes(current)) {
      if (onBlock) onBlock(current);
      navigate(redirectTo);
    }

    prevPath.current = current;
  }, [location, allowedRoutes, redirectTo, navigate, onBlock]);
}
