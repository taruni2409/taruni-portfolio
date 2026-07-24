"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api/client";
import ContentBlogEditor from "@/components/admin/ContentBlogEditor";
import ContentLabEditor from "@/components/admin/ContentLabEditor";
import LabEditor from "@/components/admin/LabEditor";
import ContentQuotesEditor from "@/components/admin/ContentQuotesEditor";
import AvailabilityEditor from "@/components/admin/AvailabilityEditor";
import NowEditor from "@/components/admin/NowEditor";
import ProfileEditor from "@/components/admin/ProfileEditor";
import HeroStatsEditor from "@/components/admin/HeroStatsEditor";
import ExperienceEditor from "@/components/admin/ExperienceEditor";
import EducationEditor from "@/components/admin/EducationEditor";
import ProjectsEditor from "@/components/admin/ProjectsEditor";
import AppsEditor from "@/components/admin/AppsEditor";
import SpotlightsEditor from "@/components/admin/SpotlightsEditor";
import SkillsEditor from "@/components/admin/SkillsEditor";
import TestimonialsEditor from "@/components/admin/TestimonialsEditor";
import GalleryEditor from "@/components/admin/GalleryEditor";
import KnowledgeDataView from "@/components/admin/KnowledgeDataView";
import { StatCard, fmt } from "@/components/admin/StatCard";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PeriodStats    { total_responses: number; unique_visitors: number; sessions: number }
interface SiteVisitStats { total_visits: number; unique_visitors: number }
interface Feedback        { total: number; positive: number; negative: number; satisfaction_pct: number }
interface Question        { text: string; count: number }
interface BlogPost         { slug: string; views: number; claps: number }
interface BlogSummary      { total_views: number; total_claps: number; posts: BlogPost[] }
interface ExperienceSummary{ total: number; average: number; distribution: Record<string, number> }
interface LocationStat     { country: string; visits: number; unique_visitors: number }
interface PageStat         { page: string; sessions: number; unique_visitors: number }
interface ModelStat        { model: string; count: number; avg_ms: number }
interface DailyCount       { date: string; count: number }
interface BlogEngPost      { slug: string; unique_readers: number; total_opens: number; revisiting_readers: number; revisit_rate: number }
interface BlogEngagement   { total_opens: number; posts: BlogEngPost[] }

type ByPeriod<T> = { week: T; month: T; all: T };

interface AdminStats {
  conversations:   ByPeriod<PeriodStats>;
  feedback:        ByPeriod<Feedback>;
  top_questions:   ByPeriod<Question[]>;
  experience:      ByPeriod<ExperienceSummary>;
  blog:            BlogSummary;
  site_visitors:   ByPeriod<SiteVisitStats>;
  blog_engagement: ByPeriod<BlogEngagement>;
  location: {
    site: ByPeriod<LocationStat[]>;
    chat: ByPeriod<LocationStat[]>;
  };
  pages: ByPeriod<PageStat[]>;
  models?: ByPeriod<ModelStat[]>;
  trends?: { visitors: DailyCount[]; conversations: DailyCount[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Sub-components ────────────────────────────────────────────────────────────

function SatisfactionBar({ positive, negative }: { positive: number; negative: number }) {
  const total = positive + negative;
  if (total === 0) return <p className="text-xs text-fg-faint">No feedback yet</p>;
  const pct = Math.round((positive / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          {positive} positive
        </span>
        <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
          {negative} negative
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-fg-faint text-center">{pct}% satisfaction from {total} rated responses</p>
    </div>
  );
}

// ── Trends sparklines ───────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  if (!data.length) return null;
  const W = 100, H = 28;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const pts = data.map((d, i) => [i * step, H - (d.count / max) * (H - 3) - 1.5]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const id = `spark-${color.replace(/[^a-z]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TrendsPanel({ trends }: { trends?: { visitors: DailyCount[]; conversations: DailyCount[] } }) {
  if (!trends) return null;
  const series = [
    { label: "Site visitors", data: trends.visitors,      color: "rgb(99 102 241)" },
    { label: "Conversations", data: trends.conversations, color: "rgb(139 92 246)" },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {series.map((s) => {
        const total = s.data.reduce((a, d) => a + d.count, 0);
        const peak = Math.max(0, ...s.data.map((d) => d.count));
        return (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">{s.label} · 30 days</h2>
              <span className="text-[11px] text-fg-faint tabular-nums">{fmt(total)} total · peak {peak}/day</span>
            </div>
            <Sparkline data={s.data} color={s.color} />
          </div>
        );
      })}
    </div>
  );
}

// ── Model health ──────────────────────────────────────────────────────────────

function ModelHealthPanel({ models }: { models: { model: string; count: number; avg_ms: number }[] }) {
  const total = models.reduce((s, m) => s + m.count, 0);
  const primary = models[0];
  const primaryShare = total > 0 && primary ? Math.round((primary.count / total) * 100) : 0;
  const lats = models.filter((m) => m.avg_ms > 0);
  const avgMs = lats.length
    ? Math.round(lats.reduce((s, m) => s + m.avg_ms * m.count, 0) / lats.reduce((s, m) => s + m.count, 0))
    : 0;
  const healthy = primaryShare >= 85;
  const COLORS = ["bg-indigo-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-zinc-400"];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Pumpkin Model Health</h2>
        {total > 0 && (
          <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold ${
            healthy
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${healthy ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            {healthy ? "Healthy" : "Fallback churn"}
          </span>
        )}
        {avgMs > 0 && (
          <span className={`text-[11px] font-semibold tabular-nums ${avgMs <= 4000 ? "text-emerald-600 dark:text-emerald-400" : avgMs <= 9000 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
            ~{(avgMs / 1000).toFixed(1)}s avg
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-fg-faint">No responses recorded yet for this period.</p>
      ) : (
        <>
          <div className="flex h-2.5 w-full rounded-full overflow-hidden mb-3">
            {models.map((m, i) => (
              <div key={m.model} className={COLORS[i % COLORS.length]} style={{ width: `${(m.count / total) * 100}%` }} title={`${m.model}: ${m.count}`} />
            ))}
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {models.map((m, i) => (
              <li key={m.model} className="flex items-center gap-2 text-xs min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${COLORS[i % COLORS.length]}`} />
                <span className="font-mono text-fg-muted truncate">{m.model}</span>
                <span className="ml-auto tabular-nums text-fg-faint shrink-0">
                  {m.avg_ms > 0 && <span className="text-fg-muted mr-2">{(m.avg_ms / 1000).toFixed(1)}s</span>}
                  {m.count} · {Math.round((m.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
          {!healthy && (
            <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              The primary model is serving only {primaryShare}% of responses — the chain is falling back (usually free-tier 429s). Reorder <span className="font-mono">GEMINI_MODEL</span> to put a quota-healthy model first to cut latency.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Prune analytics panel ─────────────────────────────────────────────────────

type PruneResult = {
  blog_views_removed: number;
  blog_claps_removed: number;
  blog_sessions_removed: number;
  page_visits_removed: number;
  total_removed: number;
  live_blogs: number;
  live_labs: number;
};

function PruneAnalyticsPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PruneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function handlePrune() {
    setRunning(true);
    setResult(null);
    setError(null);
    const token = localStorage.getItem("pumpkin_admin_token") ?? "";
    try {
      const res = await fetch(`${API_BASE_URL}/admin/prune-analytics`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PruneResult = await res.json();
      setResult(data);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  const nothingRemoved = result && result.total_removed === 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle mb-1">Refresh Metrics</h2>
          <p className="text-[11px] text-fg-muted leading-relaxed">
            Cross-checks live content against stored analytics and removes orphaned rows — views, claps, sessions, and page visits for any blog or lab entry that no longer exists.
          </p>
        </div>
        <button
          onClick={handlePrune}
          disabled={running}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg hover:border-fg-muted transition-colors disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={running ? "animate-spin" : ""}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
          {running ? "Checking…" : "Refresh Metrics"}
        </button>
      </div>

      {result && (
        <div className={`rounded-lg border px-3 py-2.5 ${
          nothingRemoved
            ? "bg-surface-raised border-border"
            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
        }`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
              nothingRemoved ? "text-fg-muted" : "text-amber-700 dark:text-amber-400"
            }`}>
              {nothingRemoved ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              )}
              {nothingRemoved ? "Already clean" : `${result.total_removed} orphaned row${result.total_removed !== 1 ? "s" : ""} removed`}
              {lastRun && <span className="font-normal opacity-60">· {lastRun}</span>}
            </span>
            <span className="text-[11px] text-fg-faint ml-auto">
              {result.live_blogs} blog{result.live_blogs !== 1 ? "s" : ""} · {result.live_labs} lab{result.live_labs !== 1 ? "s" : ""} retained
            </span>
          </div>
          {!nothingRemoved && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] tabular-nums text-fg-muted">
              {result.blog_views_removed > 0    && <span><span className="font-semibold text-fg">{result.blog_views_removed}</span> views</span>}
              {result.blog_claps_removed > 0    && <span><span className="font-semibold text-fg">{result.blog_claps_removed}</span> claps</span>}
              {result.blog_sessions_removed > 0 && <span><span className="font-semibold text-fg">{result.blog_sessions_removed}</span> sessions</span>}
              {result.page_visits_removed > 0   && <span><span className="font-semibold text-fg">{result.page_visits_removed}</span> page visits</span>}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}

// ── Reingest panel ─────────────────────────────────────────────────────────────

const REINGEST_SOURCES = [
  "Profile", "Experience", "Education", "Projects", "Apps",
  "Skills", "Testimonials", "Gallery", "Blog", "Lab", "Quotes", "FAQ",
];

type ReingestResult = { added: number; updated: number; unchanged: number; deleted: number; total: number };

function ReingestPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReingestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function handleReingest() {
    setRunning(true);
    setResult(null);
    setError(null);
    const token = localStorage.getItem("pumpkin_admin_token") ?? "";
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reingest?force=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const kick = await res.json();
      if (kick.status === "already_running") {
        setError("Already running — check back in a moment.");
        setRunning(false);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const iv = setInterval(async () => {
          try {
            const sr = await fetch(`${API_BASE_URL}/admin/reingest/status`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!sr.ok) { clearInterval(iv); reject(new Error(`HTTP ${sr.status}`)); return; }
            const s = await sr.json();
            if (!s.running) {
              clearInterval(iv);
              if (s.error) { reject(new Error(s.error)); return; }
              setResult(s.result ?? {});
              setLastRun(new Date().toLocaleTimeString());
              resolve();
            }
          } catch (err) { clearInterval(iv); reject(err); }
        }, 2000);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error — check ADMIN_PASSWORD_HASH & backend logs");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle mb-1">Pumpkin Knowledge Base</h2>
          <p className="text-[11px] text-fg-muted leading-relaxed">
            Re-reads every content source and rebuilds the RAG vector index from scratch. Run this after any content change to make Pumpkin aware of it immediately.
          </p>
        </div>
        <button
          onClick={handleReingest}
          disabled={running}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-sm shadow-accent/20"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={running ? "animate-spin" : ""}>
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {running ? "Indexing…" : "Rebuild Index"}
        </button>
      </div>

      {/* Content source chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {REINGEST_SOURCES.map((src) => (
          <span key={src} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
            running
              ? "animate-pulse bg-accent/5 border-accent/20 text-accent"
              : result
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              : "bg-surface-raised border-border text-fg-muted"
          }`}>
            {result && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
            {src}
          </span>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Sync complete
            {lastRun && <span className="font-normal text-emerald-600/70 dark:text-emerald-500/70">· {lastRun}</span>}
          </span>
          <div className="ml-auto flex items-center gap-3 text-[11px] tabular-nums text-fg-muted">
            <span><span className="font-semibold text-fg">{result.added}</span> added</span>
            <span><span className="font-semibold text-fg">{result.updated}</span> updated</span>
            {result.deleted > 0 && <span><span className="font-semibold text-rose-600 dark:text-rose-400">{result.deleted}</span> removed</span>}
            <span><span className="font-semibold text-fg">{result.unchanged}</span> unchanged</span>
            <span className="border-l border-border pl-3"><span className="font-semibold text-fg">{result.total}</span> total in ChromaDB</span>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}

// ── Sync Status Panel ──────────────────────────────────────────────────────────

interface SyncStatus {
  content_db: { blogs: number; labs: number; quotes: number };
  json_files: Record<string, number>;
  chromadb: { total: number; by_type: Record<string, number> };
  last_ingest_ts: number | null;
  ingest_running: boolean;
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() / 1000) - ts);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function GoogleIntegrationsPanel() {
  const [authStatus, setAuthStatus] = useState<{ connected: boolean; has_gmail?: boolean; has_calendar?: boolean; has_drive?: boolean; error?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean; next_slots?: { date: string; start: string; end: string; tz: string }[]; error?: string } | null>(null);
  const [resumeStatus, setResumeStatus] = useState<{ synced: boolean; name?: string; word_count?: number; modified_time?: string; synced_at?: string; web_view_link?: string } | null>(null);
  const [draftDocs, setDraftDocs] = useState<{ id: string; name: string; modified_time: string }[]>([]);
  const [digestResult, setDigestResult] = useState<string>("");
  const [inboxResult, setInboxResult] = useState<{ total_threads?: number; summary_text?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string>("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function adminToken() { return typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : ""; }
  function authHeaders() { return { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` }; }

  async function loadStatus() {
    try {
      const [authRes, calRes, resumeRes, docsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/google-auth/status`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/admin/calendar/status`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/admin/drive/resume-status`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/admin/drive/draft-docs`, { headers: authHeaders() }),
      ]);
      if (authRes.ok) setAuthStatus(await authRes.json());
      if (calRes.ok) setCalendarStatus(await calRes.json());
      if (resumeRes.ok) setResumeStatus(await resumeRes.json());
      if (docsRes.ok) { const d = await docsRes.json(); setDraftDocs(d.docs ?? []); }
    } catch { /* non-fatal */ }
  }

  useEffect(() => { void loadStatus(); }, []);

  async function handleConnect() {
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/google-auth/init`, { headers: authHeaders() });
      if (res.ok) {
        const { auth_url } = await res.json() as { auth_url: string };
        window.open(auth_url, "_blank", "width=600,height=700");
        setResult({ ok: true, message: "Google sign-in opened in a new window. After authorizing, click Refresh Status." });
      }
    } catch { setResult({ ok: false, message: "Failed to start OAuth flow." }); }
    setAuthLoading(false);
  }

  async function handleRevoke() {
    if (!confirm("Disconnect Google account? All integrations will stop working.")) return;
    await fetch(`${API_BASE_URL}/admin/google-auth/revoke`, { method: "DELETE", headers: authHeaders() });
    setAuthStatus(null);
    setResult({ ok: true, message: "Google account disconnected." });
  }

  async function handleInboxDigest() {
    setActionLoading("inbox");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/gmail/digest`, { method: "POST", headers: authHeaders() });
      if (res.ok) {
        const d = await res.json() as { total_threads?: number; summary_text?: string };
        setInboxResult(d);
        setResult({ ok: true, message: `Inbox digest synced: ${d.total_threads ?? 0} recruiter threads found.` });
      } else setResult({ ok: false, message: `Error ${res.status}` });
    } catch (e: unknown) { setResult({ ok: false, message: (e as Error).message }); }
    setActionLoading("");
  }

  async function handleResumeSync() {
    setActionLoading("resume");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/drive/sync-resume`, { method: "POST", headers: authHeaders() });
      if (res.ok) {
        const d = await res.json() as { ok?: boolean; word_count?: number; name?: string; error?: string };
        if (d.ok) { setResult({ ok: true, message: `Resume synced: ${d.name} (${d.word_count} words)` }); void loadStatus(); }
        else setResult({ ok: false, message: d.error ?? "Sync failed" });
      } else setResult({ ok: false, message: `Error ${res.status}` });
    } catch (e: unknown) { setResult({ ok: false, message: (e as Error).message }); }
    setActionLoading("");
  }

  async function handleSendDigest() {
    setActionLoading("digest");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/digest/send`, { method: "POST", headers: authHeaders() });
      if (res.ok) setResult({ ok: true, message: "Weekly digest email sent!" });
      else setResult({ ok: false, message: `Error ${res.status}` });
    } catch (e: unknown) { setResult({ ok: false, message: (e as Error).message }); }
    setDigestResult("");
    setActionLoading("");
  }

  async function handlePreviewDigest() {
    setActionLoading("preview");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/digest/preview`, { headers: authHeaders() });
      if (res.ok) { const d = await res.json() as { html: string }; setDigestResult(d.html); }
      else setResult({ ok: false, message: `Error ${res.status}` });
    } catch (e: unknown) { setResult({ ok: false, message: (e as Error).message }); }
    setActionLoading("");
  }

  const connected = authStatus?.connected ?? false;
  const scopePill = (label: string, active: boolean) => (
    <span key={label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${active ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-surface-raised text-fg-faint"}`}>
      {label}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* OAuth Connection */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-fg">Google Account</h2>
            <p className="text-xs text-fg-faint mt-0.5">Connect once to enable Gmail, Calendar, and Drive features</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-fg-faint/40"}`} />
            <span className="text-[11px] text-fg-faint">{connected ? "Connected" : "Not connected"}</span>
          </div>
        </div>

        {connected && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {scopePill("Gmail", authStatus?.has_gmail ?? false)}
            {scopePill("Calendar", authStatus?.has_calendar ?? false)}
            {scopePill("Drive", authStatus?.has_drive ?? false)}
          </div>
        )}

        <div className="flex items-center gap-2">
          {connected ? (
            <button onClick={handleRevoke} className="text-xs text-rose-500 hover:text-rose-400 transition-colors">
              Disconnect account
            </button>
          ) : (
            <button onClick={handleConnect} disabled={authLoading} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
              {authLoading ? "Opening…" : "Connect Google Account"}
            </button>
          )}
          <button onClick={() => void loadStatus()} className="text-xs text-fg-faint hover:text-fg transition-colors">
            Refresh status
          </button>
        </div>

        {result && (
          <p className={`text-xs mt-3 ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            {result.ok ? "✓" : "✗"} {result.message}
          </p>
        )}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-fg mb-1">Calendar Availability</h2>
        <p className="text-xs text-fg-faint mb-4">Pumpkin will answer scheduling questions with your real free slots (2.5s timeout, graceful fallback)</p>
        {calendarStatus?.connected && calendarStatus.next_slots && calendarStatus.next_slots.length > 0 ? (
          <div className="space-y-1 mb-3">
            <p className="text-[11px] font-semibold text-fg-faint uppercase tracking-wider mb-2">Next open slots</p>
            {calendarStatus.next_slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-fg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                {s.date}: {s.start} – {s.end} {s.tz}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-fg-faint mb-3">{connected ? (calendarStatus?.connected ? "No upcoming free slots found" : "Calendar not connected") : "Connect Google account above"}</p>
        )}
      </div>

      {/* Gmail Inbox Signals */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-fg mb-1">Inbox Signals</h2>
        <p className="text-xs text-fg-faint mb-4">Parse the last 7 days of recruiter emails — Pumpkin will use this to answer &quot;What roles is Taruni considering?&quot; with live market data</p>
        {inboxResult && (
          <div className="mb-3 rounded-xl border border-border bg-bg p-3">
            <p className="text-[11px] font-semibold text-fg-faint mb-1">{inboxResult.total_threads ?? 0} recruiter threads found</p>
            {inboxResult.summary_text && <p className="text-[12px] text-fg">{inboxResult.summary_text}</p>}
          </div>
        )}
        <button
          onClick={handleInboxDigest}
          disabled={!connected || actionLoading === "inbox"}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-raised disabled:opacity-40 transition-colors"
        >
          {actionLoading === "inbox" ? "Syncing…" : "Sync inbox now"}
        </button>
      </div>

      {/* Drive Resume Sync */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-fg mb-1">Resume Sync</h2>
        <p className="text-xs text-fg-faint mb-4">Sync your latest resume PDF from Google Drive — Pumpkin will cite the Drive link with the correct modification date</p>
        {resumeStatus?.synced && (
          <div className="mb-3 rounded-xl border border-border bg-bg p-3 text-[12px] text-fg space-y-0.5">
            <p className="font-semibold">{resumeStatus.name}</p>
            <p className="text-fg-faint">{resumeStatus.word_count} words · modified {resumeStatus.modified_time?.slice(0, 10)} · synced {resumeStatus.synced_at?.slice(0, 10)}</p>
            {resumeStatus.web_view_link && (
              <a href={resumeStatus.web_view_link} target="_blank" rel="noreferrer" className="text-accent text-[11px] hover:underline">View on Drive →</a>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleResumeSync} disabled={!connected || actionLoading === "resume"}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-40 transition-colors">
            {actionLoading === "resume" ? "Syncing…" : "Sync resume from Drive"}
          </button>
          {draftDocs.length > 0 && (
            <div>
              <p className="text-[11px] text-fg-faint mb-1">Portfolio Drafts folder ({draftDocs.length} docs)</p>
              <div className="flex flex-wrap gap-1.5">
                {draftDocs.slice(0, 5).map((d) => (
                  <span key={d.id} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-fg-muted">{d.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Digest */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-fg mb-1">Weekly Digest Email</h2>
        <p className="text-xs text-fg-faint mb-4">Send yourself a portfolio analytics summary. Automated via GitHub Actions every Monday 9 AM ET.</p>
        <div className="flex items-center gap-3">
          <button onClick={handleSendDigest} disabled={!connected || actionLoading === "digest"}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-40 transition-colors">
            {actionLoading === "digest" ? "Sending…" : "Send digest now"}
          </button>
          <button onClick={handlePreviewDigest} disabled={actionLoading === "preview"}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-raised disabled:opacity-40 transition-colors">
            {actionLoading === "preview" ? "Loading…" : "Preview HTML"}
          </button>
        </div>
        {digestResult && (
          <div className="mt-4 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-surface-raised border-b border-border">
              <span className="text-[11px] font-semibold text-fg-faint uppercase tracking-wider">Digest Preview</span>
              <button onClick={() => setDigestResult("")} className="text-[11px] text-fg-faint hover:text-fg">×</button>
            </div>
            <iframe srcDoc={digestResult} className="w-full h-96 border-0" title="Digest preview" sandbox="allow-same-origin" />
          </div>
        )}
      </div>
    </div>
  );
}

function SyncStatusPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number; unchanged: number; deleted: number; total: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sync-status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pumpkin_admin_token") ?? ""}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLoadError(null);
      setStatus(await res.json());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load sync status");
    }
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reingest?force=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("pumpkin_admin_token") ?? ""}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const kick = await res.json();
      if (kick.status === "already_running") {
        setSyncError("Already running — check back in a moment.");
        setSyncing(false);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const iv = setInterval(async () => {
          try {
            const sr = await fetch(`${API_BASE_URL}/admin/reingest/status`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("pumpkin_admin_token") ?? ""}` },
            });
            if (!sr.ok) { clearInterval(iv); reject(new Error(`HTTP ${sr.status}`)); return; }
            const s = await sr.json();
            if (!s.running) {
              clearInterval(iv);
              if (s.error) { reject(new Error(s.error)); return; }
              setSyncResult(s.result ?? {});
              setLastSyncTime(new Date().toLocaleTimeString());
              resolve();
            }
          } catch (err) { clearInterval(iv); reject(err); }
        }, 2000);
      });
      await fetchStatus();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed — check backend logs");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { void fetchStatus(); }, [fetchStatus]); // eslint-disable-line react-hooks/set-state-in-effect

  const CONTENT_ROWS: { key: string; label: string; source: "db+json" | "json" }[] = [
    { key: "blog",         label: "Blog posts",    source: "db+json" },
    { key: "lab",          label: "Lab entries",   source: "db+json" },
    { key: "quotes",       label: "Quotes",        source: "db+json" },
    { key: "experience",   label: "Experience",    source: "json"    },
    { key: "education",    label: "Education",     source: "json"    },
    { key: "projects",     label: "Projects",      source: "json"    },
    { key: "apps",         label: "Hosted Apps",   source: "json"    },
    { key: "skills",       label: "Skills",        source: "json"    },
    { key: "testimonials", label: "Testimonials",  source: "json"    },
    { key: "gallery",      label: "Gallery",       source: "json"    },
  ];

  const chromaByType = status?.chromadb.by_type ?? {};
  const jsonFiles = status?.json_files ?? {};
  const contentDb = status?.content_db ?? { blogs: 0, labs: 0, quotes: 0 };

  function dbCount(key: string): number | null {
    if (key === "blog")   return contentDb.blogs;
    if (key === "lab")    return contentDb.labs;
    if (key === "quotes") return contentDb.quotes;
    return null;
  }

  function chromaCount(key: string): number {
    const map: Record<string, string> = {
      blog: "blog", lab: "lab", quotes: "quote",
      experience: "exp", education: "edu", projects: "proj", apps: "app",
      skills: "skills", testimonials: "testimonial", gallery: "gallery",
    };
    return chromaByType[map[key] ?? key] ?? 0;
  }

  function rowStatus(key: string, source: "db+json" | "json"): "ok" | "warn" | "unknown" {
    if (!status) return "unknown";
    const json = jsonFiles[key] ?? 0;
    if (source === "db+json") {
      const db = dbCount(key) ?? 0;
      return db === json ? "ok" : "warn";
    }
    return json > 0 ? "ok" : "warn";
  }

  const allOk = status !== null && CONTENT_ROWS.every((r) => rowStatus(r.key, r.source) === "ok");

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle mb-1">Content Sync Status</h2>
            <p className="text-[11px] text-fg-muted leading-relaxed max-w-xl">
              Shows what&apos;s in content.db, the knowledge JSON files, and Pumpkin&apos;s vector index. Use{" "}
              <span className="font-semibold">Full Sync</span> to propagate all admin changes to Pumpkin immediately.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setRefreshing(true); void fetchStatus().finally(() => setRefreshing(false)); }}
              disabled={refreshing || syncing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2 text-[11px] font-medium text-fg-muted hover:text-fg hover:border-border-strong transition-colors disabled:opacity-40"
              title="Refresh status"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
              </svg>
              Refresh
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || refreshing}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-sm shadow-accent/20"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={syncing ? "animate-spin" : ""}>
                <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {syncing ? "Syncing…" : "Full Sync"}
            </button>
          </div>
        </div>

        {loadError && (
          <p className="mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-400">{loadError}</p>
        )}

        {/* Per-type table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Content Type</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">DB</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">JSON</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-subtle hidden sm:table-cell">Pumpkin</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Status</th>
              </tr>
            </thead>
            <tbody>
              {CONTENT_ROWS.map((row, i) => {
                const db = dbCount(row.key);
                const json = jsonFiles[row.key] ?? 0;
                const chroma = chromaCount(row.key);
                const st = rowStatus(row.key, row.source);
                const isLast = i === CONTENT_ROWS.length - 1;
                return (
                  <tr key={row.key} className={`${isLast ? "" : "border-b border-border"} hover:bg-surface-raised/50 transition-colors`}>
                    <td className="px-3 py-2.5 font-medium text-fg-muted">{row.label}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {db !== null ? (
                        <span className="text-fg font-semibold">{db}</span>
                      ) : (
                        <span className="text-fg-faint text-[10px]">JSON only</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {status ? (
                        <span className={`font-semibold ${db !== null && db !== json ? "text-amber-600 dark:text-amber-400" : "text-fg"}`}>{json}</span>
                      ) : (
                        <span className="text-fg-faint animate-pulse">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums hidden sm:table-cell">
                      {status ? (
                        <span className="text-fg-muted">{chroma}</span>
                      ) : (
                        <span className="text-fg-faint animate-pulse">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {!status ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-fg-faint/30 animate-pulse" />
                      ) : st === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                          <span className="text-[10px] font-medium hidden sm:inline">Synced</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <span className="text-[10px] font-medium hidden sm:inline">Out of sync</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: ChromaDB total + last sync */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-4 text-[11px] text-fg-faint">
            <span>
              Pumpkin index:{" "}
              <span className="font-semibold text-fg-muted tabular-nums">{status?.chromadb.total ?? "—"}</span>{" "}
              total docs
            </span>
            {status?.last_ingest_ts && (
              <span>
                Last synced:{" "}
                <span className="font-semibold text-fg-muted">{timeAgo(status.last_ingest_ts)}</span>
              </span>
            )}
            {status?.ingest_running && (
              <span className="inline-flex items-center gap-1 text-accent animate-pulse">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Sync in progress
              </span>
            )}
          </div>
          {status && (
            <span className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[10px] font-semibold border ${
              allOk
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${allOk ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {allOk ? "All synced" : "Sync needed"}
            </span>
          )}
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            Full sync complete
            {lastSyncTime && <span className="font-normal text-emerald-600/70 dark:text-emerald-500/70">· {lastSyncTime}</span>}
          </span>
          <div className="ml-auto flex items-center gap-3 text-[11px] tabular-nums text-fg-muted">
            <span><span className="font-semibold text-fg">{syncResult.added}</span> added</span>
            <span><span className="font-semibold text-fg">{syncResult.updated}</span> updated</span>
            {syncResult.deleted > 0 && <span><span className="font-semibold text-rose-600 dark:text-rose-400">{syncResult.deleted}</span> removed</span>}
            <span><span className="font-semibold text-fg">{syncResult.unchanged}</span> unchanged</span>
            <span className="border-l border-border pl-3"><span className="font-semibold text-fg">{syncResult.total}</span> total in Pumpkin</span>
          </div>
        </div>
      )}

      {syncError && (
        <p className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-400">{syncError}</p>
      )}

      {/* What each column means */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">How sync works</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "DB (content.db)", color: "text-fg", desc: "Live SQLite database on the server. Blog, Lab, and Quotes entries you create/edit via admin live here first." },
            { label: "JSON (knowledge files)", color: "text-fg", desc: "Files baked into the backend. DB-managed content is regenerated here after each change. Profile, Experience, Education, etc. live only here and update on GitHub push." },
            { label: "Pumpkin (ChromaDB)", color: "text-accent", desc: "Vector index used by the AI chatbot. Full Sync re-reads all JSON files and re-embeds any changed document so Pumpkin answers with the latest content." },
          ].map((item) => (
            <div key={item.label} className="border border-border-subtle rounded p-3 space-y-1">
              <p className={`text-[11px] font-semibold ${item.color}`}>{item.label}</p>
              <p className="text-[10px] text-fg-faint leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-fg-faint leading-relaxed">
          <span className="font-semibold text-amber-600 dark:text-amber-400">Out of sync</span> means the DB row count differs from the JSON file count — usually because a content change is still in flight. Full Sync resolves it instantly.
          Changes to Profile, Experience, Education, Projects, Skills, Testimonials, and Gallery made via admin go to GitHub first, rebuild the Docker image, and are visible here after the next deployment (~2–3 min).
        </p>
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000; // 5 minutes

function getAttemptState(): { count: number; until: number } {
  try {
    return JSON.parse(sessionStorage.getItem("pumpkin_admin_attempts") ?? "{}");
  } catch { return { count: 0, until: 0 }; }
}

function recordFailedAttempt() {
  const s = getAttemptState();
  const count = (s.count ?? 0) + 1;
  const until = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : (s.until ?? 0);
  sessionStorage.setItem("pumpkin_admin_attempts", JSON.stringify({ count, until }));
}

function clearAttempts() {
  sessionStorage.removeItem("pumpkin_admin_attempts");
}

function LoginForm({ onAuth }: { onAuth: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const { count, until } = getAttemptState();
    if (count >= MAX_ATTEMPTS && until > Date.now()) {
      setLockedUntil(until);
    }
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) { setLockedUntil(0); clearAttempts(); clearInterval(tick); }
      else setRemaining(left);
    }, 1000);
    setRemaining(Math.ceil((lockedUntil - Date.now()) / 1000));
    return () => clearInterval(tick);
  }, [lockedUntil]);

  const isLocked = lockedUntil > Date.now();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/stats/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { clearAttempts(); onAuth(token); }
      else {
        recordFailedAttempt();
        const { count, until } = getAttemptState();
        if (count >= MAX_ATTEMPTS) {
          setLockedUntil(until);
          setError(`Too many failed attempts. Locked for 5 minutes.`);
        } else {
          setError(`Invalid token. ${MAX_ATTEMPTS - count} attempt${MAX_ATTEMPTS - count === 1 ? "" : "s"} remaining.`);
        }
      }
    } catch {
      setError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg px-4 overflow-hidden">
      {/* Subtle dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(circle, var(--color-border, #3f3f46) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      {/* Soft radial glow behind the card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-7">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-white font-bold text-lg leading-none select-none">A</span>
          </div>
          <div className="text-center">
            <h1 className="text-base font-bold text-fg tracking-tight">Pumpkin Admin</h1>
            <p className="text-[11px] text-fg-faint mt-0.5">taruni-portfolio.vercel.app dashboard</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-surface p-6 space-y-4 shadow-xl shadow-black/10"
        >
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              Admin password
            </label>
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter admin password…"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-mono pr-16"
                autoFocus
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setVisible(!visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-fg-faint hover:text-fg-muted transition-colors"
              >
                {visible ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-3 py-2.5 flex items-start gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-xs text-rose-700 dark:text-rose-400 leading-snug">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!token || loading || isLocked}
            className="w-full rounded bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isLocked ? (
              `Locked — ${remaining}s`
            ) : loading ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Verifying…
              </>
            ) : (
              <>
                Sign in
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg-muted transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Site Guide ────────────────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    heading: "New post frontmatter",
    code: `---\ntitle: Your Title\ndate: "2026-04-21"\npublishedAt: "2026-04-21"\ndescription: One-line summary shown on index.\ntags: [tag1, tag2]\n---`,
    note: "publishedAt = immutable publish date used for sort order. date = display date (update freely). Filename becomes the URL slug: my-post.mdx → /blog/my-post",
  },
  {
    heading: "Headings",
    code: `## Section      ← large, border below\n### Sub-section ← medium, no border\n#### Label      ← uppercase small caps`,
  },
  {
    heading: "Text formatting",
    code: "**bold**        *italic*\n`inline code`   ~~strikethrough~~\n\n> blockquote pull quote\n\n<Divider />   ← decorative section break",
  },
  {
    heading: "Links & lists",
    code: `[link text](https://example.com)\n[internal](/blog/my-post)\n\n- bullet item\n- another item\n  - nested item\n\n1. numbered item\n2. second item`,
  },
  {
    heading: "Images",
    code: `<!-- basic -->\n![alt text](/blog/file.jpg)\n\n<!-- with caption -->\n![alt text](/blog/file.jpg "Caption text")\n\n<!-- component -->\n<BlogImage\n  src="/blog/file.jpg"\n  alt="description"\n  caption="optional caption"\n/>`,
    note: "Put image files in frontend/public/blog/",
  },
  {
    heading: "Callout boxes",
    code: `<Callout type="info" title="Title">text</Callout>\n<Callout type="tip" title="Title">text</Callout>\n<Callout type="warning" title="Title">text</Callout>\n<Callout type="quote" title="Title">text</Callout>`,
    note: "All MDX components (Callout, BlogImage, Divider) are auto-imported — no import statement needed.",
  },
  {
    heading: "Code blocks (Shiki — syntax highlighted)",
    code: "```python\n# basic — language only\ndef hello(): return 'hi'\n```\n\n```python title=\"main.py\"\n# with filename tab\ndef hello(): return 'hi'\n```\n\n```python {2,4-5}\n# line highlighting — {lines} after language\ndef process():\n    result = compute()  # ← highlighted\n    log(result)\n    return result        # ← highlighted\n    # and 5 too         # ← highlighted\n```\n\n```python /return/\n# word/token highlighting — /pattern/ after language\ndef hello(): return 'hi'\ndef world(): return 'world'\n```",
    note: "Copy button appears on hover. title=\"file.py\" adds a filename tab. {1,3-5} highlights specific lines (indigo accent). /word/ highlights every occurrence of that token. 200+ languages: python typescript javascript bash json yaml sql go rust + more.",
  },
  {
    heading: "Table",
    code: `| Col A | Col B |\n|---|---|\n| val   | val   |`,
  },
];

function SiteGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-raised transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-subtle">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Site Guide &amp; Maintenance</h2>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-fg-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-6 space-y-8">

          {/* MDX Syntax Reference */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-4">MDX Syntax Reference</p>
            <div className="space-y-5">
              {GUIDE_SECTIONS.map((s) => (
                <div key={s.heading}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1.5">{s.heading}</p>
                  {s.note && <p className="text-[11px] text-fg-faint mb-1.5 italic">{s.note}</p>}
                  <pre className="bg-zinc-950 text-zinc-300 text-[11px] leading-relaxed rounded p-3.5 overflow-x-auto font-mono whitespace-pre-wrap break-words">
                    {s.code}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Quick card */}
          <div className="rounded-xl border border-border bg-surface-raised p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg-faint mb-3">Quick card</p>
            <div className="space-y-1.5 font-mono text-[10px] text-fg-muted">
              {[
                ["Image",     "![alt](/blog/f.jpg)"],
                ["Caption",   '![alt](/blog/f.jpg "cap")'],
                ["Link",      "[text](https://url)"],
                ["Bold",      "**text**"],
                ["Italic",    "*text*"],
                ["Code",      "`code`"],
                ["Strike",    "~~text~~"],
                ["Quote",     "> text"],
                ["Bullet",    "- item"],
                ["Numbered",  "1. item"],
                ["Divider",   "<Divider />"],
                ["Info box",  '<Callout type="info">'],
                ["Tip box",   '<Callout type="tip">'],
                ["Warn box",  '<Callout type="warning">'],
                ["Quote box", '<Callout type="quote">'],
              ].map(([label, syntax]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-fg-faint w-20 shrink-0">{label}</span>
                  <span className="text-fg-muted">{syntax}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Appendix */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-fg-faint mb-0.5">Appendix</p>
              <h3 className="text-sm font-bold text-fg">Project Maintenance</h3>
              <p className="text-[10px] text-fg-faint mt-1 leading-relaxed">Everything you need to keep the site up to date — data, blog posts, and deployments.</p>
            </div>

            {/* 1 · Portfolio Data */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">1 · Portfolio Data</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">
                Edit only in <span className="font-mono bg-surface-raised px-1 rounded">backend/data/knowledge/</span> — these are the single source of truth for both the website UI and the Pumpkin chatbot knowledge base.
                After any edit, run <span className="font-mono bg-surface-raised px-1 rounded">npm run sync</span> from <span className="font-mono bg-surface-raised px-1 rounded">frontend/</span> (or just restart <span className="font-mono bg-surface-raised px-1 rounded">npm run dev</span>).
                Never edit <span className="font-mono bg-surface-raised px-1 rounded">frontend/src/data/knowledge/</span> directly — those files are auto-overwritten.
              </p>
              {[
                { what: "Name, bio, tagline, location, contact",             file: "backend/data/knowledge/profile.json",      fields: "name, tagline, bio, summary, obsession, previous, prev_domain, interested_domain, location, email, phone, github, linkedin, resume" },
                { what: "Work experience — roles, companies, bullet points", file: "backend/data/knowledge/experience.json",    fields: "role, company, location, start, end, description, bullets[]" },
                { what: "Education — degrees, institutions, highlights",     file: "backend/data/knowledge/education.json",    fields: "institution, school, degree, field, location, start, end, gpa, highlights[]" },
                { what: "Projects — title, description, tags, links",        file: "backend/data/knowledge/projects.json",     fields: "title, description, tags[], featured, award, sourceLinks[{label,url}], note" },
                { what: "Skills & tools — categories and items",             file: "backend/data/knowledge/skills.json",       fields: "category, items[]" },
                { what: "Testimonials — name, role, company, quote",         file: "backend/data/knowledge/testimonials.json", fields: "name, designation, company, linkedin, description, givenAt, source" },
              ].map(({ what, file, fields }) => (
                <div key={file} className="border border-border-subtle rounded p-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="font-mono text-[10px] text-accent break-all">{file}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{fields}</p>
                </div>
              ))}
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded p-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Resume link is hardcoded in Nav.tsx
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed">
                  The resume Google Drive URL in <span className="font-mono">profile.json</span> powers the chatbot and home page, but <span className="font-mono">components/Nav.tsx</span> has a separate hardcoded copy in both desktop and mobile nav. Update both when the resume changes.
                </p>
              </div>
            </div>

            {/* 2 · Blog Posts */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">2 · Blog Posts</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">
                Create a new <span className="font-mono bg-surface-raised px-1 rounded">.mdx</span> file — the filename becomes the URL slug.
                No sync needed; GitHub Actions auto-generates <span className="font-mono bg-surface-raised px-1 rounded">blog.json</span> on push so the chatbot indexes the new post automatically.
              </p>
              {[
                { what: "New post file",                   file: "frontend/src/content/blog/my-post.mdx",       fields: "Filename → URL slug. Required frontmatter: title, date, publishedAt, description, tags[]" },
                { what: "Post images",                     file: "frontend/public/blog/",                       fields: "Place image files here. Reference as /blog/filename.jpg in MDX." },
                { what: "Auto-generated chatbot index",    file: "backend/data/knowledge/blog.json",            fields: "Do not edit — auto-generated by scripts/sync-knowledge.mjs. GH Actions commits it on push; Railway re-ingests on deploy." },
              ].map(({ what, file, fields }) => (
                <div key={file} className="border border-border-subtle rounded p-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="font-mono text-[10px] text-accent break-all">{file}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{fields}</p>
                </div>
              ))}
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded p-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">publishedAt vs date</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed">
                  <span className="font-mono">publishedAt</span> is the sort key — set it once and never change it.{" "}
                  <span className="font-mono">date</span> is the display date — update freely (e.g. after a major revision).
                </p>
              </div>
            </div>

            {/* 2b · Lab */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">2b · Lab — Living System Docs</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">
                Lab is for living, in-progress project documentation — architecture, decisions, and progress logs updated as the project evolves. Files live at <span className="font-mono bg-surface-raised px-1 rounded">frontend/src/content/lab/[slug].mdx</span>. Filename = URL slug.
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-subtle mt-2">Frontmatter (required)</p>
              <pre className="bg-zinc-950 text-zinc-300 text-[11px] leading-relaxed rounded p-3.5 overflow-x-auto font-mono whitespace-pre-wrap break-words">{`---\ntitle: "My Project"\nstatus: "active"        # active | paused | shipped\ndescription: "One-line summary shown on lab index card."\nstartedAt: "2026-01-01"\nupdatedAt: "2026-04-22"  # ← update this every time you edit\ntech: [Next.js, FastAPI, PostgreSQL]\n---`}</pre>
              {[
                { what: "status: active",  detail: "Green badge with pulse animation. Sorted to top of lab index. Use while actively building." },
                { what: "status: paused",  detail: "Amber badge. Sorted second. Use when work is on hold." },
                { what: "status: shipped", detail: "Indigo badge. Sorted last. Use when the project is complete and deployed." },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded p-2.5 space-y-0.5">
                  <p className="font-mono text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded p-2.5">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Always update updatedAt</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed mt-0.5">The lab index card shows &quot;last updated [date]&quot;. Set it to today&apos;s date every time you make changes or the card will show a stale date.</p>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-subtle mt-3">Lab MDX components</p>
              {[
                { what: '<Status status="active" />',                           detail: "Inline status badge — same colors as the index card. Put it near the top of the document." },
                { what: '<Stack items={["Next.js", "Python"]} />',              detail: "Renders a row of monospace tech tags. For a full tech stack listing inside the document body." },
                { what: '<Metric value="99%" label="uptime" />',                detail: "Highlighted stat box. Use for key numbers — latency, users, accuracy, uptime." },
                { what: '<Decision date="2026-01-10" title="Why X over Y">…</Decision>', detail: "Timeline entry with indigo dot. Use for architectural decisions and technology choices." },
                { what: '<Update date="2026-04-22">…</Update>',                 detail: "Lighter timeline entry with zinc dot. Use for progress notes and milestone completions." },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded p-2.5 space-y-0.5">
                  <p className="font-mono text-[10px] font-semibold text-accent break-all">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-subtle mt-2">Architecture diagrams</p>
              <pre className="bg-zinc-950 text-zinc-300 text-[11px] leading-relaxed rounded p-3.5 overflow-x-auto font-mono whitespace-pre-wrap break-words">{`\`\`\`arch\n┌─────────────┐     ┌─────────────┐\n│  Frontend   │────▶│   Backend   │\n└─────────────┘     └─────────────┘\n\`\`\``}</pre>
              <p className="text-[10px] text-fg-faint italic leading-relaxed">
                Always use fenced <span className="font-mono bg-surface-raised px-1 rounded">```arch</span> blocks for diagrams — never a JSX component. Characters like <span className="font-mono bg-surface-raised px-1 rounded">&lt;</span>, <span className="font-mono bg-surface-raised px-1 rounded">&gt;</span>, and <span className="font-mono bg-surface-raised px-1 rounded">{"{}"}</span> inside JSX children cause an MDX acorn parse error.
              </p>
            </div>

            {/* 3 · Deploy Pipeline */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">3 · Deploy Pipeline (auto)</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">Everything is automated — just commit and push.</p>
              {[
                { what: "Update portfolio data",         detail: "Edit any backend/data/knowledge/*.json → commit + push → GH Actions runs sync-knowledge.mjs (copies all JSON to frontend/src/data/knowledge/) → Railway redeploys → chatbot re-indexes (hash changed)." },
                { what: "Publish a new blog post",       detail: "Write MDX → commit + push → GH Actions runs sync-knowledge.mjs → generates blog.json + copies all JSON → auto-commits with [skip ci] → backend redeploys on Lightsail → chatbot indexes the new post." },
                { what: "What sync-knowledge.mjs does",  detail: "1) Reads all *.mdx from frontend/src/content/blog/, strips MDX, writes blog.json. 2) Copies ALL backend/data/knowledge/*.json → frontend/src/data/knowledge/. Run: node scripts/sync-knowledge.mjs from repo root." },
                { what: "GH Actions auto-commit",        detail: "Workflow (deploy.yml) needs contents: write, pages: write, id-token: write permissions. Auto-commits synced files with [skip ci] tag to prevent infinite loops." },
                { what: "Chatbot re-ingest (hash-based)", detail: "Backend computes SHA-256 of all knowledge JSON files at startup. Re-ingests only when the hash changes — fast startup if nothing changed. Hash stored at chroma_db/.ingest_hash." },
                { what: "Static site deployment",        detail: "Frontend builds as a static export and deploys to Vercel. Backend deploys to a Lightsail Docker host. Both trigger on push to main." },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded p-2.5 space-y-0.5">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* 4 · Blog Engagement */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">4 · Blog Engagement</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">Tracked automatically. No config needed for new posts — engagement starts recording as soon as a reader opens the post.</p>
              {[
                { what: "Views — unique per visitor per post",   detail: "Auto-recorded when a reader opens a post. One view per IP address. Shown on the post page and blog index." },
                { what: "Claps — up to 50 per visitor per post", detail: "Reader clicks the clap icon button. Clicks batch with a 1.5s debounce before saving. Total shown on index card and post page." },
                { what: "Storage — SQLite analytics.db",         detail: "Stored in chroma_db/analytics.db. IPs are SHA-256 hashed — never stored raw. On Railway: set ANALYTICS_DB_PATH=/data/analytics.db with a persistent volume so counts survive redeploys." },
                { what: "Persistence on Railway",                detail: "Without a volume, counts reset on every deploy. Add a Volume (Pro plan) mounted at /data and set ANALYTICS_DB_PATH=/data/analytics.db in backend environment variables." },
                { what: "API endpoints",                         detail: "POST /blog/{slug}/view · POST /blog/{slug}/clap (body: {count}) · GET /blog/{slug}/stats · GET /blog/stats/summary" },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded p-2.5 space-y-0.5">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* 5 · Pumpkin Chatbot */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">5 · Pumpkin Chatbot</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              {[
                { what: "Response count & unique visitors", detail: "Tracked on every chat response. Shown in chatbot footer. Stored in the same analytics.db — subject to same Railway persistence note above." },
                { what: "Model indicator badge",            detail: "Green pill shows which Gemini model answered (e.g. gemini-2.5-flash). Updates automatically if a fallback was used." },
                { what: "Swap the AI model",               detail: "Change GEMINI_MODEL in Railway environment variables. No code change needed." },
                { what: "Model fallback chain",             detail: "Primary: gemini-2.5-flash (250 RPD). Fallbacks: gemini-3.5-flash → gemini-3-flash → gemini-2.5-flash-lite → gemini-3.1-flash-lite. ~2,750 req/day total. Auto-retries on 429/503/404 in order." },
                { what: "Knowledge base — ChromaDB",        detail: "ChromaDB persists to backend/chroma_db/ (git-ignored). On Railway: mount a persistent volume at /data and symlink or set the chroma path. Without a volume, the DB rebuilds on every deploy (works, just slower startup ~30–60s)." },
                { what: "RAG pipeline",                     detail: "Hybrid: ChromaDB dense (all-MiniLM-L6-v2 embeddings) + BM25 lexical → RRF merge → cross-encoder rerank (ms-marco-MiniLM-L-6-v2). Retrieves top 5 chunks → fed as context to Gemini." },
                { what: "Startup warmup",                   detail: "Embedding model and cross-encoder load at startup. First response may be ~1–2s slower. Models download once and cache in Railway's ephemeral storage." },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded p-2.5 space-y-0.5">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* 6 · Environment Variables */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">6 · Environment Variables</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint mb-1">Backend vars → Railway → your backend service → Variables. Frontend vars → GitHub Actions secrets (used at build time).</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-subtle mt-2 mb-1">Backend (Railway)</p>
              {[
                { key: "GOOGLE_API_KEY",            detail: "Required. Google AI API key for Gemini. Chat endpoints return 503 without this." },
                { key: "GEMINI_MODEL",              detail: "Primary model. Default: gemini-2.5-flash. Change here to swap models without code changes." },
                { key: "GEMINI_FALLBACK_MODELS",    detail: "Comma-separated fallbacks tried on 503/429/404. Chain: gemini-3.5-flash (250 RPD) → gemini-3-flash (250 RPD) → gemini-2.5-flash-lite (1K RPD) → gemini-3.1-flash-lite (1K RPD). Total ~2,750 req/day." },
                { key: "ANALYTICS_DB_PATH",         detail: "SQLite file path. Set to /data/analytics.db with a Railway persistent volume, otherwise counts reset on every deploy." },
                { key: "FRONTEND_ORIGIN",           detail: "CORS allowed origins (comma-separated). Must include production frontend URL or browser requests will be blocked." },
                { key: "APP_ENV",                   detail: "dev or prod. Default: dev. Controls logging and debug behavior." },
                { key: "ADMIN_PASSWORD_HASH",       detail: "Hash of your admin password (never the plaintext). Generate with: python scripts/hash_admin_password.py. Required to access this dashboard." },
              ].map(({ key, detail }) => (
                <div key={key} className="border border-border-subtle rounded p-2.5 space-y-0.5">
                  <p className="font-mono text-[11px] font-semibold text-accent">{key}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-subtle mt-3 mb-1">Frontend (GitHub Actions secrets / .env.local)</p>
              {[
                { key: "NEXT_PUBLIC_API_BASE_URL", detail: "Backend URL the browser calls. Set to your Railway backend URL in production. Required — chat and blog stats break without it." },
                { key: "NEXT_PUBLIC_BLOG_FONT",    detail: "Blog reading font. Default: Source_Serif_4. Must match the font statically imported in frontend/src/app/layout.tsx." },
              ].map(({ key, detail }) => (
                <div key={key} className="border border-border-subtle rounded p-2.5 space-y-0.5">
                  <p className="font-mono text-[11px] font-semibold text-accent">{key}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Blog Editor ───────────────────────────────────────────────────────────────

function inlineFmt(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/!\[([^\]]*)\]\(([^)"]+?)(?:\s+"([^"]+)")?\)/g, (_, alt, src, cap) =>
      `<img src="${src}" alt="${alt}" style="max-width:100%;vertical-align:middle;border-radius:8px;display:inline-block" />${cap ? ` <em style="font-size:0.82em;color:#71717a">${cap}</em>` : ""}`
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code style="background:#27272a;color:#e879f9;padding:0.1em 0.35em;border-radius:4px;font-size:0.85em">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#818cf8;text-decoration:underline">$1</a>');
}

function mdxToHTML(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        i++;
      }
      const lang = line.slice(3).trim().split(/[\s{]/)[0] || "plaintext";
      html += `<pre style="background:#f6f8fa;color:#24292e;padding:1em 1.2em;border-radius:0.75rem;overflow-x:auto;font-size:0.82em;line-height:1.6;border:1px solid #e1e4e8;margin:1em 0"><div style="font-size:9px;color:#57606a;margin-bottom:0.5em;font-family:monospace">[Shiki highlights on publish — ${lang} block]</div>${codeLines.join("\n")}</pre>`;
      i++; continue;
    }
    if (line.startsWith("#### ")) { html += `<h4 style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;margin:1.4em 0 0.3em">${inlineFmt(line.slice(5))}</h4>`; i++; continue; }
    if (line.startsWith("### "))  { html += `<h3 style="font-size:1.05rem;font-weight:700;margin:1.5em 0 0.4em">${inlineFmt(line.slice(4))}</h3>`; i++; continue; }
    if (line.startsWith("## "))   { html += `<h2 style="font-size:1.3rem;font-weight:700;margin:2em 0 0.5em;padding-bottom:0.3em;border-bottom:1px solid #3f3f46">${inlineFmt(line.slice(3))}</h2>`; i++; continue; }
    if (line.startsWith("# "))    { html += `<h1 style="font-size:1.75rem;font-weight:800;margin:0 0 0.5em">${inlineFmt(line.slice(2))}</h1>`; i++; continue; }
    if (line.startsWith("> "))    { html += `<blockquote style="border-left:3px solid #4f46e5;padding:0.5em 1em;margin:1em 0;background:#eef2ff;border-radius:0 0.5rem 0.5rem 0;font-style:italic"><p style="margin:0">${inlineFmt(line.slice(2))}</p></blockquote>`; i++; continue; }
    if (line === "---" || line.trim() === "<Divider />") { html += `<hr style="border:none;border-top:1px solid #3f3f46;margin:2em 0" />`; i++; continue; }
    if (/^[-*] /.test(line)) {
      let items = "";
      while (i < lines.length && /^[-*] /.test(lines[i])) { items += `<li style="margin-bottom:0.35em">${inlineFmt(lines[i].slice(2))}</li>`; i++; }
      html += `<ul style="padding-left:1.4em;margin:0.8em 0;list-style-type:disc">${items}</ul>`; continue;
    }
    if (/^\d+\. /.test(line)) {
      let items = "";
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items += `<li style="margin-bottom:0.35em">${inlineFmt(lines[i].replace(/^\d+\. /, ""))}</li>`; i++; }
      html += `<ol style="padding-left:1.4em;margin:0.8em 0;list-style-type:decimal">${items}</ol>`; continue;
    }
    if (line.trim() === "") { html += `<div style="height:0.6em"></div>`; i++; continue; }
    // BlogImage component — handles both single-line and multi-line
    if (line.trim().startsWith("<BlogImage")) {
      let fullTag = line;
      while (!fullTag.includes("/>") && i < lines.length - 1) { i++; fullTag += " " + lines[i]; }
      const srcM = fullTag.match(/src="([^"]+)"/);
      const altM = fullTag.match(/alt="([^"]*)"/);
      const capM = fullTag.match(/caption="([^"]*)"/);
      const iSrc = srcM?.[1] ?? ""; const iAlt = altM?.[1] ?? ""; const iCap = capM?.[1];
      html += `<figure style="margin:1.5em 0;text-align:center"><div style="display:inline-block;max-width:100%;border-radius:1rem;border:1px solid #3f3f46;overflow:hidden;background:#18181b;padding:0.75rem"><img src="${iSrc}" alt="${iAlt}" style="max-width:100%;height:auto;display:block;border-radius:0.5rem" /></div>${iCap ? `<figcaption style="margin-top:0.5em;font-size:0.82rem;color:#71717a;font-style:italic">${iCap}</figcaption>` : ""}</figure>`;
      i++; continue;
    }
    // Standalone image line: ![alt](url) or ![alt](url "caption")
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)"]+?)(?:\s+"([^"]+)")?\)$/);
    if (imgMatch) {
      const [, iAlt, iSrc, iCap] = imgMatch;
      html += `<figure style="margin:1.5em 0;text-align:center"><div style="display:inline-block;max-width:100%;border-radius:1rem;border:1px solid #3f3f46;overflow:hidden;background:#18181b;padding:0.75rem"><img src="${iSrc}" alt="${iAlt}" style="max-width:100%;height:auto;display:block;border-radius:0.5rem" /></div>${iCap ? `<figcaption style="margin-top:0.5em;font-size:0.82rem;color:#71717a;font-style:italic">${iCap}</figcaption>` : ""}</figure>`;
      i++; continue;
    }
    if (/^<\w/.test(line.trim()) && line.trim().endsWith("/>")) {
      html += `<code style="display:inline-block;background:#1e1b4b;color:#818cf8;padding:0.2em 0.5em;border-radius:4px;font-size:0.8em;margin:0.4em 0">${line.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code><br />`;
      i++; continue;
    }
    html += `<p style="margin:0 0 0.8em;line-height:1.75;color:#71717a">${inlineFmt(line)}</p>`;
    i++;
  }
  return html;
}

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  if (!raw.startsWith("---")) return { meta: {}, content: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, content: raw };
  const fm = raw.slice(4, end);
  const body = raw.slice(end + 4).trimStart();
  const meta: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    meta[key] = val;
  }
  return { meta, content: body };
}

// ── Format guide data ─────────────────────────────────────────────────────────

const FORMAT_GUIDE: { heading: string; items: { label: string; syntax: string; note?: string }[] }[] = [
  {
    heading: "Headings",
    items: [
      { label: "Section (H2)",        syntax: "## My Section",              note: "Large, underlined with border. Use for major sections." },
      { label: "Sub-section (H3)",    syntax: "### Sub-section",            note: "Medium weight. No border. Use inside an H2 section." },
      { label: "Label (H4)",          syntax: "#### Label",                 note: "Rendered uppercase small-caps in muted color. Use for field labels." },
    ],
  },
  {
    heading: "Text Formatting",
    items: [
      { label: "Bold",         syntax: "**bold text**" },
      { label: "Italic",       syntax: "*italic text*" },
      { label: "Strikethrough",syntax: "~~crossed out~~" },
      { label: "Inline code",  syntax: "`code snippet`",  note: "Renders with pink monospace styling." },
      { label: "Link",         syntax: "[link text](https://url.com)" },
      { label: "Internal link",syntax: "[anchor text](/blog/slug)",  note: "No domain needed for same-site links." },
    ],
  },
  {
    heading: "Lists",
    items: [
      { label: "Bullet list",  syntax: "- First item\n- Second item\n  - Nested item",  note: "Indent 2 spaces to nest." },
      { label: "Numbered list",syntax: "1. First\n2. Second\n3. Third",                 note: "Numbers auto-increment — you can use 1. 1. 1. too." },
    ],
  },
  {
    heading: "Blockquote",
    items: [
      { label: "Quote",        syntax: "> This is a pull quote or highlighted note.",  note: "Renders with indigo left border and background." },
    ],
  },
  {
    heading: "Code Blocks (Shiki — syntax highlighted)",
    items: [
      { label: "Python",      syntax: "```python\ndef hello():\n    return 'hi'\n```" },
      { label: "TypeScript",  syntax: "```typescript\nconst greet = (name: string) => `Hi ${name}`\n```" },
      { label: "JavaScript",  syntax: "```javascript\nconst x = 42\n```" },
      { label: "Bash / Shell",syntax: "```bash\nnpm install && npm run dev\n```" },
      { label: "JSON",        syntax: "```json\n{ \"key\": \"value\" }\n```" },
      { label: "SQL",         syntax: "```sql\nSELECT * FROM users WHERE id = 1;\n```" },
      { label: "YAML",        syntax: "```yaml\nname: Taruni\nrole: engineer\n```" },
      { label: "Go",          syntax: "```go\nfunc main() { fmt.Println(\"hi\") }\n```" },
      { label: "Rust",        syntax: "```rust\nfn main() { println!(\"hi\"); }\n```" },
      { label: "No language", syntax: "```\nPlain text / pseudocode block\n```",
        note: "Falls back to 'plaintext' — still renders with copy button and correct block style." },
      { label: "File title tab", syntax: "```python title=\"rag_pipeline.py\"\ndef query(q: str) -> str:\n    return chain.invoke(q)\n```",
        note: "Adds a filename tab above the block. Works with any language." },
      { label: "Line highlighting", syntax: "```python {2,4-6}\ndef process():\n    result = compute()   # ← line 2 highlighted\n    validate(result)\n    cache(result)        # ← lines 4-6 highlighted\n    log(result)\n    return result\n```",
        note: "Use {n} for a single line, {n,m} for multiple lines, {n-m} for a range. Renders with indigo left border accent." },
      { label: "Word / token highlight", syntax: "```python /return/\ndef hello(): return 'hi'\ndef world(): return 'world'\n```",
        note: "Wrap the target token in /slashes/ right after the language identifier. Every occurrence in the block gets highlighted. Use different patterns with /a/ /b/ for multi-colour." },
      { label: "Title + line highlight", syntax: "```typescript title=\"server.ts\" {3}\nimport express from 'express'\nconst app = express()\napp.listen(3000)   // ← highlighted\n```",
        note: "title= and {lines} can be combined freely on the same opening fence." },
    ],
  },
  {
    heading: "Table",
    items: [
      { label: "Basic table", syntax: "| Column A | Column B | Column C |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |",
        note: "Pipe-separated. Header row required. Align separators don't need to be equal width." },
      { label: "Right-align col", syntax: "| Name   | Score |\n|--------|------:|\n| Alice  |    98 |\n| Bob    |    87 |",
        note: "Append : to the right of the separator line to right-align that column." },
    ],
  },
  {
    heading: "Divider",
    items: [
      { label: "Section break",  syntax: "<Divider />",  note: "Renders a decorative horizontal rule with spacing. Prefer this over --- inside MDX." },
    ],
  },
  {
    heading: "Callout Boxes",
    items: [
      { label: "Info",    syntax: '<Callout type="info" title="Good to know">\nYour informational note here.\n</Callout>',
        note: "Blue. Use for helpful context or background info." },
      { label: "Tip",     syntax: '<Callout type="tip" title="Pro tip">\nA shortcut or best practice.\n</Callout>',
        note: "Green. Use for actionable advice." },
      { label: "Warning", syntax: '<Callout type="warning" title="Watch out">\nSomething important not to miss.\n</Callout>',
        note: "Amber. Use for gotchas, caveats, or breaking changes." },
      { label: "Quote",   syntax: '<Callout type="quote" title="Quote">\nA memorable quote or key takeaway.\n</Callout>',
        note: "Indigo. Use for pull-quotes or highlighted conclusions." },
    ],
  },
  {
    heading: "Images",
    items: [
      { label: "Basic",             syntax: "![Alt text](/blog/filename.jpg)",
        note: "Put images in frontend/public/blog/ — reference with /blog/ prefix." },
      { label: "With caption",      syntax: '![Alt text](/blog/filename.jpg "Caption shown below")',
        note: "Title attribute becomes the caption text rendered below the image." },
      { label: "BlogImage (full control)", syntax: '<BlogImage\n  src="/blog/filename.jpg"\n  alt="Descriptive alt text"\n  caption="Optional caption text"\n/>',
        note: "Use when you need precise alt + caption. Renders with rounded border and subtle shadow." },
      { label: "Placement — after heading",  syntax: "## Section Title\n\n![Alt](/blog/img.jpg)\n\nFirst paragraph…",
        note: "Images placed right after a heading get extra top margin automatically." },
      { label: "Placement — between paragraphs", syntax: "First paragraph text.\n\n![Alt](/blog/img.jpg)\n\nSecond paragraph continues here.",
        note: "Always separate images from paragraphs with blank lines." },
    ],
  },
  {
    heading: "MDX Gotchas",
    items: [
      { label: "Curly braces in text",  syntax: "Use &#123; and &#125; instead of { }",
        note: "Raw { } inside paragraph text will cause MDX parse errors — use HTML entities." },
      { label: "Angle brackets in text",syntax: "Use &lt; and &gt; instead of < >",
        note: "In body text (not code blocks), < > are treated as JSX and may fail to parse." },
      { label: "Arch diagrams",         syntax: "```arch\n┌──────────┐\n│ Frontend │\n└──────────┘\n```",
        note: "Always use ```arch fenced blocks for ASCII diagrams — never a JSX component." },
      { label: "JSX components — spacing", syntax: "<Callout type=\"info\">\nContent here.\n</Callout>",
        note: "Always put a blank line before and after JSX block components. Inline text next to them can break parsing." },
      { label: "Escaping in titles",   syntax: "title: \"It's a great post\"",
        note: "Use double-quoted YAML strings for titles containing apostrophes — no escaping needed." },
    ],
  },
];

// ── BlogEditor types + constants ───────────────────────────────────────────────

interface DraftEntry {
  id: string;
  title: string;
  slug: string;
  date: string;
  publishedAt: string;
  description: string;
  tags: string;
  ogImage: string;
  content: string;
  savedAt: string;
}

const DRAFTS_KEY = "pumpkin_blog_drafts";

const TAG_POOL = [
  "AI", "Machine Learning", "Python", "TypeScript", "System Design",
  "RAG", "FastAPI", "Next.js", "React", "Career", "Productivity",
  "Engineering", "Deep Learning", "NLP", "Databases", "LLM",
  "Embeddings", "Infrastructure", "Leadership", "Distributed Systems",
];

const POST_TEMPLATES = [
  {
    id: "technical", icon: "layers", label: "Technical Deep-Dive",
    desc: "Architecture, systems, engineering decisions",
    content: `## Introduction\n\nWhat problem does this solve and why does it matter?\n\n## The Problem\n\nDescribe the challenge. What were the constraints? What made it hard?\n\n## The Approach\n\nWalk through your thinking. What did you consider? What did you rule out and why?\n\n## Implementation\n\nThe actual solution — code snippets, diagrams, specifics.\n\n## Results\n\nMetrics, outcomes, what changed. Be concrete.\n\n## Key Takeaways\n\n- Insight 1\n- Insight 2\n- Insight 3`,
  },
  {
    id: "tutorial", icon: "book", label: "Tutorial / How-To",
    desc: "Step-by-step guide anyone can follow",
    content: `## What You'll Build\n\nOne sentence: what does the reader have at the end?\n\n## Prerequisites\n\n- Requirement 1\n- Requirement 2\n\n## Step 1: [First Step]\n\nInstructions for step 1.\n\n## Step 2: [Second Step]\n\nInstructions for step 2.\n\n## Step 3: [Third Step]\n\nInstructions for step 3.\n\n## Conclusion\n\nWhat the reader now has. What to explore next.`,
  },
  {
    id: "story", icon: "feather", label: "Story / Reflection",
    desc: "Experience, lessons learned, personal journey",
    content: `## Background\n\nSet the scene. Where were you? What were you working on?\n\n## What Happened\n\nThe story. Keep it honest and specific.\n\n## What I Learned\n\nThe real insights. What shifted in how you think?\n\n## What I'd Do Differently\n\nHonest reflection. What would you tell past-you?`,
  },
  {
    id: "quick", icon: "zap", label: "Quick Take",
    desc: "Short opinion or observation (200–400 words)",
    content: `Start writing here. A quick take is conversational — no strict structure needed.\n\n<Divider />\n\nClosing thought or question to the reader.`,
  },
];

// ── BlogEditor ─────────────────────────────────────────────────────────────────

function BlogEditor() {
  // Core content
  const [title, setTitle]               = useState("");
  const [slug, setSlug]                 = useState("");
  const [slugEdited, setSlugEdited]     = useState(false);
  const [date, setDate]                 = useState(todayISO);
  const [publishedAt, setPublishedAt]   = useState(todayISO);
  const [description, setDescription]   = useState("");
  const [tags, setTags]                 = useState<string[]>([]);
  const [tagInput, setTagInput]         = useState("");
  const [ogImage, setOgImage]           = useState("");
  const [content, setContent]           = useState("");

  // Draft management
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved]           = useState<Date | null>(null);
  const [drafts, setDrafts]                 = useState<DraftEntry[]>([]);
  const [showDraftMenu, setShowDraftMenu]   = useState(false);

  // Editor UI
  const [showTemplates, setShowTemplates]   = useState(true);
  const [activePanel, setActivePanel]       = useState<"write" | "preview">("write");
  const [focusMode, setFocusMode]           = useState(false);
  const [showPublish, setShowPublish]       = useState(false);
  const [showFormatRef, setShowFormatRef]   = useState(false);
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false);

  // Images
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);
  const [uploadingImg, setUploadingImg]     = useState(false);
  const [imgResult, setImgResult]           = useState<{ ok: boolean; message: string } | null>(null);
  const [showImageManager, setShowImageManager] = useState(false);
  const [insertingFor, setInsertingFor]         = useState<string | null>(null);
  const [captionInput, setCaptionInput]         = useState("");

  // Published posts management
  const [showPublishedPosts, setShowPublishedPosts] = useState(false);
  const [publishedPosts, setPublishedPosts]         = useState<{ name: string; slug: string; sha: string }[]>([]);
  const [loadingPosts, setLoadingPosts]             = useState(false);
  const [postsResult, setPostsResult]               = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmDeleteSlug, setConfirmDeleteSlug]   = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug]             = useState<string | null>(null);
  const [editingExisting, setEditingExisting]       = useState(false);
  const [selectedPostSlugs, setSelectedPostSlugs]   = useState<Set<string>>(new Set());
  const [bulkDeletingPosts, setBulkDeletingPosts]   = useState(false);
  const [bulkConfirmPosts, setBulkConfirmPosts]     = useState(false);

  // GitHub / publish
  const [githubPat, setGithubPat] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("pumpkin_github_pat") ?? "" : ""
  );
  const [patVisible, setPatVisible] = useState(false);
  const [patSaved, setPatSaved]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);

  const [copiedSnippet, setCopiedSnippet] = useState("");
  const textareaRef                       = useRef<HTMLTextAreaElement>(null);
  const saveCallbackRef                   = useRef<() => void>(() => {});

  // === COMPUTED ===
  const wordCount   = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const checks = {
    title:       title.trim().length > 0,
    slug:        /^[a-z0-9-]+$/.test(slug.trim()) && slug.trim().length > 0,
    description: description.trim().length > 0 && description.length <= 160,
    tags:        tags.length > 0,
    content:     wordCount >= 50,
    pat:         githubPat.trim().length > 0,
  };
  const allValid    = Object.values(checks).every(Boolean);
  const checksCount = Object.values(checks).filter(Boolean).length;

  const savedAgoText = lastSaved
    ? (() => {
        const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
        if (s < 10) return "just saved";
        if (s < 60) return `saved ${s}s ago`;
        return `saved ${Math.round(s / 60)}m ago`;
      })()
    : null;

  const suggestedTags = TAG_POOL.filter((t) => !tags.includes(t)).slice(0, 8);

  // === DRAFT HELPERS ===
  function readDrafts(): DraftEntry[] {
    try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "[]"); }
    catch { return []; }
  }

  function persistDraft(id: string | null): string {
    const newId = id ?? `draft_${Date.now()}`;
    const entry: DraftEntry = {
      id: newId, title, slug, date, publishedAt,
      description, tags: tags.join(", "), ogImage, content,
      savedAt: new Date().toISOString(),
    };
    const all     = readDrafts();
    const idx     = all.findIndex((d) => d.id === newId);
    if (idx >= 0) all[idx] = entry; else all.unshift(entry);
    const trimmed = all.slice(0, 10);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed));
    setCurrentDraftId(newId);
    setLastSaved(new Date());
    setDrafts(trimmed);
    return newId;
  }

  function loadDraftEntry(d: DraftEntry) {
    setTitle(d.title);
    setSlug(d.slug);
    setSlugEdited(true);
    setDate(d.date);
    setDescription(d.description);
    setTags(d.tags.split(",").map((t) => t.trim()).filter(Boolean));
    setOgImage(d.ogImage);
    setContent(d.content);
    setCurrentDraftId(d.id);
    setLastSaved(new Date(d.savedAt));
    setShowTemplates(false);
    setShowDraftMenu(false);
  }

  function deleteDraftEntry(id: string) {
    const all = readDrafts().filter((d) => d.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
    setDrafts(all);
    if (currentDraftId === id) setCurrentDraftId(null);
  }

  function newPost() {
    setTitle(""); setSlug(""); setSlugEdited(false); setDate(todayISO());
    setDescription(""); setTags([]); setTagInput(""); setOgImage(""); setContent("");
    setCurrentDraftId(null); setLastSaved(null); setShowTemplates(true);
    setResult(null); setShowDraftMenu(false); setActivePanel("write");
    setEditingExisting(false);
  }

  // === EFFECTS ===
  useEffect(() => { setDrafts(readDrafts()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title));
  }, [title, slugEdited]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(420, ta.scrollHeight) + "px";
  }, [content]);

  // Stable autosave every 15s using callback ref pattern
  useEffect(() => {
    saveCallbackRef.current = () => {
      if (title.trim() || content.trim()) persistDraft(currentDraftId);
    };
  });
  useEffect(() => {
    const id = setInterval(() => saveCallbackRef.current(), 15_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // === INSERTION HELPERS ===
  function insertInline(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel   = content.slice(start, end) || placeholder;
    const next  = content.slice(0, start) + before + sel + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.selectionStart = start + before.length;
      ta.selectionEnd   = start + before.length + sel.length;
      ta.focus();
    });
  }

  function insertBlock(template: string, caretOffset?: number) {
    const ta     = textareaRef.current;
    if (!ta) return;
    const pos    = ta.selectionStart;
    const before = content.slice(0, pos);
    const suffix = content.slice(pos);
    const pad    = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const next   = before + pad + template + "\n\n" + suffix;
    setContent(next);
    const caret  = pos + pad.length + (caretOffset ?? template.length);
    requestAnimationFrame(() => {
      ta.selectionStart = caret;
      ta.selectionEnd   = caret;
      ta.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key === "b") { e.preventDefault(); insertInline("**", "**", "bold text"); }
    if (e.key === "i") { e.preventDefault(); insertInline("*", "*", "italic text"); }
    if (e.key === "k") { e.preventDefault(); insertInline("[", "](url)", "link text"); }
    if (e.key === "`") { e.preventDefault(); insertInline("`", "`", "code"); }
    if (e.key === "s") { e.preventDefault(); persistDraft(currentDraftId); }
  }

  // === TAG HELPERS ===
  function addTag(t: string) {
    const tag = t.trim();
    if (!tag || tags.includes(tag)) return;
    setTags([...tags, tag]);
    setTagInput("");
  }
  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)); }
  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) removeTag(tags[tags.length - 1]);
  }

  // === PAT ===
  function savePat() {
    localStorage.setItem("pumpkin_github_pat", githubPat.trim());
    setPatSaved(true);
    setTimeout(() => setPatSaved(false), 2000);
  }

  // === IMAGE UPLOAD ===
  async function uploadImage(file: File) {
    if (!githubPat.trim()) {
      setShowPublish(true);
      setImgResult({ ok: false, message: "Set your GitHub token in the Publish section first." });
      return;
    }
    setUploadingImg(true);
    setImgResult(null);
    try {
      const reader = new FileReader();
      const b64    = await new Promise<string>((resolve, reject) => {
        reader.onload  = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const apiURL   = `https://api.github.com/repos/taruni2409/taruni-portfolio/contents/frontend/public/blog/${filename}`;
      const headers  = { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const getRes   = await fetch(apiURL, { headers });
      const body: Record<string, string> = { message: `blog: upload image ${filename}`, content: b64, branch: "main" };
      if (getRes.ok) body.sha = (await getRes.json()).sha;
      const putRes = await fetch(apiURL, { method: "PUT", headers, body: JSON.stringify(body) });
      if (putRes.ok) {
        const imgUrl = `/blog/${filename}`;
        setUploadedImages((prev) => [{ name: filename, url: imgUrl }, ...prev.filter((i) => i.url !== imgUrl)]);
        setImgResult({ ok: true, message: `Uploaded → ${imgUrl}` });
        if (!ogImage.trim()) setOgImage(imgUrl);
        insertBlock(`![${filename}](${imgUrl})`);
      } else {
        const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
        setImgResult({ ok: false, message: `GitHub: ${(err as { message?: string }).message ?? putRes.statusText}` });
      }
    } catch (e: unknown) {
      setImgResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setUploadingImg(false);
    }
  }

  // === BUILD MDX ===
  function buildFrontmatter() {
    const tagsStr = tags.length > 0 ? `[${tags.map((t) => `"${t}"`).join(", ")}]` : "[]";
    const lines   = ["---", `title: "${title}"`, `date: "${date}"`, `publishedAt: "${publishedAt}"`, `description: "${description}"`, `tags: ${tagsStr}`];
    if (ogImage.trim()) lines.push(`image: "${ogImage.trim()}"`);
    lines.push("---", "");
    return lines.join("\n");
  }

  function buildFrontmatterPreview() {
    const tagsStr = tags.length > 0 ? `[${tags.map((t) => `"${t}"`).join(", ")}]` : "[]";
    const lines   = ["---", `title: "${title || "(untitled)"}"`, `date: "${date}"`, `publishedAt: "${publishedAt}"`, `description: "${description || "(none)"}"`, `tags: ${tagsStr}`];
    if (ogImage.trim()) lines.push(`image: "${ogImage.trim()}"`);
    lines.push("---");
    return lines.join("\n");
  }

  function copySnippet(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSnippet(text);
      setTimeout(() => setCopiedSnippet(""), 1500);
    });
  }

  // === PUBLISH ===
  async function publish() {
    if (!allValid) return;
    setPublishing(true);
    setResult(null);
    const filePath = `frontend/src/content/blog/${slug}.mdx`;
    const apiURL   = `https://api.github.com/repos/taruni2409/taruni-portfolio/contents/${filePath}`;
    const headers  = { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
    const fullMDX  = buildFrontmatter() + content;
    try {
      const getRes = await fetch(apiURL, { headers });
      let sha: string | undefined;
      if (getRes.ok) { sha = (await getRes.json()).sha; }
      else if (getRes.status !== 404) { setResult({ ok: false, message: `GitHub: ${getRes.status} ${getRes.statusText}` }); setPublishing(false); return; }
      const body: Record<string, string> = { message: `blog: ${sha ? "update" : "publish"} ${slug}`, content: btoa(unescape(encodeURIComponent(fullMDX))), branch: "main" };
      if (sha) body.sha = sha;
      const putRes = await fetch(apiURL, { method: "PUT", headers, body: JSON.stringify(body) });
      if (putRes.ok) {
        setResult({ ok: true, message: `${sha ? "Updated" : "Published"}! GH Actions is building — /blog/${slug} will be live in ~2 min.` });
        // Immediately sync to backend so Pumpkin knows about this post without waiting for Railway redeploy.
        const adminTk = typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
        if (adminTk) {
          const blogBody = { slug, title, date, published_at: publishedAt, description, tags, image: ogImage.trim() || null, content, published: true };
          void fetch(`${API_BASE_URL}/content/blog/${slug}`, { headers: { Authorization: `Bearer ${adminTk}` } })
            .then((r) => r.ok
              ? fetch(`${API_BASE_URL}/content/blog/${slug}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminTk}` }, body: JSON.stringify(blogBody) })
              : fetch(`${API_BASE_URL}/content/blog`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminTk}` }, body: JSON.stringify(blogBody) })
            )
            .catch(() => {});
        }
      } else {
        const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
        setResult({ ok: false, message: `GitHub: ${(err as { message?: string }).message ?? putRes.statusText}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: `Network error: ${(e as Error).message}` });
    } finally {
      setPublishing(false);
    }
  }

  // === PUBLISHED POSTS ===
  async function loadPublishedPosts() {
    if (!githubPat.trim()) { setPostsResult({ ok: false, message: "GitHub token required — set it in the Publish section." }); return; }
    setLoadingPosts(true);
    setPostsResult(null);
    try {
      const res = await fetch(
        "https://api.github.com/repos/taruni2409/taruni-portfolio/contents/frontend/src/content/blog",
        { headers: { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) { setPostsResult({ ok: false, message: `GitHub: ${res.status} ${res.statusText}` }); return; }
      const files: { name: string; sha: string }[] = await res.json();
      const posts = files
        .filter((f) => f.name.endsWith(".mdx"))
        .map((f) => ({ name: f.name, slug: f.name.replace(/\.mdx$/, ""), sha: f.sha }));
      setPublishedPosts(posts);
      setPostsResult({ ok: true, message: `${posts.length} post${posts.length !== 1 ? "s" : ""} found.` });
    } catch (e: unknown) {
      setPostsResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setLoadingPosts(false);
    }
  }

  async function loadPostForEdit(slug: string) {
    if (!githubPat.trim()) return;
    setPostsResult(null);
    try {
      const res = await fetch(
        `https://api.github.com/repos/taruni2409/taruni-portfolio/contents/frontend/src/content/blog/${slug}.mdx`,
        { headers: { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) { setPostsResult({ ok: false, message: `Could not load ${slug}.mdx — ${res.status}` }); return; }
      const data = await res.json();
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
      const raw = new TextDecoder("utf-8").decode(bytes);
      const { meta, content: postContent } = parseFrontmatter(raw);
      const parsedTags = meta.tags
        ? meta.tags.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
        : [];
      setTitle(meta.title ?? "");
      setSlug(slug);
      setSlugEdited(true);
      setDate(meta.date ?? todayISO());
      setDescription(meta.description ?? "");
      setTags(parsedTags);
      setOgImage(meta.image ?? "");
      setContent(postContent);
      setCurrentDraftId(null);
      setLastSaved(null);
      setShowTemplates(false);
      setActivePanel("write");
      setEditingExisting(true);
      setShowPublishedPosts(false);
      setResult(null);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (e: unknown) {
      setPostsResult({ ok: false, message: `Error loading post: ${(e as Error).message}` });
    }
  }

  async function deletePost(slug: string, sha: string) {
    if (!githubPat.trim()) return;
    setDeletingSlug(slug);
    try {
      const res = await fetch(
        `https://api.github.com/repos/taruni2409/taruni-portfolio/contents/frontend/src/content/blog/${slug}.mdx`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
          body: JSON.stringify({ message: `blog: delete ${slug}`, sha, branch: "main" }),
        }
      );
      if (res.ok) {
        setPublishedPosts((prev) => prev.filter((p) => p.slug !== slug));
        setPostsResult({ ok: true, message: `Deleted /blog/${slug} — site rebuilds in ~2 min.` });
        setConfirmDeleteSlug(null);
        // Also remove from content.db + ChromaDB immediately so Pumpkin
        // stops seeing this post without waiting for the Railway redeploy.
        const adminToken = typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
        if (adminToken) {
          void fetch(`${API_BASE_URL}/content/blog/${slug}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${adminToken}` },
          }).catch(() => {});
        }
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        setPostsResult({ ok: false, message: `GitHub: ${(err as { message?: string }).message ?? res.statusText}` });
      }
    } catch (e: unknown) {
      setPostsResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setDeletingSlug(null);
    }
  }

  function togglePostSelect(slug: string) {
    setSelectedPostSlugs(prev => { const next = new Set(prev); next.has(slug) ? next.delete(slug) : next.add(slug); return next; });
  }
  function toggleSelectAllPosts() {
    setSelectedPostSlugs(prev => prev.size === publishedPosts.length ? new Set<string>() : new Set(publishedPosts.map(p => p.slug)));
  }
  async function handleBulkDeletePosts() {
    if (!bulkConfirmPosts) { setBulkConfirmPosts(true); return; }
    setBulkDeletingPosts(true);
    setBulkConfirmPosts(false);
    const slugsToDelete = [...selectedPostSlugs];
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
    for (const slug of slugsToDelete) {
      const post = publishedPosts.find(p => p.slug === slug);
      if (!post || !githubPat.trim()) continue;
      try {
        const res = await fetch(
          `https://api.github.com/repos/taruni2409/taruni-portfolio/contents/frontend/src/content/blog/${slug}.mdx`,
          { method: "DELETE", headers: { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
            body: JSON.stringify({ message: `blog: delete ${slug}`, sha: post.sha, branch: "main" }) }
        );
        if (res.ok) {
          setPublishedPosts(prev => prev.filter(p => p.slug !== slug));
          if (adminToken) {
            void fetch(`${API_BASE_URL}/content/blog/${slug}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => {});
          }
        }
      } catch { /* continue */ }
    }
    setSelectedPostSlugs(new Set());
    setBulkDeletingPosts(false);
    setPostsResult({ ok: true, message: `Deleted ${slugsToDelete.length} post${slugsToDelete.length !== 1 ? "s" : ""} — site rebuilds in ~2 min.` });
  }

  // === FOCUS MODE ===
  if (focusMode) {
    return (
      <div className="fixed inset-0 z-50 bg-bg flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setFocusMode(false)}
              className="text-xs text-fg-faint hover:text-fg transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Exit focus
            </button>
            {savedAgoText && <span className="text-[10px] text-fg-faint flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{savedAgoText}</span>}
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "B",  title: "Bold (⌘B)",   action: () => insertInline("**","**","bold text"), mono: true },
              { label: "I",  title: "Italic (⌘I)", action: () => insertInline("*","*","italic text"), mono: true },
              { label: "`",  title: "Code (⌘`)",   action: () => insertInline("`","`","code"), mono: true },
              { label: "H2", title: "Heading 2",   action: () => insertBlock("## "), mono: true },
              { label: "•",  title: "Bullet list", action: () => insertBlock("- "), mono: true },
              { label: "—",  title: "Divider",     action: () => insertBlock("<Divider />"), mono: true },
            ].map((btn) => (
              <button key={btn.label} onClick={btn.action} title={btn.title}
                className={`px-2 py-0.5 rounded text-[11px] text-fg-muted hover:text-fg transition-colors ${btn.mono ? "font-mono" : ""}`}>
                {btn.label}
              </button>
            ))}
            <span className="text-[10px] text-fg-faint tabular-nums ml-2">{wordCount > 0 ? `${wordCount} words · ~${readingTime} min` : ""}</span>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck
          className="flex-1 w-full bg-bg resize-none focus:outline-none overflow-y-auto"
          style={{ padding: "3rem min(8rem, 10vw)", fontFamily: "var(--font-blog, Georgia, serif)", fontSize: "1.1rem", lineHeight: 1.9, color: "var(--color-fg)" }}
          placeholder="Write here…"
        />
      </div>
    );
  }

  // === MAIN RENDER ===
  return (
    <div className="space-y-4 pb-8">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={newPost}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint hover:text-fg border border-border rounded px-3 py-1.5 transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            New post
          </button>
          {drafts.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowDraftMenu(!showDraftMenu)}
                className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg border border-border rounded px-3 py-1.5 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Drafts ({drafts.length})
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showDraftMenu ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showDraftMenu && (
                <div className="absolute left-0 top-full mt-1 z-30 w-72 bg-surface border border-border rounded shadow-2xl py-1 overflow-hidden">
                  {drafts.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-raised transition-colors group">
                      <button onClick={() => loadDraftEntry(d)} className="flex-1 text-left min-w-0">
                        <p className="text-xs font-medium text-fg truncate">{d.title || "(untitled)"}</p>
                        <p className="text-[10px] text-fg-faint">{new Date(d.savedAt).toLocaleString()}</p>
                      </button>
                      <button onClick={() => deleteDraftEntry(d.id)}
                        className="shrink-0 text-[10px] text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all px-2 py-0.5 rounded">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {savedAgoText && (
            <span className="text-[10px] text-fg-faint flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              {savedAgoText}
            </span>
          )}
          <button onClick={() => persistDraft(currentDraftId)}
            className="text-xs text-fg-faint hover:text-fg border border-border rounded px-3 py-1.5 transition-colors">
            Save draft
          </button>
        </div>
      </div>

      {/* ── Published Posts ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button
          onClick={() => setShowPublishedPosts(!showPublishedPosts)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">Published Posts</span>
            {publishedPosts.length > 0 && (
              <span className="text-[10px] font-mono text-accent">({publishedPosts.length})</span>
            )}
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-fg-faint transition-transform ${showPublishedPosts ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showPublishedPosts && (
          <div className="border-t border-border p-5 space-y-4">
            {/* Load + result */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadPublishedPosts}
                disabled={loadingPosts || !githubPat.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-medium border border-border rounded px-3 py-1.5 text-fg-muted hover:text-fg hover:border-indigo-400 transition-colors disabled:opacity-40"
              >
                {loadingPosts ? (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Loading…</>
                ) : (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Load from GitHub</>
                )}
              </button>
              {!githubPat.trim() && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">GitHub token required — set it in the Publish section below</span>
              )}
              {postsResult && (
                <span className={`text-[10px] ${postsResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                  {postsResult.message}
                </span>
              )}
            </div>

            {/* Posts list */}
            {publishedPosts.length > 0 && (
              <div className="space-y-1.5">
                {/* Bulk delete bar */}
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={publishedPosts.length > 0 && selectedPostSlugs.size === publishedPosts.length}
                      onChange={toggleSelectAllPosts}
                      className="accent-accent cursor-pointer"
                    />
                    <span className="text-[11px] text-fg-faint">Select all</span>
                  </div>
                  {selectedPostSlugs.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-fg-muted">{selectedPostSlugs.size} selected</span>
                      {bulkConfirmPosts ? (
                        <>
                          <button onClick={handleBulkDeletePosts} disabled={bulkDeletingPosts}
                            className="px-3 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
                            {bulkDeletingPosts ? "Deleting…" : "Confirm delete"}
                          </button>
                          <button onClick={() => setBulkConfirmPosts(false)}
                            className="px-2 py-1 rounded border border-border text-[11px] text-fg-faint hover:text-fg transition-colors">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={handleBulkDeletePosts} disabled={bulkDeletingPosts}
                          className="px-3 py-1 rounded border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                          Delete selected ({selectedPostSlugs.size})
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {publishedPosts.map((post) => (
                  <div key={post.slug} className={`flex items-center gap-3 px-4 py-3 rounded border bg-bg hover:bg-surface-raised transition-colors group ${selectedPostSlugs.has(post.slug) ? "border-rose-300 dark:border-rose-800" : "border-border"}`}>
                    <input
                      type="checkbox"
                      checked={selectedPostSlugs.has(post.slug)}
                      onChange={() => togglePostSelect(post.slug)}
                      className="shrink-0 accent-accent cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">/blog/<span className="text-accent">{post.slug}</span></p>
                      <p className="text-[10px] font-mono text-fg-faint">{post.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => loadPostForEdit(post.slug)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-[11px] font-medium text-fg-muted hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      {confirmDeleteSlug === post.slug ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-500 font-medium">Delete forever?</span>
                          <button
                            onClick={() => deletePost(post.slug, post.sha)}
                            disabled={deletingSlug === post.slug}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
                          >
                            {deletingSlug === post.slug ? "…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSlug(null)}
                            className="px-2 py-1 rounded border border-border text-[10px] text-fg-faint hover:text-fg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteSlug(post.slug)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-[11px] font-medium text-fg-faint hover:border-rose-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {publishedPosts.length === 0 && !loadingPosts && postsResult?.ok && (
              <p className="text-xs text-fg-faint text-center py-2">No MDX posts found.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Post header card (title + description + tags + slug) ─────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-5 sm:p-7 space-y-4">

          {/* Editing existing post indicator */}
          {editingExisting && (
            <div className="flex items-center gap-2 text-[11px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2 text-amber-700 dark:text-amber-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Editing existing post — publishing will update <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">/blog/{slug}</code></span>
              <button onClick={() => setEditingExisting(false)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity text-sm leading-none">×</button>
            </div>
          )}

          {/* Large title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title…"
            className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-fg placeholder:text-fg-subtle focus:outline-none leading-tight"
          />

          {/* Description with char counter */}
          <div className="relative">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line description shown on the blog index and search results…"
              className="w-full bg-transparent text-sm text-fg-subtle placeholder:text-fg-faint focus:outline-none pr-14"
            />
            <span className={`absolute right-0 top-0 text-[10px] tabular-nums font-mono ${description.length > 160 ? "text-rose-500" : description.length > 130 ? "text-amber-500" : "text-fg-faint"}`}>
              {description.length}/160
            </span>
          </div>

          {/* Tags as chips */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium rounded-sm px-2.5 py-0.5">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 leading-none ml-0.5">×</button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={tags.length === 0 ? "Add tags (type then press Enter)…" : "Add tag…"}
                className="bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none min-w-[160px] flex-1"
              />
            </div>
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {suggestedTags.slice(0, 8).map((t) => (
                  <button key={t} onClick={() => addTag(t)}
                    className="text-[10px] text-fg-faint hover:text-indigo-600 dark:hover:text-indigo-400 border border-border rounded-sm px-2 py-0.5 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700">
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Slug + date row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-border-subtle text-[11px]">
            <div className="flex items-center gap-1 font-mono text-fg-faint">
              <span>/blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="post-slug"
                className="bg-transparent text-accent focus:outline-none w-40"
              />
            </div>
            <span className="text-fg-faint">·</span>
            <span className="text-fg-faint text-[10px] uppercase tracking-wider">Last Edited:</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-fg-faint focus:outline-none focus:text-fg cursor-pointer" />
            <span className="text-fg-faint">·</span>
            <span className="text-fg-faint text-[10px] uppercase tracking-wider">Originally Published:</span>
            <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)}
              className="bg-transparent text-accent focus:outline-none focus:text-fg cursor-pointer font-mono text-xs" />
            <button onClick={() => setShowAdvancedMeta(!showAdvancedMeta)}
              className="ml-auto text-fg-faint hover:text-fg transition-colors flex items-center gap-1">
              OG image
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showAdvancedMeta ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          {showAdvancedMeta && (
            <div className="pt-3 border-t border-border-subtle space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint w-20 shrink-0">OG Image</span>
                <input type="text" value={ogImage} onChange={(e) => setOgImage(e.target.value)}
                  placeholder="/blog/cover.jpg"
                  className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-fg font-mono placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors" />
                {uploadedImages.length > 0 && (
                  <select onChange={(e) => { if (e.target.value) setOgImage(e.target.value); e.target.value = ""; }}
                    className="shrink-0 bg-bg border border-border rounded px-2 py-1 text-xs text-fg-muted focus:outline-none">
                    <option value="">Pick uploaded…</option>
                    {uploadedImages.map((img) => <option key={img.url} value={img.url}>{img.name}</option>)}
                  </select>
                )}
              </div>
              <p className="text-[10px] text-fg-faint">Used as Twitter/OG card image when someone shares the post. Upload via the Images toolbar button first, then pick it here.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Template picker ───────────────────────────────────────────────────── */}
      {showTemplates && !content && (
        <div className="rounded border border-dashed border-border bg-surface-raised/40 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-4 text-center">Start with a template — or just type below</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {POST_TEMPLATES.map((t) => {
              const tmplIcons: Record<string, React.ReactNode> = {
                layers:  <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
                book:    <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
                feather: <><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17" y1="15" x2="9" y2="15"/></>,
                zap:     <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
              };
              return (
                <button key={t.id}
                  onClick={() => { setContent(t.content); setShowTemplates(false); setActivePanel("write"); requestAnimationFrame(() => textareaRef.current?.focus()); }}
                  className="rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50 hover:shadow-sm transition-all group">
                  <div className="w-7 h-7 rounded bg-surface-raised flex items-center justify-center mb-2.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-fg-faint group-hover:text-indigo-500 transition-colors">
                      {tmplIcons[t.icon]}
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-fg group-hover:text-accent transition-colors leading-snug">{t.label}</p>
                  <p className="text-[10px] text-fg-faint mt-1 leading-relaxed">{t.desc}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => { setShowTemplates(false); requestAnimationFrame(() => textareaRef.current?.focus()); }}
              className="text-[10px] text-fg-faint hover:text-fg transition-colors">
              Skip — start from blank →
            </button>
          </div>
        </div>
      )}

      {/* ── Editor ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">

        {/* Toolbar */}
        <div className="border-b border-border bg-surface-raised px-3 py-2 flex items-center gap-1 flex-wrap">
          {/* Format */}
          {[
            { label: "B",  title: "Bold (⌘B)",          action: () => insertInline("**", "**", "bold text"),   mono: true },
            { label: "I",  title: "Italic (⌘I)",         action: () => insertInline("*", "*", "italic text"),  mono: true },
            { label: "`",  title: "Inline code (⌘`)",    action: () => insertInline("`", "`", "code"),         mono: true },
            { label: "~~", title: "Strikethrough",        action: () => insertInline("~~", "~~", "text"),      mono: true },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className={`px-2 py-0.5 rounded-md text-[11px] text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors ${b.mono ? "font-mono" : ""}`}>
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Headings */}
          {[
            { label: "H2", title: "Large section heading",       action: () => insertBlock("## "),   mono: true },
            { label: "H3", title: "Sub-section heading",         action: () => insertBlock("### "),  mono: true },
            { label: "H4", title: "Small label heading",         action: () => insertBlock("#### "), mono: true },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Block elements */}
          {[
            { label: "lnk", title: "Link (⌘K)",              action: () => insertInline("[", "](url)", "link text"), mono: true },
            { label: ">",   title: "Blockquote / pull quote", action: () => insertBlock("> "),                        mono: true },
            { label: "•",   title: "Bullet list",             action: () => insertBlock("- Item 1\n- Item 2\n- Item 3"), mono: true },
            { label: "1.",  title: "Numbered list",           action: () => insertBlock("1. First\n2. Second\n3. Third"), mono: true },
            { label: "—",   title: "Section divider",         action: () => insertBlock("<Divider />"),                mono: true },
            { label: "▦",   title: "Insert table",            action: () => insertBlock("| Column A | Column B |\n|----------|----------|\n| Cell     | Cell     |") },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className={`px-2 py-0.5 rounded-md text-[11px] text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors ${b.mono ? "font-mono" : ""}`}>
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Code blocks */}
          {[
            { label: "</>py",  title: "Python code block",     action: () => insertBlock("```python\n# code here\n```", 10) },
            { label: "</>ts",  title: "TypeScript code block", action: () => insertBlock("```typescript\n// code here\n```", 14) },
            { label: "</>sh",  title: "Shell / bash block",    action: () => insertBlock("```bash\n# command\n```", 7) },
            { label: "</>",    title: "Generic code block",    action: () => insertBlock("```\n\n```", 4) },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Callouts */}
          {[
            { label: "info", title: "Info callout",    action: () => insertBlock('<Callout type="info" title="Info">\nYour note here.\n</Callout>'), mono: true },
            { label: "tip",  title: "Tip callout",     action: () => insertBlock('<Callout type="tip" title="Tip">\nYour tip here.\n</Callout>'), mono: true },
            { label: "warn", title: "Warning callout", action: () => insertBlock('<Callout type="warning" title="Warning">\nYour warning here.\n</Callout>'), mono: true },
            { label: "quot", title: "Quote callout",   action: () => insertBlock('<Callout type="quote" title="Quote">\nYour quote here.\n</Callout>'), mono: true },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Image manager toggle */}
          <button
            onClick={() => setShowImageManager(!showImageManager)}
            title="Image Library — upload multiple images and choose placement"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors whitespace-nowrap ${showImageManager ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "border-transparent text-fg-muted hover:bg-surface hover:text-fg hover:border-border"}`}
          >
            {uploadingImg ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin shrink-0"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            )}
            {uploadingImg ? "Uploading…" : uploadedImages.length > 0 ? `Images (${uploadedImages.length})` : "Images"}
          </button>
          {/* Spacer + right controls */}
          <div className="flex-1" />
          <span className="text-[10px] text-fg-faint tabular-nums hidden sm:block shrink-0">
            {wordCount > 0 ? `${wordCount} words · ~${readingTime} min` : ""}
          </span>
          <span className="w-px h-4 bg-border mx-0.5 shrink-0 hidden sm:block" />
          <button onClick={() => setActivePanel(activePanel === "preview" ? "write" : "preview")}
            title="Toggle preview"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors shrink-0 ${activePanel === "preview" ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "border-transparent text-fg-muted hover:bg-surface hover:text-fg hover:border-border"}`}>
            {activePanel === "preview" ? (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"/></svg>Write</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Preview</>
            )}
          </button>
          <button onClick={() => setFocusMode(true)} title="Focus mode — distraction-free writing"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            Focus
          </button>
        </div>

        {/* ── Image Manager Panel ─────────────────────────────────────────── */}
        {showImageManager && (
          <div className="border-b border-border bg-bg">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-raised border-b border-border">
              <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Image Library
                {uploadedImages.length > 0 && <span className="font-mono text-accent ml-1">({uploadedImages.length} this session)</span>}
              </span>
              <button onClick={() => setShowImageManager(false)} className="text-base leading-none text-fg-faint hover:text-fg transition-colors px-1">×</button>
            </div>

            <div className="p-4 space-y-3">
              {/* Upload drop zone */}
              <label className={`flex flex-col items-center justify-center rounded border-2 border-dashed py-6 px-4 cursor-pointer transition-all ${
                uploadingImg ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 cursor-wait" : "border-border hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"
              }`}>
                <div className="w-9 h-9 rounded bg-surface-raised border border-border flex items-center justify-center mb-2">
                  {uploadingImg ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-fg-faint"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-fg-faint"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                  )}
                </div>
                <span className="text-xs font-medium text-fg-muted">{uploadingImg ? "Uploading…" : "Click to upload images"}</span>
                <span className="text-[10px] text-fg-faint mt-0.5">JPEG · PNG · WebP · GIF — multiple files supported</span>
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingImg}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) files.reduce<Promise<void>>((p, f) => p.then(() => uploadImage(f)), Promise.resolve());
                    e.target.value = "";
                  }} />
              </label>

              {!githubPat.trim() && (
                <p className="text-[10px] text-center text-amber-600 dark:text-amber-400">
                  Add your GitHub token in the Publish section first — it&apos;s needed to upload images.
                </p>
              )}

              {imgResult && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${imgResult.ok ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"}`}>
                  {imgResult.ok ? "✓" : "✗"} {imgResult.message}
                  <button onClick={() => setImgResult(null)} className="ml-auto opacity-60 hover:opacity-100 leading-none text-sm">×</button>
                </div>
              )}

              {/* Session gallery */}
              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Choose how to place each image in your post</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uploadedImages.map((img) => (
                      <div key={img.url} className="rounded-xl border border-border bg-surface overflow-hidden">
                        <div className="flex items-start gap-3 p-3">
                          {/* Icon tile — thumbnail would be broken pre-deploy */}
                          <div className="shrink-0 w-14 h-14 rounded bg-surface-raised border border-border flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fg-faint"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-fg truncate">{img.name}</p>
                            <p className="text-[10px] text-accent font-mono mt-0.5 truncate">{img.url}</p>

                            {insertingFor === img.url ? (
                              <div className="mt-2 space-y-1.5">
                                <input
                                  type="text"
                                  value={captionInput}
                                  onChange={(e) => setCaptionInput(e.target.value)}
                                  placeholder="Caption (optional) — press Enter to insert"
                                  autoFocus
                                  className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:border-indigo-400 transition-colors"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      insertBlock(captionInput.trim() ? `![${img.name}](${img.url} "${captionInput.trim()}")` : `![${img.name}](${img.url})`);
                                      setInsertingFor(null); setCaptionInput("");
                                    }
                                    if (e.key === "Escape") { setInsertingFor(null); setCaptionInput(""); }
                                  }}
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      insertBlock(captionInput.trim() ? `![${img.name}](${img.url} "${captionInput.trim()}")` : `![${img.name}](${img.url})`);
                                      setInsertingFor(null); setCaptionInput("");
                                    }}
                                    className="flex-1 px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
                                  >
                                    Insert ✓
                                  </button>
                                  <button
                                    onClick={() => { setInsertingFor(null); setCaptionInput(""); }}
                                    className="px-2 py-1 rounded border border-border text-[10px] text-fg-faint hover:text-fg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <button
                                  onClick={() => insertBlock(`![${img.name}](${img.url})`)}
                                  title="Insert at cursor"
                                  className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-medium hover:bg-indigo-700 transition-colors"
                                >
                                  Insert
                                </button>
                                <button
                                  onClick={() => setInsertingFor(img.url)}
                                  title="Insert with a caption below the image"
                                  className="px-2 py-0.5 rounded-md border border-border bg-surface-raised text-[10px] font-medium text-fg-muted hover:border-indigo-400 hover:text-fg transition-colors"
                                >
                                  + Caption
                                </button>
                                <button
                                  onClick={() => insertBlock(`<BlogImage\n  src="${img.url}"\n  alt="${img.name}"\n/>`)}
                                  title="Insert as full-width BlogImage with lightbox"
                                  className="px-2 py-0.5 rounded-md border border-border bg-surface-raised text-[10px] font-medium text-fg-muted hover:border-indigo-400 hover:text-fg transition-colors"
                                >
                                  Full-width
                                </button>
                                <button
                                  onClick={() => { setOgImage(img.url); setShowAdvancedMeta(true); }}
                                  title="Set as social preview / OG cover image"
                                  className="px-2 py-0.5 rounded-md border border-border bg-surface-raised text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
                                >
                                  Cover
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadedImages.length === 0 && !uploadingImg && (
                <p className="text-[10px] text-fg-faint text-center pb-1">
                  Uploaded images appear here — insert them anywhere in your post with the buttons above.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Write panel */}
        {activePanel === "write" && (
          <div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); if (showTemplates && e.target.value) setShowTemplates(false); }}
              onKeyDown={handleKeyDown}
              spellCheck
              className="w-full bg-bg px-5 sm:px-8 py-6 text-sm text-fg font-mono leading-relaxed focus:outline-none resize-none"
              placeholder={`Write your post here…${"\n"}Keyboard shortcuts: ⌘B bold · ⌘I italic · ⌘K link · ⌘\` code · ⌘S save draft`}
              style={{ minHeight: "420px" }}
            />
            <div className="px-5 py-2 border-t border-border flex items-center justify-between text-[10px] text-fg-faint bg-surface-raised">
              <span>{wordCount > 0 ? `${wordCount} words · ~${readingTime} min read` : "Start writing — use the toolbar above or keyboard shortcuts"}</span>
              <span className="font-mono hidden sm:block">⌘B · ⌘I · ⌘K · ⌘S save</span>
            </div>
          </div>
        )}

        {/* Preview panel */}
        {activePanel === "preview" && (
          <div className="bg-bg">
            <pre className="px-5 sm:px-8 pt-5 pb-4 text-[10px] font-mono leading-relaxed text-fg-faint bg-surface border-b border-border whitespace-pre-wrap overflow-x-auto">
              {buildFrontmatterPreview()}
            </pre>
            <div className="px-5 sm:px-8 py-8"
              style={{ fontFamily: "var(--font-blog, Georgia, serif)", lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: mdxToHTML(content) }}
            />
          </div>
        )}
      </div>

      {/* ── Format Reference (collapsible) ───────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button onClick={() => setShowFormatRef(!showFormatRef)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-raised transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            Format Reference — MDX Syntax
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-fg-faint transition-transform shrink-0 ${showFormatRef ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showFormatRef && (
          <div className="border-t border-border px-5 py-5 space-y-6">
            {FORMAT_GUIDE.map((section) => (
              <div key={section.heading}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{section.heading}</span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <div key={item.label} className="rounded-lg border border-border-subtle bg-bg hover:border-border transition-colors overflow-hidden">
                      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1">
                        <p className="text-[11px] font-semibold text-fg-muted">{item.label}</p>
                        <button onClick={() => copySnippet(item.syntax)}
                          className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-border text-fg-faint hover:text-accent hover:border-accent transition-colors">
                          {copiedSnippet === item.syntax ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      {item.note && <p className="px-3 pb-1 text-[10px] text-fg-faint italic leading-relaxed">{item.note}</p>}
                      <pre onClick={() => copySnippet(item.syntax)}
                        className="px-3 pb-3 text-[11px] font-mono text-zinc-300 bg-zinc-950 leading-relaxed whitespace-pre-wrap overflow-x-auto cursor-pointer">
                        {item.syntax}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Publish section (collapsible with checklist) ──────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button onClick={() => setShowPublish(!showPublish)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised transition-colors">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
              <path d="M7 17L17 7M17 7H7M17 7v10"/>
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">Publish to GitHub</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex gap-0.5">
              {Object.values(checks).map((ok, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-border-strong"}`} />
              ))}
            </div>
            <span className={`text-[10px] font-semibold ${allValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {checksCount}/{Object.keys(checks).length} ready
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-fg-faint transition-transform ${showPublish ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </button>

        {showPublish && (
          <div className="border-t border-border p-5 space-y-5">

            {/* Checklist */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Before you publish</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {[
                  { key: "title",       label: "Post has a title",                     ok: checks.title },
                  { key: "slug",        label: "Slug is valid (lowercase, no spaces)",  ok: checks.slug },
                  { key: "description", label: "Description written (≤160 chars)",      ok: checks.description },
                  { key: "tags",        label: "At least one tag added",               ok: checks.tags },
                  { key: "content",     label: "Content is at least 50 words",         ok: checks.content },
                  { key: "pat",         label: "GitHub token saved",                   ok: checks.pat },
                ].map(({ key, label, ok }) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${ok ? "bg-emerald-500 text-white" : "bg-surface-raised border border-border text-fg-faint"}`}>
                      {ok ? "✓" : ""}
                    </span>
                    <span className={ok ? "text-fg-muted" : "text-fg-faint"}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GitHub token */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-2">GitHub Token</p>
              <div className="flex gap-2">
                <input
                  type={patVisible ? "text" : "password"}
                  value={githubPat}
                  onChange={(e) => { setGithubPat(e.target.value); setPatSaved(false); }}
                  placeholder="ghp_… (needs repo write scope)"
                  className="flex-1 min-w-0 rounded border border-border bg-bg px-3 py-2 text-sm text-fg font-mono placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
                />
                <button onClick={() => setPatVisible(!patVisible)}
                  className="shrink-0 px-3 rounded border border-border text-fg-faint hover:text-fg text-xs transition-colors">
                  {patVisible ? "Hide" : "Show"}
                </button>
                <button onClick={savePat}
                  className="shrink-0 px-4 rounded bg-fg text-bg text-xs font-semibold hover:opacity-80 transition-opacity">
                  {patSaved ? "Saved ✓" : "Save"}
                </button>
              </div>
              <p className="text-[10px] text-fg-faint mt-1.5">
                One-time setup — stored in your browser only. Generate at{" "}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-accent underline">github.com/settings/tokens</a>
                {" "}with <code className="bg-surface-raised px-1 rounded text-[10px]">repo</code> write scope.
              </p>
            </div>

            {/* Result */}
            {result && (
              <div className={`rounded border px-4 py-3 text-sm flex items-start gap-2 ${result.ok ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"}`}>
                <span className="shrink-0 font-bold">{result.ok ? "✓" : "✗"}</span>
                <span>
                  {result.message}
                  {result.ok && slug && (
                    <> &nbsp;<a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer" className="underline font-medium">View /blog/{slug} →</a></>
                  )}
                </span>
              </div>
            )}

            {/* Publish button */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="text-[10px] text-fg-faint leading-relaxed">
                <p>Commits <code className="bg-surface-raised px-1 rounded font-mono">{slug || "post-slug"}.mdx</code> to <code className="bg-surface-raised px-1 rounded font-mono">main</code>.</p>
                <p>GH Actions rebuilds the site — your post is live in ~2 min.</p>
              </div>
              <button
                onClick={publish}
                disabled={publishing || !allValid}
                className="inline-flex items-center gap-2 rounded bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-px transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {publishing ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Publishing…</>
                ) : (
                  <>Publish to GitHub <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg></>
                )}
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}

// ── QuotesEditor ──────────────────────────────────────────────────────────────

interface QuoteEntry {
  id: string;
  text: string;
  author: string;
  source: string | null;
  category: string;
  favorite: boolean;
  featured?: boolean;
  addedAt: string;
}

const QUOTE_CATEGORIES = ["Work", "Life", "Technology", "Philosophy", "Creativity", "Mindset"];

function QuotesEditor() {
  const [quotes, setQuotes]         = useState<QuoteEntry[]>([]);
  const [sha, setSha]               = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [loadResult, setLoadResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [githubPat, setGithubPat]   = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("pumpkin_github_pat") ?? "" : ""
  );
  const [patVisible, setPatVisible] = useState(false);

  // New quote form state
  const [newText, setNewText]         = useState("");
  const [newAuthor, setNewAuthor]     = useState("");
  const [newSource, setNewSource]     = useState("");
  const [newCategory, setNewCategory] = useState("Technology");
  const [newFavorite, setNewFavorite] = useState(false);

  // Edit state
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<QuoteEntry>>({});

  const API_URL = "https://api.github.com/repos/taruni2409/taruni-portfolio/contents/backend/data/knowledge/quotes.json";

  function apiHeaders() {
    return {
      Authorization: `Bearer ${githubPat.trim()}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };
  }

  async function loadFromGitHub() {
    if (!githubPat.trim()) { setLoadResult({ ok: false, message: "GitHub PAT required." }); return; }
    setLoading(true);
    setLoadResult(null);
    try {
      const res = await fetch(API_URL, { headers: apiHeaders() });
      if (!res.ok) { setLoadResult({ ok: false, message: `GitHub: ${res.status} ${res.statusText}` }); return; }
      const data = await res.json();
      setSha(data.sha);
      const decoded = JSON.parse(atob(data.content.replace(/\n/g, "")));
      setQuotes(decoded);
      setLoadResult({ ok: true, message: `Loaded ${decoded.length} quotes.` });
    } catch (e: unknown) {
      setLoadResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  async function saveToGitHub(updatedQuotes: QuoteEntry[]) {
    if (!githubPat.trim()) { setSaveResult({ ok: false, message: "GitHub PAT required." }); return; }
    setSaving(true);
    setSaveResult(null);
    try {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(updatedQuotes, null, 2))));
      const body: Record<string, string> = { message: "quotes: update", content, branch: "main" };
      if (sha) body.sha = sha;
      const res = await fetch(API_URL, { method: "PUT", headers: apiHeaders(), body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setSha(data.content.sha);
        setQuotes(updatedQuotes);
        setSaveResult({ ok: true, message: "Saved! GH Actions will sync to frontend in ~2 min." });
        // Sync changes to backend Content API for immediate Pumpkin (ChromaDB) update.
        // quotes (closure) = pre-save state; updatedQuotes = new state.
        const adminTk = typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
        if (adminTk) {
          const oldById = new Map(quotes.map((q) => [q.id, q]));
          const newById = new Map(updatedQuotes.map((q) => [q.id, q]));
          const apiHdrs = { "Content-Type": "application/json", Authorization: `Bearer ${adminTk}` };
          for (const [id] of oldById) {
            if (!newById.has(id)) {
              void fetch(`${API_BASE_URL}/content/quotes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminTk}` } }).catch(() => {});
            }
          }
          for (const [id, q] of newById) {
            const qBody = { quote_id: q.id, text: q.text, author: q.author, source: q.source ?? null, category: q.category, favorite: q.favorite, featured: q.featured ?? false, added_at: q.addedAt };
            if (!oldById.has(id)) {
              void fetch(`${API_BASE_URL}/content/quotes`, { method: "POST", headers: apiHdrs, body: JSON.stringify(qBody) }).catch(() => {});
            } else {
              void fetch(`${API_BASE_URL}/content/quotes/${id}`, { method: "PUT", headers: apiHdrs, body: JSON.stringify(qBody) }).catch(() => {});
            }
          }
        }
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        setSaveResult({ ok: false, message: `GitHub: ${(err as { message?: string }).message ?? res.statusText}` });
      }
    } catch (e: unknown) {
      setSaveResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  function addQuote() {
    if (!newText.trim() || !newAuthor.trim()) return;
    const newQuote: QuoteEntry = {
      id: `q${Date.now()}`,
      text: newText.trim(),
      author: newAuthor.trim(),
      source: newSource.trim() || null,
      category: newCategory,
      favorite: newFavorite,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    const updated = [...quotes, newQuote];
    setNewText(""); setNewAuthor(""); setNewSource(""); setNewCategory("Technology"); setNewFavorite(false);
    saveToGitHub(updated);
  }

  function deleteQuote(id: string) {
    saveToGitHub(quotes.filter((q) => q.id !== id));
  }

  function toggleFeatured(id: string) {
    const already = quotes.find((q) => q.id === id)?.featured;
    const updated = quotes.map((q) => ({
      ...q,
      featured: !already && q.id === id ? true : undefined,
    }));
    saveToGitHub(updated);
  }

  function startEdit(q: QuoteEntry) {
    setEditingId(q.id);
    setEditFields({ text: q.text, author: q.author, source: q.source ?? "", category: q.category, favorite: q.favorite, featured: q.featured ?? false });
  }

  function saveEdit(id: string) {
    const updated = quotes.map((q) => {
      if (q.id !== id) return editFields.featured ? { ...q, featured: undefined } : q;
      return { ...q, ...editFields, source: (editFields.source as string | undefined)?.trim() || null, featured: editFields.featured ? true : undefined };
    });
    setEditingId(null);
    saveToGitHub(updated);
  }

  const inputCls = "w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-indigo-400 transition-colors";
  const labelCls = "block text-[11px] font-semibold text-fg-muted mb-1";

  return (
    <div className="space-y-6">

      {/* PAT + Load */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">GitHub Access</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={patVisible ? "text" : "password"}
              value={githubPat}
              onChange={(e) => { setGithubPat(e.target.value); localStorage.setItem("pumpkin_github_pat", e.target.value); }}
              placeholder="ghp_…"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setPatVisible(!patVisible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg-muted text-[10px]"
            >
              {patVisible ? "hide" : "show"}
            </button>
          </div>
          <button
            onClick={loadFromGitHub}
            disabled={loading || !githubPat.trim()}
            className="shrink-0 px-4 py-2 rounded bg-fg text-bg text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
        {loadResult && (
          <p className={`text-xs ${loadResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {loadResult.message}
          </p>
        )}
      </div>

      {/* Add new quote */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Add New Quote</h2>
        <div>
          <label className={labelCls}>Quote text *</label>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="The best way to predict the future is to invent it."
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Author *</label>
            <input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="Alan Kay" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Source / Book</label>
            <input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="Profiles of the Future (optional)" className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className={labelCls}>Category</label>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputCls}>
              {QUOTE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-5">
            <input type="checkbox" checked={newFavorite} onChange={(e) => setNewFavorite(e.target.checked)} className="rounded" />
            <span className="text-xs font-medium text-fg-muted flex items-center gap-1">
              Favorite
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
          </label>
        </div>
        <button
          onClick={addQuote}
          disabled={!newText.trim() || !newAuthor.trim() || saving || !githubPat.trim()}
          className="w-full rounded bg-indigo-600 text-white py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : "Add Quote → GitHub"}
        </button>
        {saveResult && (
          <p className={`text-xs text-center ${saveResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {saveResult.message}
          </p>
        )}
      </div>

      {/* Existing quotes list */}
      {quotes.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">{quotes.length} Quotes</h2>
          </div>
          <div className="divide-y divide-border">
            {quotes.map((q) => (
              <div key={q.id} className="px-5 py-4">
                {editingId === q.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editFields.text ?? ""}
                      onChange={(e) => setEditFields((p) => ({ ...p, text: e.target.value }))}
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={editFields.author ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, author: e.target.value }))}
                        placeholder="Author"
                        className={inputCls}
                      />
                      <input
                        value={(editFields.source as string | null | undefined) ?? ""}
                        onChange={(e) => setEditFields((p) => ({ ...p, source: e.target.value }))}
                        placeholder="Source (optional)"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        value={editFields.category ?? "Technology"}
                        onChange={(e) => setEditFields((p) => ({ ...p, category: e.target.value }))}
                        className={`${inputCls} flex-1`}
                      >
                        {QUOTE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editFields.favorite ?? false}
                          onChange={(e) => setEditFields((p) => ({ ...p, favorite: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-xs font-medium text-fg-muted">Favorite</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editFields.featured ?? false}
                          onChange={(e) => setEditFields((p) => ({ ...p, featured: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-xs font-medium text-indigo-500">Featured on home</span>
                      </label>
                      <button onClick={() => saveEdit(q.id)} disabled={saving} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                        {saving ? "…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded border border-border text-xs text-fg-faint hover:text-fg transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">{q.category}</span>
                        {q.favorite && <svg width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                        {q.featured && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-fg leading-relaxed line-clamp-2">{q.text}</p>
                      <p className="text-[11px] text-fg-faint mt-1">
                        — {q.author}{q.source ? `, ${q.source}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => toggleFeatured(q.id)}
                        disabled={saving}
                        title={q.featured ? "Remove from home" : "Feature on home"}
                        className={`text-[10px] px-2 py-1 rounded transition-colors disabled:opacity-40 ${
                          q.featured
                            ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60"
                            : "text-fg-faint hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                            className={q.featured ? "fill-indigo-500 stroke-indigo-500" : "fill-none stroke-current"}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                          {q.featured ? "Featured" : "Feature"}
                        </span>
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        className="text-[10px] text-fg-faint hover:text-fg px-2 py-1 rounded hover:bg-surface-raised transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuote(q.id)}
                        disabled={saving}
                        className="text-[10px] text-rose-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

type Period = "week" | "month" | "all";
const PERIOD_LABELS: Record<Period, string> = { week: "This week", month: "This month", all: "All time" };

function Dashboard({
  stats, onLogout, onRefresh, refreshing, secondsAgo, lastUpdated,
}: {
  stats: AdminStats;
  onLogout: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  secondsAgo: number;
  lastUpdated: Date | null;
}) {
  const [period, setPeriod] = useState<Period>("all");
  const [activeView, setActiveView] = useState<
    "analytics" | "write-blog" | "write-lab" | "quotes" | "blog-api" | "lab" | "quotes-api" |
    "availability" | "now" | "data" | "sync" | "integrations" |
    "profile" | "hero-stats" | "spotlights" | "experience" | "education" | "projects" | "apps" | "skills" | "testimonials" | "gallery"
  >("analytics");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("pumpkin_admin_collapsed_groups") ?? "[]")); }
    catch { return new Set(); }
  });
  function toggleGroup(g: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      if (typeof window !== "undefined") localStorage.setItem("pumpkin_admin_collapsed_groups", JSON.stringify([...next]));
      return next;
    });
  }
  const [hasPat, setHasPat] = useState(() =>
    typeof window !== "undefined" ? !!localStorage.getItem("pumpkin_github_pat") : false
  );
  // Refresh PAT status whenever sidebar footer mounts or window focuses
  useEffect(() => {
    function checkPat() { setHasPat(!!localStorage.getItem("pumpkin_github_pat")); }
    window.addEventListener("focus", checkPat);
    return () => window.removeEventListener("focus", checkPat);
  }, []);
  const conv        = stats.conversations[period];
  const site        = stats.site_visitors[period];
  const feedback    = stats.feedback[period];
  const topQs       = stats.top_questions[period];
  const exp         = stats.experience[period];
  const blogEng     = stats.blog_engagement[period];
  const siteLocations = stats.location.site[period];
  const chatLocations = stats.location.chat[period];
  const pages       = stats.pages[period];
  const models      = stats.models?.[period] ?? [];
  const topPosts    = [...stats.blog.posts].sort((a, b) => b.views - a.views).slice(0, 8);

  type NavItem = { key: typeof activeView; label: string; group: string };
  const NAV: NavItem[] = [
    { key: "analytics",    label: "Analytics",    group: "Overview"  },
    { key: "write-blog",   label: "Write Blog",   group: "Content"   },
    { key: "blog-api",     label: "Blog · API",   group: "Content"   },
    { key: "write-lab",    label: "Write Lab",    group: "Content"   },
    { key: "lab",          label: "Lab · API",    group: "Content"   },
    { key: "quotes",       label: "Quotes",       group: "Content"   },
    { key: "quotes-api",   label: "Quotes · API", group: "Content"   },
    { key: "profile",      label: "Profile",      group: "Portfolio" },
    { key: "hero-stats",   label: "Hero Stats",   group: "Portfolio" },
    { key: "spotlights",   label: "Spotlights",   group: "Portfolio" },
    { key: "experience",   label: "Experience",   group: "Portfolio" },
    { key: "education",    label: "Education",    group: "Portfolio" },
    { key: "projects",     label: "Projects",     group: "Portfolio" },
    { key: "apps",         label: "Hosted Apps",  group: "Portfolio" },
    { key: "skills",       label: "Skills",       group: "Portfolio" },
    { key: "testimonials", label: "Testimonials", group: "Portfolio" },
    { key: "gallery",      label: "Gallery",      group: "Portfolio" },
    { key: "sync",         label: "Sync",         group: "Settings"  },
    { key: "data",         label: "Raw JSON",     group: "Settings"  },
    { key: "availability", label: "Availability", group: "Settings"  },
    { key: "now",          label: "Now Page",     group: "Settings"  },
    { key: "integrations", label: "Integrations", group: "Settings"  },
  ];
  const groups = ["Overview", "Content", "Portfolio", "Settings"] as const;

  const VIEW_LABELS: Record<typeof activeView, string> = {
    analytics: "Analytics", "write-blog": "Write Blog", "write-lab": "Write Lab", quotes: "Quotes",
    "blog-api": "Blog (API)", lab: "Lab (API)", "quotes-api": "Quotes (API)",
    availability: "Availability", now: "Now Page", data: "Raw JSON", sync: "Sync Status",
    integrations: "Google Integrations",
    profile: "Profile", "hero-stats": "Hero Stats", experience: "Experience",
    education: "Education", projects: "Projects", apps: "Hosted Apps", skills: "Skills", testimonials: "Testimonials",
    gallery: "Gallery", spotlights: "Spotlights",
  };

  function NavIcon({ navKey }: { navKey: string }) {
    const paths: Record<string, React.ReactNode> = {
      analytics:     <><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></>,
      "write-blog":  <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"/></>,
      "write-lab":   <><path d="M8 3v8l-4 9h16l-4-9V3M6 3h12"/><path d="M9 14h6"/></>,
      "blog-api":    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
      lab:           <><path d="M8 3v8l-4 9h16l-4-9V3M6 3h12"/></>,
      quotes:        <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
      "quotes-api":  <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
      profile:       <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
      "hero-stats":  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
      experience:    <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
      education:     <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
      projects:      <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
      apps:          <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
      spotlights:    <><path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z"/></>,
      skills:        <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
      testimonials:  <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
      gallery:       <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
      sync:          <><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
      data:          <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
      availability:  <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
      now:           <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
      integrations:  <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,
    };
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-80">
        {paths[navKey]}
      </svg>
    );
  }

  // Rendered as a plain function (not <NavList/>) so it never remounts and keeps
  // its collapse/search state stable across renders.
  function renderNav(onSelect?: () => void) {
    const q = navQuery.trim().toLowerCase();
    const matched = NAV.filter(n => !q || n.label.toLowerCase().includes(q));
    return (
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1" style={{ scrollbarWidth: "none" }}>
        {/* Quick filter */}
        <div className="px-1 pb-2">
          <div className="relative">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Find a section…"
              className="w-full rounded-lg border border-border bg-bg pl-8 pr-7 py-1.5 text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
            />
            {navQuery && (
              <button onClick={() => setNavQuery("")} aria-label="Clear"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg p-0.5 rounded">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {groups.map(g => {
          const items = matched.filter(n => n.group === g);
          if (items.length === 0) return null;
          const collapsed = !q && collapsedGroups.has(g);
          const groupActive = items.some(n => n.key === activeView);
          return (
            <div key={g}>
              <button
                onClick={() => toggleGroup(g)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-widest">{g}</span>
                {groupActive && <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />}
                <span className="ml-auto text-[9px] font-semibold tabular-nums text-fg-faint bg-surface-raised rounded px-1.5 py-0.5">{items.length}</span>
              </button>
              {!collapsed && (
                <div className="mt-0.5 mb-1.5 space-y-px">
                  {items.map(n => {
                    const isActive = activeView === n.key;
                    return (
                      <button
                        key={n.key}
                        onClick={() => { setActiveView(n.key); setNavQuery(""); onSelect?.(); }}
                        className={`group/i w-full flex items-center gap-2.5 pl-2.5 pr-2 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-500/5"
                            : "text-fg-muted hover:text-fg hover:bg-surface-raised"
                        }`}
                      >
                        <span className={`shrink-0 transition-colors ${isActive ? "text-indigo-500" : "text-fg-faint group-hover/i:text-fg-muted"}`}>
                          <NavIcon navKey={n.key} />
                        </span>
                        <span className="truncate">{n.label}</span>
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {q && matched.length === 0 && (
          <p className="px-3 py-6 text-[11px] text-fg-faint text-center">No sections match &ldquo;{navQuery}&rdquo;</p>
        )}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 max-w-[85vw] flex flex-col bg-surface border-r border-border
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Sidebar header */}
        <div className="flex items-center gap-2.5 px-4 py-[14px] border-b border-border shrink-0">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/20 shrink-0">
            <span className="text-white font-bold text-sm leading-none select-none">A</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-fg leading-tight tracking-tight">Pumpkin</p>
            <p className="text-[10px] text-fg-faint leading-none mt-0.5">Admin Dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-fg-faint hover:text-fg lg:hidden p-0.5 rounded-md hover:bg-surface-raised transition-colors"
            aria-label="Close sidebar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Nav items */}
        {renderNav(() => setSidebarOpen(false))}

        {/* Sidebar footer */}
        <div className="shrink-0 px-4 pt-2 pb-3 border-t border-border" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <p className="text-[9px] text-fg-subtle tracking-wide">taruni-portfolio.vercel.app</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 border-b border-border bg-surface/80 backdrop-blur-md shrink-0 sticky top-0 z-30" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))', paddingBottom: '0.625rem' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-fg-muted hover:text-fg p-2 -ml-1 rounded-md hover:bg-surface-raised transition-colors"
            aria-label="Open sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <p className="text-sm font-semibold text-fg truncate">{VIEW_LABELS[activeView]}</p>
          </div>
          {lastUpdated && (
            <span className="text-[10px] text-fg-faint tabular-nums hidden sm:inline">
              {refreshing ? "Refreshing…" : secondsAgo < 10 ? "Just now" : `${secondsAgo}s ago`}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-md text-fg-faint hover:text-fg hover:bg-surface-raised transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className={refreshing ? "animate-spin" : ""}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <span className="w-px h-4 bg-border shrink-0" />
          {/* GitHub status dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${hasPat ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`}
            title={hasPat ? "GitHub PAT connected" : "No GitHub PAT set"}
          />
          {/* View site */}
          <Link
            href="/"
            className="p-1.5 rounded-md text-fg-faint hover:text-fg hover:bg-surface-raised transition-colors"
            title="View site"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </Link>
          {/* Sign out */}
          <button
            onClick={onLogout}
            className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Sign out"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-surface/90 backdrop-blur-md shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-fg-faint font-medium">Pumpkin Admin</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span className="font-semibold text-fg truncate">{VIEW_LABELS[activeView]}</span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] text-fg-faint tabular-nums mr-0.5">
                {refreshing ? "Refreshing…" : secondsAgo < 10 ? "Just updated" : `Updated ${secondsAgo}s ago`}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-faint hover:text-fg border border-border hover:border-fg-faint rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={refreshing ? "animate-spin" : ""}>
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
            <span className="w-px h-4 bg-border shrink-0" />
            {/* GitHub PAT status */}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded ${hasPat ? "text-fg-faint" : "text-amber-600 dark:text-amber-400"}`}
              title={hasPat ? "GitHub PAT connected — editors ready" : "No GitHub PAT set — editors will not load"}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasPat ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
              {hasPat ? "GitHub" : "No PAT"}
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-faint hover:text-fg border border-border hover:border-fg-faint rounded-lg px-2.5 py-1.5 transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              View site
            </Link>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-500 hover:text-rose-400 border border-rose-200 dark:border-rose-800 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-2.5 py-1.5 transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

        {/* Period tabs — analytics only */}
        {activeView === "analytics" && (
          <div className="w-full sm:w-fit">
            <div className="grid grid-cols-3 sm:flex gap-1 bg-surface-raised rounded-xl p-1 border border-border">
            {(["week", "month", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  period === p
                    ? "bg-fg text-bg shadow-sm"
                    : "text-fg-muted hover:text-fg hover:bg-surface"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            </div>
          </div>
        )}

        {activeView === "write-blog" && <BlogEditor />}
        {activeView === "write-lab" && <LabEditor />}
        {activeView === "quotes" && <QuotesEditor />}
        {activeView === "blog-api" && <ContentBlogEditor />}
        {activeView === "lab" && <ContentLabEditor />}
        {activeView === "quotes-api" && <ContentQuotesEditor />}
        {activeView === "availability" && <AvailabilityEditor />}
        {activeView === "now"          && <NowEditor />}
        {activeView === "profile"      && <ProfileEditor />}
        {activeView === "hero-stats"   && <HeroStatsEditor />}
        {activeView === "spotlights"   && <SpotlightsEditor />}
        {activeView === "experience"   && <ExperienceEditor />}
        {activeView === "education"    && <EducationEditor />}
        {activeView === "projects"     && <ProjectsEditor />}
        {activeView === "apps"         && <AppsEditor />}
        {activeView === "skills"       && <SkillsEditor />}
        {activeView === "testimonials" && <TestimonialsEditor />}
        {activeView === "gallery" && <GalleryEditor />}
        {activeView === "sync" && <SyncStatusPanel />}
        {activeView === "data" && <KnowledgeDataView />}
        {activeView === "integrations" && <GoogleIntegrationsPanel />}

        {/* Analytics content */}
        {activeView === "analytics" && (<>

        {/* Top stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <StatCard
            label="Site Visitors"
            value={site.unique_visitors}
            sub={`${fmt(site.total_visits)} total page loads`}
            color="indigo"
          />
          <StatCard
            label="Chat Users"
            value={conv.unique_visitors}
            sub={`${(Math.round(conv.total_responses / Math.max(conv.unique_visitors, 1) * 10) / 10).toFixed(1)} avg msgs/visitor`}
          />
          <StatCard
            label="Conversations"
            value={conv.total_responses}
            sub={`${fmt(conv.sessions)} session${conv.sessions !== 1 ? "s" : ""}`}
          />
          <StatCard
            label="Satisfaction"
            value={feedback.total > 0 ? `${feedback.satisfaction_pct}%` : "—"}
            sub={`from ${feedback.total} rated responses`}
            color={feedback.satisfaction_pct >= 70 ? "emerald" : feedback.satisfaction_pct > 0 ? "rose" : "default"}
          />
          <StatCard
            label="Avg Experience"
            value={exp.total > 0 ? `${exp.average}/5` : "—"}
            sub={`from ${exp.total} visitor rating${exp.total !== 1 ? "s" : ""}`}
            color={exp.average >= 4 ? "emerald" : exp.average >= 3 ? "default" : exp.total > 0 ? "rose" : "default"}
          />
          <StatCard
            label="Blog Views"
            value={stats.blog.total_views}
            sub={`${fmt(stats.blog.total_claps)} claps across ${stats.blog.posts.length} posts`}
          />
        </div>

        {/* 30-day trends */}
        <TrendsPanel trends={stats.trends} />

        {/* Pumpkin model health */}
        <ModelHealthPanel models={models} />

        {/* Knowledge base reingest */}
        <ReingestPanel />

        {/* Metrics cleanup */}
        <PruneAnalyticsPanel />

        {/* Questions + Feedback */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Top questions */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle mb-4">Top Questions</h2>
            {topQs.length === 0 ? (
              <p className="text-sm text-fg-faint">No questions logged yet.</p>
            ) : (
              <ol className="space-y-2">
                {topQs.map((q, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono text-fg-faint mt-0.5 w-4 shrink-0">{i + 1}.</span>
                    <span className="text-xs text-fg-muted leading-relaxed flex-1 min-w-0 truncate" title={q.text}>
                      {q.text}
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums bg-surface-raised border border-border rounded-lg px-2 py-0.5 text-fg-muted shrink-0">
                      {q.count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Feedback breakdown */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4 sm:space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Response Feedback</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-surface-raised border border-border p-2.5 text-center">
                <p className="text-xl sm:text-2xl font-bold text-fg">{feedback.total}</p>
                <p className="text-[9px] sm:text-[10px] text-fg-faint mt-0.5">Total rated</p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 text-center">
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{feedback.positive}</p>
                <p className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-500 mt-0.5 flex items-center justify-center gap-0.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  Positive
                </p>
              </div>
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-center">
                <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">{feedback.negative}</p>
                <p className="text-[9px] sm:text-[10px] text-rose-700 dark:text-rose-500 mt-0.5 flex items-center justify-center gap-0.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                  Negative
                </p>
              </div>
            </div>
            <SatisfactionBar positive={feedback.positive} negative={feedback.negative} />

            {/* All-time conversation comparison */}
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-fg-subtle">Conversations by period</p>
              {(["week", "month", "all"] as Period[]).map((p) => {
                const c = stats.conversations[p];
                const maxVal = stats.conversations.all.total_responses || 1;
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span className="text-[10px] text-fg-faint w-20 shrink-0">{PERIOD_LABELS[p]}</span>
                    <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${Math.round((c.total_responses / maxVal) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-fg-muted w-8 text-right shrink-0">
                      {fmt(c.total_responses)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visitor Experience Ratings */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Visitor Experience</h2>
            {exp.total > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} width="13" height="13" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      className={s <= Math.round(exp.average) ? "fill-amber-400 stroke-amber-400" : "fill-none stroke-fg-faint"}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-fg">{exp.average}</span>
                <span className="text-[10px] text-fg-faint">/ 5 from {exp.total} rating{exp.total !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
          {exp.total === 0 ? (
            <p className="text-xs text-fg-faint">No ratings yet — visitors will see the rating widget after their first chat exchange.</p>
          ) : (
            <div className="space-y-2">
              {[5,4,3,2,1].map((star) => {
                const count = exp.distribution[star] ?? 0;
                const pct = exp.total > 0 ? Math.round((count / exp.total) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-[11px] text-fg-faint w-4 shrink-0 text-right">{star}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-fg-faint w-6 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Site visitors breakdown */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Site Visitors</h2>
            <span className="text-[11px] text-fg-faint">all unique IPs, hashed — every page load</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {(["week", "month", "all"] as Period[]).map((p) => {
              const sv = stats.site_visitors[p];
              return (
                <div key={p} className={`rounded-lg border p-3 text-center ${p === period ? "border-accent bg-accent/5" : "border-border bg-surface-raised"}`}>
                  <p className="text-xl sm:text-2xl font-bold tabular-nums text-fg">{fmt(sv.unique_visitors)}</p>
                  <p className="text-[9px] sm:text-[10px] text-fg-faint mt-0.5">{PERIOD_LABELS[p]}</p>
                  <p className="text-[9px] text-fg-faint">{fmt(sv.total_visits)} loads</p>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            {(["week", "month", "all"] as Period[]).map((p) => {
              const sv = stats.site_visitors[p];
              const maxVal = stats.site_visitors.all.unique_visitors || 1;
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="text-[10px] text-fg-faint w-20 shrink-0">{PERIOD_LABELS[p]}</span>
                  <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.round((sv.unique_visitors / maxVal) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-fg-muted w-8 text-right shrink-0">{fmt(sv.unique_visitors)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blog table */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Blog Performance</h2>
            <div className="flex items-center gap-3 text-[11px] text-fg-faint">
              <span><strong className="text-fg-muted">{fmt(stats.blog.total_views)}</strong> views</span>
              <span><strong className="text-fg-muted">{fmt(stats.blog.total_claps)}</strong> claps</span>
            </div>
          </div>
          {topPosts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-fg-faint">No blog data yet.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[320px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 sm:px-5 py-2.5 text-fg-subtle font-semibold uppercase tracking-wider text-[10px]">Post</th>
                  <th className="text-right px-3 sm:px-5 py-2.5 text-fg-subtle font-semibold uppercase tracking-wider text-[10px]">Views</th>
                  <th className="text-right px-3 sm:px-5 py-2.5 text-fg-subtle font-semibold uppercase tracking-wider text-[10px]">Claps</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((p, i) => (
                  <tr key={p.slug} className={i < topPosts.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-3 sm:px-5 py-3 text-fg-muted font-medium max-w-[140px] sm:max-w-xs">
                      <a
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent transition-colors truncate block"
                      >
                        {p.slug}
                      </a>
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-right tabular-nums text-fg-muted font-semibold">{fmt(p.views)}</td>
                    <td className="px-3 sm:px-5 py-3 text-right tabular-nums text-fg-muted">{fmt(p.claps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Location breakdown */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle mb-4">Visitor Locations</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {([["Site Visitors", siteLocations], ["Chat Users", chatLocations]] as [string, LocationStat[]][]).map(([label, locs]) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-2">{label}</p>
                {locs.length === 0 ? (
                  <p className="text-xs text-fg-faint">No geo data yet — populates as visitors arrive.</p>
                ) : (
                  <div className="space-y-1.5">
                    {locs.map((l) => {
                      const maxV = locs[0]?.unique_visitors || 1;
                      const pct = Math.round((l.unique_visitors / maxV) * 100);
                      return (
                        <div key={l.country} className="flex items-center gap-2">
                          <span className="text-[11px] text-fg-muted w-20 sm:w-28 shrink-0 truncate">{l.country}</span>
                          <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums text-fg-faint w-6 text-right shrink-0">{fmt(l.unique_visitors)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Page visits */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle mb-4">Top Pages</h2>
          {pages.length === 0 ? (
            <p className="text-xs text-fg-faint">No page data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {pages.map((p) => {
                const maxS = pages[0]?.sessions || 1;
                const pct = Math.round((p.sessions / maxS) * 100);
                return (
                  <div key={p.page} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-fg-muted w-24 sm:w-36 shrink-0 truncate" title={p.page}>{p.page}</span>
                    <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-fg-faint shrink-0">{fmt(p.sessions)} sessions</span>
                    <span className="text-[10px] tabular-nums text-fg-faint shrink-0 hidden sm:inline">{fmt(p.unique_visitors)} uniq</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Blog engagement — session-based opens + revisits */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Blog Engagement</h2>
            <div className="flex items-center gap-3 text-[11px] text-fg-faint">
              <span><strong className="text-fg-muted">{fmt(blogEng.total_opens)}</strong> total opens</span>
              <span className="text-[9px]">· 10-min session dedup · revisit = same IP opens again after 10 min</span>
            </div>
          </div>
          {blogEng.posts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-fg-faint">No blog session data yet — populates as readers open posts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[440px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 sm:px-5 py-2.5 text-fg-subtle font-semibold uppercase tracking-wider text-[10px]">Post</th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-fg-subtle font-semibold uppercase tracking-wider text-[10px]">Opens</th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-fg-subtle font-semibold uppercase tracking-wider text-[10px]">Readers</th>
                    <th className="text-right px-3 sm:px-5 py-2.5 text-fg-subtle font-semibold uppercase tracking-wider text-[10px]">Revisit %</th>
                  </tr>
                </thead>
                <tbody>
                  {blogEng.posts.map((p, i) => (
                    <tr key={p.slug} className={i < blogEng.posts.length - 1 ? "border-b border-border" : ""}>
                      <td className="px-3 sm:px-5 py-3 text-fg-muted font-medium max-w-[140px] sm:max-w-xs">
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"
                           className="hover:text-accent transition-colors truncate block">{p.slug}</a>
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right tabular-nums text-fg-muted font-semibold">{fmt(p.total_opens)}</td>
                      <td className="px-3 sm:px-5 py-3 text-right tabular-nums text-fg-muted">{fmt(p.unique_readers)}</td>
                      <td className="px-3 sm:px-5 py-3 text-right tabular-nums">
                        <span className={`font-semibold ${p.revisit_rate >= 30 ? "text-emerald-600 dark:text-emerald-400" : "text-fg-muted"}`}>
                          {p.revisit_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Site Guide */}
        <SiteGuide />

        <p className="text-center text-[10px] text-fg-faint pb-4">
          Pumpkin Admin · {new Date().getFullYear()} · Auto-refreshes every 60s
        </p>

        </>)}

          </div>
        </main>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const AUTO_REFRESH_MS = 60_000;
const SESSION_TTL_MS  = 4 * 60 * 60 * 1000; // 4 hours

// Token lives in localStorage (not sessionStorage) so it's readable by the
// every-helper `localStorage.getItem("pumpkin_admin_token")` calls AND by the
// Google OAuth callback, which runs in a separate popup window that does not
// share the opener's sessionStorage. Expiry is enforced via the companion key.
function saveSession(t: string) {
  localStorage.setItem("pumpkin_admin_token", t);
  localStorage.setItem("pumpkin_admin_exp", String(Date.now() + SESSION_TTL_MS));
}

function clearSession() {
  localStorage.removeItem("pumpkin_admin_token");
  localStorage.removeItem("pumpkin_admin_exp");
}

function loadSession(): string | null {
  const t   = localStorage.getItem("pumpkin_admin_token");
  const exp = Number(localStorage.getItem("pumpkin_admin_exp") ?? 0);
  if (!t || Date.now() > exp) { clearSession(); return null; }
  return t;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Restore token from sessionStorage after hydration (checks expiry)
  useEffect(() => {
    const saved = loadSession();
    if (saved) setToken(saved);
  }, []);

  // Auto-expire: check every minute
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      if (!loadSession()) { clearSession(); setToken(null); setStats(null); setLastUpdated(null); }
    }, 60_000);
    return () => clearInterval(id);
  }, [token]);

  const fetchStats = (t: string, silent = false) => {
    if (!silent) setRefreshing(true);
    return fetch(`${API_BASE_URL}/stats/admin`, { headers: { Authorization: `Bearer ${t}` } })
      .then(async (res) => {
        if (!res.ok) { clearSession(); setToken(null); return; }
        setStats(await res.json());
        setLastUpdated(new Date());
        setSecondsAgo(0);
        setError("");
      })
      .catch(() => setError("Failed to load stats — is the backend reachable?"))
      .finally(() => setRefreshing(false));
  };

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    if (!token) return;
    fetchStats(token);
    const interval = setInterval(() => fetchStats(token, true), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // "X seconds ago" ticker
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    }, 5000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  function handleAuth(t: string) {
    saveSession(t);
    setToken(t);
  }

  function handleLogout() {
    clearSession();
    setToken(null);
    setStats(null);
    setLastUpdated(null);
  }

  if (!token) return <LoginForm onAuth={handleAuth} />;

  if (error && !stats) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-rose-600">{error}</p>
    </div>
  );

  if (!stats) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-fg-faint animate-pulse">Loading stats…</p>
    </div>
  );

  return (
    <Dashboard
      stats={stats}
      onLogout={handleLogout}
      onRefresh={() => token && fetchStats(token)}
      refreshing={refreshing}
      secondsAgo={secondsAgo}
      lastUpdated={lastUpdated}
    />
  );
}
