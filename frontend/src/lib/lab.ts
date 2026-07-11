import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "lab");

export type LabStatus = "active" | "shipped" | "paused";

export interface LabLink {
  label: string;
  url: string;
}

export interface LabFrontmatter {
  title: string;
  status: LabStatus;
  description: string;
  startedAt: string;
  updatedAt: string;
  tech: string[];
  links?: LabLink[];
}

export interface LabMeta extends LabFrontmatter {
  slug: string;
}

export interface LabEntry extends LabMeta {
  content: string;
}

const STATUS_ORDER: Record<LabStatus, number> = { active: 0, paused: 1, shipped: 2 };

export function getAllLabEntries(): LabMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data } = matter(raw);
      return {
        slug,
        title: data.title ?? slug,
        status: (data.status ?? "active") as LabStatus,
        description: data.description ?? "",
        startedAt: data.startedAt ?? "",
        updatedAt: data.updatedAt ?? "",
        tech: data.tech ?? [],
        links: data.links ?? undefined,
      } as LabMeta;
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.updatedAt < b.updatedAt ? 1 : -1);
}

export function getLabEntryBySlug(slug: string): LabEntry | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    status: (data.status ?? "active") as LabStatus,
    description: data.description ?? "",
    startedAt: data.startedAt ?? "",
    updatedAt: data.updatedAt ?? "",
    tech: data.tech ?? [],
    links: data.links ?? undefined,
    content,
  };
}

export function getAllLabSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
