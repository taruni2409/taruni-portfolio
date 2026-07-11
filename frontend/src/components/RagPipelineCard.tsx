"use client";

import { useState } from "react";
import RagPipelineModal from "@/components/RagPipelineModal";

interface SourceLink { label: string; url: string; }
interface Props {
  title: string;
  description: string;
  tags: string[];
  award?: string;
  note?: string;
  sourceLinks?: SourceLink[];
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RagPipelineCard({ title, description, tags, award, note, sourceLinks }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex-1 rounded-2xl border border-border bg-surface p-5 space-y-3 hover:border-border-strong card-lift transition-all">

        {/* ── Standard card content ── */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-fg text-sm leading-snug">{title}</h3>
          {award && (
            <span className="text-[10px] font-semibold rounded-sm bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 whitespace-nowrap flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px] mr-1" aria-hidden><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 0-3 3" /></svg>{award}
            </span>
          )}
        </div>

        <p className="text-xs leading-5 text-fg-subtle">{description}</p>

        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-fg-subtle tracking-wide">
              {t}
            </span>
          ))}
        </div>

        {note && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 rounded-sm px-2.5 py-1.5 leading-relaxed">
            {note}
          </p>
        )}

        {sourceLinks && sourceLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {sourceLinks.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm bg-accent-light border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-[10px] font-semibold text-accent hover:opacity-80 transition-opacity">
                {link.label}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
              </a>
            ))}
          </div>
        )}

        {/* ── Pipeline modal trigger ── */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex w-full items-center gap-1.5 border-t border-border pt-3 text-[10px] font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/>
          </svg>
          View RAG pipeline
        </button>
      </div>

      <RagPipelineModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
