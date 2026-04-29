import { useContext } from 'react';
import { SecurityContext } from '../provider/ReactSecurityProvider.jsx';

export default function SecurePage({
  children,
  blurAmount = '6px',
  watermarkSize = 14,
}) {
  const ctx = useContext(SecurityContext) || {};
  const { suspicious, locked, lastEvent, unlock, config = {} } = ctx;

  const showBlur = suspicious;
  const showLockOverlay = locked && (config.showLockOverlay ?? true);
  const showNoise = config.noiseOverlay ?? false;
  const enableWatermark = config.enableWatermark ?? false;

  // dynamic watermark text based on event
  const eventWatermarkText = {
    screenshot: 'Screenshot detected — Protected content',
    ai_screenshot: 'AI Screenshot Detection Triggered',
    devtools: 'DevTools Detected',
    clipboard: 'Copy Attempt Blocked',
    ghosting: 'Ghost Keystroke Detected',
    keystroke_tamper: 'Keystroke Tampering Detected',
    vpn_detected: 'VPN/Proxy Connection Identified',
  };

  const watermarkText =
    eventWatermarkText[lastEvent] ||
    config.watermarkText ||
    'Protected Content';

  return (
    <div style={{ position: 'relative' }}>
      {/* main content */}
      <div
        style={{
          filter: showBlur ? `blur(${blurAmount})` : 'none',
          pointerEvents: locked ? 'none' : 'auto',
          transition: 'filter 0.25s ease',
        }}
      >
        {children}
      </div>

      {/* noise security overlay */}
      {showNoise && (
        <div
          style={{
            pointerEvents: 'none',
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            opacity: 0.25,
            mixBlendMode: 'multiply',
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)',
          }}
        />
      )}

      {/* floating watermark (active when suspicious or enabled) */}
      {enableWatermark && (
        <div
          style={{
            pointerEvents: 'none',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-25deg)',
            zIndex: 9997,
            fontSize: `${watermarkSize}px`,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.10)',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {watermarkText}
        </div>
      )}

      {/* corner watermark when specific event happened */}
      {lastEvent && (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            padding: '0.35rem 0.75rem',
            borderRadius: 999,
            fontSize: '0.75rem',
            background: 'rgba(15,23,42,0.9)',
            color: '#e5e7eb',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {watermarkText}
        </div>
      )}

      {/* lock overlay */}
      {showLockOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'radial-gradient(circle at top, rgba(15,23,42,0.95), rgba(15,23,42,0.98))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            color: '#e5e7eb',
            textAlign: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              borderRadius: 16,
              padding: '1.75rem 1.9rem',
              background: 'rgba(15,23,42,0.9)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                fontSize: '2.4rem',
                marginBottom: '1rem',
              }}
            >
              🔒
            </div>
            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: '0.7rem',
              }}
            >
              Security Lock Activated
            </h2>

            <p
              style={{
                fontSize: '0.9rem',
                opacity: 0.85,
                marginBottom: '1.2rem',
                lineHeight: 1.45,
              }}
            >
              Suspicious activity was detected:
              <b style={{ textTransform: 'capitalize' }}>
                {' '}
                {lastEvent?.replace('_', ' ')}
              </b>
              . Your session may be restricted for safety.
            </p>

            {config.showUnlockButton !== false &&
              typeof unlock === 'function' && (
                <button
                  type="button"
                  onClick={unlock}
                  style={{
                    borderRadius: 999,
                    padding: '0.55rem 1.4rem',
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #22c55e, #16a34a, #15803d)',
                    color: '#f9fafb',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Unlock (Trusted User)
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
