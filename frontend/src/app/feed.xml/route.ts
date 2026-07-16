import { getAllPosts } from "@/lib/blog";

// Revalidate hourly — picks up admin-published posts without a rebuild
export const revalidate = 3600;

const SITE_URL   = "https://jayaremala.com";
const SITE_TITLE = "Taruni Nallamothu — Blog";
const SITE_DESC  = "Notes on data engineering, machine learning, and building analytics systems.";
const AUTHOR     = "Taruni Nallamothu";
const AUTHOR_EMAIL = "taruninallamothu24@gmail.com";
const API        = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface FeedPost {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
}

async function fetchApiPosts(): Promise<FeedPost[]> {
  try {
    const res = await fetch(`${API}/content/blog`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const posts = await res.json() as {
      slug: string; title: string; description: string;
      tags: string[]; published_at: string; published?: boolean;
    }[];
    return posts
      .filter((p) => p.published !== false)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        description: p.description,
        tags: p.tags ?? [],
        publishedAt: p.published_at,
      }));
  } catch { return []; }
}

export async function GET() {
  // MDX filesystem posts
  const mdxPosts = getAllPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    tags: p.tags,
    publishedAt: p.publishedAt ?? p.date,
  }));

  // API-published posts (admin panel)
  const apiPosts = await fetchApiPosts();

  // Merge: deduplicate by slug (MDX takes precedence for metadata accuracy)
  const seen = new Set(mdxPosts.map((p) => p.slug));
  const merged = [
    ...mdxPosts,
    ...apiPosts.filter((p) => !seen.has(p.slug)),
  ].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)); // newest first

  const items = merged.map((post) => {
    const url     = `${SITE_URL}/blog/${post.slug}`;
    const pubDate = new Date(post.publishedAt).toUTCString();
    const cats    = post.tags.map((t) => `    <category>${escapeXml(t)}</category>`).join("\n");
    return `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${escapeXml(post.description)}</description>
    <pubDate>${pubDate}</pubDate>
    <author>${AUTHOR_EMAIL} (${AUTHOR})</author>
${cats}
  </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>en-us</language>
    <managingEditor>${AUTHOR_EMAIL} (${AUTHOR})</managingEditor>
    <webMaster>${AUTHOR_EMAIL} (${AUTHOR})</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/og-image.png</url>
      <title>${escapeXml(SITE_TITLE)}</title>
      <link>${SITE_URL}/blog</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
