"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BlogEngagement from "@/components/blog/BlogEngagement";
import ShareButtons from "@/components/blog/ShareButtons";
import { fetchBlogPost, fetchLabEntry } from "@/lib/api/content";
import { siteGroups } from "@/lib/site-nav";

// ── Icons ─────────────────────────────────────────────────────────────────────
// All 18×18, stroke-based, theme-aware via currentColor

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function IconMessageAI() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

// Derived from the shared nav config so every page on the site shows up here
// automatically — add a page to site-nav and it appears on the 404 too.
const LINKS: { href: string; label: string; desc: string; icon: ReactNode }[] = [
  { href: "/", label: "Portfolio", desc: "Home — hero, projects & contact", icon: <IconHome /> },
  ...siteGroups.flatMap((g) => g.items),
];

// ── Inline blog/lab post renderer (for admin-published posts not yet in static HTML) ──

function InlinePost({ type, slug }: { type: "blog" | "lab"; slug: string }) {
  const [post, setPost] = useState<{ title: string; date?: string; tags?: string[]; content: string; slug: string } | null | "loading">("loading");

  useEffect(() => {
    const fetcher = type === "blog" ? fetchBlogPost : fetchLabEntry;
    fetcher(slug)
      .then((data) => {
        if (!data) { setPost(null); return; }
        if (type === "blog") {
          const b = data as Awaited<ReturnType<typeof fetchBlogPost>>;
          setPost({ title: b!.title, date: b!.date, tags: b!.tags, content: b!.content, slug: b!.slug });
        } else {
          const l = data as Awaited<ReturnType<typeof fetchLabEntry>>;
          setPost({ title: l!.title, date: l!.started_at, tags: l!.tech, content: l!.content, slug: l!.slug });
        }
      })
      .catch(() => setPost(null));
  }, [type, slug]);

  if (post === "loading") {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!post) return null; // Fall through to 404 UI

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <Link
        href={`/${type}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors mb-10"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        {type === "blog" ? "All posts" : "Lab"}
      </Link>
      <article>
        <header className="mb-10 pb-8 border-b border-border">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg leading-tight mb-3 font-[family-name:var(--font-blog)]">
            {post.title}
          </h1>
          {post.date && <span className="text-sm text-fg-faint">{post.date}</span>}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-fg-subtle">#{t}</span>
              ))}
            </div>
          )}
          {type === "blog" && <ShareButtons slug={post.slug} title={post.title} />}
        </header>
        <div className="prose max-w-none font-[family-name:var(--font-blog)] text-[1.0625rem] leading-[1.85]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
        {type === "blog" && <BlogEngagement slug={post.slug} />}
      </article>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotFound() {
  const [resolved, setResolved] = useState<{ type: "blog" | "lab"; slug: string } | null | "checking">("checking");

  useEffect(() => {
    const path = window.location.pathname;
    const blogMatch = path.match(/^\/blog\/([^/]+)\/?$/);
    const labMatch = path.match(/^\/lab\/([^/]+)\/?$/);
    if (blogMatch) setResolved({ type: "blog", slug: blogMatch[1] });
    else if (labMatch) setResolved({ type: "lab", slug: labMatch[1] });
    else setResolved(null);
  }, []);

  if (resolved === "checking") return null;
  if (resolved) {
    return <InlinePost type={resolved.type} slug={resolved.slug} />;
  }
  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col">

      {/* Minimal header */}
      <header className="px-5 sm:px-8 pt-5 pb-4 shrink-0">
        <Link
          href="/"
          className="text-sm font-black tracking-tight text-fg hover:opacity-70 transition-opacity"
        >
          Taruni<span className="text-indigo-600 dark:text-indigo-400">.</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">

        {/* Hero — pumpkin floats over the "404" watermark */}
        <div className="relative flex flex-col items-center mb-10 sm:mb-12">

          {/* 404 watermark */}
          <span
            className="absolute inset-x-0 text-center select-none pointer-events-none font-black leading-none text-border/40 dark:text-border/30"
            style={{ fontSize: "clamp(7rem, 28vw, 15rem)", top: "50%", transform: "translateY(-50%)", zIndex: 0 }}
            aria-hidden
          >
            404
          </span>

          {/* Floating pumpkin */}
          <div className="relative z-10 mb-5" style={{ animation: "pumpkin-float 3s ease-in-out infinite" }}>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-orange-400/15 blur-2xl scale-125" aria-hidden />
              <span className="relative block text-[72px] leading-none" aria-hidden>🎃</span>
            </div>
          </div>

          {/* Copy */}
          <div className="relative z-10 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg mb-2.5">
              This page got carved out
            </h1>
            <p className="text-sm text-fg-subtle max-w-xs sm:max-w-sm mx-auto leading-relaxed">
              Looks like this vine led nowhere. Here&apos;s where you actually want to go:
            </p>
          </div>
        </div>

        {/* Navigation grid */}
        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5">

          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5 transition-all duration-200 hover:border-border-strong hover:shadow-sm card-lift"
            >
              {/* Icon pill */}
              <div className="w-9 h-9 rounded-xl bg-surface-raised flex items-center justify-center text-fg-subtle shrink-0 group-hover:bg-surface-sunken group-hover:text-accent transition-colors duration-200">
                {link.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg leading-none mb-1 group-hover:text-accent transition-colors duration-150">
                  {link.label}
                </p>
                <p className="text-[11px] text-fg-faint truncate">{link.desc}</p>
              </div>

              <svg
                className="shrink-0 text-fg-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-150"
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" aria-hidden
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          ))}

          {/* Ask Pumpkin — full-width, matches nav button style */}
          <Link
            href="/chat"
            className="group sm:col-span-2 flex items-center gap-3.5 rounded-2xl bg-fg hover:opacity-80 px-4 py-4 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors duration-200">
              <IconMessageAI />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-none mb-1">
                Ask Pumpkin ✦
              </p>
              <p className="text-[11px] text-indigo-200">
                Ask Taruni&apos;s AI anything — experience, projects, or just say hello
              </p>
            </div>

            <svg
              className="shrink-0 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-150"
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" aria-hidden
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border px-5 py-4 text-center">
        <p className="text-xs text-fg-faint">
          © {new Date().getFullYear()} Taruni Nallamothu
        </p>
      </footer>

    </div>
  );
}
