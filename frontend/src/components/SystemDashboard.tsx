"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import type { Period, SystemData } from "./system/types";
import Stat, { SectionTitle } from "./system/Stat";
import PeriodToggle from "./system/PeriodToggle";
import ReliabilityStrip from "./system/ReliabilityStrip";
import LatencyPanel from "./system/LatencyPanel";
import CostPanel from "./system/CostPanel";
import QualityPanel from "./system/QualityPanel";
import TraceWaterfall from "./system/TraceWaterfall";

const REFRESH_MS = 20_000;

export default function SystemDashboard() {
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<SystemData | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  // Refetch on period change and on the auto-refresh tick.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/stats/system?period=${period}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && (setData(d), setError(false)))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [period, tick]);

  // Light auto-refresh so the page feels live.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  if (error && !data) {
    return (
      <p className="text-sm text-fg-faint">
        The live system is warming up or unreachable. This dashboard reads real-time metrics from the
        Railway backend — refresh in a moment.
      </p>
    );
  }
  if (!data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-raised animate-pulse" />
        ))}
      </div>
    );
  }

  const maxVol = Math.max(...data.volume.map((v) => v.count), 1);
  const maxPage = Math.max(...data.pages.map((p) => p.sessions), 1);

  return (
    <div className="space-y-10">
      {/* Period toggle */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-fg-faint">
          Showing <span className="font-medium text-fg-muted">{periodLabel(period)}</span> · auto-refreshes
        </p>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      <ReliabilityStrip data={data} />
      <LatencyPanel data={data} />
      <CostPanel data={data} />
      <QualityPanel data={data} />
      <TraceWaterfall refreshKey={tick} />

      {/* Chat volume + traffic */}
      <div className="grid sm:grid-cols-2 gap-6">
        <section>
          <SectionTitle>Chat volume · 30 days</SectionTitle>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-end gap-[3px] h-24">
              {data.volume.map((v) => (
                <div
                  key={v.date}
                  title={`${v.date}: ${v.count}`}
                  className="flex-1 rounded-sm bg-accent/70 hover:bg-accent transition-colors"
                  style={{ height: `${Math.max(4, (v.count / maxVol) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-fg-faint">
              <span>30d ago</span>
              <span>today</span>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>Top pages</SectionTitle>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            {data.pages.length === 0 && <p className="text-[12px] text-fg-faint">No traffic yet.</p>}
            {data.pages.slice(0, 6).map((p) => (
              <div key={p.page}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[11px] text-fg-muted truncate">{p.page}</span>
                  <span className="font-mono tabular-nums text-[10px] text-fg-faint shrink-0">
                    {p.sessions}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${Math.max(3, (p.sessions / maxPage) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Totals */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Responses" value={String(data.totals.total_responses)} />
          <Stat label="Unique visitors" value={String(data.totals.unique_visitors)} />
          <Stat label="Sessions" value={String(data.totals.sessions)} />
          <Stat label="KB documents" value={String(data.kb_docs)} sub="embedded chunks" />
        </div>
      </section>
    </div>
  );
}

function periodLabel(p: Period): string {
  return { day: "last 24 hours", week: "last 7 days", month: "last 30 days", all: "all time" }[p];
}
