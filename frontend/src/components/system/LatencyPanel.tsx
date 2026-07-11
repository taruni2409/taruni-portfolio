import type { SystemData } from "./types";
import { STAGE_LABEL } from "./types";
import Stat, { SectionTitle } from "./Stat";

// End-to-end percentiles + per-stage p50/p95 (fine-grained latency) + peak throughput.
export default function LatencyPanel({ data }: { data: SystemData }) {
  const stages = data.latency_stages.length > 0 ? data.latency_stages : [];
  const maxStage = Math.max(...stages.map((s) => s.p95), 1);

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>End-to-end latency</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="P50" value={`${data.latency.p50}ms`} sub="median" />
          <Stat label="P95" value={`${data.latency.p95}ms`} />
          <Stat label="P99" value={`${data.latency.p99}ms`} sub="tail" />
          <Stat
            label="Peak load"
            value={`${data.throughput.peak_rpm}`}
            sub="req/min busiest"
          />
        </div>
      </section>

      {stages.length > 0 && (
        <section>
          <SectionTitle>RAG pipeline — per-stage p50 / p95</SectionTitle>
          <p className="text-[11px] text-fg-faint mb-3">{data.retrieval.method}</p>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            {stages.map((s) => (
              <div key={s.stage}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-fg-muted">{STAGE_LABEL[s.stage] ?? s.stage}</span>
                  <span className="font-mono tabular-nums text-[11px] text-fg-faint">
                    p50 {s.p50}ms · p95 {s.p95}ms
                  </span>
                </div>
                {/* p95 bar with a p50 marker tucked inside */}
                <div className="relative mt-1 h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/40"
                    style={{ width: `${Math.max(3, (s.p95 / maxStage) * 100)}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-accent"
                    style={{ width: `${Math.max(2, (s.p50 / maxStage) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
