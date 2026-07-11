"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BACK_HREF = "/";

const SECTIONS = [
  {
    label: "Experience",
    href: "/experience",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-4 0v2" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "Blog",
    href: "/blog",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    label: "Education",
    href: "/education",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
];

export default function ChatCloseButton() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(BACK_HREF);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  function handleEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setExpanded(true);
  }

  function handleLeave() {
    closeTimer.current = setTimeout(() => setExpanded(false), 120);
  }

  return (
    <>
      {/* ── Mobile: × circle ──────────────────────────────────────────── */}
      <Link
        href={BACK_HREF}
        aria-label="Back to portfolio"
        className="md:hidden flex h-9 w-9 items-center justify-center rounded-full
                   border border-border bg-surface/80 backdrop-blur-sm
                   text-fg-muted hover:text-fg hover:border-border-strong
                   hover:bg-surface active:scale-90
                   transition-all duration-150 shadow-sm"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </Link>

      {/* ── Desktop: hover-expand exit panel ──────────────────────────── */}
      <div
        className="hidden md:block relative"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {/* Main exit button */}
        <Link
          href={BACK_HREF}
          aria-label="Back to portfolio (press Esc)"
          className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 shadow-sm
                      backdrop-blur-md transition-all duration-200
                      ${expanded
                        ? "border-border-strong bg-surface shadow-md"
                        : "border-border bg-surface/80 hover:border-border-strong hover:bg-surface hover:shadow-md"
                      }`}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 transition-all duration-150 ${expanded ? "text-accent -translate-x-0.5" : "text-fg-faint"}`}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className={`text-[12px] font-semibold tracking-wide transition-colors duration-150 ${expanded ? "text-fg" : "text-fg-muted"}`}>
            Portfolio
          </span>
          <kbd className="inline-flex items-center text-[9px] font-mono bg-bg border border-border rounded-md px-1.5 py-0.5 leading-none text-fg-faint shadow-sm transition-colors duration-150">
            esc
          </kbd>
        </Link>

        {/* Dropdown panel — pt-2 bridges the gap so mouse doesn't lose hover */}
        <div
          className={`absolute top-full right-0 pt-2 w-44 z-50
                      transition-all duration-200 ease-out
                      ${expanded
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible -translate-y-1 pointer-events-none"
                      }`}
        >
          <div className="rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-2xl overflow-hidden">

            {/* Section header */}
            <div className="px-3 pt-2.5 pb-1.5 border-b border-border/60">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-fg-faint">
                Jump to
              </p>
            </div>

            {/* Nav links */}
            <div className="p-1.5 space-y-0.5">
              {SECTIONS.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2
                             text-[11px] font-medium text-fg-muted
                             hover:bg-accent-light hover:text-accent
                             transition-colors duration-100 group"
                >
                  <span className="text-fg-faint group-hover:text-accent transition-colors duration-100 shrink-0">
                    {section.icon}
                  </span>
                  {section.label}
                </Link>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-border/60">
              <p className="text-[9px] text-fg-faint text-center tracking-wide">
                or press{" "}
                <kbd className="inline-flex items-center font-mono text-[8px] bg-surface-raised border border-border rounded px-1 py-px leading-none">
                  esc
                </kbd>
                {" "}to exit
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
