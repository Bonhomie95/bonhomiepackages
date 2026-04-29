/**
 * Basic DevTools detection using window size heuristic.
 * Not bulletproof, but enough to flag suspicious behavior.
 */
export function isDevtoolsOpen() {
  if (typeof window === "undefined") return false;

  const threshold = 160;
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;

  return widthDiff > threshold || heightDiff > threshold;
}
