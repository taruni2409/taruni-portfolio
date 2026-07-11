"use client";

/** Shared design primitives used by every admin editor */

import { API_BASE_URL } from "@/lib/api/client";

// ── Background reingest trigger ───────────────────────────────────────────────
// Call after any content.db write so Pumpkin stays in sync automatically.
export function triggerReingest(): void {
  const token =
    typeof window !== "undefined"
      ? (localStorage.getItem("pumpkin_admin_token") ?? "")
      : "";
  if (!token) return;
  void fetch(`${API_BASE_URL}/admin/reingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// ── Base class strings (re-usable in editors that build inputs directly) ──────

export const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg " +
  "placeholder:text-fg-subtle focus:outline-none focus:border-accent " +
  "focus:ring-2 focus:ring-accent/10 transition-all disabled:opacity-40";

export const selectCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 " +
  "transition-all disabled:opacity-40";

// ── Section card wrapper ───────────────────────────────────────────────────────

export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Section header inside a card ──────────────────────────────────────────────

export function SectionHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-sm font-bold text-fg leading-tight">{title}</h2>
        {sub && <p className="text-[11px] text-fg-faint mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────

export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle mb-1.5 flex items-center gap-1">
      {children}
      {required && <span className="text-rose-500 normal-case tracking-normal font-normal">*</span>}
    </p>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────

export function TextInput({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputCls}
    />
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export function TextArea({
  value,
  onChange,
  placeholder = "",
  rows = 3,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${inputCls} resize-none`}
    />
  );
}

// ── Toggle pill ───────────────────────────────────────────────────────────────

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
        checked
          ? "bg-accent/10 border-accent/30 text-accent"
          : "border-border text-fg-muted hover:border-fg-muted hover:bg-surface-raised"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-fg-faint"
        }`}
      />
      {label}
    </button>
  );
}

// ── Result banner ─────────────────────────────────────────────────────────────

export function ResultBanner({
  result,
}: {
  result: { ok: boolean; message: string } | null;
}) {
  if (!result) return null;
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 text-xs ${
        result.ok
          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
      }`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 mt-0.5"
      >
        {result.ok ? (
          <path d="M20 6L9 17l-5-5" />
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        )}
      </svg>
      <span className="leading-relaxed">{result.message}</span>
    </div>
  );
}

// ── Dirty badge ───────────────────────────────────────────────────────────────

export function DirtyBadge({ dirty }: { dirty: boolean }) {
  if (!dirty) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Unsaved
    </span>
  );
}

// ── GitHub PAT row ────────────────────────────────────────────────────────────

export function GithubPATRow({
  pat,
  patVisible,
  setPatVisible,
  updatePat,
  loading,
  onLoad,
  loaded,
}: {
  pat: string;
  patVisible: boolean;
  setPatVisible: (v: boolean) => void;
  updatePat: (v: string) => void;
  loading: boolean;
  onLoad: () => void;
  loaded: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel>GitHub Token</FieldLabel>
        {loaded && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Connected
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type={patVisible ? "text" : "password"}
          value={pat}
          onChange={(e) => updatePat(e.target.value)}
          placeholder="ghp_…"
          className="flex-1 min-w-0 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-mono"
        />
        <button
          onClick={() => setPatVisible(!patVisible)}
          className="shrink-0 px-3 py-2 rounded-lg border border-border text-xs text-fg-muted hover:text-fg hover:bg-surface transition-colors"
        >
          {patVisible ? "Hide" : "Show"}
        </button>
        <button
          onClick={onLoad}
          disabled={!pat.trim() || loading}
          className="shrink-0 px-4 py-2 rounded-lg bg-surface border border-border text-xs font-semibold text-fg-muted hover:text-fg hover:border-fg-muted disabled:opacity-40 transition-all"
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>
      <p className="text-[10px] text-fg-faint leading-relaxed">
        Needs repo <code className="font-mono bg-bg px-1 rounded">contents:write</code> permission.
        Stored in localStorage — never sent to a third party.
      </p>
    </div>
  );
}

// ── Save row ──────────────────────────────────────────────────────────────────

export function SaveRow({
  onSave,
  saving,
  loaded,
  pat,
  dirty = true,
  label = "Save & Deploy",
}: {
  onSave: () => void;
  saving: boolean;
  loaded: boolean;
  pat: string;
  dirty?: boolean;
  label?: string;
}) {
  const disabled = !pat.trim() || !loaded || saving || !dirty;
  return (
    <div className="flex items-center gap-3 flex-wrap pt-5 border-t border-border">
      <button
        onClick={onSave}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-40 shadow-sm shadow-accent/20"
      >
        {saving ? (
          <>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Saving…
          </>
        ) : (
          <>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {label}
          </>
        )}
      </button>

      {!loaded && pat.trim() && (
        <p className="text-[11px] text-fg-faint flex items-center gap-1">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Click Load first
        </p>
      )}
      {dirty && loaded && pat.trim() && <DirtyBadge dirty={true} />}
    </div>
  );
}

// ── Move up/down buttons ──────────────────────────────────────────────────────

export function MoveButtons({
  idx,
  total,
  onMove,
}: {
  idx: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => onMove(-1)}
        disabled={idx === 0}
        className="p-1.5 rounded-md text-fg-faint hover:text-fg hover:bg-surface-raised disabled:opacity-20 transition-all"
        title="Move up"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={idx === total - 1}
        className="p-1.5 rounded-md text-fg-faint hover:text-fg hover:bg-surface-raised disabled:opacity-20 transition-all"
        title="Move down"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
