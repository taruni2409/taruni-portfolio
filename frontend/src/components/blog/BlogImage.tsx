"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  src: string;
  alt: string;
  caption?: string;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function BlogImage({ src, alt, caption }: Props) {
  const fullSrc = src.startsWith("http") ? src : `${BASE}${src}`;
  const [open, setOpen]       = useState(false);
  const [animIn, setAnimIn]   = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Drive entrance animation after the portal mounts
  useEffect(() => {
    if (!open) { setAnimIn(false); return; }
    const raf = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Scroll lock + ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  /* ── Lightbox overlay (portal) ─────────────────────────────────────── */
  const overlay = (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `rgba(0,0,0,${animIn ? 0.92 : 0})`,
        backdropFilter: `blur(${animIn ? 14 : 0}px)`,
        WebkitBackdropFilter: `blur(${animIn ? 14 : 0}px)`,
        transition: "background-color 0.25s ease, backdrop-filter 0.25s ease, -webkit-backdrop-filter 0.25s ease",
        cursor: "zoom-out",
        padding: "2rem 1.5rem 3.5rem",
      }}
    >
      {/* Image + caption wrapper */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          cursor: "auto",
          opacity: animIn ? 1 : 0,
          transform: animIn ? "scale(1) translateY(0)" : "scale(0.94) translateY(12px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fullSrc}
          alt={alt}
          style={{
            display: "block",
            maxWidth: "92vw",
            maxHeight: "82vh",
            width: "auto",
            height: "auto",
            borderRadius: "1.125rem",
            boxShadow: "0 32px 80px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        />

        {caption && (
          <p style={{
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "rgba(255,255,255,0.55)",
            fontStyle: "italic",
            maxWidth: "520px",
            lineHeight: 1.6,
            letterSpacing: "0.01em",
          }}>
            {caption}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => setOpen(false)}
        aria-label="Close image"
        style={{
          position: "fixed",
          top: "1.25rem",
          right: "1.25rem",
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: animIn ? 1 : 0,
          transition: "opacity 0.25s ease, background 0.15s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      {/* ESC hint */}
      <p style={{
        position: "fixed",
        bottom: "1.25rem",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "0.6875rem",
        color: "rgba(255,255,255,0.28)",
        letterSpacing: "0.08em",
        userSelect: "none",
        opacity: animIn ? 1 : 0,
        transition: "opacity 0.35s ease 0.1s",
        pointerEvents: "none",
      }}>
        ESC to close · click outside to dismiss
      </p>
    </div>
  );

  const shadowIdle   = "0 0 0 1px var(--border), 0 2px 6px -2px rgba(0,0,0,0.10), 0 16px 40px -10px rgba(0,0,0,0.18), 0 0 48px -16px rgba(79,70,229,0.07)";
  const shadowActive = "0 0 0 1px var(--border-strong), 0 4px 12px -3px rgba(0,0,0,0.16), 0 32px 64px -14px rgba(0,0,0,0.26), 0 0 56px -14px rgba(79,70,229,0.13)";

  /* ── Thumbnail ──────────────────────────────────────────────────────── */
  return (
    <>
      <figure className="not-prose my-8 flex flex-col items-center w-full">
        <div
          className="relative w-full rounded-2xl overflow-hidden cursor-zoom-in group"
          style={{ boxShadow: shadowIdle, transition: "box-shadow 0.35s ease" }}
          onClick={() => setOpen(true)}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadowActive; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadowIdle; }}
          title="Click to enlarge"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullSrc}
            alt={alt}
            className="w-full h-auto block transition-transform duration-500 ease-out group-hover:scale-[1.025]"
          />

          {/* Hover veil + expand icon */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/22 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7"/>
              </svg>
            </div>
          </div>
        </div>

        {caption && (
          <figcaption className="mt-3 text-center text-[11px] text-fg-faint italic leading-relaxed max-w-md">
            {caption}
          </figcaption>
        )}
      </figure>

      {mounted && open && createPortal(overlay, document.body)}
    </>
  );
}
