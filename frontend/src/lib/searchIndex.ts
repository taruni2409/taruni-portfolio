/**
 * Centralised search-index builder.
 *
 * Call getSearchIndex() once (server-side, build time) to get every
 * searchable item on the site as a flat SearchItem[].
 *
 * Adding new content is zero-touch:
 *   • New page route   → auto-discovered by getAllPages() (filesystem scan)
 *   • New blog post    → auto-discovered by getAllPosts()  (MDX scan)
 *   • New lab entry    → auto-discovered by getAllLabEntries() (MDX scan)
 *   • New knowledge JSON → auto-read if it lands in src/data/knowledge/
 *     Known files use the typed strategy in FILE_STRATEGIES.
 *     Unknown future files fall back to the generic strategy
 *     (looks for title/name + description/summary/caption fields).
 */

import fs   from "fs";
import path from "path";
import { getAllPages }      from "./pages";
import { getAllPosts }      from "./blog";
import { getAllLabEntries } from "./lab";

// ── Public types ──────────────────────────────────────────────────────────────

export interface SearchItem {
  type:        string;   // "page" | "blog" | "lab" | "experience" | any future type
  title:       string;
  description?: string;
  href:        string;
  tags?:       string[];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

type RawRecord = Record<string, unknown>;

interface FileStrategy {
  type: string;
  href: string;
  // Return null to skip a record (e.g. malformed rows)
  map(item: RawRecord): { title: string; description?: string; tags?: string[] } | null;
}

/** Path to the synced knowledge JSON files */
const KNOWLEDGE_DIR = path.join(process.cwd(), "src", "data", "knowledge");

/**
 * Files to skip — handled separately (MDX sources) or not worth indexing
 * as standalone search items.
 */
const SKIP_FILES = new Set(["blog.json", "lab.json", "profile.json"]);

// ── Per-file typed strategies ─────────────────────────────────────────────────

const FILE_STRATEGIES: Record<string, FileStrategy> = {
  "experience.json": {
    type: "experience",
    href: "/experience",
    map(item) {
      if (!item.role && !item.company) return null;
      const period = [item.start, item.end ?? "Present"].filter(Boolean).join(" – ");
      return {
        title:       [item.role, item.company].filter(Boolean).join(" · "),
        description: [period, item.description].filter(Boolean).join("  ·  ") || undefined,
        tags:        typeof item.tech === "string"
          ? item.tech.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      };
    },
  },

  "education.json": {
    type: "education",
    href: "/education",
    map(item) {
      if (!item.institution && !item.degree) return null;
      const subtitle = [item.degree, item.field].filter(Boolean).join(" in ");
      const gpaStr   = item.gpa ? `GPA ${item.gpa}` : "";
      const highlight = Array.isArray(item.highlights) ? (item.highlights[0] as string) : "";
      return {
        title:       [subtitle, item.institution].filter(Boolean).join(" · "),
        description: [gpaStr, highlight].filter(Boolean).join("  ·  ") || (item.school as string) || undefined,
      };
    },
  },

  "projects.json": {
    type: "project",
    href: "/projects",
    map(item) {
      if (!item.title) return null;
      return {
        title:       item.title as string,
        description: [item.award, item.description].filter(Boolean).join("  ·  ") || undefined,
        tags:        Array.isArray(item.tags) ? (item.tags as string[]) : [],
      };
    },
  },

  "skills.json": {
    type: "skill",
    href: "/projects",
    map(item) {
      if (!item.category) return null;
      const items = Array.isArray(item.items) ? (item.items as string[]) : [];
      return {
        title:       item.category as string,
        description: items.slice(0, 8).join(", ") || undefined,
        tags:        items,
      };
    },
  },

  "quotes.json": {
    type: "quote",
    href: "/quotes",
    map(item) {
      if (!item.text) return null;
      const text = String(item.text);
      return {
        title:       `"${text.slice(0, 90)}${text.length > 90 ? "…" : ""}"`,
        description: item.author ? `— ${item.author}` : undefined,
        tags:        item.category ? [String(item.category)] : [],
      };
    },
  },

  "testimonials.json": {
    type: "testimonial",
    href: "/",
    map(item) {
      if (!item.name) return null;
      const desc = String(item.description ?? "");
      return {
        title:       [item.name, item.company].filter(Boolean).join(" · "),
        description: desc.slice(0, 130) + (desc.length > 130 ? "…" : "") || undefined,
      };
    },
  },

  "gallery.json": {
    type: "gallery",
    href: "/gallery",
    map(item) {
      if (!item.title) return null;
      return {
        title:       item.title as string,
        description: [item.caption, item.category].filter(Boolean).join("  ·  ") || undefined,
      };
    },
  },
};

/**
 * Generic fallback for any future JSON file not listed in FILE_STRATEGIES.
 * Looks for common field names; skips records with no usable title.
 */
function genericMap(filename: string, item: RawRecord): SearchItem | null {
  const type  = filename.replace(/\.json$/, "");
  const href  = `/${type}`;
  const title = (item.title ?? item.name ?? item.label) as string | undefined;
  if (!title) return null;
  const description = (item.description ?? item.summary ?? item.caption ?? item.body) as string | undefined;
  const tags  = Array.isArray(item.tags) ? (item.tags as string[]) : [];
  return { type, title, description: description ? String(description).slice(0, 140) : undefined, href, tags };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function getSearchIndex(): SearchItem[] {
  const items: SearchItem[] = [];

  // ── 1. App pages (filesystem scan — auto-picks up new routes) ────────────
  for (const p of getAllPages()) {
    items.push({ type: "page", title: p.title, description: p.description, href: p.href });
  }

  // ── 2. Blog posts + per-tag navigation (MDX scan) ────────────────────────
  const posts = getAllPosts();
  for (const p of posts) {
    items.push({ type: "blog", title: p.title, description: p.description, href: `/blog/${p.slug}`, tags: p.tags });
  }
  const blogTags = [...new Set(posts.flatMap((p) => p.tags))].sort();
  for (const tag of blogTags) {
    items.push({
      type:        "tag",
      title:       `#${tag}`,
      description: `Browse posts tagged "${tag}"`,
      href:        `/blog/tag/${encodeURIComponent(tag)}`,
      tags:        [tag],
    });
  }

  // ── 3. Lab entries (MDX scan) ─────────────────────────────────────────────
  for (const l of getAllLabEntries()) {
    items.push({ type: "lab", title: l.title, description: l.description, href: `/lab/${l.slug}`, tags: l.tech });
  }

  // ── 4. Knowledge JSON files (auto-scanned) ────────────────────────────────
  if (!fs.existsSync(KNOWLEDGE_DIR)) return items;

  const jsonFiles = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith(".json") && !SKIP_FILES.has(f));

  for (const file of jsonFiles) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, file), "utf8"));
    } catch {
      continue; // skip malformed files
    }

    // Support both array files (most) and single-object files
    const records = (Array.isArray(raw) ? raw : [raw]) as RawRecord[];
    const strategy = FILE_STRATEGIES[file];

    for (const record of records) {
      if (typeof record !== "object" || record === null) continue;

      if (strategy) {
        const mapped = strategy.map(record);
        if (mapped) items.push({ type: strategy.type, href: strategy.href, ...mapped });
      } else {
        // Generic fallback — handles any future JSON file automatically
        const item = genericMap(file, record);
        if (item) items.push(item);
      }
    }
  }

  return items;
}
