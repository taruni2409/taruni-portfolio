import type { SystemData } from "./types";
import { fmtUptime, fmtRelative } from "./types";
import Stat from "./Stat";

// The top-line "is it healthy" row an engineering manager scans first.
export default function ReliabilityStrip({ data }: { data: SystemData }) {
  const r = data.reliability;
  const healthy = data.health.status === "ok";
  const errorTone = r.error_rate_pct >= 5 ? "bad" : r.error_rate_pct > 0 ? "warn" : "good";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
            healthy
              ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
              : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${healthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {healthy ? "All systems operational" : "Degraded"}
        </span>
        <span className="text-[11px] text-fg-faint font-mono">
          {data.retrieval.embed_model} · {data.retrieval.embed_dim}d
        </span>
        {r.deploy_sha && (
          <span className="text-[11px] text-fg-faint font-mono" title="Deployed commit">
            build {r.deploy_sha}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Success rate" value={`${r.success_rate_pct}%`} sub={`${r.total} requests`} tone="good" />
        <Stat
          label="Error rate"
          value={`${r.error_rate_pct}%`}
          sub={r.errors > 0 ? `${r.errors} failed` : "no errors"}
          tone={errorTone}
        />
        <Stat label="Uptime" value={fmtUptime(r.uptime_seconds)} sub="since last deploy" />
        <Stat label="KB ingested" value={fmtRelative(r.last_ingest_at)} sub={`${data.kb_docs} chunks`} />
      </div>

      {r.by_code.length > 0 && (
        <p className="text-[11px] text-fg-faint">
          Errors:{" "}
          {r.by_code.map((c, i) => (
            <span key={c.code} className="font-mono">
              {i > 0 && ", "}
              {c.code} ({c.count})
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
