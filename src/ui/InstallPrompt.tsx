import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !("MSStream" in window)
  );
}

const DISMISS_KEY = "sirat_install_dismissed";

/**
 * Shows an "Install Sirat" banner when the browser reports the app is
 * installable (Android/desktop Chrome via `beforeinstallprompt`), or a manual
 * "Add to Home Screen" hint on iOS Safari (which has no install event).
 * Hidden when already installed or previously dismissed.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — offer the manual path instead.
    if (isIOS()) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Sirat"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        width: "min(440px, calc(100vw - 24px))",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "var(--r-lg)",
        background: "var(--surface-2)",
        border: "1px solid var(--border-strong)",
        boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)",
        animation: "sirat-rise 260ms var(--ease-out)",
      }}
    >
      <img src="/icon.svg" alt="" width={40} height={40} style={{ borderRadius: "10px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text-primary)" }}>
          Install Sirat
        </span>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
          {iosHint ? (
            <>Tap the Share icon, then <strong style={{ color: "var(--text-2)" }}>Add to Home Screen</strong>.</>
          ) : (
            <>Add it to your home screen — works offline.</>
          )}
        </span>
      </div>
      {!iosHint && (
        <button
          onClick={install}
          style={{
            flexShrink: 0,
            padding: "9px 16px",
            borderRadius: "var(--r-pill)",
            background: "var(--accent)",
            color: "#20160A",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ flexShrink: 0, padding: "6px", color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
