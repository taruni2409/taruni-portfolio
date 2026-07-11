"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function ReadingMode() {
  const [active,  setActive]  = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("reading-mode", active);
    return () => document.documentElement.classList.remove("reading-mode");
  }, [active]);

  // Esc exits
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <>
      {/* ── Inline "Focus" button — lives in the article header ── */}
      {!active && (
        <button
          onClick={() => setActive(true)}
          aria-label="Enter focus reading mode"
          className="inline-flex items-center gap-1.5 rounded-full border border-border
                     bg-surface text-fg-faint hover:text-fg hover:border-fg-muted
                     px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest
                     transition-all duration-200 select-none"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          Focus
        </button>
      )}

      {/* ── Portaled Exit button — body root, always clickable above the spotlight ── */}
      {mounted && active && createPortal(
        <button
          onClick={() => setActive(false)}
          aria-label="Exit focus mode (Esc)"
          className="fixed bottom-6 right-24 z-[10000]
                     inline-flex items-center gap-1.5 rounded-full
                     bg-fg border border-fg text-bg
                     px-3.5 py-2 text-[10px] font-semibold uppercase tracking-widest
                     shadow-xl hover:opacity-80 transition-all duration-200 select-none"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
          Exit focus
        </button>,
        document.body
      )}
    </>
  );
}
