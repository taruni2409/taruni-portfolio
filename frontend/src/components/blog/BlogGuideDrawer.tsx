"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api/client";

interface PeriodSiteStats {
  total_responses: number;
  unique_visitors: number;
}

interface PeriodBlogStats {
  total_claps: number;
  total_views: number;
  posts: { slug: string; views: number; claps: number }[];
}

interface Overview {
  site: Record<string, PeriodSiteStats>;
  blog: Record<string, PeriodBlogStats>;
}

const SECTIONS = [
  {
    heading: "New post frontmatter",
    code: `---
title: Your Title
date: "2026-04-21"
publishedAt: "2026-04-21"
description: One-line summary shown on index.
tags: [tag1, tag2]
---`,
    note: "publishedAt = immutable publish date used for sort order. date = display date (update freely). Filename becomes the URL slug: my-post.mdx → /blog/my-post",
  },
  {
    heading: "Headings",
    code: `## Section      ← large, border below
### Sub-section ← medium, no border
#### Label      ← uppercase small caps`,
  },
  {
    heading: "Text formatting",
    code: `**bold**        *italic*
\`inline code\`   ~~strikethrough~~

> blockquote pull quote

<Divider />   ← decorative section break`,
  },
  {
    heading: "Links & lists",
    code: `[link text](https://example.com)
[internal](/blog/my-post)

- bullet item
- another item
  - nested item

1. numbered item
2. second item`,
  },
  {
    heading: "Images",
    code: `<!-- basic -->
![alt text](/blog/file.jpg)

<!-- with caption -->
![alt text](/blog/file.jpg "Caption text")

<!-- component -->
<BlogImage
  src="/blog/file.jpg"
  alt="description"
  caption="optional caption"
/>`,
    note: "Put image files in frontend/public/blog/",
  },
  {
    heading: "Callout boxes",
    code: `<Callout type="info" title="Title">text</Callout>
<Callout type="tip" title="Title">text</Callout>
<Callout type="warning" title="Title">text</Callout>
<Callout type="quote" title="Title">text</Callout>`,
    note: "All MDX components (Callout, BlogImage, Divider, PullQuote) are auto-imported — no import statement needed.",
  },
  {
    heading: "Pull quote",
    code: `<PullQuote author="Optional Name">
  A line worth pausing on, set large and centered.
</PullQuote>`,
    note: "Large editorial quote for breaking up long sections. Author is optional.",
  },
  {
    heading: "Footnotes",
    code: `Here is a claim.[^1]

[^1]: The supporting note, shown at the end.`,
    note: "GFM footnotes — references link down to a styled notes section at the article end.",
  },
  {
    heading: "Code blocks",
    code: "```python\ndef hello(): return 'hi'\n```\n\nSupported: python typescript javascript\nbash json yaml sql go rust",
  },
  {
    heading: "Table",
    code: `| Col A | Col B |
|---|---|
| val   | val   |`,
  },
];

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default function BlogGuideDrawer() {
  const [open, setOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/stats/overview`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setOverview)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Footer-inline trigger — rendered by Footer.tsx via pathname check */}
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-fg-faint hover:text-accent transition-colors duration-300 inline-flex items-center gap-1"
      >
        <span className="text-[10px]">✦</span>
        Guide
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:max-w-sm bg-surface shadow-2xl border-l border-border flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Reference</p>
            <h2 className="text-sm font-bold text-fg mt-0.5">Site Guide & Maintenance</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-fg-faint hover:bg-surface-raised hover:text-fg-muted transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.heading}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent mb-2">{s.heading}</p>
              {s.note && (
                <p className="text-[11px] text-fg-faint mb-1.5 italic">{s.note}</p>
              )}
              <pre className="bg-zinc-950 text-zinc-300 text-[11px] leading-relaxed rounded-xl p-3.5 overflow-x-auto font-mono whitespace-pre-wrap break-words">
                {s.code}
              </pre>
            </div>
          ))}

          {/* Appendix — Project Maintenance */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-fg-faint mb-0.5">Appendix</p>
              <h3 className="text-sm font-bold text-fg">Project Maintenance</h3>
              <p className="text-[10px] text-fg-faint mt-1 leading-relaxed">Everything you need to keep the site up to date — data, blog posts, and deployments.</p>
            </div>

            {/* Live Stats Dashboard */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Live Stats</span>
                <div className="flex-1 h-px bg-border-subtle" />
                {overview && <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-semibold">● live</span>}
              </div>

              {!overview ? (
                <p className="text-[10px] text-fg-faint italic">Fetching stats…</p>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[260px] text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="text-left py-1.5 text-fg-faint font-semibold w-[40%]">Metric</th>
                        <th className="text-right py-1.5 text-fg-faint font-semibold">7d</th>
                        <th className="text-right py-1.5 text-fg-faint font-semibold">30d</th>
                        <th className="text-right py-1.5 text-fg-faint font-semibold">1y</th>
                        <th className="text-right py-1.5 text-fg-subtle font-semibold">All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {[
                        {
                          label: "Unique visitors",
                          values: (["week","month","year","all"] as const).map(p => fmt(overview.site[p].unique_visitors)),
                        },
                        {
                          label: "Pumpkin responses",
                          values: (["week","month","year","all"] as const).map(p => fmt(overview.site[p].total_responses)),
                        },
                        {
                          label: "Blog views",
                          values: (["week","month","year","all"] as const).map(p => fmt(overview.blog[p].total_views)),
                        },
                        {
                          label: "Blog claps",
                          values: (["week","month","year","all"] as const).map(p => fmt(overview.blog[p].total_claps)),
                        },
                      ].map(({ label, values }) => (
                        <tr key={label}>
                          <td className="py-1.5 text-fg-muted">{label}</td>
                          {values.map((v, i) => (
                            <td key={i} className={`py-1.5 text-right font-semibold ${i === 3 ? "text-fg" : "text-fg-subtle"}`}>{v}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t border-border">
                        <td className="py-1.5 text-fg-faint">Posts published</td>
                        <td colSpan={3} />
                        <td className="py-1.5 text-right font-semibold text-fg">
                          {overview.blog["all"].posts.length}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>

                  {overview.blog["all"].posts.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-fg-faint mb-1.5">Per-post (all time)</p>
                      <div className="overflow-x-auto -mx-1 px-1">
                      <table className="w-full min-w-[200px] text-[10px] border-collapse">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="text-left py-1 text-fg-faint font-semibold">Post</th>
                            <th className="text-right py-1 text-fg-faint font-semibold">Views</th>
                            <th className="text-right py-1 text-fg-faint font-semibold">Claps</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {[...overview.blog["all"].posts]
                            .sort((a, b) => b.views - a.views)
                            .map((post) => (
                              <tr key={post.slug}>
                                <td className="py-1 text-fg-subtle font-mono text-[9px] truncate max-w-[130px]">{post.slug}</td>
                                <td className="py-1 text-right text-fg-muted">{fmt(post.views)}</td>
                                <td className="py-1 text-right text-fg-muted">{fmt(post.claps)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Section 1 — Portfolio Data */}
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
                {
                  what: "Name, bio, tagline, location, contact",
                  file: "backend/data/knowledge/profile.json",
                  fields: "name, tagline, bio, summary, obsession, previous, prev_domain, interested_domain, location, email, phone, github, linkedin, resume",
                },
                {
                  what: "Work experience — roles, companies, bullet points",
                  file: "backend/data/knowledge/experience.json",
                  fields: "role, company, location, start, end, description, bullets[]",
                },
                {
                  what: "Education — degrees, institutions, highlights",
                  file: "backend/data/knowledge/education.json",
                  fields: "institution, school, degree, field, location, start, end, gpa, highlights[]",
                },
                {
                  what: "Projects — title, description, tags, links",
                  file: "backend/data/knowledge/projects.json",
                  fields: "title, description, tags[], featured, award, sourceLinks[{label,url}], note",
                },
                {
                  what: "Skills & tools — categories and items",
                  file: "backend/data/knowledge/skills.json",
                  fields: "category, items[]",
                },
                {
                  what: "Testimonials — name, role, company, quote",
                  file: "backend/data/knowledge/testimonials.json",
                  fields: "name, designation, company, linkedin, description, givenAt, source",
                },
              ].map(({ what, file, fields }) => (
                <div key={file} className="border border-border-subtle rounded-lg p-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="font-mono text-[10px] text-accent break-all">{file}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{fields}</p>
                </div>
              ))}
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded-lg p-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">⚠ Resume link is hardcoded in Nav.tsx</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed">
                  The resume Google Drive URL in <span className="font-mono">profile.json</span> powers the chatbot and home page, but <span className="font-mono">components/Nav.tsx</span> has a separate hardcoded copy in both desktop and mobile nav. Update both when the resume changes.
                </p>
              </div>
            </div>

            {/* Section 2 — Blog Posts */}
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
                {
                  what: "New post file",
                  file: "frontend/src/content/blog/my-post.mdx",
                  fields: "Filename → URL slug. Required frontmatter: title, date, publishedAt, description, tags[]",
                },
                {
                  what: "Post images",
                  file: "frontend/public/blog/",
                  fields: "Place image files here. Reference as /blog/filename.jpg in MDX.",
                },
                {
                  what: "Auto-generated chatbot index",
                  file: "backend/data/knowledge/blog.json",
                  fields: "Do not edit — auto-generated by scripts/sync-knowledge.mjs. GH Actions commits it on push; Railway re-ingests on deploy.",
                },
              ].map(({ what, file, fields }) => (
                <div key={file} className="border border-border-subtle rounded-lg p-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="font-mono text-[10px] text-accent break-all">{file}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{fields}</p>
                </div>
              ))}
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded-lg p-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">publishedAt vs date</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed">
                  <span className="font-mono">publishedAt</span> is the sort key — set it once and never change it.
                  <span className="font-mono"> date</span> is the display date — update freely (e.g. after a major revision).
                </p>
              </div>
            </div>

            {/* Section 2b — Lab Maintenance */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">2b · Lab — Living System Docs</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">
                Lab is for living, in-progress project documentation — architecture, decisions, and progress logs updated as the project evolves. Files live at <span className="font-mono bg-surface-raised px-1 rounded">frontend/src/content/lab/[slug].mdx</span>. Filename = URL slug.
              </p>

              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-faint mt-2">Frontmatter (required)</p>
              <pre className="bg-zinc-950 text-zinc-300 text-[11px] leading-relaxed rounded-xl p-3.5 overflow-x-auto font-mono whitespace-pre-wrap break-words">{`---
title: "My Project"
status: "active"        # active | paused | shipped
description: "One-line summary shown on lab index card."
startedAt: "2026-01-01"
updatedAt: "2026-04-22"  # ← update this every time you edit
tech: [Next.js, FastAPI, PostgreSQL]
---`}</pre>

              {[
                { what: "status: active", detail: "Green badge with pulse animation. Sorted to top of lab index. Use while actively building.", color: "emerald" },
                { what: "status: paused", detail: "Amber badge. Sorted second. Use when work is on hold.", color: "amber" },
                { what: "status: shipped", detail: "Indigo badge. Sorted last. Use when the project is complete and deployed.", color: "indigo" },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="font-mono text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}

              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded-lg p-2.5">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Always update updatedAt</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed mt-0.5">The lab index card shows &ldquo;last updated [date]&rdquo;. Set it to today&apos;s date every time you make changes or the card will show a stale date.</p>
              </div>

              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-faint mt-3">Lab MDX components</p>
              {[
                {
                  what: "<Status status=\"active\" />",
                  detail: "Inline status badge — same colors as the index card. Put it near the top of the document so status is visible in the post.",
                },
                {
                  what: "<Stack items={[\"Next.js\", \"Python\"]} />",
                  detail: "Renders a row of monospace tech tags. Use for a full tech stack listing inside the document body (separate from the frontmatter tech[] chips in the header).",
                },
                {
                  what: "<Metric value=\"99%\" label=\"uptime\" />",
                  detail: "Highlighted stat box. Use for key numbers — latency, users, accuracy, uptime. Group multiple Metrics in a flex row for a dashboard effect.",
                },
                {
                  what: "<Decision date=\"2026-01-10\" title=\"Why X over Y\">...</Decision>",
                  detail: "Timeline entry with indigo dot. Use for architectural decisions, technology choices, or design tradeoffs. Children text is the reasoning.",
                },
                {
                  what: "<Update date=\"2026-04-22\">...</Update>",
                  detail: "Lighter timeline entry with zinc dot. Use for progress notes, milestone completions, or status changes over time. Add a new Update entry each time you revisit the project.",
                },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="font-mono text-[10px] font-semibold text-accent break-all">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}

              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-faint mt-2">Architecture diagrams</p>
              <pre className="bg-zinc-950 text-zinc-300 text-[11px] leading-relaxed rounded-xl p-3.5 overflow-x-auto font-mono whitespace-pre-wrap break-words">{`\`\`\`arch
┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │
└─────────────┘     └─────────────┘
\`\`\``}</pre>
              <p className="text-[10px] text-fg-faint italic leading-relaxed">
                Always use fenced <span className="font-mono bg-surface-raised px-1 rounded">```arch</span> blocks for diagrams — never a JSX component. Characters like <span className="font-mono bg-surface-raised px-1 rounded">&lt;</span>, <span className="font-mono bg-surface-raised px-1 rounded">&gt;</span>, and <span className="font-mono bg-surface-raised px-1 rounded">{"{}"}</span> inside JSX children cause an MDX acorn parse error.
              </p>

              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-faint mt-2">Typical update workflow</p>
              {[
                { what: "Create a new lab entry", detail: "Add frontend/src/content/lab/my-project.mdx with required frontmatter → commit + push → deploys automatically." },
                { what: "Update an existing entry", detail: "Edit the MDX file, update updatedAt in frontmatter → commit + push. No sync script needed — lab files are read directly at build time." },
                { what: "Mark a project shipped", detail: "Change status to \"shipped\" in frontmatter, update updatedAt, add a final <Update> timeline note → commit + push." },
                { what: "Chatbot indexing", detail: "Lab entries are indexed into ChromaDB via lab.json (auto-generated by sync-knowledge.mjs on every push). Pumpkin can answer questions about active lab projects, tech stack, and decisions." },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Section 3 — Deploy Pipeline */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">3 · Deploy Pipeline (auto)</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">Everything is automated — just commit and push.</p>
              {[
                {
                  what: "Update portfolio data",
                  detail: "Edit any backend/data/knowledge/*.json → commit + push → GH Actions runs sync-knowledge.mjs (copies all JSON to frontend/src/data/knowledge/) → Railway redeploys → chatbot re-indexes (hash changed).",
                },
                {
                  what: "Publish a new blog post",
                  detail: "Write MDX → commit + push → GH Actions runs sync-knowledge.mjs → generates blog.json + copies all JSON → auto-commits with [skip ci] → Railway redeploys → chatbot indexes the new post.",
                },
                {
                  what: "What sync-knowledge.mjs does",
                  detail: "1) Reads all *.mdx from frontend/src/content/blog/, strips MDX, writes blog.json. 2) Copies ALL backend/data/knowledge/*.json → frontend/src/data/knowledge/. Run: node scripts/sync-knowledge.mjs from repo root.",
                },
                {
                  what: "GH Actions auto-commit",
                  detail: "Workflow (deploy.yml) needs contents: write, pages: write, id-token: write permissions. Auto-commits synced files with [skip ci] tag to prevent infinite loops.",
                },
                {
                  what: "Chatbot re-ingest (hash-based)",
                  detail: "Backend computes SHA-256 of all knowledge JSON files at startup. Re-ingests only when the hash changes — fast startup if nothing changed. Hash stored at chroma_db/.ingest_hash.",
                },
                {
                  what: "Static site deployment",
                  detail: "Frontend builds as a static export and deploys to Vercel. Backend deploys to a Lightsail Docker host. Both trigger on push to main.",
                },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Section 4 — Blog Engagement */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">4 · Blog Engagement</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint leading-relaxed">Tracked automatically. No config needed for new posts — engagement starts recording as soon as a reader opens the post.</p>
              {[
                {
                  what: "Views — unique per visitor per post",
                  detail: "Auto-recorded when a reader opens a post. One view per IP address. Shown on the post page and blog index.",
                },
                {
                  what: "Claps — up to 50 per visitor per post",
                  detail: "Reader clicks the clap icon button. Clicks batch with a 1.5s debounce before saving. Total shown on index card and post page.",
                },
                {
                  what: "Storage — SQLite analytics.db",
                  detail: "Stored in chroma_db/analytics.db. IPs are SHA-256 hashed — never stored raw. On Railway: set ANALYTICS_DB_PATH=/data/analytics.db with a persistent volume so counts survive redeploys.",
                },
                {
                  what: "Persistence on Railway",
                  detail: "Without a volume, counts reset on every deploy. Add a Volume (Pro plan) mounted at /data and set ANALYTICS_DB_PATH=/data/analytics.db in backend environment variables.",
                },
                {
                  what: "API endpoints",
                  detail: "POST /blog/{slug}/view · POST /blog/{slug}/clap (body: {count}) · GET /blog/{slug}/stats · GET /blog/stats/summary",
                },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Section 5 — Pumpkin Chatbot */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">5 · Pumpkin Chatbot</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              {[
                {
                  what: "Response count & unique visitors",
                  detail: "Tracked on every chat response. Shown in chatbot footer. Stored in the same analytics.db — subject to same Railway persistence note above.",
                },
                {
                  what: "Model indicator badge",
                  detail: "Green pill shows which Gemini model answered (e.g. gemini-2.5-flash). Updates automatically if a fallback was used.",
                },
                {
                  what: "Swap the AI model",
                  detail: "Change GEMINI_MODEL in Railway environment variables. No code change needed.",
                },
                {
                  what: "Model fallback chain",
                  detail: "Primary: GEMINI_MODEL. Fallbacks: GEMINI_FALLBACK_MODELS (comma-separated). Auto-retries on 503/429 capacity errors in order.",
                },
                {
                  what: "Knowledge base — ChromaDB",
                  detail: "ChromaDB persists to backend/chroma_db/ (git-ignored). On Railway: mount a persistent volume at /data and symlink or set the chroma path. Without a volume, the DB rebuilds on every deploy (works, just slower startup ~30–60s).",
                },
                {
                  what: "RAG pipeline",
                  detail: "Hybrid: ChromaDB dense (all-MiniLM-L6-v2 embeddings) + BM25 lexical → RRF merge → cross-encoder rerank (ms-marco-MiniLM-L-6-v2). Retrieves top 5 chunks → fed as context to Gemini.",
                },
                {
                  what: "Startup warmup",
                  detail: "Embedding model and cross-encoder load at startup. First response may be ~1–2s slower. Models download once and cache in Railway's ephemeral storage.",
                },
              ].map(({ what, detail }) => (
                <div key={what} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="text-[11px] font-semibold text-fg-muted">{what}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Section 6 — Environment Variables */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">6 · Environment Variables</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <p className="text-[10px] text-fg-faint mb-1">Backend vars → Railway → your backend service → Variables. Frontend vars → GitHub Actions secrets (used at build time).</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-faint mt-2 mb-1">Backend (Railway)</p>
              {[
                { key: "GOOGLE_API_KEY", detail: "Required. Google AI API key for Gemini. Chat endpoints return 503 without this." },
                { key: "GEMINI_MODEL", detail: "Primary model. Default: gemini-2.5-flash. Change here to swap models without code changes." },
                { key: "GEMINI_FALLBACK_MODELS", detail: "Comma-separated fallbacks tried on 503/429. Default: gemini-2.0-flash,gemini-2.0-flash-lite,gemini-flash-latest" },
                { key: "ANALYTICS_DB_PATH", detail: "SQLite file path. Set to /data/analytics.db with a Railway persistent volume, otherwise counts reset on every deploy." },
                { key: "FRONTEND_ORIGIN", detail: "CORS allowed origins (comma-separated). Must include production frontend URL or browser requests will be blocked. Default includes localhost:3000 and GitHub Pages." },
                { key: "APP_ENV", detail: "dev or prod. Default: dev. Controls logging and debug behavior." },
              ].map(({ key, detail }) => (
                <div key={key} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="font-mono text-[11px] font-semibold text-accent">{key}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
              <p className="text-[9px] font-bold uppercase tracking-widest text-fg-faint mt-3 mb-1">Frontend (GitHub Actions secrets / .env.local)</p>
              {[
                { key: "NEXT_PUBLIC_API_BASE_URL", detail: "Backend URL the browser calls. Set to your Railway backend URL in production (e.g. https://your-backend.up.railway.app). Required — chat and blog stats break without it." },
                { key: "NEXT_PUBLIC_BLOG_FONT", detail: "Blog reading font. Default: Source_Serif_4. Must match the font statically imported in frontend/src/app/layout.tsx." },
              ].map(({ key, detail }) => (
                <div key={key} className="border border-border-subtle rounded-lg p-2.5 space-y-0.5">
                  <p className="font-mono text-[11px] font-semibold text-accent">{key}</p>
                  <p className="text-[10px] text-fg-faint leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick card */}
          <div className="rounded-xl border border-border bg-surface-raised p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-fg-faint mb-3">Quick card</p>
            <div className="space-y-1.5 font-mono text-[10px] text-fg-muted">
              {[
                ["Image",       "![alt](/blog/f.jpg)"],
                ["Caption",     "![alt](/blog/f.jpg \"cap\")"],
                ["Link",        "[text](https://url)"],
                ["Bold",        "**text**"],
                ["Italic",      "*text*"],
                ["Code",        "`code`"],
                ["Strike",      "~~text~~"],
                ["Quote",       "> text"],
                ["Bullet",      "- item"],
                ["Numbered",    "1. item"],
                ["Divider",     "<Divider />"],
                ["Info box",    "<Callout type=\"info\">"],
                ["Tip box",     "<Callout type=\"tip\">"],
                ["Warn box",    "<Callout type=\"warning\">"],
                ["Quote box",   "<Callout type=\"quote\">"],
                ["Pull quote",  "<PullQuote author=\"…\">"],
                ["Footnote",    "text[^1]  …  [^1]: note"],
              ].map(([label, syntax]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-fg-faint w-20 shrink-0">{label}</span>
                  <span className="text-fg-muted">{syntax}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
