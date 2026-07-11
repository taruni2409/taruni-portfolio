"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

// ── Node definitions ──────────────────────────────────────────────────────────

interface NodeDef {
  id: string;
  label: string;
  brief: string;
  detail: string;
  dot: string;
  badge?: string;
  tag?: string;
  tagColor?: string;
}

const NODES: NodeDef[] = [
  {
    id: "query",
    label: "User Query",
    brief: "Natural language input",
    detail:
      "Any natural language question — no templates or keyword syntax required. The pipeline understands intent, not just matching words.",
    dot: "bg-indigo-500",
    tag: "Input",
    tagColor: "text-indigo-400",
  },
  {
    id: "hyde",
    label: "HyDE Expansion",
    brief: "3 synthetic answer variants generated",
    detail:
      "Hypothetical Document Embeddings: generates 3 plausible answers and embeds them alongside the original query. Querying with multiple hypothesis vectors dramatically improves recall for indirect or ambiguous questions.",
    dot: "bg-violet-500",
    badge: "×3",
    tag: "Retrieval",
    tagColor: "text-violet-400",
  },
];

const SPLIT_LEFT: NodeDef = {
  id: "vector",
  label: "Vector Search",
  brief: "BGE-base · ONNX",
  detail:
    "Dense semantic search via BAAI/bge-base-en-v1.5 running on ONNX (no PyTorch runtime). Finds conceptually related chunks even without keyword overlap — captures meaning, not just words.",
  dot: "bg-blue-500",
};

const SPLIT_RIGHT: NodeDef = {
  id: "bm25",
  label: "BM25 Lexical",
  brief: "Sparse keyword retrieval",
  detail:
    "Classic BM25 inverted-index retrieval. Catches exact-match terms — names, acronyms, rare words — that dense embeddings can under-weight. The two methods are complementary.",
  dot: "bg-blue-400",
};

const LOWER_NODES: NodeDef[] = [
  {
    id: "rrf",
    label: "RRF Fusion",
    brief: "Reciprocal Rank → top 20",
    detail:
      "Reciprocal Rank Fusion merges vector and BM25 result lists without needing to normalize scores. Each doc's final score = Σ 1/(k + rank_i) across both retrievers. Returns the top-20 candidates.",
    dot: "bg-sky-500",
    tag: "Ranking",
    tagColor: "text-sky-400",
  },
  {
    id: "graph",
    label: "Graph Expansion",
    brief: "+2 related docs via entity links",
    detail:
      "Each retrieved chunk carries entity links to related documents in the knowledge graph. The pipeline follows 1 hop to add 2 more context docs, broadening coverage without broadening the query.",
    dot: "bg-teal-500",
    tag: "Context",
    tagColor: "text-teal-400",
  },
  {
    id: "gemini",
    label: "Gemini 2.5 Flash",
    brief: "Context-injected generation",
    detail:
      "Top chunks injected into the system prompt with source attribution. Uses Gemini 2.5 Flash for fast, high-quality generation. A fallback chain (Flash → 2.0 Flash → Lite) handles quota limits transparently.",
    dot: "bg-amber-500",
    tag: "Generate",
    tagColor: "text-amber-400",
  },
  {
    id: "stream",
    label: "Streamed Response",
    brief: "Token-by-token via SSE",
    detail:
      "Server-Sent Events stream tokens to the browser the moment they are generated — no waiting for the full response. The UI renders characters as they arrive, giving instant feedback.",
    dot: "bg-green-500",
    tag: "Output",
    tagColor: "text-green-400",
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Connector() {
  return (
    <div className="flex justify-center my-0.5">
      <div className="relative h-5 w-px bg-border overflow-hidden">
        <div className="absolute top-0 h-4 w-full animate-[flow_1.4s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-indigo-400 to-transparent" />
      </div>
    </div>
  );
}

function Node({
  node,
  active,
  onActivate,
}: {
  node: NodeDef;
  active: boolean;
  onActivate: (n: NodeDef | null) => void;
}) {
  return (
    <button
      type="button"
      onPointerEnter={() => onActivate(node)}
      onPointerLeave={() => onActivate(null)}
      onClick={() => onActivate(active ? null : node)}
      className={`w-full flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition-all duration-150
        ${active
          ? "border-accent/50 bg-accent-light/20 dark:bg-accent-light/10"
          : "border-border bg-surface-raised/60 hover:border-border-strong"
        }`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full transition-shadow duration-150 ${node.dot} ${active ? "ring-2 ring-indigo-400/50" : ""}`} />
      <span className="text-sm font-semibold text-fg leading-snug">{node.label}</span>
      {node.badge && (
        <span className="ml-1 rounded-full bg-border px-1.5 py-0.5 text-[9px] font-bold text-fg-faint">
          {node.badge}
        </span>
      )}
      {node.tag && (
        <span className={`ml-auto text-[10px] font-semibold ${node.tagColor ?? "text-fg-faint"}`}>
          {node.tag}
        </span>
      )}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function RagPipelineModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeNode, setActiveNode] = useState<NodeDef | null>(null);

  const handleActivate = useCallback((node: NodeDef | null) => {
    setActiveNode(node);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) setActiveNode(null);
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <h2 className="text-sm font-bold text-fg">RAG Pipeline Architecture</h2>
            <p className="text-[11px] text-fg-faint mt-0.5">
              Hover or tap any node to see how data flows through the backend
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-fg-faint hover:text-fg hover:bg-surface-raised transition-colors mt-0.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Diagram */}
        <div className="px-5 py-5 space-y-0.5">
          {/* Top nodes */}
          {NODES.map((node, i) => (
            <div key={node.id}>
              {i > 0 && <Connector />}
              <Node node={node} active={activeNode?.id === node.id} onActivate={handleActivate} />
            </div>
          ))}

          {/* Fork into parallel search */}
          <div className="flex justify-center my-0.5">
            <div className="relative" style={{ width: "calc(100% - 2rem)" }}>
              <div className="absolute left-1/2 top-0 h-2 w-px bg-border -translate-x-1/2" />
              <div className="absolute left-0 right-0 top-2 h-px bg-border" />
              <div className="absolute left-0 top-2 h-2 w-px bg-border" />
              <div className="absolute right-0 top-2 h-2 w-px bg-border" />
              <div className="h-4" />
            </div>
          </div>

          {/* Split row */}
          <div className="grid grid-cols-2 gap-2">
            {[SPLIT_LEFT, SPLIT_RIGHT].map((node) => (
              <button
                key={node.id}
                type="button"
                onPointerEnter={() => handleActivate(node)}
                onPointerLeave={() => handleActivate(null)}
                onClick={() => handleActivate(activeNode?.id === node.id ? null : node)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-150
                  ${activeNode?.id === node.id
                    ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-sm"
                    : "border-border bg-surface-raised/60 hover:border-border-strong"
                  }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${node.dot}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-fg leading-snug">{node.label}</p>
                  <p className="text-[10px] text-fg-faint mt-0.5">{node.brief}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Merge back */}
          <div className="flex justify-center my-0.5">
            <div className="relative" style={{ width: "calc(100% - 2rem)" }}>
              <div className="absolute left-0 top-0 h-2 w-px bg-border" />
              <div className="absolute right-0 top-0 h-2 w-px bg-border" />
              <div className="absolute left-0 right-0 top-2 h-px bg-border" />
              <div className="absolute left-1/2 top-2 h-2 w-px bg-border -translate-x-1/2" />
              <div className="h-4" />
            </div>
          </div>

          {/* Lower nodes */}
          {LOWER_NODES.map((node, i) => (
            <div key={node.id}>
              {i > 0 && <Connector />}
              <Node node={node} active={activeNode?.id === node.id} onActivate={handleActivate} />
            </div>
          ))}
        </div>

        {/* Detail panel — fixed height so content swap never shifts layout */}
        <div className="mx-5 mb-5 rounded-xl border border-border bg-surface-raised h-24 px-4 py-3 overflow-y-auto">
          {activeNode ? (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeNode.dot}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{activeNode.label}</p>
              </div>
              <p className="text-xs text-fg-subtle leading-relaxed">{activeNode.detail}</p>
            </div>
          ) : (
            <p className="text-xs text-fg-faint leading-relaxed pt-1">
              Hover or tap any node above to see a detailed explanation of that pipeline step.
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="px-5 pb-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-4">
          {[
            { label: "Input", dot: "bg-indigo-500" },
            { label: "Retrieval", dot: "bg-violet-500" },
            { label: "Search", dot: "bg-blue-500" },
            { label: "Ranking", dot: "bg-sky-500" },
            { label: "Context", dot: "bg-teal-500" },
            { label: "Generate", dot: "bg-amber-500" },
            { label: "Output", dot: "bg-green-500" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
              <span className="text-[10px] text-fg-faint">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
