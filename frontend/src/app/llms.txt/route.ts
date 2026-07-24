import { getAllPosts } from "@/lib/blog";
import { getAllLabEntries } from "@/lib/lab";
import { profile } from "@/data/profile";
import { siteGroups } from "@/lib/site-nav";

// Revalidate hourly — picks up admin-published content without a rebuild.
// Mirrors the sitemap / feed.xml cadence.
export const revalidate = 3600;

const BASE = "https://taruni-portfolio.vercel.app";
const API  = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Entry {
  slug: string;
  title: string;
  description: string;
  /** Sort key — newest first. */
  sortKey: string;
}

/* ── API fetchers (silent on failure — MDX is the fallback) ───────────── */

async function fetchApiBlogPosts(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API}/content/blog`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const posts = await res.json() as {
      slug: string; title: string; description: string;
      published_at: string; published?: boolean;
    }[];
    return posts
      .filter((p) => p.published !== false)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        description: p.description ?? "",
        sortKey: p.published_at ?? "",
      }));
  } catch { return []; }
}

async function fetchApiLabEntries(): Promise<Entry[]> {
  try {
    const res = await fetch(`${API}/content/lab`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const entries = await res.json() as {
      slug: string; title: string; description: string; updated_at: string;
    }[];
    return entries.map((e) => ({
      slug: e.slug,
      title: e.title,
      description: e.description ?? "",
      sortKey: e.updated_at ?? "",
    }));
  } catch { return []; }
}

/** Merge MDX + API entries, MDX winning on slug collision, newest first. */
function merge(mdx: Entry[], api: Entry[]): Entry[] {
  const bySlug = new Map<string, Entry>();
  for (const e of mdx) bySlug.set(e.slug, e);
  for (const e of api) if (!bySlug.has(e.slug)) bySlug.set(e.slug, e);
  return [...bySlug.values()].sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
}

function bullet(base: string, e: Entry): string {
  const desc = e.description ? `: ${e.description}` : "";
  return `- [${e.title}](${base}/${e.slug})${desc}`;
}

export async function GET() {
  // MDX filesystem content (always available at build time)
  const mdxPosts: Entry[] = getAllPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    sortKey: p.publishedAt ?? p.date,
  }));
  const mdxLab: Entry[] = getAllLabEntries().map((e) => ({
    slug: e.slug,
    title: e.title,
    description: e.description,
    sortKey: e.updatedAt,
  }));

  // API-published content (admin panel)
  const [apiPosts, apiLab] = await Promise.all([
    fetchApiBlogPosts(),
    fetchApiLabEntries(),
  ]);

  const posts = merge(mdxPosts, apiPosts);
  const lab   = merge(mdxLab, apiLab);

  // Key pages are derived from the shared nav config (lib/site-nav), so any page
  // added to the nav/footer automatically shows up here too. Optional richer copy
  // per route lives in LLMS_DESC; new pages fall back to their nav description.
  const LLMS_DESC: Record<string, string> = {
    "/experience": "work history timeline",
    "/education":  "degrees and highlights",
    "/projects":   "production systems, hackathon winners, and side projects",
    "/lab":        "live designs and progress logs for in-flight projects",
    "/apps":       "live apps and products I build, host, and run under my domain",
    "/now":        "what I'm focused on right now",
    "/gallery":    "visual log of achievements and milestones",
    "/quotes":     "words that shaped how I think and build",
    "/mcp":        "connect your own LLM (Claude/Cursor) to read-only portfolio tools",
    "/system":     "live observability — latency percentiles, RAG pipeline timing, model fallback",
  };
  const keyPages = [
    `- [Portfolio](${BASE}/portfolio): hero, featured projects, skills, contact`,
    ...siteGroups.flatMap((g) => g.items).map((i) =>
      `- [${i.label}](${BASE}${i.href}): ${LLMS_DESC[i.href] ?? i.desc}`),
    `- [Chat with Pumpkin](${BASE}/chat): RAG chatbot that answers recruiter questions about my work`,
  ].join("\n");

  const blogSection = posts.length
    ? posts.map((p) => bullet(`${BASE}/blog`, p)).join("\n")
    : "- (no posts yet)";

  const labSection = lab.length
    ? lab.map((e) => bullet(`${BASE}/lab`, e)).join("\n")
    : "- (no entries yet)";

  const body = `# ${profile.name}

> ${profile.tagline}

${profile.bio} Based in ${profile.location}.
Contact: ${profile.email} · GitHub: ${profile.github} · LinkedIn: ${profile.linkedin} · Résumé: ${profile.resume}

Interested in: ${profile.interested_domain}.

## Key pages

${keyPages}

## Blog

${blogSection}

## Lab notes

${labSection}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
