"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SparkleIcon from "@/components/SparkleIcon";

const SESSION_KEY = "pumpkin_popup_shown";
const SNOOZE_KEY  = "pumpkin_popup_snoozed";

function shouldAutoShow() {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(SESSION_KEY)) return false;
  const ts = localStorage.getItem(SNOOZE_KEY);
  if (ts && Date.now() - Number(ts) < 7 * 24 * 60 * 60 * 1000) return false;
  return true;
}

export default function PumpkinChatButton() {
  const pathname = usePathname();
  const [mounted, setMounted]     = useState(false);
  const [show, setShow]           = useState(false); // card is in DOM
  const [closing, setClosing]     = useState(false); // exit animation playing
  const autoTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const openCard = useCallback(() => {
    setClosing(false);
    setShow(true);
  }, []);

  const closeCard = useCallback(() => {
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setShow(false);
      setClosing(false);
    }, 220);
  }, []);

  const toggle = () => (show && !closing ? closeCard() : openCard());

  const snooze = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    closeCard();
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  };

  // Auto-show once per session, 5 s after mount
  useEffect(() => {
    if (!mounted) return;
    if (!shouldAutoShow()) return;
    autoTimer.current = setTimeout(() => {
      openCard();
      sessionStorage.setItem(SESSION_KEY, "1");
      // Auto-hide after 9 s
      autoTimer.current = setTimeout(closeCard, 9000);
    }, 5000);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [mounted, openCard, closeCard]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const hidden =
    pathname.startsWith("/blog") ||
    pathname.startsWith("/lab")  ||
    pathname === "/quotes";

  if (!mounted || hidden) return null;

  return (
    <div className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-3
      transition-[opacity,transform] duration-300 ease-out">

      {/* ── Popup card ─────────────────────────────────────────────── */}
      {show && (
        <div className={closing ? "animate-bubble-out" : "animate-bubble-in"}>
          <div
            className="relative w-72 rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              boxShadow:
                "0 20px 60px -12px rgba(0,0,0,0.16), 0 8px 24px -8px rgba(0,0,0,0.08)",
            }}
          >
            {/* Dot grid — same density and colour as the footer */}
            <div
              aria-hidden
              className="hero-dot-grid absolute inset-0 pointer-events-none opacity-[0.28]"
            />

            {/* Very subtle top tint */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-24 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 100%)",
              }}
            />

            <div className="relative z-10 p-5">

              {/* ── Header ── */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Icon pill */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
                  >
                    <svg
                      width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="var(--accent)"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold leading-none text-fg">
                      Ask Pumpkin
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                      <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-fg-subtle">
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close */}
                <button
                  onClick={snooze}
                  aria-label="Dismiss"
                  className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md
                             text-fg-faint hover:text-fg hover:bg-surface-raised transition-colors"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Divider */}
              <div
                aria-hidden
                className="mb-3.5 h-px bg-gradient-to-r from-transparent via-border to-transparent"
              />

              {/* Message */}
              <p className="text-[12px] leading-[1.7] text-fg-muted mb-4">
                Ask me anything about Taruni — her projects, experience, or what makes her unique.
              </p>

              {/* CTA */}
              <Link
                href="/chat"
                onClick={closeCard}
                className="group flex items-center justify-between w-full rounded-xl
                           px-4 py-2.5 text-[12px] font-semibold text-accent-fg
                           transition-opacity duration-150 hover:opacity-90
                           active:scale-[0.98] transition-transform"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%)",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <SparkleIcon size={13} className="shrink-0" />
                  Start chatting
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB ── dot-texture circle with animated layers ──────── */}
      {/* Wrapper is NOT overflow-hidden so the breathing ring can bleed outside */}
      <div className="relative flex items-center justify-center">

        {/* Breathing outer ring — same accent colour, very low opacity */}
        <span
          aria-hidden
          className="fab-ring-pulse absolute rounded-full pointer-events-none"
          style={{
            inset: "-6px",
            border: "1.5px solid var(--accent)",
          }}
        />

        {/* The button itself — overflow-hidden clips the rotating dot grid */}
        <button
          onClick={toggle}
          aria-label="Ask Pumpkin AI"
          aria-expanded={show && !closing}
          className="relative flex h-14 w-14 items-center justify-center rounded-full
                     overflow-hidden
                     bg-surface border border-border/60
                     shadow-[0_4px_20px_-6px_rgba(0,0,0,0.14)]
                     dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.45)]
                     hover:border-accent/40
                     hover:shadow-[0_6px_28px_-6px_rgba(0,0,0,0.18)]
                     dark:hover:shadow-[0_6px_28px_-6px_rgba(0,0,0,0.55)]
                     transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {/* ── Layer 1: slowly rotating dot grid (footer texture) ── */}
          <div
            aria-hidden
            className="fab-dot-rotate hero-dot-grid absolute inset-0 pointer-events-none opacity-[0.42]"
          />

          {/* ── Layer 2: radial vignette — brightens centre, dims edges ── */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, transparent 28%, color-mix(in srgb, var(--surface) 65%, transparent) 100%)",
            }}
          />

          {/* ── Layer 3: very subtle accent glow at top-left (light source) ── */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 65%)",
            }}
          />

          {/* ── Icon — chat bubble ↔ close ── */}
          <span
            className="relative z-10 text-accent"
            style={{
              transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
              transform: show && !closing ? "rotate(90deg) scale(0.88)" : "rotate(0deg) scale(1)",
            }}
          >
            {show && !closing ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
