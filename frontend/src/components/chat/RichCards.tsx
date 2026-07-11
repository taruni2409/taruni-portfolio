"use client";

import Link from "next/link";
import { projects, type Project } from "@/data/projects";

// Distinctive product name = the part before a dash / paren
function projectName(title: string): string {
  return title.split(/[–—(]| - /)[0].trim();
}

function detectProjects(text: string): Project[] {
  const lower = text.toLowerCase();
  const hits: Project[] = [];
  for (const p of projects) {
    const key = projectName(p.title).toLowerCase();
    const firstWord = key.split(/\s+/)[0];
    if (lower.includes(key) || (firstWord.length >= 5 && lower.includes(firstWord))) {
      hits.push(p);
    }
  }
  return hits.slice(0, 2);
}

const PREFERRED_LINK = /live|github|preview|demo/i;

export default function RichCards({ content }: { content: string }) {
  const matched = detectProjects(content);
  if (matched.length === 0) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {matched.map((p) => {
        const name = projectName(p.title);
        const link = p.sourceLinks?.find((l) => PREFERRED_LINK.test(l.label)) ?? p.sourceLinks?.[0];

        return (
          <div
            key={p.title}
            className="group rounded-xl border border-border bg-surface/70 p-3
                       hover:border-border-strong hover:bg-surface
                       transition-colors duration-150"
          >
            {/* Title + award (the highlight metric) */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[12px] font-semibold text-fg leading-snug min-w-0">{name}</p>
              {p.award && (
                <span className="shrink-0 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Winner
                </span>
              )}
            </div>

            {/* Stack */}
            <div className="flex flex-wrap gap-1 mb-2.5">
              {p.tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded bg-surface-raised px-1.5 py-0.5 text-[9px] font-medium text-fg-muted">
                  {t}
                </span>
              ))}
              {p.tags.length > 3 && (
                <span className="text-[9px] text-fg-faint self-center">+{p.tags.length - 3}</span>
              )}
            </div>

            {/* Link / action */}
            <div className="flex items-center gap-2">
              {link ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-accent-light border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-[10px] font-semibold text-accent hover:opacity-80 transition-opacity"
                >
                  {link.label}
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </a>
              ) : (
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-fg-faint hover:text-accent transition-colors"
                >
                  View project
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
