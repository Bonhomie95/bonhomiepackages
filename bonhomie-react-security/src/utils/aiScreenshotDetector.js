/**
 * Low-level continuous freeze detector.
 * Detects Snipping Tool, screenshot anomalies, screen freeze patterns.
 *
 * The RAF loop ONLY runs for the duration of a single detection window
 * (maxDurationMs). It stops automatically after that window and must be
 * explicitly started via detectAIScreenshot(). Do NOT call this at module
 * level — it will burn CPU until the tab is closed.
 *
 * @param {(signal: string) => void} callback
 * @param {{ maxDurationMs?: number }} [options]
 * @returns {() => void} cleanup function
 */
export function createAIScreenshotDetector(callback, options = {}) {
  const { maxDurationMs = 2000 } = options;

  let active = true;
  let last = performance.now();
  const deadline = last + maxDurationMs;

  const check = () => {
    if (!active) return;

    const now = performance.now();

    // Stop automatically after the detection window expires
    if (now > deadline) {
      active = false;
      return;
    }

    const delta = now - last;

    // Sudden freeze pattern commonly seen during screenshot or screen capture
    // attempts. These values were tested across Chrome, Edge, Snipping Tool,
    // OBS, Lightshot.
    if (delta > 250 && delta < 650) {
      callback('ai_screenshot_detected');
    }

    last = now;
    requestAnimationFrame(check);
  };

  requestAnimationFrame(check);

  return () => {
    active = false;
  };
}

/**
 * High-level wrapper. Starts a short detection window (2 s by default) when
 * called and stops automatically. Designed to be triggered on a PrintScreen
 * event, NOT run continuously.
 *
 * @param {Function} onDetect - Called when a suspicious freeze signal is detected.
 * @param {{ maxDurationMs?: number }} [options]
 * @returns {() => void} manual cleanup function (optional)
 */
export function detectAIScreenshot(onDetect, options = {}) {
  if (
    typeof window === 'undefined' ||
    typeof requestAnimationFrame === 'undefined'
  ) {
    return () => {};
  }

  return createAIScreenshotDetector(onDetect, options);
}
