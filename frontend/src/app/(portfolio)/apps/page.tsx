import { apps, type AppStatus } from "@/data/apps";

export const metadata = {
  title: "Apps",
  description:
    "Everything Taruni hosts and runs under her domain — live apps, products, and sub-domains.",
  alternates: { canonical: "https://taruni-portfolio.vercel.app/apps" },
  openGraph: {
    type: "website" as const,
    url: "https://taruni-portfolio.vercel.app/apps",
    title: "Apps — Taruni Nallamothu",
    description: "Live apps and products hosted under taruni-portfolio.vercel.app — built, shipped, and operated end-to-end.",
  },
};

const STATUS_STYLE: Record<AppStatus, { dot: string; text: string; label: string }> = {
  live:     { dot: "bg-emerald-400", text: "text-emerald-700 dark:text-emerald-400", label: "Live" },
  beta:     { dot: "bg-sky-400",     text: "text-sky-700 dark:text-sky-400",         label: "Beta" },
  wip:      { dot: "bg-amber-400",   text: "text-amber-700 dark:text-amber-400",     label: "WIP" },
  archived: { dot: "bg-zinc-400",    text: "text-zinc-600 dark:text-zinc-400",       label: "Archived" },
};

function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return url.replace(/^https?:\/\//, ""); }
}

export default function AppsPage() {
  const liveCount = apps.filter((a) => a.status === "live").length;

  return (
    <div className="mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] px-4 sm:px-6 xl:px-8 py-12 sm:py-16">

      {/* Header */}
      <header className="mb-10 sm:mb-12">
        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">Work · Hosted</p>

        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-fg">Apps</h1>
          <span className="text-xl sm:text-2xl font-mono select-none text-fg-faint" aria-hidden>{"⌘"}</span>
        </div>

        <p className="text-sm text-fg-subtle max-w-xl leading-relaxed mb-4">
          Standalone apps and products I&apos;ve built, shipped, and host under my domain — each one designed,
          deployed, and operated end-to-end.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
            {apps.length} {apps.length === 1 ? "app" : "apps"}
          </span>
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {liveCount} live
            </span>
          )}
        </div>
      </header>

      {/* Grid */}
      {apps.length === 0 ? (
        <p className="text-sm text-fg-faint">No hosted apps yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {apps.map((app) => {
            const s = STATUS_STYLE[app.status] ?? STATUS_STYLE.live;
            return (
              <a
                key={app.slug}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl border border-border bg-surface p-5 hover:border-border-strong hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-base font-bold text-fg leading-snug group-hover:text-accent transition-colors">
                    {app.name}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 shrink-0 text-[10px] font-semibold ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${app.status === "live" ? "animate-pulse" : ""}`} />
                    {s.label}
                  </span>
                </div>

                {app.tagline && (
                  <p className="text-[13px] text-fg-subtle leading-relaxed mb-1">{app.tagline}</p>
                )}
                {app.description && (
                  <p className="text-xs text-fg-faint leading-relaxed mb-3 line-clamp-4">{app.description}</p>
                )}

                <div className="mt-auto space-y-3">
                  {app.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {app.tech.slice(0, 6).map((t) => (
                        <span key={t} className="rounded-sm bg-surface-raised border border-border px-2 py-0.5 text-[10px] font-mono font-medium text-fg-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-fg-faint">
                      {hostOf(app.url)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                      Visit
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M7 17L17 7M17 7H7M17 7v10" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
