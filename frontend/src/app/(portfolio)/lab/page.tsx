import { getAllLabEntries } from "@/lib/lab";
import LabSectionDynamic from "@/components/lab/LabSectionDynamic";
import BlogSwitcher from "@/components/blog/BlogSwitcher";
import { profile } from "@/data/profile";

export const metadata = { title: "Lab — Taruni Nallamothu" };

export default function LabPage() {
  // Build-time MDX entries — used as fallback if the API is unreachable
  const staticEntries = getAllLabEntries();
  const activeCount  = staticEntries.filter((e) => e.status === "active").length;
  const shippedCount = staticEntries.filter((e) => e.status === "shipped").length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-12 sm:mb-16 relative">
        {/* Decorative background bloom */}
        <div
          className="absolute -top-8 -right-8 w-72 h-72 rounded-full blur-3xl pointer-events-none -z-10"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(20,184,166,0.06) 60%, transparent 100%)" }}
          aria-hidden
        />

        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">Build Log · In the Open</p>

        {/* Title with decorative glyph + switcher */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-baseline gap-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-fg">Lab</h1>
            <code className="text-lg sm:text-xl font-mono text-fg-faint select-none" aria-hidden>⬡</code>
          </div>
          <BlogSwitcher
            posts={staticEntries.map((e) => ({ slug: e.slug, title: e.title, date: e.updatedAt }))}
            label="Browse"
            listTitle="All entries"
            basePath="/lab"
          />
        </div>

        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">Building in public</p>

        {profile.page_lab && (
          <p className="text-sm text-fg-subtle max-w-xl leading-relaxed">
            {profile.page_lab}
          </p>
        )}

        {/* Stat chips — derived from staticEntries; updates after API hydrates */}
        {staticEntries.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-sm px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeCount} active
              </span>
            )}
            {shippedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-sm px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {shippedCount} shipped
              </span>
            )}
            <span className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-sm px-3 py-1">
              {staticEntries.length} experiment{staticEntries.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </header>

      {/* LabSectionDynamic fetches from API on the client; falls back to staticEntries */}
      <LabSectionDynamic staticEntries={staticEntries} />
    </div>
  );
}
