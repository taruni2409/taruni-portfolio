import Link from "next/link";
import { profile } from "@/data/profile";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  icon?: string;
}

// ── Section keyword map ───────────────────────────────────────────────────────

const SECTIONS: { href: string; label: string; icon: string; keywords: string[] }[] = [
  {
    href: "/projects",
    label: "Projects",
    icon: "◈",
    keywords: [
      "project", "built", "build", "snaplog", "codecollab", "genecart",
      "hackathon", "award", "winner", "github", "demo", "app", "system", "engine",
      "qualcomm", "SnapLog",
    ],
  },
  {
    href: "/experience",
    label: "Experience",
    icon: "◎",
    keywords: [
      "experience", "work", "job", "role", "shell", "wipro", "nyu", "engineer",
      "intern", "company", "position", "career", "employed", "team", "led", "built at",
      "latency", "pipeline", "kafka", "langraph", "production",
    ],
  },
  {
    href: "/education",
    label: "Education",
    icon: "◉",
    keywords: [
      "education", "degree", "university", "nyu", "vit", "gpa", "tandon",
      "master", "bachelor", "school", "college", "coursework", "study", "studied", "graduate",
    ],
  },
  {
    href: "/blog",
    label: "Blog",
    icon: "◇",
    keywords: ["blog", "writing", "post", "article", "thoughts", "wrote", "publish"],
  },
  {
    href: "/lab",
    label: "Lab",
    icon: "⬡",
    keywords: [
      "lab", "system design", "architecture", "living doc", "in progress",
      "decision", "progress log", "building in public", "itsjaya",
    ],
  },
  {
    href: "/quotes",
    label: "Quotes",
    icon: "❝",
    keywords: [
      "quote", "quotes", "saying", "wisdom", "words", "philosophy",
      "inspiring", "favorite quote", "mental model", "live by",
      "shaped how", "think and build", "collected", "curated",
    ],
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: "▣",
    keywords: [
      "gallery", "photo", "picture", "milestone", "visual",
      "event photo", "certificate", "award photo", "photograph", "image",
    ],
  },
  {
    href: "/now",
    label: "Now",
    icon: "◌",
    keywords: [
      "now", "currently", "right now", "at the moment", "currently working",
      "what is he doing", "reading now", "building now", "learning now",
      "what's he up to", "these days", "recently",
    ],
  },
  {
    href: "/",
    label: "Skills",
    icon: "◆",
    keywords: [
      "skill", "stack", "technology", "language", "tool", "framework", "python",
      "typescript", "react", "fastapi", "kubernetes", "aws", "redis", "proficient",
    ],
  },
];

// ── RAG source type → portfolio URL ──────────────────────────────────────────

const SOURCE_TYPE_MAP: Record<string, { href: string; label: string; icon: string }> = {
  experience: { href: "/experience", label: "Experience",  icon: "◎" },
  education:  { href: "/education",  label: "Education",   icon: "◉" },
  project:    { href: "/projects",   label: "Projects",    icon: "◈" },
  skills:     { href: "/",           label: "Skills",      icon: "◆" },
  profile:    { href: "/",           label: "Portfolio",   icon: "✦" },
  quote:      { href: "/quotes",     label: "Quotes",      icon: "❝" },
  gallery:    { href: "/gallery",    label: "Gallery",     icon: "▣" },
};

/**
 * Convert RAG source strings (e.g. "experience:exp_0_bullet_2", "blog:blog_my-post",
 * "lab:lab_itsjaya") into deduplicated NavLink pills.
 */
export function sourcesToNavLinks(sources: string[]): NavLink[] {
  const seen = new Set<string>();
  const links: NavLink[] = [];

  for (const src of sources) {
    const colon = src.indexOf(":");
    if (colon === -1) continue;
    const type = src.slice(0, colon);
    const id   = src.slice(colon + 1);

    if (type === "blog") {
      // id format: "blog_{slug}"
      const slug = id.replace(/^blog_/, "");
      const href = `/blog/${slug}`;
      if (!seen.has(href)) {
        seen.add(href);
        links.push({ href, label: "Blog post ↗", icon: "◇" });
      }
      // Also surface blog index
      if (!seen.has("/blog")) { seen.add("/blog"); links.push({ href: "/blog", label: "Blog", icon: "◇" }); }
      continue;
    }

    if (type === "lab") {
      // id format: "lab_{slug}"
      const slug = id.replace(/^lab_/, "");
      const href = `/lab/${slug}`;
      if (!seen.has(href)) {
        seen.add(href);
        links.push({ href, label: "Lab entry ↗", icon: "⬡" });
      }
      if (!seen.has("/lab")) { seen.add("/lab"); links.push({ href: "/lab", label: "Lab", icon: "⬡" }); }
      continue;
    }

    if (type === "quote") {
      if (!seen.has("/quotes")) { seen.add("/quotes"); links.push({ href: "/quotes", label: "Quotes", icon: "❝" }); }
      continue;
    }

    if (type === "gallery") {
      if (!seen.has("/gallery")) { seen.add("/gallery"); links.push({ href: "/gallery", label: "Gallery", icon: "▣" }); }
      continue;
    }

    if (type === "profile" && id === "profile_now") {
      if (!seen.has("/now")) { seen.add("/now"); links.push({ href: "/now", label: "Now", icon: "◌" }); }
      continue;
    }

    const mapped = SOURCE_TYPE_MAP[type];
    if (mapped && !seen.has(mapped.href)) {
      seen.add(mapped.href);
      links.push({ href: mapped.href, label: mapped.label, icon: mapped.icon });
    }
  }

  return links;
}

// ── Keyword-based detection (from conversation text) ─────────────────────────

export function detectNavLinks(userMsg: string, assistantMsg: string): NavLink[] {
  const combined = (userMsg + " " + assistantMsg).toLowerCase();
  const links: NavLink[] = [];

  for (const s of SECTIONS) {
    if (s.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      links.push({ label: s.label, href: s.href, icon: s.icon });
    }
  }

  if (/\b(resume|cv|download|pdf)\b/.test(combined)) {
    links.push({ label: "Resume ↗", href: profile.resume, external: true });
  }

  return links;
}

// ── Merge RAG-based + keyword-based links, deduped, capped at 5 ──────────────

export function mergeNavLinks(ragLinks: NavLink[], keywordLinks: NavLink[]): NavLink[] {
  const seen = new Set<string>();
  const result: NavLink[] = [];
  for (const l of [...ragLinks, ...keywordLinks]) {
    if (!seen.has(l.href)) {
      seen.add(l.href);
      result.push(l);
    }
  }
  return result.slice(0, 5);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NavSuggestions({ links }: { links: NavLink[] }) {
  if (!links.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {links.map((l) =>
        l.external ? (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-accent hover:border-accent/50 transition-all"
          >
            {l.icon && <span className="text-accent/70 text-[10px]">{l.icon}</span>}
            {l.label}
          </a>
        ) : (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1 text-[11px] font-medium text-fg-muted hover:bg-accent-light hover:border-accent/50 hover:text-accent transition-all"
          >
            {l.icon && <span className="text-zinc-400 text-[10px]">{l.icon}</span>}
            {l.label}
          </Link>
        )
      )}
    </div>
  );
}
