"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";

interface Stats {
  total_responses: number;
  unique_visitors: number;
  site_unique_visitors: number;
}

export default function SiteVitals() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-3 w-28 rounded-full bg-surface-raised animate-pulse" />
        <div className="h-3 w-36 rounded-full bg-surface-raised animate-pulse hidden sm:block" />
      </div>
    );
  }

  if (!stats) return null;
  const siteVisitors = stats.site_unique_visitors ?? stats.unique_visitors;
  if (stats.total_responses === 0 && siteVisitors === 0) return null;

  return (
    <div className="animate-fade-up flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {siteVisitors > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>
            <span className="font-semibold text-fg-subtle tabular-nums">
              {siteVisitors.toLocaleString()}
            </span>{" "}
            unique visitors
          </span>
        </div>
      )}
      {stats.total_responses > 0 && (
        <>
          <span className="text-border text-[10px] hidden sm:inline">·</span>
          <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span>
              <span className="font-semibold text-fg-subtle tabular-nums">
                {stats.total_responses.toLocaleString()}
              </span>{" "}
              questions answered by Pumpkin
            </span>
          </div>
        </>
      )}
    </div>
  );
}
