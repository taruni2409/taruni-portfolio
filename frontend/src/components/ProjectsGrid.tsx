"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";

interface SourceLink { label: string; url: string }
interface Project {
  title: string;
  description: string;
  tags: string[];
  featured?: boolean;
  award?: string;
  note?: string;
  sourceLinks?: SourceLink[];
}

function onTiltMove(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const { left, top, width, height } = el.getBoundingClientRect();
  const x = (e.clientX - left) / width  - 0.5;
  const y = (e.clientY - top)  / height - 0.5;
  el.style.transform = `perspective(700px) rotateX(${(-y * 7).toFixed(1)}deg) rotateY(${(x * 7).toFixed(1)}deg) scale3d(1.02,1.02,1.02)`;
}

function onTiltLeave(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
}

export default function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const q = query.toLowerCase().trim();
  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags))).sort();

  const filtered = projects.filter((p) => {
    const matchesTag = !activeTag || p.tags.includes(activeTag);
    const matchesQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q));
    return matchesTag && matchesQuery;
  });

  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          aria-label="Search projects"
          placeholder="Search by title, tech, or keyword…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border border-border bg-surface pl-9 pr-9 py-2.5 text-base sm:text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg transition-colors"
            aria-label="Clear search"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Tag filter pills */}
      {allTags.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTag(null)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3.5 py-1.5 border transition-all duration-150 ${
              !activeTag
                ? "bg-fg text-bg border-fg"
                : "bg-surface border-border text-fg-faint hover:text-fg hover:border-border-strong"
            }`}
          >
            All
            <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
              !activeTag ? "bg-bg/20 text-bg" : "bg-surface-raised text-fg-faint"
            }`}>{projects.length}</span>
          </button>
          {allTags.map((tag) => {
            const isActive = activeTag === tag;
            const count = projects.filter((p) => p.tags.includes(tag)).length;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3.5 py-1.5 border transition-all duration-150 ${
                  isActive
                    ? "bg-accent text-white border-accent"
                    : "bg-surface border-border text-fg-faint hover:text-fg hover:border-border-strong"
                }`}
              >
                {tag}
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                  isActive ? "bg-white/20 text-white" : "bg-surface-raised text-fg-faint"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-fg-faint">
            No projects match{query ? ` "${query}"` : ""}{activeTag ? ` tagged "${activeTag}"` : ""}.
          </p>
          <button
            onClick={() => { setQuery(""); setActiveTag(null); }}
            className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => {
            const isAward = Boolean(p.award);

            return (
              <ScrollReveal key={i} delay={Math.min((i % 3) * 80, 160)} className="flex">
                <div
                  className="group relative flex flex-col flex-1 rounded-2xl border border-border bg-surface p-5 sm:p-6 hover:border-border-strong transition-all overflow-hidden card-lift"
                  onMouseMove={onTiltMove}
                  onMouseLeave={onTiltLeave}
                  style={{ transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s, box-shadow 0.2s", willChange: "transform" }}
                >
                  {/* Hover sweep */}
                  <div className={`absolute inset-x-0 top-0 h-px ${isAward ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-fg/20"} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
                  {/* Corner bracket accents — ridealso-style geometric marks */}
                  <svg className="absolute top-2.5 left-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path d="M9 1 L1 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <svg className="absolute bottom-2.5 right-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path d="M1 9 L9 9 L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>

                  {/* Title + badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h2 className="font-bold text-fg text-sm leading-snug group-hover:text-accent transition-colors">
                      {p.title}
                    </h2>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isAward && (
                        <span className="text-[10px] font-semibold rounded-sm bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2 py-0.5 whitespace-nowrap">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px] mr-1" aria-hidden><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 0-3 3" /></svg>Winner
                        </span>
                      )}
                      {p.featured && !isAward && (
                        <span className="text-[10px] font-semibold rounded-sm bg-surface-raised border border-border text-fg-subtle px-2 py-0.5">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-fg-subtle flex-1 mb-4">{p.description}</p>

                  {/* Tag chips */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTag(activeTag === t ? null : t)}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide transition-colors ${
                          activeTag === t
                            ? "bg-accent border-accent text-white"
                            : "border-border text-fg-subtle hover:border-accent/50 hover:text-accent"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {p.note && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 rounded-sm px-3 py-2 mb-3 leading-relaxed">
                      {p.note}
                    </p>
                  )}

                  {/* Source links */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
                    {p.sourceLinks && p.sourceLinks.length > 0 ? (
                      p.sourceLinks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold text-accent hover:border-accent/50 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {link.label}
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 17L17 7M17 7H7M17 7v10"/>
                          </svg>
                        </a>
                      ))
                    ) : (
                      <span className="text-[11px] text-fg-faint">{p.note ? "" : "In progress"}</span>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
