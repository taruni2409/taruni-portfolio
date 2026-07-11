"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import type { TraceEntry } from "./types";
import { STAGE_LABEL, STAGE_COLOR, fmtDuration, fmtRelative } from "./types";
import { SectionTitle } from "./Stat";

// Glass-box view of real recent answers: each row is a stacked stage timeline.
export default function TraceWaterfall({ refreshKey }: { refreshKey: number }) {
  const [traces, setTraces] = useState<TraceEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/stats/system/traces`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setTraces(d.traces ?? []))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) return null;

  return (
    <section>
      <SectionTitle>Live request traces</SectionTitle>
      <p className="text-[11px] text-fg-faint mb-3">
        The last answers Pumpkin generated, broken down by pipeline stage. No question text or visitor
        data — just timing.
      </p>
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {!traces && (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-6 rounded bg-surface-raised animate-pulse" />
            ))}
          </div>
        )}
        {traces && traces.length === 0 && (
          <p className="p-4 text-[12px] text-fg-faint">No traces yet — ask Pumpkin a question.</p>
        )}
        {traces?.map((t, idx) => {
          const total = t.stages.reduce((s, st) => s + st.ms, 0) || t.latency_ms || 1;
          return (
            <div key={idx} className="p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      t.status === "ok" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <span className="font-mono text-[11px] text-fg-muted truncate">{t.model}</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] text-fg-faint shrink-0">
                  {fmtDuration(t.latency_ms)} · {fmtRelative(t.created_at)}
                </span>
              </div>
              {/* Stacked stage timeline */}
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-raised">
                {t.stages.map((st, i) => (
                  <div
                    key={i}
                    className={`${STAGE_COLOR[st.stage] ?? "bg-fg-faint"} h-full`}
                    style={{ width: `${(st.ms / total) * 100}%` }}
                    title={`${STAGE_LABEL[st.stage] ?? st.stage}: ${fmtDuration(st.ms)}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(STAGE_LABEL).map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-fg-faint">
            <span className={`w-2 h-2 rounded-sm ${STAGE_COLOR[key] ?? "bg-fg-faint"}`} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
