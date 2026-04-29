export function getRandomWatermarkPosition() {
  const margin = 40;
  const positions = [
    { bottom: margin, right: margin },
    { top: margin, right: margin },
    { bottom: margin, left: margin },
    { top: margin, left: margin },
    { top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-20deg)' },
  ];
  return positions[Math.floor(Math.random() * positions.length)];
}

// Use a data attribute as the source of truth instead of a module-level
// variable. This is safe across multiple React roots, hot-reloads, and
// React Strict Mode double-invocations.
const WATERMARK_ATTR = 'data-bon-watermark';

/**
 * Apply a dynamic watermark overlay on the screen.
 *
 * @param {string} text
 * @param {number} opacity - 0.05 to 0.25 recommended
 * @param {number} size - font size in px
 */
export function applyDynamicWatermark(
  text = 'Protected Content',
  opacity = 0.12,
  size = 22
) {
  clearWatermark();

  const pos = getRandomWatermarkPosition();

  const el = document.createElement('div');
  el.setAttribute(WATERMARK_ATTR, 'true');

  Object.assign(el.style, {
    position: 'fixed',
    zIndex: 999999,
    pointerEvents: 'none',
    fontWeight: '700',
    fontSize: `${size}px`,
    color: `rgba(255,255,255,${opacity})`,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    padding: '6px 14px',
    mixBlendMode: 'overlay',
    transition: 'opacity 0.25s ease',
    opacity: '1',
    ...pos,
  });

  el.textContent = text;
  document.body.appendChild(el);
}

/**
 * Remove all watermark nodes from the DOM.
 */
export function clearWatermark() {
  document.querySelectorAll(`[${WATERMARK_ATTR}]`).forEach((el) => {
    el.style.opacity = '0';
    // Defer removal so the fade-out transition plays
    setTimeout(() => el.remove(), 200);
  });
}
