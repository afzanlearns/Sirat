import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// iOS Safari ignores `user-scalable=no`, so block pinch-zoom and double-tap-zoom
// explicitly to make Sirat feel like a native app. Text selection still works.
["gesturestart", "gesturechange", "gestureend"].forEach((evt) =>
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false })
);
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault(); // kill double-tap zoom
    lastTouchEnd = now;
  },
  { passive: false }
);

// Register the service worker for offline support (production builds only —
// avoids interfering with Vite's dev-server HMR). Demo the PWA via `npm run
// build && npm run preview`.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sirat] Service worker registration failed:", err);
    });
  });
}
