"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "@/lib/api/client";
import { triggerReingest } from "./AdminShared";

const GITHUB_LAB_URL = "https://api.github.com/repos/sabarishreddy99/jayaremala/contents/backend/data/knowledge/lab.json";
const GITHUB_LAB_MDX_BASE = "https://api.github.com/repos/sabarishreddy99/jayaremala/contents/frontend/src/content/lab";

function buildLabMdx(b: { title: string; status: string; description: string; started_at: string; updated_at: string; tech: string[]; links: { label: string; url: string }[]; content: string }): string {
  const esc = (s: string) => s.replace(/"/g, '\\"');
  const techYaml = `[${b.tech.join(", ")}]`;
  const linksYaml = b.links.length > 0
    ? `links:\n${b.links.map((l) => `  - label: ${l.label}\n    url: ${l.url}`).join("\n")}`
    : "links: []";
  return `---\ntitle: "${esc(b.title)}"\nstatus: "${b.status}"\ndescription: "${esc(b.description)}"\nstartedAt: "${b.started_at}"\nupdatedAt: "${b.updated_at}"\ntech: ${techYaml}\n${linksYaml}\n---\n\n${b.content}`;
}

function githubPat(): string {
  return typeof window !== "undefined" ? localStorage.getItem("pumpkin_github_pat") ?? "" : "";
}

async function pushLabMdxToGitHub(b: { slug: string; title: string; status: string; description: string; started_at: string; updated_at: string; tech: string[]; links: { label: string; url: string }[]; content: string }) {
  const pat = githubPat();
  if (!pat.trim()) return;
  try {
    const url = `${GITHUB_LAB_MDX_BASE}/${b.slug}.mdx`;
    const hdrs = { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
    const getRes = await fetch(url, { headers: hdrs });
    if (!getRes.ok && getRes.status !== 404) return;
    const sha = getRes.ok ? (await getRes.json() as { sha: string }).sha : undefined;
    const ghBody: Record<string, string> = { message: `lab: ${sha ? "update" : "add"} ${b.slug}`, content: btoa(unescape(encodeURIComponent(buildLabMdx(b)))), branch: "main" };
    if (sha) ghBody.sha = sha;
    await fetch(url, { method: "PUT", headers: hdrs, body: JSON.stringify(ghBody) });
  } catch { /* non-fatal — API save already succeeded */ }
}

async function deleteLabMdxFromGitHub(slug: string) {
  const pat = githubPat();
  if (!pat.trim()) return;
  try {
    const url = `${GITHUB_LAB_MDX_BASE}/${slug}.mdx`;
    const hdrs = { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
    const getRes = await fetch(url, { headers: hdrs });
    if (!getRes.ok) return;
    const { sha } = await getRes.json() as { sha: string };
    await fetch(url, { method: "DELETE", headers: hdrs, body: JSON.stringify({ message: `lab: remove ${slug}`, sha, branch: "main" }) });
  } catch { /* non-fatal */ }
}

interface LabLink { label: string; url: string }

interface LabRow {
  id: number;
  slug: string;
  title: string;
  status: "active" | "paused" | "shipped";
  description: string;
  started_at: string;
  updated_at: string;
  tech: string[];
  links: LabLink[];
  content: string;
}

type EditorMode = "write" | "split" | "preview";

const todayISO = new Date().toISOString().slice(0, 10);

interface LabForm {
  slug: string;
  title: string;
  status: "active" | "paused" | "shipped";
  description: string;
  started_at: string;
  updated_at: string;
  tech: string;
  links: LabLink[];
  content: string;
}

const EMPTY_FORM: LabForm = {
  slug: "",
  title: "",
  status: "active",
  description: "",
  started_at: todayISO,
  updated_at: todayISO,
  tech: "",
  links: [{ label: "", url: "" }],
  content: "",
};

function adminToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken()}`,
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function readingTime(text: string) {
  return Math.max(1, Math.ceil(wordCount(text) / 200));
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

/* ── Markdown preview (mirrors BlogPostMarkdown — plain remark-gfm) ──── */
function Preview({ content }: { content: string }) {
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {content.trim() ? (
        <div className="prose max-w-none text-[1rem] leading-[1.85]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-fg-faint text-sm italic text-center mt-16">Nothing to preview yet…</p>
      )}
    </div>
  );
}

function Result({ result }: { result: { ok: boolean; message: string } | null }) {
  if (!result) return null;
  return (
    <span className={`text-xs ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
      {result.ok ? "✓" : "✗"} {result.message}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active:  "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  paused:  "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  shipped: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
};

export default function ContentLabEditor() {
  const [entries, setEntries] = useState<LabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedContent, setSavedContent] = useState("");
  const [mode, setMode] = useState<EditorMode>("write");
  const [fullscreen, setFullscreen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const isDirty = form.content !== savedContent;

  async function loadEntries(): Promise<LabRow[] | null> {
    setLoading(true);
    let data: LabRow[] | null = null;
    try {
      const res = await fetch(`${API_BASE_URL}/content/lab`);
      if (res.ok) { data = await res.json(); setEntries(data ?? []); }
    } catch { /* silent */ }
    setLoading(false);
    return data;
  }

  async function pushToGitHub(rows: LabRow[]) {
    const pat = githubPat();
    if (!pat.trim()) return;
    try {
      const output = rows.map((e) => ({
        slug: e.slug, title: e.title, status: e.status, description: e.description,
        startedAt: e.started_at, updatedAt: e.updated_at, tech: e.tech, links: e.links, content: e.content,
      }));
      const hdrs = { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const getRes = await fetch(GITHUB_LAB_URL, { headers: hdrs });
      if (!getRes.ok && getRes.status !== 404) return;
      const sha = getRes.ok ? (await getRes.json() as { sha: string }).sha : undefined;
      const body: Record<string, string> = { message: "lab: sync from admin", content: btoa(unescape(encodeURIComponent(JSON.stringify(output, null, 2)))), branch: "main" };
      if (sha) body.sha = sha;
      await fetch(GITHUB_LAB_URL, { method: "PUT", headers: hdrs, body: JSON.stringify(body) });
    } catch { /* non-fatal — API save already succeeded */ }
  }

  useEffect(() => { loadEntries(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingSlug(null);
    setResult(null);
    setSavedContent("");
    setFullscreen(false);
  }

  function startEdit(e: LabRow) {
    setEditingSlug(e.slug);
    setForm({
      slug: e.slug,
      title: e.title,
      status: e.status,
      description: e.description,
      started_at: e.started_at,
      updated_at: e.updated_at,
      tech: e.tech.join(", "),
      links: e.links.length > 0 ? e.links : [{ label: "", url: "" }],
      content: e.content,
    });
    setSavedContent(e.content);
    setResult(null);
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: editingSlug ? f.slug : slugify(title),
    }));
  }

  function updateLink(idx: number, field: keyof LabLink, value: string) {
    setForm((f) => {
      const links = [...f.links];
      links[idx] = { ...links[idx], [field]: value };
      return { ...f, links };
    });
  }

  function addLink() {
    setForm((f) => ({ ...f, links: [...f.links, { label: "", url: "" }] }));
  }

  function removeLink(idx: number) {
    setForm((f) => ({ ...f, links: f.links.filter((_, i) => i !== idx) }));
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
      status: form.status,
      description: form.description.trim(),
      started_at: form.started_at,
      updated_at: form.updated_at,
      tech: form.tech.split(",").map((t) => t.trim()).filter(Boolean),
      links: form.links.filter((l) => l.label.trim() && l.url.trim()),
      content: form.content,
    };
    try {
      const url = editingSlug
        ? `${API_BASE_URL}/content/lab/${editingSlug}`
        : `${API_BASE_URL}/content/lab`;
      const res = await fetch(url, {
        method: editingSlug ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSavedContent(form.content);
        setResult({ ok: true, message: editingSlug ? "Updated!" : "Entry created — live immediately." });
        const wasEditing = !!editingSlug;
        if (!wasEditing) resetForm();
        const updated = await loadEntries();
        triggerReingest();
        if (updated !== null) void pushToGitHub(updated);
        void pushLabMdxToGitHub(body);
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, message: (err as { detail?: string }).detail ?? `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: (e as Error).message });
    }
    setSaving(false);
  }, [form, editingSlug]);

  function toggleSelect(slug: string) {
    setSelectedSlugs(prev => { const next = new Set(prev); if (next.has(slug)) next.delete(slug); else next.add(slug); return next; });
  }
  function toggleSelectAll() {
    setSelectedSlugs(prev => prev.size === entries.length ? new Set<string>() : new Set(entries.map(e => e.slug)));
  }
  async function handleBulkDelete() {
    if (!bulkConfirm) { setBulkConfirm(true); return; }
    setBulkDeleting(true);
    setBulkConfirm(false);
    const slugsToDelete = [...selectedSlugs];
    for (const slug of slugsToDelete) {
      try {
        const res = await fetch(`${API_BASE_URL}/content/lab/${slug}`, { method: "DELETE", headers: authHeaders() });
        if (res.ok || res.status === 204) {
          if (editingSlug === slug) resetForm();
          void deleteLabMdxFromGitHub(slug);
        }
      } catch { /* continue */ }
    }
    setSelectedSlugs(new Set());
    const updated = await loadEntries();
    triggerReingest();
    if (updated !== null) void pushToGitHub(updated);
    setBulkDeleting(false);
    setResult({ ok: true, message: `Deleted ${slugsToDelete.length} entr${slugsToDelete.length !== 1 ? "ies" : "y"}.` });
  }

  async function handleDelete(slug: string) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/content/lab/${slug}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        setResult({ ok: true, message: "Deleted." });
        setConfirmDelete(null);
        if (editingSlug === slug) resetForm();
        const updated = await loadEntries();
        triggerReingest();
        if (updated !== null) void pushToGitHub(updated);
        void deleteLabMdxFromGitHub(slug);
      } else {
        setResult({ ok: false, message: `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: (e as Error).message });
    }
    setSaving(false);
  }

  const setContent = (v: string) => setForm((f) => ({ ...f, content: v }));

  // Keyboard shortcuts on the textarea
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === "b") { e.preventDefault(); insertMarkdown(taRef, setContent, { before: "**", after: "**", placeholder: "bold text" }); }
    if (e.key === "i") { e.preventDefault(); insertMarkdown(taRef, setContent, { before: "*", after: "*", placeholder: "italic text" }); }
    if (e.key === "k") { e.preventDefault(); insertMarkdown(taRef, setContent, { before: "[", after: "](url)", placeholder: "link text" }); }
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
  }

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
        <TBtn title="Architecture diagram (```arch)" onClick={() => insertMarkdown(taRef, setContent, { before: "\n```arch\n", after: "\n```\n", placeholder: "ASCII architecture diagram" })}>
          <code className="text-[10px]">arch</code>
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
            placeholder={"Write your lab entry in Markdown…\n\nTip: ⌘B bold · ⌘I italic · ⌘K link · ⌘↵ save"}
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
        <div className="flex items-center gap-3 shrink-0">
          <input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Entry title…"
            className="flex-1 bg-transparent text-lg font-semibold text-fg placeholder:text-fg-faint focus:outline-none border-b border-border focus:border-accent transition-colors pb-1" />
          <button onClick={() => setFullscreen(false)} className="text-xs text-fg-faint hover:text-fg transition-colors shrink-0">Exit fullscreen</button>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {editorArea}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "paused" | "shipped" }))}
            className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-fg focus:outline-none focus:border-accent"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="shipped">Shipped</option>
          </select>
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
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-bold text-fg">{editingSlug ? "Edit lab entry" : "Lab — Content API"}</h2>
          {editingSlug && (
            <button onClick={resetForm} className="text-xs text-fg-faint hover:text-fg transition-colors">
              + New entry
            </button>
          )}
        </div>
        <p className="text-xs text-fg-faint mb-6">Changes are live immediately — no git push, no rebuild.</p>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Title</label>
              <input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="My experiment"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="my-experiment"
                disabled={!!editingSlug}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg font-mono placeholder:text-fg-faint focus:outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "paused" | "shipped" }))}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="shipped">Shipped</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Originally Published <span className="normal-case font-normal text-fg-faint">(sort order)</span></label>
              <input
                type="date"
                value={form.started_at}
                onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Last Edited <span className="normal-case font-normal text-fg-faint">(shown to readers)</span></label>
              <input
                type="date"
                value={form.updated_at}
                onChange={(e) => setForm((f) => ({ ...f, updated_at: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Short description shown in lab index"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Tech (comma-separated)</label>
            <input
              value={form.tech}
              onChange={(e) => setForm((f) => ({ ...f, tech: e.target.value }))}
              placeholder="React, TypeScript, FastAPI"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
            />
          </div>

          {/* Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-semibold text-fg-faint uppercase tracking-wider">Links</label>
              {form.links.length < 5 && (
                <button onClick={addLink} className="text-[10px] text-accent hover:text-accent/80 transition-colors">
                  + Add link
                </button>
              )}
            </div>
            <div className="space-y-2">
              {form.links.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={link.label}
                    onChange={(e) => updateLink(idx, "label", e.target.value)}
                    placeholder="Label"
                    className="w-1/3 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => updateLink(idx, "url", e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
                  />
                  {form.links.length > 1 && (
                    <button
                      onClick={() => removeLink(idx)}
                      className="text-[11px] text-rose-500 hover:text-rose-600 px-2 shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1.5 uppercase tracking-wider">Content (Markdown)</label>
            {editorArea}
            <p className="text-[10px] text-fg-faint mt-1.5 flex flex-wrap gap-x-3">
              <span>⌘B bold</span><span>⌘I italic</span><span>⌘K link</span><span>⌘↵ save</span>
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : editingSlug ? "Update Entry" : "Add Entry"}
            </button>
            {editingSlug && (
              <button onClick={resetForm} className="text-xs text-fg-faint hover:text-fg transition-colors">
                Cancel
              </button>
            )}
            <Result result={result} />
          </div>
        </div>

        {/* Entry list */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={entries.length > 0 && selectedSlugs.size === entries.length}
              onChange={toggleSelectAll}
              disabled={entries.length === 0}
              className="accent-accent cursor-pointer"
            />
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-faint">
              {loading ? "Loading…" : `${entries.length} entries`}
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
          {entries.map((e) => (
            <div key={e.slug} className={`flex items-start gap-3 rounded-xl border bg-bg p-3 hover:border-border-strong transition-colors ${selectedSlugs.has(e.slug) ? "border-rose-300 dark:border-rose-800" : "border-border"}`}>
              <input
                type="checkbox"
                checked={selectedSlugs.has(e.slug)}
                onChange={() => toggleSelect(e.slug)}
                className="mt-1 shrink-0 accent-accent cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg leading-snug truncate">{e.title}</p>
                <p className="text-[11px] text-fg-faint mt-0.5 font-mono">/{e.slug}</p>
                <div className="flex gap-2 mt-1 flex-wrap items-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status] ?? "bg-surface-raised text-fg-muted"}`}>
                    {e.status}
                  </span>
                  <span className="text-[10px] text-fg-faint">{e.started_at}</span>
                  {e.tech.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] bg-surface-raised px-2 py-0.5 rounded-full text-fg-muted">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => startEdit(e)}
                  className="text-[11px] text-accent hover:text-accent/80 transition-colors"
                >
                  Edit
                </button>
                {confirmDelete === e.slug ? (
                  <span className="flex gap-1">
                    <button
                      onClick={() => handleDelete(e.slug)}
                      className="text-[11px] text-rose-600 hover:text-rose-500"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[11px] text-fg-faint"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(e.slug)}
                    className="text-[11px] text-fg-faint hover:text-rose-600 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
