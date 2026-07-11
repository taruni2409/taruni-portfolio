import type { SystemData } from "./types";
import { fmtTokens } from "./types";
import Stat, { SectionTitle } from "./Stat";

// Token usage + estimated cost + model mix / fallback rate.
export default function CostPanel({ data }: { data: SystemData }) {
  const totalModel = data.models.reduce((s, m) => s + m.count, 0) || 1;
  const cost = data.cost;

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Cost & efficiency</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Est. cost" value={`$${cost.est_cost_usd.toFixed(4)}`} sub="in window" />
          <Stat label="Tokens" value={fmtTokens(cost.total_tokens)} sub="prompt + output" />
          <Stat label="Avg prompt" value={fmtTokens(cost.avg_prompt)} sub="tokens / req" />
          <Stat label="Avg output" value={fmtTokens(cost.avg_completion)} sub="tokens / req" />
        </div>
      </section>

      <section>
        <SectionTitle>Model mix · {data.fallback_rate_pct}% fallback</SectionTitle>
        <div className="rounded-xl border border-border bg-surface p-4 space-y-2.5">
          {data.models.length === 0 && <p className="text-[12px] text-fg-faint">No responses yet.</p>}
          {data.models.map((m) => (
            <div key={m.model}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] text-fg-muted truncate">{m.model}</span>
                <span className="font-mono tabular-nums text-[10px] text-fg-faint shrink-0">
                  {m.count} · {m.avg_ms}ms
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.model === data.primary_model ? "bg-accent" : "bg-amber-400"}`}
                  style={{ width: `${Math.max(3, (m.count / totalModel) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-[10px] text-fg-faint">
            Fallback chain: <span className="font-mono">{data.model_chain.join(" → ")}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
