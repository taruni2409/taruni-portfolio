/**
 * Typed fetch wrappers for the content API (/content/*).
 * Used by SWR hooks in client components and by generateStaticParams at build time.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiBlogPost {
  id: number;
  slug: string;
  title: string;
  date: string;
  published_at: string;
  description: string;
  tags: string[];
  image?: string | null;
  content: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiLabEntry {
  id: number;
  slug: string;
  title: string;
  status: "active" | "paused" | "shipped";
  description: string;
  started_at: string;
  updated_at: string;
  tech: string[];
  links: { label: string; url: string }[];
  content: string;
  created_at: string;
}

export interface ApiQuote {
  id: number;
  quote_id: string;
  text: string;
  author: string;
  source?: string | null;
  category: string;
  favorite: boolean;
  featured: boolean;
  added_at: string;
  created_at: string;
}

// ── Normalizers (API shape → frontend shape) ──────────────────────────────────

/** Map API quote to the shape QuotesClient expects */
export function normalizeQuote(q: ApiQuote) {
  return {
    id: q.quote_id,
    text: q.text,
    author: q.author,
    source: q.source ?? null,
    category: q.category as import("@/data/quotes").QuoteCategory,
    favorite: q.favorite,
    featured: q.featured,
    addedAt: q.added_at,
  };
}

/** Map API blog post to the shape BlogSection expects */
export function normalizeBlogPost(p: ApiBlogPost) {
  const wordCount = p.content.split(/\s+/).filter(Boolean).length;
  return {
    slug: p.slug,
    title: p.title,
    date: p.date,
    publishedAt: p.published_at,
    description: p.description,
    tags: p.tags ?? [],
    readingTime: Math.max(1, Math.ceil(wordCount / 200)),
    image: p.image ?? undefined,
  };
}

/** Map API lab entry to the shape LabList expects */
export function normalizeLabEntry(e: ApiLabEntry) {
  return {
    slug: e.slug,
    title: e.title,
    status: e.status as "active" | "paused" | "shipped",
    description: e.description,
    startedAt: e.started_at,
    updatedAt: e.updated_at,
    tech: e.tech ?? [],
    links: e.links ?? [],
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export async function fetchBlogPosts(): Promise<ApiBlogPost[]> {
  const res = await fetch(`${API_BASE}/content/blog`, { next: { revalidate: 0 } } as RequestInit);
  if (!res.ok) throw new Error(`/content/blog returned ${res.status}`);
  return res.json();
}

export async function fetchBlogPost(slug: string): Promise<ApiBlogPost | null> {
  const res = await fetch(`${API_BASE}/content/blog/${slug}`, { next: { revalidate: 0 } } as RequestInit);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`/content/blog/${slug} returned ${res.status}`);
  return res.json();
}

export async function fetchLabEntries(): Promise<ApiLabEntry[]> {
  const res = await fetch(`${API_BASE}/content/lab`, { next: { revalidate: 0 } } as RequestInit);
  if (!res.ok) throw new Error(`/content/lab returned ${res.status}`);
  return res.json();
}

export async function fetchLabEntry(slug: string): Promise<ApiLabEntry | null> {
  const res = await fetch(`${API_BASE}/content/lab/${slug}`, { next: { revalidate: 0 } } as RequestInit);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`/content/lab/${slug} returned ${res.status}`);
  return res.json();
}

export async function fetchQuotes(): Promise<ApiQuote[]> {
  const res = await fetch(`${API_BASE}/content/quotes`, { next: { revalidate: 0 } } as RequestInit);
  if (!res.ok) throw new Error(`/content/quotes returned ${res.status}`);
  return res.json();
}

// ── SWR keys ──────────────────────────────────────────────────────────────────
// Use these as the first argument to useSWR so all hooks share the same cache

export const BLOG_POSTS_KEY = `${API_BASE}/content/blog`;
export const LAB_ENTRIES_KEY = `${API_BASE}/content/lab`;
export const QUOTES_KEY = `${API_BASE}/content/quotes`;
export const blogPostKey = (slug: string) => `${API_BASE}/content/blog/${slug}`;
export const labEntryKey = (slug: string) => `${API_BASE}/content/lab/${slug}`;
