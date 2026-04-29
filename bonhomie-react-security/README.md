# @bonhomie/react-security

<p align="center">
  <img src="https://img.shields.io/npm/v/@bonhomie/react-security?color=blue&label=npm%20version" />
  <img src="https://img.shields.io/npm/dm/@bonhomie/react-security?color=orange&label=downloads" />
  <img src="https://img.shields.io/bundlephobia/min/@bonhomie/react-security?color=yellow&label=minified" />
  <img src="https://img.shields.io/github/license/bonhomie/react-security?color=green&label=license" />
</p>

<p align="center">
  🔐 A powerful React security toolkit: DevTools detection, screenshot blocking, anti-inspect,<br />
  anti-iframe, tamper detection, watermarks, lock screen UI, VPN detection, and more.
</p>

---

## 🚀 Install

```bash
npm install @bonhomie/react-security
```

`react-router-dom` is required only if you use `useRouteTamperGuard`:

```bash
npm install react-router-dom
```

---

## ✨ Feature Matrix

| Feature                    | Low | Medium | High |
| -------------------------- | --- | ------ | ---- |
| DevTools Detection         | ✔   | ✔      | ✔    |
| Screenshot Block           | ✖   | ✔      | ✔    |
| Copy/Paste Block           | ✖   | ✔      | ✔    |
| Right-Click Block          | ✖   | ✔      | ✔    |
| Route Tamper Detection     | ✔   | ✔      | ✔    |
| Anti-Iframe Lock           | ✔   | ✔      | ✔    |
| Lock Screen                | ✖   | ✔      | ✔    |
| Noise Overlay              | ✖   | ✖      | ✔    |
| Watermark                  | Opt | Opt    | ✔    |
| Auto-Logout                | ✖   | Opt    | Opt  |
| AI Screenshot Detection    | Opt | Opt    | ✔    |
| VPN Detection              | Opt | Opt    | ✔    |
| Keystroke Tamper Detection | Opt | Opt    | ✔    |

---

## 🧩 Basic Usage

```jsx
import {
  ReactSecurityProvider,
  SecurePage,
  AntiIframe,
  BlockInspect,
} from "@bonhomie/react-security";

export default function App() {
  return (
    <ReactSecurityProvider level="high">
      <AntiIframe>
        <BlockInspect>
          <SecurePage>
            <Dashboard />
          </SecurePage>
        </BlockInspect>
      </AntiIframe>
    </ReactSecurityProvider>
  );
}
```

---

## 🎛 Security Levels

### LOW

```js
{
  blockDevTools: true,
  blockScreenshot: false,
  blockCopy: false,
  lockOnSuspicious: false,
  autoLogout: false,
  noiseOverlay: false,
}
```

### MEDIUM (recommended for SaaS)

```js
{
  blockDevTools: true,
  blockScreenshot: true,
  blockCopy: true,
  lockOnSuspicious: true,
  showLockOverlay: true,
}
```

### HIGH (fintech, exam apps, dashboards)

```js
{
  blockDevTools: true,
  blockScreenshot: true,
  blockCopy: true,
  noiseOverlay: true,
  lockOnSuspicious: true,
  showLockOverlay: true,
  enableWatermark: true,
}
```

---

## ⚙️ Provider Configuration (Advanced)

```jsx
<ReactSecurityProvider
  level="medium"
  config={{
    blockScreenshot: true,
    blockDevTools: true,
    blockCopy: true,
    lockOnSuspicious: true,
    autoLogout: true,
    noiseOverlay: true,
    enableWatermark: true,
    watermarkText: "Protected by Bonhomie Security",
    showUnlockButton: true,
    onDetect: (type) => console.log("Suspicious:", type),
    onLogout: () => logoutUser(),
  }}
>
  <App />
</ReactSecurityProvider>
```

---

## 🛡 Components

### `<SecurePage />`

Wraps content with blur-on-suspicious, lock screen, noise overlay, and watermark.

```jsx
<SecurePage blurAmount="6px">
  <Dashboard />
</SecurePage>
```

### `<BlockInspect />`

Blocks F12, Ctrl+Shift+I/J, Ctrl+U, right-click, mobile long-press, and zoom inspect.

```jsx
<BlockInspect>
  <ProtectedContent />
</BlockInspect>
```

### `<AntiIframe />`

Prevents your app from loading inside a cross-origin iframe.

```jsx
<AntiIframe>
  <App />
</AntiIframe>
```

---

## 🪝 Hooks Reference

### `useDevtoolsDetect`

```js
useDevtoolsDetect({
  enabled: true,
  onDetect: () => console.log("DevTools opened"),
});
```

### `useScreenshotBlock`

```js
useScreenshotBlock({
  blockPrintScreen: true,
  onScreenshotAttempt: () => alert("Screenshot blocked"),
});
```

### `useClipboardLock`

> Note: blocking paste also prevents browser autofill and password managers. Use thoughtfully.

```js
useClipboardLock({
  blockCopy: true,
  blockPaste: true,
  onBlock: (type) => console.log("Blocked:", type),
});
```

### `useRouteTamperGuard`

Requires `react-router-dom` v6+.

```js
useRouteTamperGuard({
  allowedRoutes: ["/dashboard"],
  redirectTo: "/warning",
});
```

### `useGhostingDetect`

Detects simultaneous key presses beyond what a human can produce.

```js
useGhostingDetect({
  onGhost: () => console.warn("Ghost keystroke detected!"),
});
```

### `useKeystrokeTamper`

Detects suspiciously fast keystroke bursts (automated input).

```js
useKeystrokeTamper({
  onTamper: () => alert("Keystroke tampering detected!"),
});
```

---

## 🧠 Utilities

```js
import {
  detectVPN,
  detectAIScreenshot,
  applyDynamicWatermark,
  clearWatermark,
} from "@bonhomie/react-security";
```

### `detectVPN()`

Lightweight VPN/proxy detector using WebRTC ICE candidates.

> **Privacy note:** This function makes a request to `ipapi.co` to look up the detected IP's organization. The user's IP address is sent to a third-party service. Only enable this where your use case warrants it and where your privacy policy permits it. The free tier of `ipapi.co` has rate limits (~1,000 requests/day).

```js
const result = await detectVPN();
// { ip: "1.2.3.4", suspicious: true, org: "digitalocean" }
```

### `detectAIScreenshot(onDetect)`

Starts a short 2-second detection window triggered by a screenshot event (e.g. PrintScreen keydown). Detects suspicious frame-freeze patterns from Snipping Tool, OBS, and similar tools.

```js
// Trigger on PrintScreen, not on component mount
window.addEventListener("keydown", (e) => {
  if (e.key === "PrintScreen") {
    detectAIScreenshot((signal) => {
      console.log("Detected:", signal);
    });
  }
});
```

### `applyDynamicWatermark(text, opacity, size)` / `clearWatermark()`

```js
applyDynamicWatermark("CONFIDENTIAL", 0.12, 22);
clearWatermark();
```

---

## 🌐 SSR Notes (Next.js / Remix)

This library is **client-only**. Add `"use client"` to any file importing these components.

```jsx
"use client";
import { ReactSecurityProvider } from "@bonhomie/react-security";
```

---

## 🛠 Troubleshooting

**Screenshot still works?** Windows Snipping Tool can bypass DOM APIs. Enable `noiseOverlay` + `enableWatermark`. Consider backend watermarking for critical content.

**DevTools not detected?** Detection is heuristic (window size diff). Mix with zoom detection, key combo blocking, and route tamper guard for better coverage.

**Lock screen won't unlock?** Ensure the provider config includes `showUnlockButton: true`.

**`useRouteTamperGuard` crashes?** Install `react-router-dom` — it's a required peer dependency for this hook.

---

## 📄 License

MIT — free for personal & commercial use.

## 👨‍💻 Author

Made with care by **Bonhomie** · Full-stack Web & Mobile Developer.
