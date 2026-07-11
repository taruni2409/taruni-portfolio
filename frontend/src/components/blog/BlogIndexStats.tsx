"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import ParallaxImage from "@/components/ParallaxImage";

const SITE_URL = "https://jayaremala.com";

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
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
      } ${className}`}
    >
      {children}
    </div>
  );
}

function CardShareButton({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${SITE_URL}/blog/${slug}`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* blocked */ }
    }
  }, [slug, title]);

  return (
    <button
      onClick={share}
      aria-label={copied ? "Link copied!" : "Share post"}
      title={copied ? "Link copied!" : "Share post"}
      className="flex items-center gap-1 shrink-0 rounded px-2 py-1
                 text-fg-faint hover:text-accent hover:bg-surface-raised
                 transition-colors text-[10px] font-medium"
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  );
}
import { API_BASE_URL } from "@/lib/api/client";

interface Summary {
  total_claps: number;
  total_views: number;
  posts: { slug: string; views: number; claps: number }[];
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/* ─── Blog cover art ────────────────────────────────────────────────────
   Deterministic SVG art for posts without a hero image. Three patterns
   cycle by slug hash; all colours use CSS custom properties so they
   respond to light / dark mode automatically.
──────────────────────────────────────────────────────────────────────── */

function strHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function rv(seed: number, n: number): number {
  return (strHash(`${seed}:${n}`) >>> 1) / 0x7fffffff;
}

function BlogCoverSVG({ slug }: { slug: string }) {
  const h = strHash(slug);
  const pattern = h % 4;
  const uid = `cov-${slug.replace(/[^a-z0-9]/gi, "").slice(0, 20)}`;

  /* ── Dot constellation ─────────────────────────────────────────── */
  if (pattern === 0) {
    const N = 22;
    const dots = Array.from({ length: N }, (_, i) => ({
      cx: rv(h, i * 3) * 380 + 10,
      cy: rv(h, i * 3 + 1) * 178 + 11,
      rad: rv(h, i * 3 + 2) * 3 + 1.1,
      opacity: rv(h, i * 7 + 5) * 0.42 + 0.12,
      accent: rv(h, i * 11 + 3) > 0.74,
    }));
    const edges: [number, number, number, number, number][] = [];
    for (let i = 0; i < N; i++) {
      const j = (i + Math.floor(rv(h, i * 31) * 6) + 2) % N;
      const dx = dots[i].cx - dots[j].cx;
      const dy = dots[i].cy - dots[j].cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 145 && d > 18)
        edges.push([dots[i].cx, dots[i].cy, dots[j].cx, dots[j].cy, rv(h, i * 53) * 0.13 + 0.04]);
    }
    return (
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" aria-hidden
        style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <radialGradient id={`${uid}-rg`} cx="42%" cy="46%" r="58%">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.14 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0.01 }} />
          </radialGradient>
        </defs>
        <rect width="400" height="200" style={{ fill: "var(--surface-raised)" }} />
        <rect width="400" height="200" fill={`url(#${uid}-rg)`} />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 22 + 1} x2="400" y2={i * 22 + 1}
            style={{ stroke: "var(--fg)", strokeOpacity: 0.035, strokeWidth: 0.5 }} />
        ))}
        {Array.from({ length: 21 }, (_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="200"
            style={{ stroke: "var(--fg)", strokeOpacity: 0.035, strokeWidth: 0.5 }} />
        ))}
        {edges.map(([x1, y1, x2, y2, o], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            style={{ stroke: "var(--accent)", strokeOpacity: o, strokeWidth: 0.75 }} />
        ))}
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.accent ? d.rad * 2.2 : d.rad}
            style={{ fill: d.accent ? "var(--accent)" : "var(--fg)", opacity: d.opacity }} />
        ))}
      </svg>
    );
  }

  /* ── Sine waves ────────────────────────────────────────────────── */
  if (pattern === 1) {
    const WC = 7;
    const focal = Math.floor(WC / 2);
    const waves = Array.from({ length: WC }, (_, i) => {
      const amp   = rv(h, i * 13 + 0) * 24 + 9;
      const freq  = rv(h, i * 13 + 1) * 0.014 + 0.011;
      const phase = rv(h, i * 13 + 2) * Math.PI * 2;
      const yBase = 22 + i * 25;
      const pts = Array.from({ length: 81 }, (_, xi) => {
        const x = xi * 5;
        const y = yBase + amp * Math.sin(freq * x + phase);
        return `${xi === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(2)}`;
      }).join(" ");
      return { pts, sw: i === focal ? 2 : 1, so: 0.06 + i * 0.022 + (i === focal ? 0.1 : 0) };
    });
    const ax = rv(h, 91) * 280 + 60;
    const fAmp  = rv(h, focal * 13 + 0) * 24 + 9;
    const fFreq = rv(h, focal * 13 + 1) * 0.014 + 0.011;
    const fPh   = rv(h, focal * 13 + 2) * Math.PI * 2;
    const ay = (22 + focal * 25) + fAmp * Math.sin(fFreq * ax + fPh);
    return (
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" aria-hidden
        style={{ width: "100%", height: "100%", display: "block" }}>
        <rect width="400" height="200" style={{ fill: "var(--surface-raised)" }} />
        <rect width="400" height="200" style={{ fill: "var(--accent)", opacity: 0.04 }} />
        {waves.map((w, i) => (
          <path key={i} d={w.pts} fill="none"
            style={{ stroke: "var(--accent)", strokeOpacity: w.so, strokeWidth: w.sw }} />
        ))}
        <circle cx={ax} cy={ay} r={4.5} style={{ fill: "var(--accent)", opacity: 0.5 }} />
        <circle cx={ax} cy={ay} r={10} fill="none"
          style={{ stroke: "var(--accent)", strokeOpacity: 0.22, strokeWidth: 1.5 }} />
        <circle cx={ax} cy={ay} r={18} fill="none"
          style={{ stroke: "var(--accent)", strokeOpacity: 0.1, strokeWidth: 1 }} />
      </svg>
    );
  }

  /* ── Circuit traces ────────────────────────────────────────────── */
  if (pattern === 3) {
    const nodeCount = 13;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      x:      rv(h, i * 5 + 0) * 360 + 20,
      y:      rv(h, i * 5 + 1) * 158 + 21,
      accent: rv(h, i * 5 + 2) > 0.68,
      r:      rv(h, i * 5 + 3) * 2 + 1.5,
    }));
    const traces: { d: string; o: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const j = (i + Math.floor(rv(h, i * 37) * 4) + 1) % nodeCount;
      const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 210 && dist > 28) {
        const horizFirst = rv(h, i * 53 + 7) > 0.5;
        const d = horizFirst
          ? `M${nodes[i].x.toFixed(1)},${nodes[i].y.toFixed(1)} H${nodes[j].x.toFixed(1)} V${nodes[j].y.toFixed(1)}`
          : `M${nodes[i].x.toFixed(1)},${nodes[i].y.toFixed(1)} V${nodes[j].y.toFixed(1)} H${nodes[j].x.toFixed(1)}`;
        traces.push({ d, o: rv(h, i * 61) * 0.1 + 0.07 });
      }
    }
    return (
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" aria-hidden
        style={{ width: "100%", height: "100%", display: "block" }}>
        <rect width="400" height="200" style={{ fill: "var(--surface-raised)" }} />
        <rect width="400" height="200" style={{ fill: "var(--accent)", opacity: 0.04 }} />
        {traces.map((t, i) => (
          <path key={i} d={t.d} fill="none"
            style={{ stroke: "var(--accent)", strokeOpacity: t.o, strokeWidth: 1 }} />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y}
            r={n.accent ? n.r * 2.4 : n.r}
            style={{
              fill: n.accent ? "var(--accent)" : "var(--fg)",
              opacity: n.accent ? 0.45 : 0.2,
            }} />
        ))}
        {/* Square pads at accent nodes — PCB via feel */}
        {nodes.filter((n) => n.accent).map((n, i) => (
          <rect key={i}
            x={n.x - 4} y={n.y - 4} width={8} height={8} rx="1" fill="none"
            style={{ stroke: "var(--accent)", strokeOpacity: 0.3, strokeWidth: 0.75 }} />
        ))}
      </svg>
    );
  }

  /* ── Geometric rings ───────────────────────────────────────────── */
  const shapes = Array.from({ length: 16 }, (_, i) => ({
    x:  rv(h, i * 7 + 0) * 360 + 20,
    y:  rv(h, i * 7 + 1) * 158 + 21,
    sz: rv(h, i * 7 + 2) * 44 + 12,
    angle: rv(h, i * 7 + 3) * 60,
    isCircle: rv(h, i * 7 + 4) > 0.38,
    isAccent: rv(h, i * 7 + 5) > 0.68,
    opacity: rv(h, i * 7 + 6) * 0.1 + 0.05,
  }));
  return (
    <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" aria-hidden
      style={{ width: "100%", height: "100%", display: "block" }}>
      <rect width="400" height="200" style={{ fill: "var(--surface-raised)" }} />
      <rect width="400" height="200" style={{ fill: "var(--accent)", opacity: 0.03 }} />
      {shapes.map((s, i) => s.isCircle ? (
        <circle key={i} cx={s.x} cy={s.y} r={s.sz} fill="none"
          style={{
            stroke: s.isAccent ? "var(--accent)" : "var(--fg)",
            strokeOpacity: s.opacity, strokeWidth: s.isAccent ? 1 : 0.75,
          }} />
      ) : (
        <rect key={i} x={s.x - s.sz / 2} y={s.y - s.sz / 2}
          width={s.sz} height={s.sz} rx="2" fill="none"
          style={{
            stroke: s.isAccent ? "var(--accent)" : "var(--fg)",
            strokeOpacity: s.opacity, strokeWidth: 0.75,
          }}
          transform={`rotate(${s.angle.toFixed(1)},${s.x.toFixed(1)},${s.y.toFixed(1)})`} />
      ))}
      <circle cx="200" cy="100" r="35" fill="none"
        style={{ stroke: "var(--accent)", strokeOpacity: 0.16, strokeWidth: 1.5 }} />
      <circle cx="200" cy="100" r="16" fill="none"
        style={{ stroke: "var(--accent)", strokeOpacity: 0.26, strokeWidth: 1 }} />
      <circle cx="200" cy="100" r="5"
        style={{ fill: "var(--accent)", opacity: 0.42 }} />
    </svg>
  );
}

export function BlogIndexStats({ summary }: { summary: Summary | null }) {
  if (!summary || (summary.total_claps === 0 && summary.total_views === 0)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4 mb-8">
      {summary.total_views > 0 && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          {formatCount(summary.total_views)} views
        </span>
      )}
      {summary.total_claps > 0 && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
          {formatCount(summary.total_claps)} claps
        </span>
      )}
      <span className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
        {summary.posts.length} posts
      </span>
    </div>
  );
}

export function BlogPostStats({ slug, slugMap }: { slug: string; slugMap: Summary["posts"] }) {
  const post = slugMap.find((p) => p.slug === slug);
  if (!post) return null;

  return (
    <div className="flex items-center gap-3 mt-2 shrink-0">
      {post.views > 0 && (
        <div className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="text-[10px] text-fg-faint">{formatCount(post.views)}</span>
        </div>
      )}
      {post.claps > 0 && (
        <div className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
          <span className="text-[10px] text-fg-faint">{formatCount(post.claps)}</span>
        </div>
      )}
    </div>
  );
}

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  publishedAt?: string;
  description: string;
  tags: string[];
  readingTime?: number;
  image?: string;
}

type SortMode = "latest" | "oldest" | "popular";

export function BlogPostList({ posts, summary }: { posts: PostMeta[]; summary: Summary | null }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("latest");

  const q = query.toLowerCase().trim();
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();
  const filtered = posts.filter((p) => {
    const matchesTag = !activeTag || p.tags.includes(activeTag);
    const matchesQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q));
    return matchesTag && matchesQuery;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "oldest") {
      const aD = a.publishedAt ?? a.date, bD = b.publishedAt ?? b.date;
      return aD < bD ? -1 : aD > bD ? 1 : 0;
    }
    if (sort === "popular") {
      const aS = summary?.posts.find((s) => s.slug === a.slug);
      const bS = summary?.posts.find((s) => s.slug === b.slug);
      const aScore = (aS?.views ?? 0) + (aS?.claps ?? 0) * 3;
      const bScore = (bS?.views ?? 0) + (bS?.claps ?? 0) * 3;
      if (bScore !== aScore) return bScore - aScore;
    }
    // latest (default) — descending publishedAt
    const aD = a.publishedAt ?? a.date, bD = b.publishedAt ?? b.date;
    return aD < bD ? 1 : aD > bD ? -1 : 0;
  });

  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border border-border bg-surface pl-9 pr-9 py-2.5 text-base sm:text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg transition-colors"
            aria-label="Clear search"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-faint shrink-0">Sort</span>
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: "latest"  as const, label: "Latest",  icon: (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            )},
            { key: "oldest"  as const, label: "Oldest",  icon: (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            )},
            { key: "popular" as const, label: "Popular", icon: (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            )},
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                sort === key
                  ? "bg-fg text-bg"
                  : "border border-border bg-surface text-fg-muted hover:border-fg-muted hover:text-fg"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter — horizontal scroll on mobile, wraps on sm+ */}
      {allTags.length > 1 && (
        <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-x-visible gap-2 mb-8 pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTag(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
              !activeTag
                ? "bg-fg text-bg"
                : "border border-border bg-surface text-fg-muted hover:border-fg-muted hover:text-fg"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                activeTag === tag
                  ? "bg-accent text-white border border-accent"
                  : "border border-border bg-surface text-fg-muted hover:border-accent hover:text-accent"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="rounded border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-fg-faint">
            No posts match{query ? ` "${query}"` : ""}{activeTag ? ` in #${activeTag}` : ""}.
          </p>
          <button
            onClick={() => { setQuery(""); setActiveTag(null); setSort("latest"); }}
            className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

    {sorted.length > 0 && (
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {sorted.map((p, i) => {
          const postStats = summary?.posts.find((s) => s.slug === p.slug);
          return (
            <li key={p.slug} className="flex">
              <Reveal delay={Math.min(i * 60, 300)} className="flex-1 flex">
              <Link
                href={`/blog/${p.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-surface overflow-hidden hover:border-border-strong transition-all card-lift w-full"
              >
                {/* ── Cover ── */}
                <div className="relative aspect-2/1 overflow-hidden bg-surface-raised shrink-0">
                  {p.image ? (
                    <ParallaxImage src={p.image} className="w-full h-full" />
                  ) : (
                    <BlogCoverSVG slug={p.slug} />
                  )}
                  {/* Bottom fade — cover melts into card surface */}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-surface to-transparent pointer-events-none" />
                  {/* Reading time badge */}
                  {p.readingTime && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-bg/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-medium text-fg-muted">
                        {p.readingTime} min
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Content ── */}
                <div className="flex flex-col flex-1 p-5">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-sm bg-surface-raised border border-border px-2 py-0.5 text-[10px] font-medium text-fg-subtle">
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-bold text-fg group-hover:text-accent transition-colors leading-snug mb-2 line-clamp-2">
                    {p.title}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-fg-subtle leading-relaxed flex-1 mb-4 line-clamp-2">
                    {p.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-fg-faint truncate">{p.publishedAt ?? p.date}</span>
                      {p.publishedAt && p.date && p.date !== p.publishedAt && (
                        <span className="text-[10px] text-fg-faint/60 truncate">Updated {p.date}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {postStats && postStats.views > 0 && (
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                          <span className="text-[10px] text-fg-faint">{formatCount(postStats.views)}</span>
                        </div>
                      )}
                      {postStats && postStats.claps > 0 && (
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/>
                            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                          </svg>
                          <span className="text-[10px] text-fg-faint">{formatCount(postStats.claps)}</span>
                        </div>
                      )}
                      <CardShareButton slug={p.slug} title={p.title} />
                    </div>
                  </div>
                </div>
              </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    )}
    </div>
  );
}

export function BlogSection({ posts }: { posts: PostMeta[] }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/blog/stats/summary`)
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setSummary)
      .catch(() => {});
  }, []);

  return (
    <>
      <BlogIndexStats summary={summary} />
      <BlogPostList posts={posts} summary={summary} />
    </>
  );
}
