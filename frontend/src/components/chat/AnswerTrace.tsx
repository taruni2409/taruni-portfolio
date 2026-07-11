"use client";

import { useState } from "react";

export interface TraceStage {
  stage: string;
  ms: number;
}

/** Human labels + descriptions for the raw pipeline stage keys from the backend. */
const STAGE_META: Record<string, { label: string; desc: string }> = {
  retrieve: { label: "Hybrid retrieval", desc: "HyDE + dense (bge-base) + BM25, embedded in one ONNX pass" },
  rrf:      { label: "Rank fusion",      desc: "Reciprocal Rank Fusion merges dense + lexical (k=60)" },
  rerank:   { label: "Re-rank",          desc: "Score-sort to the top chunks for a tight context window" },
  graph:    { label: "Graph expansion",  desc: "1-hop traversal pulls in a related document" },
  llm:      { label: "LLM generation",   desc: "Gemini streams the grounded answer token by token" },
};

const BAR = "bg-accent";

export default function AnswerTrace({
  trace,
  model,
  latencyMs,
}: {
  trace: TraceStage[];
  model?: string;
  latencyMs?: number;
}) {
  const [open, setOpen] = useState(false);
  if (!trace || trace.length === 0) return null;

  const total = latencyMs ?? trace.reduce((s, t) => s + t.ms, 0);
  const maxMs = Math.max(...trace.map((t) => t.ms), 1);

  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group inline-flex items-center gap-1.5 text-[10px] font-medium text-fg-faint hover:text-accent transition-colors"
      >
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-accent shrink-0"
        >
          {/* circuit / pipeline glyph */}
          <circle cx="5" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="12" r="2" />
          <path d="M7 6h6a3 3 0 0 1 3 3v1M7 18h6a3 3 0 0 0 3-3v-1" />
        </svg>
        <span className="uppercase tracking-[0.12em]">How this answer was built</span>
        <span className="font-mono tabular-nums text-fg-faint/70">· {Math.round(total)}ms</span>
        <svg
          width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-surface/60 p-3 animate-[fadeUp_0.25s_ease_forwards]">
          <div className="space-y-2">
            {trace.map((t, i) => {
              const meta = STAGE_META[t.stage] ?? { label: t.stage, desc: "" };
              const pct = Math.max(3, (t.ms / maxMs) * 100);
              return (
                <div key={`${t.stage}-${i}`} className="group/row">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-medium text-fg-muted">{meta.label}</span>
                    <span className="font-mono tabular-nums text-[10px] text-fg-faint shrink-0">
                      {t.ms.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR} transition-[width] duration-500 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {meta.desc && (
                    <p className="mt-0.5 text-[9.5px] leading-snug text-fg-faint/80">{meta.desc}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[9.5px] text-fg-faint">
            <span className="font-mono">{model ?? "gemini"}</span>
            <span>
              hybrid RAG · <span className="font-mono tabular-nums">{Math.round(total)}ms</span> end-to-end
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
