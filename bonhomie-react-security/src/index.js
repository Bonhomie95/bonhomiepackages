// ----------------------------
// Hooks
// ----------------------------
export { default as useDevtoolsDetect } from "./hooks/useDevtoolsDetect.js";
export { default as useClipboardLock } from "./hooks/useClipboardLock.js";
export { default as useScreenshotBlock } from "./hooks/useScreenshotBlock.js";
export { default as useRouteTamperGuard } from "./hooks/useRouteTamperGuard.js";

// Advanced hooks
export { default as useGhostingDetect } from "./hooks/useGhostingDetect.js";
export { default as useKeystrokeTamper } from "./hooks/useKeystrokeTamper.js";

// ----------------------------
// Components
// ----------------------------
export { default as AntiIframe } from "./components/AntiIframe.jsx";
export { default as SecurePage } from "./components/SecurePage.jsx";
export { default as BlockInspect } from "./components/BlockInspect.jsx";

// ----------------------------
// Provider
// ----------------------------
export { default as ReactSecurityProvider } from "./provider/ReactSecurityProvider.jsx";

// ----------------------------
// Utilities
// ----------------------------
export * from "./utils/detectDevTools.js";
export * from "./utils/watermark.js";
export * from "./utils/aiScreenshotDetector.js";
export * from "./utils/vpnDetect.js";
