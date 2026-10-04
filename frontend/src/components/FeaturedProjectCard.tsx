"use client";

import { useState } from "react";

interface SourceLink { label: string; url: string }
interface Project {
  title: string;
  description: string;
  details?: string[];
  tags: string[];
  featured?: boolean;
  award?: string;
  note?: string;
  sourceLinks?: SourceLink[];
  liveUrl?: string;
}

export default function FeaturedProjectCard({ p }: { p: Project }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = Boolean(p.details && p.details.length > 0);

  return (
    <div
      className={`group relative flex-1 rounded-card border border-border bg-surface p-6 space-y-3 hover:border-border-strong card-lift overflow-hidden ${hasDetails ? "cursor-pointer" : ""}`}
      onClick={() => { if (hasDetails) setIsExpanded((v) => !v); }}
      role={hasDetails ? "button" : undefined}
      aria-expanded={hasDetails ? isExpanded : undefined}
    >
      <div className={`absolute inset-x-0 top-0 h-px ${p.award ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-fg/20"} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
      {/* Corner bracket accents — ridealso-style geometric marks */}
      <svg className="absolute top-2.5 left-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d="M9 1 L1 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <svg className="absolute bottom-2.5 right-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d="M1 9 L9 9 L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* Tap-to-expand affordance — right edge, vertically centred */}
      {hasDetails && (
        <div
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200 pointer-events-none ${
            isExpanded
              ? "border-accent/50 bg-accent/10 text-accent scale-90"
              : "border-border text-fg-faint group-hover:border-accent/40 group-hover:text-accent group-hover:scale-110"
          }`}
          aria-hidden
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11.24V7.5a1.5 1.5 0 0 1 3 0v3.74" />
            <path d="M12 7.5v-2a1.5 1.5 0 0 1 3 0v6" />
            <path d="M15 9v-1a1.5 1.5 0 0 1 3 0v6" />
            <path d="M18 14v-2a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1.5a7 7 0 0 1-6.1-3.6l-2.3-4.1a1.5 1.5 0 1 1 2.6-1.5L8 14" />
          </svg>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 pr-6">
        <h3 className="font-semibold text-fg text-sm leading-snug group-hover:text-accent transition-colors">{p.title}</h3>
        {p.award && (
          <span className="text-[10px] font-semibold rounded-sm bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 whitespace-nowrap flex-shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px] mr-1" aria-hidden><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 0-3 3" /></svg>{p.award}
          </span>
        )}
      </div>
      <p className="text-xs leading-5 text-fg-subtle">{p.description}</p>

      {/* Expanded details — smooth grid-rows reveal, no layout jump */}
      {hasDetails && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <ul className="space-y-1.5 border-l-2 border-accent/30 pl-3 pb-1">
              {p.details!.map((d, di) => (
                <li key={di} className="text-[11px] leading-5 text-fg-subtle">{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {p.tags.slice(0, 4).map((t) => (
          <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-fg-subtle tracking-wide">
            {t}
          </span>
        ))}
      </div>
      {p.note && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 rounded-sm px-2.5 py-1.5 leading-relaxed">
          {p.note}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {p.liveUrl && (
          <a
            href={p.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-white hover:bg-accent-hover transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Live
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
          </a>
        )}
        {p.sourceLinks && p.sourceLinks.length > 0
          ? p.sourceLinks.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold text-accent hover:border-accent/50 transition-colors"
                onClick={(e) => e.stopPropagation()}>
                {link.label}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
              </a>
            ))
          : null}
      </div>
    </div>
  );
}
