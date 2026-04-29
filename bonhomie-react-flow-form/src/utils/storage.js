const isClient = typeof window !== 'undefined';

export function saveState(key, value) {
  if (!isClient) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadState(key) {
  if (!isClient) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearState(key) {
  if (!isClient) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
