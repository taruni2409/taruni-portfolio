"use client";

import { useGitHubStaging } from "@/lib/githubStaging";

/** Sticky bottom toolbar: shows everything staged across editors and publishes it all
 *  in a single GitHub commit (→ one CI deploy). */
export default function PublishBar() {
  const ctx = useGitHubStaging();
  if (!ctx) return null;
  const { staged, count, publishAll, publishing, unstage, result, dismissResult } = ctx;

  if (count === 0 && !result) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        {count > 0 ? (
          <>
            <span className="text-sm font-semibold text-fg">
              {count} pending change{count > 1 ? "s" : ""}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {Object.keys(staged).map((path) => (
                <span key={path} className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-raised px-2 py-0.5 text-[11px] text-fg-muted">
                  {path.replace(/^.*\//, "").replace(/\.json$/, "")}
                  <button onClick={() => unstage(path)} aria-label={`Discard ${path}`} className="text-fg-faint hover:text-rose-500">×</button>
                </span>
              ))}
            </div>
            <button
              onClick={() => void publishAll()}
              disabled={publishing}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-fg shadow-sm shadow-accent/25 transition hover:bg-accent-hover active:scale-[0.97] disabled:opacity-60"
            >
              {publishing ? "Publishing…" : `Publish all (${count})`}
            </button>
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <span className={`text-sm font-medium ${result?.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {result?.message}
            </span>
            <button onClick={dismissResult} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg hover:bg-surface-raised">
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
