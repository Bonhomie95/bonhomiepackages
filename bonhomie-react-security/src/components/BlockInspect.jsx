import { useEffect, useContext, useRef } from 'react';
import { SecurityContext } from '../provider/ReactSecurityProvider.jsx';

export default function BlockInspect({
  children,
  detectMobile = true,
  detectContextMenu = true,
  detectZoom = true,
}) {
  const ctx = useContext(SecurityContext);

  // Store ctx.markSuspicious in a ref so the event handlers always
  // call the latest version without needing to re-register listeners.
  const markSuspiciousRef = useRef(null);
  useEffect(() => {
    markSuspiciousRef.current =
      typeof ctx?.markSuspicious === 'function' ? ctx.markSuspicious : null;
  });

  const longPressTimer = useRef(null);

  useEffect(() => {
    const markEvent = (type) => {
      if (markSuspiciousRef.current) markSuspiciousRef.current(type);
    };

    // Desktop keyboard shortcuts
    const keyHandler = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        markEvent('inspect_key');
      }
      if (e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key)) {
        e.preventDefault();
        markEvent('inspect_key_combo');
      }
      if (e.ctrlKey && e.key === 'U') {
        e.preventDefault();
        markEvent('view_source_attempt');
      }
    };
    window.addEventListener('keydown', keyHandler);

    // Block right-click
    const contextHandler = (e) => {
      if (detectContextMenu) {
        e.preventDefault();
        markEvent('context_menu_blocked');
      }
    };
    window.addEventListener('contextmenu', contextHandler);

    // Mobile long press
    const touchStart = () => {
      if (!detectMobile) return;
      longPressTimer.current = setTimeout(() => {
        markEvent('mobile_long_press_inspect');
      }, 500);
    };
    const touchEnd = () => clearTimeout(longPressTimer.current);
    window.addEventListener('touchstart', touchStart);
    window.addEventListener('touchend', touchEnd);

    // Zoom / DevTools width heuristic
    const zoomHandler = () => {
      if (!detectZoom) return;
      const zoom = window.outerWidth / window.innerWidth;
      if (zoom > 1.05) markEvent('zoom_devtools_detected');
    };
    window.addEventListener('resize', zoomHandler);

    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('contextmenu', contextHandler);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('resize', zoomHandler);
    };
  }, [detectMobile, detectContextMenu, detectZoom]);

  return children;
}
