// Shared types + formatting helpers for the /system observability dashboard.
// Mirrors the payload from GET /stats/system and /stats/system/traces.

export type Period = "day" | "week" | "month" | "all";

export interface SystemData {
  period: string;
  latency: { count: number; p50: number; p95: number; p99: number; avg: number };
  stages: { stage: string; avg_ms: number; count: number }[];
  latency_stages: { stage: string; p50: number; p95: number; count: number }[];
  throughput: { peak_rpm: number; at: string };
  models: { model: string; count: number; avg_ms: number }[];
  fallback_rate_pct: number;
  primary_model: string;
  model_chain: string[];
  cost: { total_tokens: number; avg_prompt: number; avg_completion: number; est_cost_usd: number };
  quality: {
    satisfaction_pct: number;
    experience: { total: number; average: number; distribution: Record<string, number> };
    samples: number;
    avg_top_score: number;
    grounded_pct: number;
  };
  volume: { date: string; count: number }[];
  totals: { total_responses: number; unique_visitors: number; sessions: number };
  pages: { page: string; sessions: number; unique_visitors: number }[];
  kb_docs: number;
  reliability: {
    uptime_seconds: number;
    deploy_sha: string;
    last_ingest_at: string | null;
    total: number;
    errors: number;
    error_rate_pct: number;
    success_rate_pct: number;
    by_code: { code: string; count: number }[];
  };
  health: { status: string; api: string; analytics_db: string; rag: string };
  retrieval: { embed_model: string; embed_dim: number; method: string };
}

export interface TraceEntry {
  model: string;
  latency_ms: number;
  status: string;
  created_at: string;
  stages: { stage: string; ms: number }[];
}

export const STAGE_LABEL: Record<string, string> = {
  retrieve: "Hybrid retrieval",
  rrf: "Rank fusion",
  rerank: "Re-rank",
  graph: "Graph expansion",
  ttft: "Time to first token",
  llm: "LLM generation",
};

// Distinct hue per stage so the trace waterfall reads as a stacked timeline.
export const STAGE_COLOR: Record<string, string> = {
  retrieve: "bg-sky-400",
  rrf: "bg-indigo-400",
  rerank: "bg-violet-400",
  graph: "bg-fuchsia-400",
  ttft: "bg-amber-400",
  llm: "bg-emerald-400",
};

export function fmtDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`;
  return `${Math.round(ms)}ms`;
}

export function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
