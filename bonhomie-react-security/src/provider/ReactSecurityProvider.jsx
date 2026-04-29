import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';

import useDevtoolsDetect from '../hooks/useDevtoolsDetect.js';
import useScreenshotBlock from '../hooks/useScreenshotBlock.js';
import useClipboardLock from '../hooks/useClipboardLock.js';
import useGhostingDetect from '../hooks/useGhostingDetect.js';
import useKeystrokeTamper from '../hooks/useKeystrokeTamper.js';

import { detectAIScreenshot } from '../utils/aiScreenshotDetector.js';
import { detectVPN } from '../utils/vpnDetect.js';
import { applyDynamicWatermark, clearWatermark } from '../utils/watermark.js';

export const SecurityContext = createContext({
  suspicious: false,
  locked: false,
  lastEvent: null,
  markSuspicious: () => {},
  unlock: () => {},
  config: {},
});

const LEVELS = {
  low: {
    blockDevTools: true,
    blockScreenshot: false,
    blockCopy: false,
    lockOnSuspicious: false,
    autoLogout: false,
    noiseOverlay: false,
    showLockOverlay: false,
    enableWatermark: false,
    detectVPN: false,
    detectKeystrokeTamper: false,
  },
  medium: {
    blockDevTools: true,
    blockScreenshot: true,
    blockCopy: true,
    lockOnSuspicious: true,
    autoLogout: false,
    noiseOverlay: false,
    showLockOverlay: true,
    enableWatermark: true,
    detectVPN: true,
    detectKeystrokeTamper: true,
  },
  high: {
    blockDevTools: true,
    blockScreenshot: true,
    blockCopy: true,
    lockOnSuspicious: true,
    autoLogout: true,
    noiseOverlay: true,
    showLockOverlay: true,
    enableWatermark: true,
    detectVPN: true,
    detectKeystrokeTamper: true,
  },
};

/**
 * @param {{
 *   children: React.ReactNode;
 *   level?: 'low' | 'medium' | 'high';
 *   config?: {
 *     watermarkText?: string;   Custom watermark text shown on the page
 *     [key: string]: any;
 *   };
 * }} props
 */
export default function ReactSecurityProvider({
  children,
  level = 'medium',
  config = {},
}) {
  const [suspicious, setSuspicious] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  const merged = useMemo(() => {
    const defaults = LEVELS[level] || LEVELS.medium;
    return { ...defaults, ...config };
  }, [level, config]);

  const {
    blockDevTools,
    blockScreenshot,
    blockCopy,
    lockOnSuspicious,
    autoLogout,
    noiseOverlay,
    showLockOverlay,
    enableWatermark,
    detectVPN: checkVPN,
    detectKeystrokeTamper,
    watermarkText = 'PROTECTED',
    onDetect,
    onLogout,
  } = merged;

  const markSuspicious = useCallback(
    (type) => {
      setSuspicious(true);
      setLastEvent(type);
      if (lockOnSuspicious) setLocked(true);
      if (onDetect) onDetect(type);
      if (autoLogout && onLogout) onLogout(type);
    },
    [lockOnSuspicious, autoLogout, onDetect, onLogout]
  );

  const unlock = useCallback(() => {
    setLocked(false);
    setSuspicious(false);
    setLastEvent(null);
    clearWatermark();
  }, []);

  // Core detection hooks
  useDevtoolsDetect({
    enabled: blockDevTools,
    onDetect: () => markSuspicious('devtools'),
  });

  useScreenshotBlock({
    blockPrintScreen: blockScreenshot,
    blockImageSave: blockScreenshot,
    onScreenshotAttempt: async () => {
      const cleanup = detectAIScreenshot((signal) => {
        if (signal === 'ai_screenshot_detected') markSuspicious('ai_screenshot');
        else markSuspicious('screenshot');
        cleanup();
      });
    },
  });

  useClipboardLock({
    blockCopy,
    blockCut: blockCopy,
    blockPaste: blockCopy,
    blockContextMenu: blockCopy,
    onBlock: () => markSuspicious('clipboard'),
  });

  useGhostingDetect({
    enabled: detectKeystrokeTamper,
    onGhost: () => markSuspicious('ghosting'),
  });

  useKeystrokeTamper({
    enabled: detectKeystrokeTamper,
    onTamper: () => markSuspicious('keystroke_tamper'),
  });

  // VPN / proxy detection
  useEffect(() => {
    if (!checkVPN) return;
    detectVPN().then((result) => {
      if (result?.suspicious) markSuspicious('vpn_detected');
    });
  }, [checkVPN, markSuspicious]);

  // Dynamic watermark — uses the configurable watermarkText prop
  useEffect(() => {
    if (!enableWatermark) return;
    const text = `${watermarkText} • ${new Date().toISOString()}`;
    applyDynamicWatermark(text);
    return () => clearWatermark();
  }, [enableWatermark, watermarkText]);

  // Noise overlay
  useEffect(() => {
    if (!noiseOverlay) return;
    const el = document.createElement('div');
    el.id = 'bon-security-noise';
    el.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" opacity="0.07"><filter id="n"><feTurbulence baseFrequency="0.8"/></filter><rect width="100%" height="100%" filter="url(%23n)" /></svg>');
      z-index: 999999;
    `;
    document.body.appendChild(el);
    return () => el.remove();
  }, [noiseOverlay]);

  return (
    <SecurityContext.Provider
      value={{ suspicious, locked, lastEvent, markSuspicious, unlock, config: merged }}
    >
      {locked && showLockOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '2rem',
            fontWeight: 'bold',
          }}
        >
          🔒 Security Lock Activated
        </div>
      )}
      {children}
    </SecurityContext.Provider>
  );
}
