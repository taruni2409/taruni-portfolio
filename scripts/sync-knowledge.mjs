#!/usr/bin/env node
// Syncs backend/data/knowledge/ → frontend/src/data/knowledge/
// Converts MDX blog posts → backend/data/knowledge/blog.json
// Converts MDX lab entries → backend/data/knowledge/lab.json
//
// Run:  node scripts/sync-knowledge.mjs   (from repo root)
//       npm run sync                       (from frontend/)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_KNOWLEDGE = join(__dirname, "../backend/data/knowledge");
const FRONTEND_KNOWLEDGE = join(__dirname, "../frontend/src/data/knowledge");
const BLOG_DIR = join(__dirname, "../frontend/src/content/blog");
const LAB_DIR  = join(__dirname, "../frontend/src/content/lab");

mkdirSync(FRONTEND_KNOWLEDGE, { recursive: true });

// ── Shared helpers ─────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: content };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map(s => s.trim().replace(/^['"]|['"]$/g, ""));
    } else {
      val = val.replace(/^['"]|['"]$/g, "");
    }
    meta[key] = val;
  }
  return { meta, body: m[2] };
}

function stripMdx(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")              // fenced code blocks (incl. arch diagrams)
    .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, "")  // JSX block components
    .replace(/<[A-Z][^/]*\/>/g, "")              // self-closing JSX
    .replace(/^---$/gm, "")                       // horizontal rules
    .replace(/^#{1,6}\s+/gm, "")                 // headings
    .replace(/\*\*(.*?)\*\*/g, "$1")             // bold
    .replace(/\*(.*?)\*/g, "$1")                 // italic
    .replace(/`[^`]*`/g, "")                     // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")     // links
    .replace(/^\|.*\|$/gm, "")                   // markdown tables
    .replace(/^[>*-]\s+/gm, "")                  // blockquotes / bullets
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── 1. Generate blog.json from MDX posts ──────────────────────────────────────

const mdxBlogFiles = readdirSync(BLOG_DIR)
  .filter(f => f.endsWith(".mdx") && !f.toUpperCase().startsWith("BLOG"));

const posts = [];
for (const file of mdxBlogFiles) {
  const slug = basename(file, ".mdx");
  const raw = readFileSync(join(BLOG_DIR, file), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  posts.push({
    slug,
    title:       meta.title || slug,
    date:        meta.date || "",
    description: meta.description || "",
    tags:        Array.isArray(meta.tags) ? meta.tags : [],
    content:     stripMdx(body).slice(0, 2000),
  });
}

writeFileSync(join(BACKEND_KNOWLEDGE, "blog.json"), JSON.stringify(posts, null, 2));
console.log(`sync: generated blog.json (${posts.length} post(s))`);

// ── 2. Generate lab.json from MDX lab entries ──────────────────────────────────

const labEntries = [];
if (existsSync(LAB_DIR)) {
  const mdxLabFiles = readdirSync(LAB_DIR).filter(f => f.endsWith(".mdx"));
  for (const file of mdxLabFiles) {
    const slug = basename(file, ".mdx");
    const raw = readFileSync(join(LAB_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    labEntries.push({
      slug,
      title:       meta.title || slug,
      status:      meta.status || "active",
      description: meta.description || "",
      startedAt:   meta.startedAt || "",
      updatedAt:   meta.updatedAt || "",
      tech:        Array.isArray(meta.tech) ? meta.tech : [],
      content:     stripMdx(body).slice(0, 3000),
    });
  }
}

writeFileSync(join(BACKEND_KNOWLEDGE, "lab.json"), JSON.stringify(labEntries, null, 2));
console.log(`sync: generated lab.json (${labEntries.length} entr${labEntries.length === 1 ? "y" : "ies"})`);

// ── 3. Copy all JSON files from backend → frontend ────────────────────────────

const jsonFiles = readdirSync(BACKEND_KNOWLEDGE).filter(f => f.endsWith(".json"));
for (const file of jsonFiles) {
  // Validate before overwriting the frontend copy: an empty or malformed source
  // JSON must fail the sync loudly, not silently ship a broken file that breaks
  // the Next build (Turbopack can't import invalid JSON). See quotes.json regression.
  const content = readFileSync(join(BACKEND_KNOWLEDGE, file), "utf8");
  if (!content.trim()) {
    throw new Error(`sync: backend/data/knowledge/${file} is empty — refusing to overwrite frontend copy`);
  }
  try {
    JSON.parse(content);
  } catch (err) {
    throw new Error(`sync: backend/data/knowledge/${file} is not valid JSON — ${err.message}`);
  }
  writeFileSync(join(FRONTEND_KNOWLEDGE, file), content);
}
console.log(`sync: copied ${jsonFiles.length} JSON file(s) → frontend/src/data/knowledge/`);
