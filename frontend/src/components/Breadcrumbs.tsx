"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import blogData from "@/data/knowledge/blog.json";
import labData from "@/data/knowledge/lab.json";
import { playClick } from "@/lib/sound";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo";

type Section = { group: string; label: string };

// Mirrors the Nav grouping (Work / Writing / Developers) so the trail and the
// menu always agree on where a page lives.
const SECTIONS: Record<string, Section> = {
  "/experience": { group: "Work", label: "Experience" },
  "/education":  { group: "Work", label: "Education" },
  "/projects":   { group: "Work", label: "Projects" },
  "/lab":        { group: "Work", label: "Lab" },
  "/now":        { group: "Work", label: "Now" },
  "/blog":       { group: "Writing", label: "Blog" },
  "/quotes":     { group: "Writing", label: "Quotes" },
  "/gallery":    { group: "Writing", label: "Gallery" },
  "/mcp":        { group: "Developers", label: "MCP" },
  "/system":     { group: "Developers", label: "System" },
};

const titleMap = (data: { slug: string; title: string }[]): Record<string, string> =>
  Object.fromEntries(data.map((d) => [d.slug, d.title]));

const BLOG_TITLES = titleMap(blogData as { slug: string; title: string }[]);
const LAB_TITLES = titleMap(labData as { slug: string; title: string }[]);

function prettify(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Crumb = { label: string; href?: string };

export default function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const sectionPath = "/" + (segments[0] ?? "");
  const section = SECTIONS[sectionPath];

  // No trail on the home page, admin, or anything outside the known sections.
  if (!section) return null;

  const detailSlug = segments[1];
  const isDetail = Boolean(detailSlug);

  // Every crumb that maps to a real route is a clickable link — including the
  // current page. The category (Work/Writing/…) has no page, so it stays a label.
  const crumbs: Crumb[] = [
    { label: "Home", href: "/portfolio" },
    { label: section.group },
    { label: section.label, href: sectionPath },
  ];

  if (isDetail) {
    const title =
      sectionPath === "/blog" ? BLOG_TITLES[detailSlug]
      : sectionPath === "/lab" ? LAB_TITLES[detailSlug]
      : undefined;
    crumbs.push({ label: title || prettify(detailSlug), href: pathname });
  }

  // Match the page's own container so the trail aligns with content.
  const container = isDetail
    ? "max-w-3xl lg:max-w-[68rem] px-4 sm:px-6"
    : "max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 xl:px-8";

  // BreadcrumbList structured data — mirrors the visible trail. Only the crumbs
  // that map to a real URL become positioned items (the Work/Writing category has
  // no page), so it stays valid and matches what users can click.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs
      .filter((c) => c.href)
      .map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        item: `${SITE_URL}${(c.href as string).replace(/\/+$/, "")}`,
      })),
  };

  return (
    <div className={`mx-auto w-full ${container} pt-6 sm:pt-8 -mb-6 sm:-mb-9`}>
      <JsonLd data={breadcrumbLd} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {c.href ? (
                <Link
                  href={c.href}
                  onClick={() => playClick("nav")}
                  aria-current={last ? "page" : undefined}
                  className={`transition-colors ${
                    last
                      ? "text-fg font-medium truncate max-w-[45vw] sm:max-w-xs hover:opacity-80"
                      : "text-fg-faint hover:text-fg whitespace-nowrap"
                  }`}
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-fg-faint whitespace-nowrap select-none">{c.label}</span>
              )}
              {!last && <span className="text-fg-faint/50 select-none" aria-hidden>/</span>}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
