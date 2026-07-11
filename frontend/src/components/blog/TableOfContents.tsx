"use client";

import { useEffect, useState } from "react";

export interface Heading {
  level: 2 | 3;
  text: string;
  id: string;
}

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-80px 0% -70% 0%" }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label="Table of contents">
      <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint mb-3">On this page</p>
      <ol className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? "0.75rem" : undefined }}>
            <a
              href={`#${h.id}`}
              className={`block text-xs leading-snug transition-colors
                ${activeId === h.id
                  ? "text-accent font-medium"
                  : "text-fg-faint hover:text-fg-subtle"}`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function MobileTOC({ headings }: { headings: Heading[] }) {
  if (headings.length < 2) return null;
  return (
    <details className="lg:hidden not-prose my-6 rounded-xl border border-border bg-surface-raised px-4 py-3 group">
      <summary className="text-[10px] font-bold uppercase tracking-widest text-fg-faint cursor-pointer select-none list-none flex items-center justify-between">
        On this page
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className="transition-transform group-open:rotate-180">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </summary>
      <ol className="mt-3 space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? "0.75rem" : undefined }}>
            <a href={`#${h.id}`} className="block text-xs text-fg-subtle hover:text-accent transition-colors leading-snug">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
