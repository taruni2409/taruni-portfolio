"use client";

import { useState, useEffect } from "react";

const SECTIONS = [
  { id: "hero",         label: "Hero" },
  { id: "about",        label: "About" },
  { id: "projects",     label: "Projects" },
  { id: "skills",       label: "Skills" },
  { id: "contact",      label: "Contact" },
] as const;

const NAV_H = 55;

export default function SectionNav() {
  const [active, setActive]   = useState<string>("hero");
  const [copied, setCopied]   = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function update() {
      setScrolled(window.scrollY > 80);
      let current: string = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= NAV_H) current = id;
      }
      setActive(current);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(`${location.origin}/#${id}`);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }

  return (
    <nav
      aria-label="Page sections"
      className={`fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300
        sm:opacity-100
        ${scrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      {/* dots column — fixed narrow width so the connecting line stays centred */}
      <div className="relative flex flex-col items-center w-3">
        {/* track line */}
        <span
          aria-hidden
          className="absolute top-[9px] bottom-[9px] left-1/2 -translate-x-1/2 w-px bg-border/60"
        />

        {SECTIONS.map(({ id, label }, i) => {
          const isActive = active === id;
          return (
            <div
              key={id}
              className={`group relative flex items-center justify-center${i > 0 ? " mt-4" : ""}`}
            >
              {/* label + copy — desktop only, slides in from right on hover */}
              <div className="hidden sm:flex absolute right-full items-center gap-2 pr-3
                opacity-0 group-hover:opacity-100
                translate-x-1.5 group-hover:translate-x-0
                transition-all duration-200
                pointer-events-none group-hover:pointer-events-auto">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint whitespace-nowrap">
                  {label}
                </span>
                <button
                  onClick={() => copy(id)}
                  title={`Copy link to ${label}`}
                  className="flex items-center justify-center text-fg-faint hover:text-accent transition-colors"
                  aria-label={`Copy link to ${label} section`}
                >
                  {copied === id ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>

              {/* dot */}
              <button
                onClick={() => scrollTo(id)}
                aria-label={`Go to ${label}`}
                title={label}
                className={`relative z-10 rounded-full flex-shrink-0 transition-all duration-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
                  ${isActive
                    ? "w-2.5 h-2.5 bg-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
                    : "w-1.5 h-1.5 bg-fg-faint/35 hover:bg-fg-faint/75"
                  }`}
              />
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
