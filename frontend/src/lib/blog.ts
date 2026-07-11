import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "blog");

export interface PostFrontmatter {
  title: string;
  date: string;
  publishedAt?: string;
  description: string;
  tags: string[];
  readingTime: number;
  image?: string;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
}

export interface Post extends PostMeta {
  content: string;
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data } = matter(raw);
      const toStr = (v: unknown) =>
        v instanceof Date ? v.toISOString().slice(0, 10) : (v as string) ?? "";
      const wordCount = raw.split(/\s+/).filter(Boolean).length;
      return {
        slug,
        title: data.title ?? slug,
        date: toStr(data.date),
        publishedAt: data.publishedAt ? toStr(data.publishedAt) : undefined,
        description: data.description ?? "",
        tags: data.tags ?? [],
        readingTime: Math.max(1, Math.ceil(wordCount / 200)),
        image: data.image ?? undefined,
      } as PostMeta;
    })
    .sort((a, b) => {
      // Posts with explicit publishedAt sort first (by publishedAt).
      // Legacy posts without publishedAt sort after, by date.
      const aKey = a.publishedAt ?? "";
      const bKey = b.publishedAt ?? "";
      if (aKey && bKey) return aKey < bKey ? 1 : -1;
      if (aKey) return -1;
      if (bKey) return 1;
      return a.date < b.date ? 1 : -1;
    });
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const toStr = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : (v as string) ?? "";
  const wordCount = raw.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: data.title ?? slug,
    date: toStr(data.date),
    publishedAt: data.publishedAt ? toStr(data.publishedAt) : undefined,
    description: data.description ?? "",
    tags: data.tags ?? [],
    readingTime: Math.max(1, Math.ceil(wordCount / 200)),
    image: data.image ?? undefined,
    content,
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
