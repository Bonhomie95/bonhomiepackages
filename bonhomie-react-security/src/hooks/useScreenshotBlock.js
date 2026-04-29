import { useEffect } from 'react';

/**
 * Attempts to intercept common screenshot actions.
 *
 * Browser security limits mean this cannot guarantee screenshot prevention —
 * treat it as a deterrent and a signal, not a hard block.
 *
 * @param {{
 *   blockPrintScreen?: boolean;
 *   blockImageSave?: boolean;
 *   onScreenshotAttempt?: (type: string) => void;
 * }} options
 */
export default function useScreenshotBlock(options = {}) {
  const {
    blockPrintScreen = true,
    blockImageSave = true,
    onScreenshotAttempt,
  } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeydown = (e) => {
      if (blockPrintScreen && e.key === 'PrintScreen') {
        e.preventDefault();
        if (onScreenshotAttempt) onScreenshotAttempt('printscreen');
        // Overwrite clipboard with blank to neutralize the capture
        navigator.clipboard?.writeText('');
      }

      // Ctrl+P is the print dialog — blocking it is unnecessarily disruptive
      // to legitimate users (printing invoices, tickets, articles, etc.)
      // and has been intentionally removed.
    };

    // Block right-click save on images and canvases
    const handleContextMenu = (e) => {
      if (!blockImageSave) return;
      const target = e.target;
      if (target.tagName === 'IMG' || target.tagName === 'CANVAS') {
        e.preventDefault();
        if (onScreenshotAttempt) onScreenshotAttempt('contextmenu-image');
      }
    };

    window.addEventListener('keydown', handleKeydown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [blockPrintScreen, blockImageSave, onScreenshotAttempt]);
}
