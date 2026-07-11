import fs from "fs";
import path from "path";

export interface PageMeta {
  href: string;
  title: string;
  description: string;
}

// Rich metadata for known routes. Add an entry here when you add a new page and
// want a custom title/description in Cmd+K — otherwise the route gets a title
// derived from its URL segment automatically.
const ROUTE_CONFIG: Record<string, { title: string; description: string }> = {
  "/":           { title: "Home",         description: "Portfolio homepage, featured projects, skills" },
  "/experience": { title: "Experience",   description: "Work history, roles, companies, timelines" },
  "/education":  { title: "Education",    description: "Degrees, institutions, coursework" },
  "/projects":   { title: "Projects",     description: "Things I've built — source links, awards" },
  "/apps":       { title: "Apps",         description: "Live apps & products I host and run" },
  "/blog":       { title: "Blog",         description: "Technical writing and essays" },
  "/lab":        { title: "Lab",          description: "Living system docs, active builds" },
  "/quotes":     { title: "Quotes",       description: "Collected wisdom, favourite quotes" },
  "/now":        { title: "Now",          description: "What I'm currently working on" },
  "/gallery":    { title: "Gallery",      description: "Photos and moments" },
  "/chat":       { title: "Ask Pumpkin",  description: "AI assistant — ask anything about Taruni" },
};

// Directories under src/app/ to never surface in the command palette
const EXCLUDED_DIRS = new Set(["admin", "api"]);

function segmentToTitle(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isRouteGroup(name: string) { return name.startsWith("("); }
function isDynamic(name: string)    { return name.startsWith("["); }
function isHidden(name: string)     { return name.startsWith("_") || name.startsWith("."); }

function walk(dir: string, routePrefix: string, out: PageMeta[]) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // If this directory contains a page file, record the route
  const hasPage = entries.some((e) => e.isFile() && /^page\.(tsx?|jsx?|mdx)$/.test(e.name));
  if (hasPage) {
    const href = routePrefix === "" ? "/" : routePrefix;
    const cfg  = ROUTE_CONFIG[href];
    out.push({
      href,
      title:       cfg?.title       ?? segmentToTitle(href.split("/").filter(Boolean).pop() ?? "Home"),
      description: cfg?.description ?? `${segmentToTitle(href.split("/").filter(Boolean).pop() ?? "Home")} page`,
    });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (isHidden(entry.name))  continue;
    if (isDynamic(entry.name)) continue;          // skip [slug], [tag], etc.
    if (EXCLUDED_DIRS.has(entry.name)) continue;  // skip admin, api

    const childDir = path.join(dir, entry.name);

    if (isRouteGroup(entry.name)) {
      // Route group: transparent in URL, recurse with same prefix
      walk(childDir, routePrefix, out);
    } else {
      const childRoute = routePrefix === "" ? `/${entry.name}` : `${routePrefix}/${entry.name}`;
      walk(childDir, childRoute, out);
    }
  }
}

export function getAllPages(): PageMeta[] {
  const appDir = path.join(process.cwd(), "src", "app");
  const raw: PageMeta[] = [];

  walk(appDir, "", raw);

  // Deduplicate (route groups can cause the same href to appear twice)
  const seen = new Set<string>();
  const pages = raw.filter((p) => {
    if (seen.has(p.href)) return false;
    seen.add(p.href);
    return true;
  });

  return pages.sort((a, b) => {
    if (a.href === "/") return -1;
    if (b.href === "/") return 1;
    return a.href.localeCompare(b.href);
  });
}
