#!/usr/bin/env node
// Converts MDX blog posts → backend/data/knowledge/blog.json
// Run: node scripts/sync-blog.mjs (from repo root)
//      or via `npm run sync-blog` (from frontend/)

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, "../frontend/src/content/blog");
const OUTPUT = join(__dirname, "../backend/data/knowledge/blog.json");

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
    .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, "")   // JSX components with children
    .replace(/<[A-Z][^/]*\/>/g, "")                          // self-closing JSX
    .replace(/^#{1,6}\s+/gm, "")                             // headings
    .replace(/\*\*(.*?)\*\*/g, "$1")                         // bold
    .replace(/\*(.*?)\*/g, "$1")                             // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "")                      // inline/block code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")                 // links → text only
    .replace(/^[>*-]\s+/gm, "")                              // blockquotes, list markers
    .replace(/\n{3,}/g, "\n\n")                              // collapse excess newlines
    .trim();
}

const files = readdirSync(BLOG_DIR)
  .filter(f => f.endsWith(".mdx") && !f.toUpperCase().startsWith("BLOG"));

const posts = [];
for (const file of files) {
  const slug = basename(file, ".mdx");
  const raw = readFileSync(join(BLOG_DIR, file), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  posts.push({
    slug,
    title: meta.title || slug,
    date: meta.date || "",
    description: meta.description || "",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    content: stripMdx(body).slice(0, 2000),
  });
}

writeFileSync(OUTPUT, JSON.stringify(posts, null, 2));
console.log(`sync-blog: wrote ${posts.length} post(s) → ${OUTPUT}`);
