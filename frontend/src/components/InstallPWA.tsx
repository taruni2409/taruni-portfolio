"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// The browser-fired install event (not in TS's lib DOM types).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PlatformId = "ios" | "android" | "macos" | "windows";

const PLATFORMS: { id: PlatformId; label: string; steps: string[] }[] = [
  {
    id: "ios",
    label: "iPhone / iPad",
    steps: [
      "Open this site in Safari.",
      "Tap the Share button (the square with an up arrow).",
      "Scroll down and choose “Add to Home Screen”.",
      "Tap “Add” — the icon appears on your home screen.",
    ],
  },
  {
    id: "android",
    label: "Android",
    steps: [
      "Open this site in Chrome.",
      "Tap “Install” below, or the ⋮ menu (top-right).",
      "Choose “Install app” / “Add to Home screen”.",
      "Confirm — it installs like a native app.",
    ],
  },
  {
    id: "macos",
    label: "macOS",
    steps: [
      "In Safari, click Share → “Add to Dock”.",
      "Or in Chrome / Edge, click the install icon in the address bar.",
      "Launch it any time from your Dock.",
    ],
  },
  {
    id: "windows",
    label: "Windows",
    steps: [
      "Open this site in Chrome or Edge.",
      "Click “Install” below, or the install icon in the address bar.",
      "Or open the ⋮ menu → “Install this site as an app”.",
      "It opens in its own window, like a desktop app.",
    ],
  },
];

function detectPlatform(): PlatformId {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android/.test(ua)) return "android";
  if (/macintosh|mac os x/.test(ua)) return "macos";
  return "windows";
}

function DownloadIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

export default function InstallPWA({
  variant = "nav",
  onTrigger,
}: {
  variant?: "nav" | "mobile" | "footer" | "chip" | "icon";
  onTrigger?: () => void;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<PlatformId>("windows");

  useEffect(() => {
    setMounted(true);
    setTab(detectPlatform());

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showHelp) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowHelp(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [showHelp]);

  if (installed) return null;

  async function nativeInstall() {
    if (!deferred) return false;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setShowHelp(false);
    return true;
  }

  async function handleClick() {
    onTrigger?.();
    if (!(await nativeInstall())) setShowHelp(true);
  }

  const trigger =
    variant === "icon" ? (
      <button
        onClick={handleClick}
        aria-label="Install this site as an app"
        title="Install this site as an app"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/60 text-fg-muted backdrop-blur transition-colors hover:border-fg-muted hover:text-fg"
      >
        <DownloadIcon size={16} />
      </button>
    ) : variant === "chip" ? (
      <button
        onClick={handleClick}
        className="group inline-flex items-center gap-2 rounded-sm border border-border/60 bg-surface px-3.5 py-1.5 text-[11px] font-medium text-fg-muted transition-all hover:border-border-strong hover:text-fg dark:border-border-strong dark:bg-surface-raised"
      >
        <DownloadIcon size={12} />
        <span className="text-fg-subtle group-hover:text-accent transition-colors">Install as app</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-fg-faint group-hover:text-accent shrink-0 transition-colors">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    ) : variant === "footer" ? (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-fg-muted transition-colors hover:text-accent"
      >
        <DownloadIcon size={12} />
        <span className="hidden sm:inline">Install app</span>
        <span className="sm:hidden">Install</span>
      </button>
    ) : variant === "mobile" ? (
      <button
        onClick={handleClick}
        className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
      >
        <DownloadIcon size={14} />
        Install app
      </button>
    ) : (
      <button
        onClick={handleClick}
        title="Install this site as an app"
        aria-label="Install this site as an app"
        className="rounded p-2 text-fg-faint transition-colors hover:bg-surface-raised hover:text-fg-subtle"
      >
        <DownloadIcon size={13} />
      </button>
    );

  const active = PLATFORMS.find((p) => p.id === tab) ?? PLATFORMS[3];

  return (
    <>
      {trigger}

      {mounted &&
        showHelp &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setShowHelp(false)}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Install this site"
            >
              {/* Header */}
              <div className="flex items-start gap-3 border-b border-border p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fg text-bg">
                  <DownloadIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-fg">Install this site as an app</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                    Add it to your home screen or dock — works on every device, even offline.
                  </p>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-fg-faint transition hover:bg-surface-raised hover:text-fg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Platform tabs */}
              <div className="flex gap-1 overflow-x-auto px-4 pt-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTab(p.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      tab === p.id ? "bg-surface-raised text-accent" : "text-fg-faint hover:text-fg"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Steps */}
              <ol className="space-y-3 p-5">
                {active.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-raised text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-sm leading-relaxed text-fg-muted">{step}</span>
                  </li>
                ))}
              </ol>

              {deferred && (tab === "android" || tab === "windows") && (
                <div className="px-5 pb-5">
                  <button
                    onClick={nativeInstall}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-fg px-5 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-80 active:scale-[0.98]"
                  >
                    <DownloadIcon />
                    Install now
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
