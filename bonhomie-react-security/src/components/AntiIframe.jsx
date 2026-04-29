export default function AntiIframe({ children }) {
  if (typeof window !== 'undefined' && window.top !== window.self) {
    try {
      // This throws a SecurityError when the top frame is cross-origin.
      // The try/catch prevents an unhandled exception — the page simply
      // renders nothing when embedded cross-origin (same effective result).
      window.top.location = window.self.location;
    } catch {
      // Cross-origin frame — can't redirect, so just render nothing.
    }
    return null;
  }
  return children;
}
