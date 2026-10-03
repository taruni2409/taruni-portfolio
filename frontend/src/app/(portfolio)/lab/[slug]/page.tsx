import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import rehypeSlug from "rehype-slug";
import { getAllLabEntries, getAllLabSlugs, getLabEntryBySlug, LabStatus } from "@/lib/lab";
import type { LabMeta } from "@/lib/lab";
import { labMDXComponents } from "@/components/lab/LabMDXComponents";
import { TableOfContents, MobileTOC } from "@/components/blog/TableOfContents";
import type { Heading } from "@/components/blog/TableOfContents";
import FontSizeControl from "@/components/blog/FontSizeControl";
import BlogSwitcher from "@/components/blog/BlogSwitcher";
import ProseReveal from "@/components/blog/ProseReveal";
import BlogPostMarkdown from "@/components/blog/BlogPostMarkdown";
import { normalizeLabEntry } from "@/lib/api/content";
import type { ApiLabEntry } from "@/lib/api/content";

type Props = { params: Promise<{ slug: string }> };

// Without this, a slug that was once returned by generateStaticParams (e.g. from
// the backend's content.db when it was briefly reachable) but no longer is can
// still be served from Vercel's ISR cache indefinitely — a stale/deleted entry
// stays live forever instead of 404ing once it drops out of the build's slug list.
export const dynamicParams = false;

const STATUS_STYLES: Record<LabStatus, { dot: string; text: string; bg: string; label: string }> = {
  active:  { dot: "bg-emerald-400 animate-pulse", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800", label: "Active" },
  shipped: { dot: "bg-indigo-400",                text: "text-indigo-700 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800",   label: "Shipped" },
  paused:  { dot: "bg-amber-400",                 text: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",     label: "Paused" },
};

function extractHeadings(markdown: string): Heading[] {
  return [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].map(([, hashes, text]) => ({
    level: hashes.length as 2 | 3,
    text: text.trim(),
    id: text.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-"),
  }));
}

async function getMergedAllLabEntries(): Promise<LabMeta[]> {
  const mdxEntries = getAllLabEntries();
  const mdxSlugs = new Set(mdxEntries.map((e) => e.slug));
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const res = await fetch(`${apiUrl}/content/lab`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const apiEntries: ApiLabEntry[] = await res.json();
      const extras = apiEntries.filter((e) => !mdxSlugs.has(e.slug)).map(normalizeLabEntry);
      const STATUS_ORDER: Record<LabStatus, number> = { active: 0, paused: 1, shipped: 2 };
      return [...mdxEntries, ...extras].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.updatedAt < b.updatedAt ? 1 : -1)
      );
    }
  } catch { /* API not available at build time — use MDX only */ }
  return mdxEntries;
}

/** Full-featured view for admin-created lab entries (no MDX file, plain markdown content). */
function LabEntryApiView({ entry, allEntries }: { entry: ApiLabEntry; allEntries: LabMeta[] }) {
  const s = STATUS_STYLES[entry.status as LabStatus] ?? STATUS_STYLES.active;
  const idx = allEntries.findIndex((e) => e.slug === entry.slug);
  const prev = allEntries[idx + 1] ?? null;
  const next = allEntries[idx - 1] ?? null;
  const switcherEntries = allEntries.map((e) => ({ slug: e.slug, title: e.title, date: e.updatedAt }));
  const headings = extractHeadings(entry.content);

  return (
    <>
    <div className="mx-auto w-full max-w-3xl lg:max-w-[68rem] px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/lab"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Lab
        </Link>
        <div className="hidden sm:block">
          <BlogSwitcher posts={switcherEntries} currentSlug={entry.slug} label="Browse" listTitle="All entries" basePath="/lab" />
        </div>
      </div>

      <div className="lg:flex lg:gap-14 lg:items-start">
        <div className="flex-1 min-w-0">
          <article>
            <header className="mb-10 pb-8 border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-semibold ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="text-[11px] text-fg-faint">started {entry.started_at}</span>
                  <span className="text-fg-faint/40 select-none" aria-hidden>·</span>
                  <span className="text-[11px] text-fg-faint">updated {entry.updated_at}</span>
                </div>
                <FontSizeControl />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg leading-tight mb-3">
                {entry.title}
              </h1>
              <p className="text-sm text-fg-subtle leading-relaxed mb-4">{entry.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {entry.tech.map((t) => (
                  <span key={t} className="rounded-sm bg-surface-raised px-2.5 py-1 text-[11px] font-mono font-medium text-fg-muted border border-border">
                    {t}
                  </span>
                ))}
                {entry.links?.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M7 17L17 7M17 7H7M17 7v10"/>
                    </svg>
                  </a>
                ))}
              </div>

              <div className="sm:hidden mt-4">
                <BlogSwitcher posts={switcherEntries} currentSlug={entry.slug} label="Browse" listTitle="All entries" basePath="/lab" />
              </div>
            </header>

            <MobileTOC headings={headings} />

            <ProseReveal
              className="prose max-w-none leading-[1.85]"
              style={{ fontSize: "var(--blog-font-size, 1.0rem)" }}
            >
              <BlogPostMarkdown content={entry.content} />
            </ProseReveal>
          </article>

          <div className="mt-16 pt-8 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              {prev ? (
                <Link
                  href={`/lab/${prev.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-xl border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Previous
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">{prev.title}</span>
                  <span className="text-[10px] text-fg-faint">updated {prev.updatedAt}</span>
                </Link>
              ) : <div />}
              {next ? (
                <Link
                  href={`/lab/${next.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-xl border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all text-right"
                >
                  <span className="inline-flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    Next
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">{next.title}</span>
                  <span className="text-[10px] text-fg-faint">updated {next.updatedAt}</span>
                </Link>
              ) : <div />}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/lab"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint hover:text-accent transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to all entries
              </Link>
            </div>
          </div>
        </div>

        {headings.length >= 2 && (
          <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>
    </div>
    </>
  );
}

export async function generateStaticParams() {
  const slugs = new Set(getAllLabSlugs());
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const res = await fetch(`${apiUrl}/content/lab`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const apiEntries: { slug: string }[] = await res.json();
      for (const e of apiEntries) slugs.add(e.slug);
    }
  } catch {
    // API not available during build — filesystem slugs are the baseline
  }
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = getLabEntryBySlug(slug);
  if (entry) return { title: `${entry.title} — Lab — Taruni Nallamothu` };

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const res = await fetch(`${apiUrl}/content/lab/${slug}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const apiEntry: ApiLabEntry = await res.json();
      return { title: `${apiEntry.title} — Lab — Taruni Nallamothu` };
    }
  } catch { /* silent */ }
  return {};
}

export default async function LabEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = getLabEntryBySlug(slug);

  // Build merged entry list once — used for switcher and prev/next in both views
  const allEntries = await getMergedAllLabEntries();

  // If not an MDX entry, try the content API (admin-created entry)
  if (!entry) {
    let apiEntry: ApiLabEntry | null = null;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/content/lab/${slug}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) apiEntry = await res.json();
    } catch { /* fall through to notFound */ }
    if (!apiEntry) notFound();
    return <LabEntryApiView entry={apiEntry} allEntries={allEntries} />;
  }

  const idx = allEntries.findIndex((e) => e.slug === slug);
  const prev = allEntries[idx + 1] ?? null;
  const next = allEntries[idx - 1] ?? null;

  const switcherEntries = allEntries.map((e) => ({
    slug: e.slug,
    title: e.title,
    date: e.updatedAt,
  }));

  const s = STATUS_STYLES[entry.status];

  const headings = extractHeadings(entry.content);

  return (
    <>
    <div className="mx-auto w-full max-w-3xl lg:max-w-[68rem] px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/lab"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Lab
        </Link>
        {/* Desktop: switcher in breadcrumb row */}
        <div className="hidden sm:block">
          <BlogSwitcher
            posts={switcherEntries}
            currentSlug={slug}
            label="Browse"
            listTitle="All entries"
            basePath="/lab"
          />
        </div>
      </div>

      <div className="lg:flex lg:gap-14 lg:items-start">
        <div className="flex-1 min-w-0">
          <article>
            <header className="mb-10 pb-8 border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-semibold ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="text-[11px] text-fg-faint">started {entry.startedAt}</span>
                  <span className="text-fg-faint/40 select-none" aria-hidden>·</span>
                  <span className="text-[11px] text-fg-faint">updated {entry.updatedAt}</span>
                </div>
                <FontSizeControl />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg leading-tight mb-3">
                {entry.title}
              </h1>
              <p className="text-sm text-fg-subtle leading-relaxed mb-4">{entry.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {entry.tech.map((t) => (
                  <span key={t} className="rounded-sm bg-surface-raised px-2.5 py-1 text-[11px] font-mono font-medium text-fg-muted border border-border">
                    {t}
                  </span>
                ))}
                {entry.links?.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M7 17L17 7M17 7H7M17 7v10"/>
                    </svg>
                  </a>
                ))}
              </div>

              {/* Mobile: switcher below heading where dropdown has room to open */}
              <div className="sm:hidden mt-4">
                <BlogSwitcher
                  posts={switcherEntries}
                  currentSlug={slug}
                  label="Browse"
                  listTitle="All entries"
                  basePath="/lab"
                />
              </div>
            </header>

            {/* Mobile TOC — collapsible, before content */}
            <MobileTOC headings={headings} />

            <ProseReveal
              className="prose max-w-none leading-[1.85]"
              style={{ fontSize: "var(--blog-font-size, 1.0rem)" }}
            >
              <MDXRemote
                source={entry.content}
                components={labMDXComponents}
                options={{ mdxOptions: { rehypePlugins: [rehypeSlug] } }}
              />
            </ProseReveal>
          </article>

          <div className="mt-16 pt-8 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              {prev ? (
                <Link
                  href={`/lab/${prev.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-xl border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Previous
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">
                    {prev.title}
                  </span>
                  <span className="text-[10px] text-fg-faint">updated {prev.updatedAt}</span>
                </Link>
              ) : <div />}

              {next ? (
                <Link
                  href={`/lab/${next.slug}`}
                  className="group flex flex-col gap-1 p-4 rounded-xl border border-border hover:border-border-strong bg-surface hover:bg-surface-raised transition-all text-right"
                >
                  <span className="inline-flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint group-hover:text-fg-subtle transition-colors">
                    Next
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-fg-muted group-hover:text-fg transition-colors leading-snug line-clamp-2">
                    {next.title}
                  </span>
                  <span className="text-[10px] text-fg-faint">updated {next.updatedAt}</span>
                </Link>
              ) : <div />}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/lab"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint hover:text-accent transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to all entries
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop TOC sidebar */}
        {headings.length >= 2 && (
          <aside className="hidden lg:block w-52 shrink-0 sticky top-24 self-start">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>
    </div>
    </>
  );
}
