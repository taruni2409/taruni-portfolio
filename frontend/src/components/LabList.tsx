"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import type { LabMeta, LabStatus } from "@/lib/lab";

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<LabStatus, {
  dot: string;
  text: string;
  bg: string;
  label: string;
  pillActive: string;
  leftBorder: string;
  sweep: string;
}> = {
  active: {
    dot: "bg-emerald-400 animate-pulse",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
    label: "Active",
    pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
    leftBorder: "border-l-2 border-l-emerald-400 dark:border-l-emerald-500",
    sweep: "from-emerald-500 to-teal-500",
  },
  shipped: {
    dot: "bg-indigo-400",
    text: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800",
    label: "Shipped",
    pillActive: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
    leftBorder: "border-l-2 border-l-indigo-400 dark:border-l-indigo-500",
    sweep: "from-indigo-500 to-violet-500",
  },
  paused: {
    dot: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
    label: "Paused",
    pillActive: "bg-amber-500 text-white border-amber-500 shadow-sm",
    leftBorder: "border-l-2 border-l-amber-400 dark:border-l-amber-500",
    sweep: "from-amber-500 to-orange-500",
  },
};

const ALL_STATUSES: LabStatus[] = ["active", "shipped", "paused"];

function formatMonth(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

export default function LabList({ entries }: { entries: LabMeta[] }) {
  const [activeStatus, setActiveStatus] = useState<LabStatus | null>(null);

  const availableStatuses = ALL_STATUSES.filter((s) => entries.some((e) => e.status === s));
  const filtered = activeStatus ? entries.filter((e) => e.status === activeStatus) : entries;

  return (
    <div>
      {/* Filter pills */}
      {availableStatuses.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveStatus(null)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-sm px-3.5 py-1.5 border transition-all duration-150 ${
              !activeStatus
                ? "bg-fg text-bg border-fg shadow-sm"
                : "bg-surface border-border text-fg-faint hover:text-fg"
            }`}
          >
            All
            <span className={`text-[10px] font-semibold rounded-sm px-1.5 py-0.5 ${
              !activeStatus ? "bg-bg/20 text-bg" : "bg-surface-raised text-fg-faint"
            }`}>{entries.length}</span>
          </button>

          {availableStatuses.map((status) => {
            const s = STATUS_STYLES[status];
            const isActive = activeStatus === status;
            const count = entries.filter((e) => e.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setActiveStatus(activeStatus === status ? null : status)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-sm px-3.5 py-1.5 border transition-all duration-150 ${
                  isActive ? s.pillActive : "bg-surface border-border text-fg-faint hover:text-fg"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/80" : s.dot}`} />
                {s.label}
                <span className={`text-[10px] font-semibold rounded-sm px-1.5 py-0.5 ${
                  isActive ? "bg-white/20 text-white" : "bg-surface-raised text-fg-faint"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cards */}
      <ol className="space-y-4">
        {filtered.map((entry, i) => {
          const s = STATUS_STYLES[entry.status];
          return (
            <li key={entry.slug}>
              <Reveal delay={Math.min(i * 70, 350)}>
              <Link
                href={`/lab/${entry.slug}`}
                className={`group relative block rounded-sm border border-border bg-surface p-5 sm:p-6 hover:shadow-md transition-all overflow-hidden ${s.leftBorder}`}
              >
                {/* Hover sweep bar */}
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${s.sweep} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />

                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-base font-bold text-fg group-hover:text-accent transition-colors leading-snug">
                    {entry.title}
                  </h2>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-semibold ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>

                <p className="text-sm text-fg-subtle leading-relaxed mb-4">{entry.description}</p>

                {/* Footer: tech tags + date range + explore arrow */}
                <div className="flex items-end justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {entry.tech.map((t) => (
                      <span key={t} className="rounded-sm bg-surface-raised px-2 py-0.5 text-[10px] font-mono font-medium text-fg-subtle border border-border">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {entry.startedAt && (
                      <span className="text-[10px] text-fg-faint whitespace-nowrap">
                        {formatMonth(entry.startedAt)} → {formatMonth(entry.updatedAt)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                      Explore
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
