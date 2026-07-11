"use client";

import { useEffect, useRef, useState, useCallback, Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "@/lib/api/client";
import { triggerReingest } from "./AdminShared";

/* ── Types ─────────────────────────────────────────────────────────── */
interface BlogRow {
  id: number;
  slug: string;
  title: string;
  date: string;
  published_at: string;
  description: string;
  tags: string[];
  content: string;
  published: boolean;
}

type EditorMode = "write" | "split" | "preview";

const todayISO = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  slug: "",
  title: "",
  date: todayISO,
  published_at: todayISO,
  description: "",
  tags: [] as string[],
  content: "",
  published: true,
};

/* ── Helpers ────────────────────────────────────────────────────────── */
function adminToken() {
  return typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
}
function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` };
}
function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function readingTime(text: string) {
  return Math.max(1, Math.ceil(wordCount(text) / 200));
}

/* ── GitHub MDX sync ────────────────────────────────────────────────── */
const GITHUB_BLOG_MDX_BASE = "https://api.github.com/repos/sabarishreddy99/jayaremala/contents/frontend/src/content/blog";

function buildBlogMdx(b: { title: string; date: string; published_at: string; description: string; tags: string[]; content: string }): string {
  const esc = (s: string) => s.replace(/"/g, '\\"');
  return `---\ntitle: "${esc(b.title)}"\ndate: "${b.date}"\npublishedAt: "${b.published_at}"\ndescription: "${esc(b.description)}"\ntags: ${JSON.stringify(b.tags)}\n---\n\n${b.content}`;
}

function githubPat(): string {
  return typeof window !== "undefined" ? localStorage.getItem("pumpkin_github_pat") ?? "" : "";
}

async function pushBlogMdxToGitHub(b: { slug: string; title: string; date: string; published_at: string; description: string; tags: string[]; content: string }) {
  const pat = githubPat();
  if (!pat.trim()) return;
  try {
    const url = `${GITHUB_BLOG_MDX_BASE}/${b.slug}.mdx`;
    const hdrs = { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
    const getRes = await fetch(url, { headers: hdrs });
    if (!getRes.ok && getRes.status !== 404) return;
    const sha = getRes.ok ? (await getRes.json() as { sha: string }).sha : undefined;
    const ghBody: Record<string, string> = { message: `blog: ${sha ? "update" : "add"} ${b.slug}`, content: btoa(unescape(encodeURIComponent(buildBlogMdx(b)))), branch: "main" };
    if (sha) ghBody.sha = sha;
    await fetch(url, { method: "PUT", headers: hdrs, body: JSON.stringify(ghBody) });
  } catch { /* non-fatal — API save already succeeded */ }
}

async function deleteBlogMdxFromGitHub(slug: string) {
  const pat = githubPat();
  if (!pat.trim()) return;
  try {
    const url = `${GITHUB_BLOG_MDX_BASE}/${slug}.mdx`;
    const hdrs = { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
    const getRes = await fetch(url, { headers: hdrs });
    if (!getRes.ok) return;
    const { sha } = await getRes.json() as { sha: string };
    await fetch(url, { method: "DELETE", headers: hdrs, body: JSON.stringify({ message: `blog: remove ${slug}`, sha, branch: "main" }) });
  } catch { /* non-fatal */ }
}

/* ── Toolbar insert helper ──────────────────────────────────────────── */
function insertMarkdown(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  setValue: (v: string) => void,
  wrap: { before?: string; after?: string; placeholder?: string; linePrefix?: string }
) {
  const ta = ref.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  const full = ta.value;
  let newVal = "";
  let newCursor: [number, number] = [0, 0];

  if (wrap.linePrefix) {
    // Prefix each selected line
    const lineStart = full.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = full.indexOf("\n", end) === -1 ? full.length : full.indexOf("\n", end);
    const lines = full.slice(lineStart, lineEnd).split("\n");
    const prefixed = lines.map((l) => wrap.linePrefix + l).join("\n");
    newVal = full.slice(0, lineStart) + prefixed + full.slice(lineEnd);
    newCursor = [lineStart, lineStart + prefixed.length];
  } else {
    const before = wrap.before ?? "";
    const after = wrap.after ?? wrap.before ?? "";
    const text = selected || wrap.placeholder || "";
    newVal = full.slice(0, start) + before + text + after + full.slice(end);
    const curStart = start + before.length;
    newCursor = [curStart, curStart + text.length];
  }

  setValue(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(newCursor[0], newCursor[1]);
  });
}

/* ── Tag pill input ─────────────────────────────────────────────────── */
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center rounded-xl border border-border bg-bg px-3 py-2 min-h-[38px] focus-within:border-accent transition-colors cursor-text"
      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-medium">
          #{t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}
            className="hover:text-rose-500 transition-colors leading-none" aria-label={`Remove ${t}`}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && input.trim()) { e.preventDefault(); add(input); }
          if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => { if (input.trim()) add(input); }}
        placeholder={tags.length ? "" : "type tag, press Enter…"}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-fg placeholder:text-fg-faint outline-none"
      />
    </div>
  );
}

/* ── Toolbar button ─────────────────────────────────────────────────── */
function TBtn({
  onClick, title, children, className = "",
}: { onClick: () => void; title: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center h-7 px-2 rounded text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors text-xs font-semibold select-none ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Callout styles (mirrors MDXComponents.tsx) ─────────────────────── */
type CalloutType = "info" | "tip" | "warning" | "quote";
const CALLOUT_STYLES: Record<CalloutType, { border: string; bg: string; icon: string; label: string; text: string }> = {
  info:    { border: "border-blue-200 dark:border-blue-800",   bg: "bg-blue-50 dark:bg-blue-950/50",   icon: "ℹ",  label: "text-blue-700 dark:text-blue-400",   text: "text-blue-800 dark:text-blue-300" },
  tip:     { border: "border-green-200 dark:border-green-800", bg: "bg-green-50 dark:bg-green-950/50", icon: "✦",  label: "text-green-700 dark:text-green-400", text: "text-green-800 dark:text-green-300" },
  warning: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-950/50", icon: "⚠",  label: "text-amber-700 dark:text-amber-400", text: "text-amber-900 dark:text-amber-300" },
  quote:   { border: "border-indigo-200 dark:border-indigo-800", bg: "bg-indigo-50 dark:bg-indigo-950/50", icon: "❝", label: "text-indigo-600 dark:text-indigo-400", text: "text-indigo-900 dark:text-indigo-300" },
};

/* ── Preprocess markdown before ReactMarkdown ───────────────────────── */
// Converts JSX-style custom components → markdown equivalents so ReactMarkdown
// can render them. ReactMarkdown can't execute JSX, so we convert them to
// standard markdown syntax that our custom component overrides then render correctly.
function preprocessMarkdown(raw: string): string {
  return raw
    // <Divider /> → horizontal rule
    .replace(/<Divider\s*\/?>/g, "\n\n---\n\n")
    // <Callout type="x">body</Callout> → special blockquote marker "> [TYPE] body"
    .replace(
      /<Callout[^>]*type=["'](\w+)["'][^>]*>([\s\S]*?)<\/Callout>/g,
      (_, type, body) =>
        `\n\n> [${type.toUpperCase()}] ${body.trim().replace(/\n+/g, " ")}\n\n`
    )
    // <BlogImage src="..." alt="..."> → markdown image
    .replace(
      /<BlogImage[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/g,
      (_, src, alt) => `\n\n![${alt}](${src})\n\n`
    );
}

/* ── Markdown preview ───────────────────────────────────────────────── */
function Preview({ content }: { content: string }) {
  const processed = preprocessMarkdown(content);
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {content.trim() ? (
        <div className="prose max-w-none text-[1rem] leading-[1.85] font-[family-name:var(--font-blog)]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Detect preprocessed callouts: blockquote whose first <p> starts with "[TYPE]"
              blockquote: ({ children }) => {
                const kids = Children.toArray(children);
                const firstP = kids.find(
                  (k): k is React.ReactElement<{ children: React.ReactNode }> =>
                    isValidElement(k) && (k as React.ReactElement).type === "p"
                );
                if (firstP) {
                  const pKids = Children.toArray(firstP.props.children);
                  const firstText = typeof pKids[0] === "string" ? pKids[0] : "";
                  const m = firstText.match(/^\[([A-Z]+)\]\s*/);
                  if (m) {
                    const type = m[1].toLowerCase() as CalloutType;
                    const s = CALLOUT_STYLES[type] ?? CALLOUT_STYLES.info;
                    return (
                      <div className={`not-prose my-6 rounded-xl border ${s.border} ${s.bg} px-5 py-4`}>
                        <div className={`flex items-center gap-2 mb-1.5 text-sm font-semibold ${s.label}`}>
                          <span>{s.icon}</span>
                          <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </div>
                        <div className={`text-sm leading-relaxed ${s.text}`}>
                          {firstText.slice(m[0].length)}{pKids.slice(1)}
                        </div>
                      </div>
                    );
                  }
                }
                return <blockquote>{children}</blockquote>;
              },
              // <Divider /> → styled ornamental rule
              hr: () => (
                <div className="not-prose my-8 flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-fg-faint text-xs">✦</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              ),
            }}
          >
            {processed}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-fg-faint text-sm italic text-center mt-16">Nothing to preview yet…</p>
      )}
    </div>
  );
}

/* ── Result message ─────────────────────────────────────────────────── */
function Result({ result }: { result: { ok: boolean; message: string } | null }) {
  if (!result) return null;
  return (
    <span className={`text-xs ${result.ok ? "text-emerald-500" : "text-rose-500"}`}>
      {result.ok ? "✓" : "✗"} {result.message}
    </span>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function ContentBlogEditor() {
  const [posts, setPosts]           = useState<BlogRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [savedContent, setSavedContent] = useState("");
  const [mode, setMode]             = useState<EditorMode>("write");
  const [fullscreen, setFullscreen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const isDirty = form.content !== savedContent;

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/content/blog/drafts`, {
        headers: { Authorization: `Bearer ${adminToken()}` },
      });
      if (res.ok) setPosts(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }

  useEffect(() => { loadPosts(); }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingSlug(null);
    setResult(null);
    setSavedContent("");
    setFullscreen(false);
  }

  function startEdit(p: BlogRow) {
    setEditingSlug(p.slug);
    setForm({
      slug: p.slug,
      title: p.title,
      date: p.date,
      published_at: p.published_at,
      description: p.description,
      tags: p.tags,
      content: p.content,
      published: p.published,
    });
    setSavedContent(p.content);
    setResult(null);
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({ ...f, title, slug: editingSlug ? f.slug : slugify(title) }));
  }

  const handleSave = useCallback(async () => {
    if (!form.slug.trim() || !form.title.trim()) {
      setResult({ ok: false, message: "Slug and title are required." });
      return;
    }
    setSaving(true);
    setResult(null);
    const body = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      date: form.date,
      published_at: form.published_at,
      description: form.description.trim(),
      tags: form.tags,
      content: form.content,
      published: form.published,
    };
    try {
      const url = editingSlug ? `${API_BASE_URL}/content/blog/${editingSlug}` : `${API_BASE_URL}/content/blog`;
      const res = await fetch(url, {
        method: editingSlug ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSavedContent(form.content);
        setResult({ ok: true, message: editingSlug ? "Updated!" : "Post created and live!" });
        if (!editingSlug) resetForm();
        await loadPosts();
        triggerReingest();
        void pushBlogMdxToGitHub(body);
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, message: (err as { detail?: string }).detail ?? `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: (e as Error).message });
    }
    setSaving(false);
  }, [form, editingSlug]);

  async function handleDelete(slug: string) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/content/blog/${slug}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        setResult({ ok: true, message: "Deleted." });
        setConfirmDelete(null);
        if (editingSlug === slug) resetForm();
        await loadPosts();
        triggerReingest();
        void deleteBlogMdxFromGitHub(slug);
      } else {
        setResult({ ok: false, message: `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: (e as Error).message });
    }
    setSaving(false);
  }

  function toggleSelect(slug: string) {
    setSelectedSlugs(prev => { const next = new Set(prev); next.has(slug) ? next.delete(slug) : next.add(slug); return next; });
  }
  function toggleSelectAll() {
    setSelectedSlugs(prev => prev.size === posts.length ? new Set<string>() : new Set(posts.map(p => p.slug)));
  }
  async function handleBulkDelete() {
    if (!bulkConfirm) { setBulkConfirm(true); return; }
    setBulkDeleting(true);
    setBulkConfirm(false);
    const slugsToDelete = [...selectedSlugs];
    for (const slug of slugsToDelete) {
      try {
        const res = await fetch(`${API_BASE_URL}/content/blog/${slug}`, { method: "DELETE", headers: authHeaders() });
        if (res.ok || res.status === 204) {
          if (editingSlug === slug) resetForm();
          void deleteBlogMdxFromGitHub(slug);
        }
      } catch { /* continue */ }
    }
    setSelectedSlugs(new Set());
    await loadPosts();
    triggerReingest();
    setBulkDeleting(false);
    setResult({ ok: true, message: `Deleted ${slugsToDelete.length} post${slugsToDelete.length !== 1 ? "s" : ""}.` });
  }

  // Keyboard shortcuts on the textarea
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === "b") { e.preventDefault(); insertMarkdown(taRef, (v) => setForm((f) => ({ ...f, content: v })), { before: "**", after: "**", placeholder: "bold text" }); }
    if (e.key === "i") { e.preventDefault(); insertMarkdown(taRef, (v) => setForm((f) => ({ ...f, content: v })), { before: "*", after: "*", placeholder: "italic text" }); }
    if (e.key === "k") { e.preventDefault(); insertMarkdown(taRef, (v) => setForm((f) => ({ ...f, content: v })), { before: "[", after: "](url)", placeholder: "link text" }); }
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
  }

  const setContent = (v: string) => setForm((f) => ({ ...f, content: v }));

  const wc = wordCount(form.content);
  const rt = readingTime(form.content);

  /* ── Editor area ──────────────────────────────────────────────────── */
  const editorArea = (
    <div className={`flex flex-col border border-border rounded-xl overflow-hidden bg-bg ${fullscreen ? "flex-1" : ""}`}>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-surface-raised flex-wrap">
        <TBtn title="Bold (⌘B)" onClick={() => insertMarkdown(taRef, setContent, { before: "**", after: "**", placeholder: "bold text" })}>
          <strong>B</strong>
        </TBtn>
        <TBtn title="Italic (⌘I)" onClick={() => insertMarkdown(taRef, setContent, { before: "*", after: "*", placeholder: "italic text" })}>
          <em className="font-serif">I</em>
        </TBtn>
        <TBtn title="Strikethrough" onClick={() => insertMarkdown(taRef, setContent, { before: "~~", after: "~~", placeholder: "text" })}>
          <span className="line-through">S</span>
        </TBtn>

        <span className="w-px h-4 bg-border mx-1" />

        <TBtn title="Heading 2" onClick={() => insertMarkdown(taRef, setContent, { before: "\n## ", after: "", placeholder: "Section heading" })}>
          H2
        </TBtn>
        <TBtn title="Heading 3" onClick={() => insertMarkdown(taRef, setContent, { before: "\n### ", after: "", placeholder: "Sub-section" })}>
          H3
        </TBtn>

        <span className="w-px h-4 bg-border mx-1" />

        <TBtn title="Inline code" onClick={() => insertMarkdown(taRef, setContent, { before: "`", after: "`", placeholder: "code" })}>
          <code className="text-[10px]">`x`</code>
        </TBtn>
        <TBtn title="Code block" onClick={() => insertMarkdown(taRef, setContent, { before: "\n```\n", after: "\n```\n", placeholder: "code here" })}>
          <code className="text-[10px]">```</code>
        </TBtn>

        <span className="w-px h-4 bg-border mx-1" />

        <TBtn title="Link (⌘K)" onClick={() => insertMarkdown(taRef, setContent, { before: "[", after: "](url)", placeholder: "link text" })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </TBtn>
        <TBtn title="Blockquote" onClick={() => insertMarkdown(taRef, setContent, { before: "\n> ", after: "", placeholder: "quote" })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/></svg>
        </TBtn>

        <span className="w-px h-4 bg-border mx-1" />

        <TBtn title="Bullet list" onClick={() => insertMarkdown(taRef, setContent, { linePrefix: "- " })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
        </TBtn>
        <TBtn title="Numbered list" onClick={() => insertMarkdown(taRef, setContent, { linePrefix: "1. " })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </TBtn>

        <span className="w-px h-4 bg-border mx-1" />

        <TBtn title="Callout block" onClick={() => insertMarkdown(taRef, setContent, { before: "\n<Callout type=\"info\">\n", after: "\n</Callout>\n", placeholder: "Callout content" })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </TBtn>
        <TBtn title="Divider" onClick={() => insertMarkdown(taRef, setContent, { before: "\n\n<Divider />\n\n", after: "" })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>
        </TBtn>

        {/* Spacer + mode switcher on the right */}
        <div className="ml-auto flex items-center gap-1">
          {(["write", "split", "preview"] as EditorMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${mode === m ? "bg-accent/10 text-accent" : "text-fg-faint hover:text-fg"}`}>
              {m}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-1" />
          <button onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex items-center justify-center w-7 h-7 rounded text-fg-faint hover:text-fg hover:bg-surface-raised transition-colors">
            {fullscreen ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7V3h4"/><path d="M17 3h4v4"/><path d="M21 17v4h-4"/><path d="M7 21H3v-4"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className={`flex ${fullscreen ? "flex-1 min-h-0" : "h-80"}`}>
        {/* Write pane */}
        {(mode === "write" || mode === "split") && (
          <textarea
            ref={taRef}
            value={form.content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Write your post in Markdown…\n\nTip: ⌘B bold · ⌘I italic · ⌘K link · ⌘↵ save"}
            className={`bg-transparent px-4 py-4 text-sm text-fg font-mono placeholder:text-fg-subtle focus:outline-none resize-none leading-relaxed ${mode === "split" ? "w-1/2 border-r border-border" : "w-full"}`}
          />
        )}

        {/* Preview pane */}
        {(mode === "preview" || mode === "split") && (
          <div className={mode === "split" ? "w-1/2" : "w-full"}>
            <Preview content={form.content} />
          </div>
        )}
      </div>

      {/* Editor footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-raised text-[10px] text-fg-faint">
        <span>{wc.toLocaleString()} words · {rt} min read</span>
        <span className={isDirty ? "text-amber-500 font-medium" : "text-emerald-500"}>
          {isDirty ? "● Unsaved changes" : "✓ Saved"}
        </span>
      </div>
    </div>
  );

  /* ── Fullscreen wrapper ────────────────────────────────────────────── */
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-bg flex flex-col p-6 gap-4 overflow-y-auto">
        {/* compact meta bar */}
        <div className="flex items-center gap-3 shrink-0">
          <input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Post title…"
            className="flex-1 bg-transparent text-lg font-semibold text-fg placeholder:text-fg-faint focus:outline-none border-b border-border focus:border-accent transition-colors pb-1" />
          <button onClick={() => setFullscreen(false)} className="text-xs text-fg-faint hover:text-fg transition-colors shrink-0">Exit fullscreen</button>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {editorArea}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-fg">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} className="rounded" />
            Published
          </label>
          <div className="ml-auto flex items-center gap-3">
            <Result result={result} />
            <button onClick={handleSave} disabled={saving}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : editingSlug ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Normal layout ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-fg">
              {editingSlug ? "Edit post" : "New blog post"}
            </h2>
            <p className="text-[11px] text-fg-faint mt-0.5">Posts publish immediately via the Content API — no git push needed.</p>
          </div>
          {editingSlug && (
            <button onClick={resetForm} className="text-xs text-fg-faint hover:text-fg transition-colors">
              + New post
            </button>
          )}
        </div>

        {/* Title + Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Title</label>
            <input value={form.title} onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="My new post"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Slug (URL)</label>
            <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="my-new-post" disabled={!!editingSlug}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg font-mono placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors disabled:opacity-50" />
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-fg-faint uppercase tracking-wider">Description</label>
            <span className="text-[10px] text-fg-faint">{form.description.length}/160</span>
          </div>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            maxLength={160} placeholder="One-line summary shown in the blog index"
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors" />
        </div>

        {/* Dates + Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Originally Published <span className="normal-case font-normal text-fg-faint">(sort order)</span></label>
            <input type="date" value={form.published_at} onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Last Edited <span className="normal-case font-normal text-fg-faint">(shown to readers)</span></label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Tags</label>
            <TagInput tags={form.tags} onChange={(t) => setForm((f) => ({ ...f, tags: t }))} />
          </div>
        </div>

        {/* Editor */}
        <div>
          <label className="block text-[11px] font-semibold text-fg-faint mb-1.5 uppercase tracking-wider">Content</label>
          {editorArea}
          <p className="text-[10px] text-fg-faint mt-1.5 flex flex-wrap gap-x-3">
            <span>⌘B bold</span><span>⌘I italic</span><span>⌘K link</span><span>⌘↵ save</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} className="rounded" />
            <span className="text-sm text-fg">Published (live immediately)</span>
          </label>
          <div className="ml-auto flex items-center gap-3">
            <Result result={result} />
            {editingSlug && (
              <button onClick={resetForm} className="text-xs text-fg-faint hover:text-fg transition-colors">Cancel</button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : editingSlug ? "Update Post" : "Publish Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Post list */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={posts.length > 0 && selectedSlugs.size === posts.length}
              onChange={toggleSelectAll}
              disabled={posts.length === 0}
              className="accent-accent cursor-pointer"
            />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-fg-faint">
              {loading ? "Loading…" : `${posts.length} post${posts.length !== 1 ? "s" : ""} (including drafts)`}
            </h3>
          </div>
          {selectedSlugs.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-fg-muted">{selectedSlugs.size} selected</span>
              {bulkConfirm ? (
                <>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting}
                    className="px-3 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
                    {bulkDeleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button onClick={() => setBulkConfirm(false)}
                    className="px-2 py-1 rounded border border-border text-[11px] text-fg-faint hover:text-fg transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="px-3 py-1 rounded border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                  Delete selected ({selectedSlugs.size})
                </button>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.slug} className={`flex items-start gap-3 rounded-xl border bg-bg p-3 hover:border-border-strong transition-colors ${selectedSlugs.has(p.slug) ? "border-rose-300 dark:border-rose-800" : "border-border"}`}>
              <input
                type="checkbox"
                checked={selectedSlugs.has(p.slug)}
                onChange={() => toggleSelect(p.slug)}
                className="mt-1 shrink-0 accent-accent cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${p.published ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <p className="text-sm font-medium text-fg leading-snug truncate">{p.title}</p>
                </div>
                <p className="text-[11px] text-fg-faint font-mono pl-3.5">/{p.slug} · {p.date}</p>
                <div className="flex gap-1.5 mt-1.5 pl-3.5 flex-wrap">
                  {p.tags.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] bg-surface-raised border border-border px-1.5 py-0.5 rounded text-fg-faint">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 shrink-0 pt-0.5">
                <button onClick={() => startEdit(p)} className="text-[11px] text-accent hover:text-accent/80 transition-colors">Edit</button>
                {confirmDelete === p.slug ? (
                  <span className="flex gap-2">
                    <button onClick={() => handleDelete(p.slug)} className="text-[11px] text-rose-600 hover:text-rose-500">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[11px] text-fg-faint">Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDelete(p.slug)} className="text-[11px] text-fg-faint hover:text-rose-600 transition-colors">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
