import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getAllLabEntries } from "@/lib/lab";
import { siteGroups } from "@/lib/site-nav";

// Revalidate every hour so admin-published content appears without a rebuild
export const revalidate = 3600;

const BASE = "https://jayaremala.com";
const API  = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

// Per-route SEO weighting. Any page not listed here falls back to DEFAULT_META,
// so a newly added page still lands in the sitemap with sensible values.
const ROUTE_META: Record<string, { priority: number; changeFrequency: ChangeFreq }> = {
  "/":           { priority: 1.0,  changeFrequency: "weekly"  },
  "/portfolio":  { priority: 0.95, changeFrequency: "weekly"  },
  "/blog":       { priority: 0.9,  changeFrequency: "weekly"  },
  "/experience": { priority: 0.8,  changeFrequency: "monthly" },
  "/projects":   { priority: 0.8,  changeFrequency: "monthly" },
  "/apps":       { priority: 0.7,  changeFrequency: "monthly" },
  "/education":  { priority: 0.7,  changeFrequency: "monthly" },
  "/lab":        { priority: 0.7,  changeFrequency: "weekly"  },
  "/now":        { priority: 0.6,  changeFrequency: "weekly"  },
  "/gallery":    { priority: 0.6,  changeFrequency: "monthly" },
  "/quotes":     { priority: 0.5,  changeFrequency: "monthly" },
};
const DEFAULT_META = { priority: 0.6, changeFrequency: "monthly" as const };

/* ── API fetchers (silent on failure — MDX posts are the fallback) ─── */

async function fetchApiBlogPosts(): Promise<{ slug: string; published_at: string }[]> {
  try {
    const res = await fetch(`${API}/content/blog`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const posts = await res.json();
    // only published posts belong in the sitemap
    return (posts as { slug: string; published_at: string; published?: boolean }[])
      .filter((p) => p.published !== false);
  } catch { return []; }
}

async function fetchApiLabEntries(): Promise<{ slug: string; updated_at: string }[]> {
  try {
    const res = await fetch(`${API}/content/lab`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // MDX filesystem posts (always available at build time)
  const mdxPosts = getAllPosts();
  const mdxLab   = getAllLabEntries();

  // API posts (admin-published, may not exist in MDX)
  const [apiPosts, apiLab] = await Promise.all([
    fetchApiBlogPosts(),
    fetchApiLabEntries(),
  ]);

  // Merge blog posts: MDX wins for date precision; API adds any extra slugs
  const blogSlugMap = new Map<string, string>();
  for (const p of mdxPosts) {
    blogSlugMap.set(p.slug, p.publishedAt ?? p.date);
  }
  for (const p of apiPosts) {
    if (!blogSlugMap.has(p.slug)) blogSlugMap.set(p.slug, p.published_at);
  }

  // Merge lab entries the same way
  const labSlugMap = new Map<string, string>();
  for (const e of mdxLab) {
    labSlugMap.set(e.slug, e.updatedAt);
  }
  for (const e of apiLab) {
    if (!labSlugMap.has(e.slug)) labSlugMap.set(e.slug, e.updated_at);
  }

  // Blog tag pages (from MDX only — API posts may not have tags indexed)
  const allTags = [...new Set(mdxPosts.flatMap((p) => p.tags))];

  /* ── Static routes — derived from the shared nav config (lib/site-nav) ──
     so any page added to the nav/footer automatically appears here too.
     Plus a few routes that aren't in the nav (home, portfolio, chat). ── */
  const pageHrefs = [...new Set([
    "/", "/portfolio", "/chat",
    ...siteGroups.flatMap((g) => g.items.map((i) => i.href)),
  ])];

  const staticRoutes: MetadataRoute.Sitemap = [
    ...pageHrefs.map((href) => ({
      url: `${BASE}${href}`,
      lastModified: new Date(),
      ...(ROUTE_META[href] ?? DEFAULT_META),
    })),
  ];

  const blogRoutes: MetadataRoute.Sitemap = [...blogSlugMap.entries()].map(([slug, date]) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: new Date(date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const labRoutes: MetadataRoute.Sitemap = [...labSlugMap.entries()].map(([slug, date]) => ({
    url: `${BASE}/lab/${slug}`,
    lastModified: new Date(date),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagRoutes: MetadataRoute.Sitemap = allTags.map((tag) => ({
    url: `${BASE}/blog/tag/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...blogRoutes, ...labRoutes, ...tagRoutes];
}
