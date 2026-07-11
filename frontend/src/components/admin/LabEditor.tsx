"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { triggerReingest } from "./AdminShared";

/* ────────────────────────────────────────────────────────────────────────────
   Write Lab — full-featured authoring view for Lab (living system docs).
   Mirrors the "Write Blog" editor: localStorage drafts + autosave, templates,
   focus mode, rich toolbar, live preview, format reference, image upload, and
   GitHub publish. Lab entries are saved to content.db (live immediately) and,
   when a GitHub PAT is set, synced to the MDX file + aggregate lab.json.
──────────────────────────────────────────────────────────────────────────── */

const GITHUB_REPO = "https://api.github.com/repos/taruni2409/taruni-portfolio/contents";
const GITHUB_LAB_MDX_BASE = `${GITHUB_REPO}/frontend/src/content/lab`;
const GITHUB_LAB_JSON = `${GITHUB_REPO}/backend/data/knowledge/lab.json`;

type LabStatus = "active" | "paused" | "shipped";

interface LabLink { label: string; url: string }

interface LabRow {
  id: number;
  slug: string;
  title: string;
  status: LabStatus;
  description: string;
  started_at: string;
  updated_at: string;
  tech: string[];
  links: LabLink[];
  content: string;
}

interface DraftEntry {
  id: string;
  title: string;
  slug: string;
  status: LabStatus;
  description: string;
  startedAt: string;
  updatedAt: string;
  tech: string;
  links: LabLink[];
  content: string;
  savedAt: string;
}

const DRAFTS_KEY = "pumpkin_lab_drafts";

const TECH_POOL = [
  "React", "Next.js", "TypeScript", "Python", "FastAPI", "ChromaDB",
  "Postgres", "Redis", "Docker", "Tailwind", "ONNX", "Gemini",
  "RAG", "Embeddings", "SQLite", "Railway", "Vercel", "WebSockets",
];

const LAB_TEMPLATES = [
  {
    id: "system", icon: "layers", label: "System Doc",
    desc: "Living doc for a system you're building",
    content: `<Status status="active" />\n\n## What this is\n\nOne paragraph: what the system does and why it exists.\n\n## Architecture\n\n\`\`\`arch\n┌────────────┐     ┌────────────┐\n│  Frontend  │────▶│  Backend   │\n└────────────┘     └────────────┘\n\`\`\`\n\n## Stack\n\n<Stack items={["Next.js", "FastAPI", "ChromaDB"]} />\n\n## Decisions\n\n<Decision date="${todayISO()}" title="Why X over Y">\nThe reasoning behind a key architectural choice.\n</Decision>\n\n## Progress log\n\n<Update date="${todayISO()}">\nWhat changed today.\n</Update>`,
  },
  {
    id: "experiment", icon: "flask", label: "Experiment",
    desc: "Hypothesis → method → result",
    content: `<Status status="active" />\n\n## Hypothesis\n\nWhat are you testing, and what do you expect?\n\n## Method\n\nHow you set it up. Be reproducible.\n\n## Results\n\n<Metric value="0%" label="key metric" />\n\nWhat actually happened.\n\n## Takeaway\n\nWhat you learned. What's next?`,
  },
  {
    id: "teardown", icon: "wrench", label: "Teardown",
    desc: "Reverse-engineer how something works",
    content: `## The thing\n\nWhat you're taking apart and why it's interesting.\n\n## How it works\n\nWalk through the internals.\n\n\`\`\`arch\n[ Input ] ──▶ [ Process ] ──▶ [ Output ]\n\`\`\`\n\n## What I'd steal\n\n- Idea 1\n- Idea 2`,
  },
  {
    id: "quick", icon: "zap", label: "Quick Note",
    desc: "Short status update or finding",
    content: `<Status status="active" />\n\n<Update date="${todayISO()}">\nStart writing here — a quick lab note needs no strict structure.\n</Update>`,
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function adminToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function inlineFmt(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/!\[([^\]]*)\]\(([^)"]+?)(?:\s+"([^"]+)")?\)/g, (_, alt, src, cap) =>
      `<img src="${src}" alt="${alt}" style="max-width:100%;vertical-align:middle;border-radius:8px;display:inline-block" />${cap ? ` <em style="font-size:0.82em;color:#71717a">${cap}</em>` : ""}`
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code style="background:#27272a;color:#e879f9;padding:0.1em 0.35em;border-radius:4px;font-size:0.85em">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#818cf8;text-decoration:underline">$1</a>');
}

// Approximate preview renderer — mirrors the blog one, with lab niceties
// (```arch blocks + lab JSX components shown as labeled placeholders). The
// real render happens via labMDXComponents on the live /lab page.
function mdxToHTML(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim().split(/[\s{]/)[0] || "plaintext";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        i++;
      }
      if (lang === "arch") {
        html += `<pre style="background:#09090b;color:#d4d4d8;padding:1em 1.2em;border-radius:0.75rem;overflow-x:auto;font-size:0.7rem;line-height:1.65;border:1px solid #27272a;margin:1em 0"><div style="font-size:9px;color:#52525b;margin-bottom:0.5em;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em">architecture</div>${codeLines.join("\n")}</pre>`;
      } else {
        html += `<pre style="background:#f6f8fa;color:#24292e;padding:1em 1.2em;border-radius:0.75rem;overflow-x:auto;font-size:0.82em;line-height:1.6;border:1px solid #e1e4e8;margin:1em 0"><div style="font-size:9px;color:#57606a;margin-bottom:0.5em;font-family:monospace">[Shiki highlights on publish — ${lang} block]</div>${codeLines.join("\n")}</pre>`;
      }
      i++; continue;
    }
    if (line.startsWith("#### ")) { html += `<h4 style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;margin:1.4em 0 0.3em">${inlineFmt(line.slice(5))}</h4>`; i++; continue; }
    if (line.startsWith("### "))  { html += `<h3 style="font-size:1.05rem;font-weight:700;margin:1.5em 0 0.4em">${inlineFmt(line.slice(4))}</h3>`; i++; continue; }
    if (line.startsWith("## "))   { html += `<h2 style="font-size:1.3rem;font-weight:700;margin:2em 0 0.5em;padding-bottom:0.3em;border-bottom:1px solid #3f3f46">${inlineFmt(line.slice(3))}</h2>`; i++; continue; }
    if (line.startsWith("# "))    { html += `<h1 style="font-size:1.75rem;font-weight:800;margin:0 0 0.5em">${inlineFmt(line.slice(2))}</h1>`; i++; continue; }
    if (line.startsWith("> "))    { html += `<blockquote style="border-left:3px solid #4f46e5;padding:0.5em 1em;margin:1em 0;background:#eef2ff;border-radius:0 0.5rem 0.5rem 0;font-style:italic"><p style="margin:0">${inlineFmt(line.slice(2))}</p></blockquote>`; i++; continue; }
    if (line === "---") { html += `<hr style="border:none;border-top:1px solid #3f3f46;margin:2em 0" />`; i++; continue; }
    if (/^[-*] /.test(line)) {
      let items = "";
      while (i < lines.length && /^[-*] /.test(lines[i])) { items += `<li style="margin-bottom:0.35em">${inlineFmt(lines[i].slice(2))}</li>`; i++; }
      html += `<ul style="padding-left:1.4em;margin:0.8em 0;list-style-type:disc">${items}</ul>`; continue;
    }
    if (/^\d+\. /.test(line)) {
      let items = "";
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items += `<li style="margin-bottom:0.35em">${inlineFmt(lines[i].replace(/^\d+\. /, ""))}</li>`; i++; }
      html += `<ol style="padding-left:1.4em;margin:0.8em 0;list-style-type:decimal">${items}</ol>`; continue;
    }
    if (line.trim() === "") { html += `<div style="height:0.6em"></div>`; i++; continue; }
    // Standalone image line: ![alt](url) or ![alt](url "caption")
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)"]+?)(?:\s+"([^"]+)")?\)$/);
    if (imgMatch) {
      const [, iAlt, iSrc, iCap] = imgMatch;
      html += `<figure style="margin:1.5em 0;text-align:center"><div style="display:inline-block;max-width:100%;border-radius:1rem;border:1px solid #3f3f46;overflow:hidden;background:#18181b;padding:0.75rem"><img src="${iSrc}" alt="${iAlt}" style="max-width:100%;height:auto;display:block;border-radius:0.5rem" /></div>${iCap ? `<figcaption style="margin-top:0.5em;font-size:0.82rem;color:#71717a;font-style:italic">${iCap}</figcaption>` : ""}</figure>`;
      i++; continue;
    }
    // Lab JSX components (Status / Decision / Update / Stack / Metric) — placeholder
    if (/^<\w/.test(line.trim())) {
      const tagM = line.trim().match(/^<(\w+)/);
      const tag = tagM?.[1] ?? "Component";
      if (line.trim().endsWith("/>")) {
        html += `<div style="display:inline-block;background:#1e1b4b;color:#818cf8;padding:0.3em 0.7em;border-radius:6px;font-size:0.78em;font-family:monospace;margin:0.4em 0">⬡ ${tag}</div>`;
        i++; continue;
      }
      // Multi-line component block — collect until closing tag
      const inner: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(`</${tag}`)) { inner.push(lines[i]); i++; }
      i++; // skip closing tag
      html += `<div style="border-left:3px solid #6366f1;padding:0.5em 0.9em;margin:1em 0;background:#1e1b4b0d;border-radius:0 0.5rem 0.5rem 0"><div style="font-size:9px;color:#6366f1;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.3em">⬡ ${tag}</div><div style="color:#71717a">${inner.map((l) => inlineFmt(l)).join("<br />")}</div></div>`;
      continue;
    }
    html += `<p style="margin:0 0 0.8em;line-height:1.75;color:#71717a">${inlineFmt(line)}</p>`;
    i++;
  }
  return html;
}

function buildLabMdx(b: { title: string; status: string; description: string; startedAt: string; updatedAt: string; tech: string[]; links: LabLink[]; content: string }): string {
  const esc = (s: string) => s.replace(/"/g, '\\"');
  const techYaml = `[${b.tech.join(", ")}]`;
  const linksYaml = b.links.length > 0
    ? `links:\n${b.links.map((l) => `  - label: ${l.label}\n    url: ${l.url}`).join("\n")}`
    : "links: []";
  return `---\ntitle: "${esc(b.title)}"\nstatus: "${b.status}"\ndescription: "${esc(b.description)}"\nstartedAt: "${b.startedAt}"\nupdatedAt: "${b.updatedAt}"\ntech: ${techYaml}\n${linksYaml}\n---\n\n${b.content}`;
}

/* ── Lab format reference ─────────────────────────────────────────────────── */
const LAB_FORMAT_GUIDE: { heading: string; items: { label: string; syntax: string; note?: string }[] }[] = [
  {
    heading: "Lab Components (living-doc)",
    items: [
      { label: "Status badge",   syntax: '<Status status="active" />', note: 'status = "active" | "paused" | "shipped". Put near the top of the entry.' },
      { label: "Decision log",   syntax: '<Decision date="2026-06-19" title="Why X over Y">\nThe reasoning behind a key choice.\n</Decision>', note: "Timeline entry with a dot + connector. Use for architectural decisions." },
      { label: "Progress update",syntax: '<Update date="2026-06-19">\nWhat changed today.\n</Update>', note: "Lighter timeline entry. Use for ongoing progress logs." },
      { label: "Tech stack row", syntax: '<Stack items={["Next.js", "FastAPI", "ChromaDB"]} />', note: "Renders tech as mono pills inline." },
      { label: "Metric",         syntax: '<Metric value="40%" label="latency drop" />', note: "Highlighted stat. Place several side by side." },
    ],
  },
  {
    heading: "Architecture diagrams",
    items: [
      { label: "Arch block", syntax: "```arch\n┌──────────┐     ┌──────────┐\n│ Frontend │────▶│ Backend  │\n└──────────┘     └──────────┘\n```", note: "Always use ```arch fenced blocks for ASCII diagrams — renders in a dark terminal-style frame." },
    ],
  },
  {
    heading: "Headings",
    items: [
      { label: "Section (H2)",     syntax: "## My Section",   note: "Large, underlined. Major sections." },
      { label: "Sub-section (H3)", syntax: "### Sub-section", note: "Medium weight, no border." },
    ],
  },
  {
    heading: "Text Formatting",
    items: [
      { label: "Bold",         syntax: "**bold text**" },
      { label: "Italic",       syntax: "*italic text*" },
      { label: "Strikethrough",syntax: "~~crossed out~~" },
      { label: "Inline code",  syntax: "`code snippet`",  note: "Pink monospace styling." },
      { label: "Link",         syntax: "[link text](https://url.com)" },
    ],
  },
  {
    heading: "Lists",
    items: [
      { label: "Bullet list",  syntax: "- First item\n- Second item" },
      { label: "Numbered list",syntax: "1. First\n2. Second" },
    ],
  },
  {
    heading: "Code Blocks (Shiki — syntax highlighted)",
    items: [
      { label: "Python",      syntax: "```python\ndef hello():\n    return 'hi'\n```" },
      { label: "TypeScript",  syntax: "```typescript\nconst greet = (n: string) => `Hi ${n}`\n```" },
      { label: "Bash / Shell",syntax: "```bash\nnpm install && npm run dev\n```" },
      { label: "No language", syntax: "```\nPlain text / pseudocode block\n```" },
    ],
  },
  {
    heading: "Table",
    items: [
      { label: "Basic table", syntax: "| Column A | Column B |\n|----------|----------|\n| Cell 1   | Cell 2   |", note: "Pipe-separated. Header row required." },
    ],
  },
];

/* ── Main component ───────────────────────────────────────────────────────── */
export default function LabEditor() {
  // Core content
  const [title, setTitle]             = useState("");
  const [slug, setSlug]               = useState("");
  const [slugEdited, setSlugEdited]   = useState(false);
  const [status, setStatus]           = useState<LabStatus>("active");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt]     = useState(todayISO());
  const [updatedAt, setUpdatedAt]     = useState(todayISO());
  const [tech, setTech]               = useState<string[]>([]);
  const [techInput, setTechInput]     = useState("");
  const [links, setLinks]             = useState<LabLink[]>([{ label: "", url: "" }]);
  const [content, setContent]         = useState("");

  // Draft management
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved]           = useState<Date | null>(null);
  const [drafts, setDrafts]                 = useState<DraftEntry[]>([]);
  const [showDraftMenu, setShowDraftMenu]   = useState(false);

  // Editor UI
  const [showTemplates, setShowTemplates]   = useState(true);
  const [activePanel, setActivePanel]       = useState<"write" | "preview">("write");
  const [focusMode, setFocusMode]           = useState(false);
  const [showPublish, setShowPublish]       = useState(false);
  const [showFormatRef, setShowFormatRef]   = useState(false);

  // Images
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);
  const [uploadingImg, setUploadingImg]     = useState(false);
  const [imgResult, setImgResult]           = useState<{ ok: boolean; message: string } | null>(null);
  const [showImageManager, setShowImageManager] = useState(false);
  const [insertingFor, setInsertingFor]     = useState<string | null>(null);
  const [captionInput, setCaptionInput]     = useState("");

  // Published entries management
  const [showPublished, setShowPublished]       = useState(false);
  const [entries, setEntries]                   = useState<LabRow[]>([]);
  const [loadingEntries, setLoadingEntries]     = useState(false);
  const [entriesResult, setEntriesResult]       = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug]         = useState<string | null>(null);
  const [editingExisting, setEditingExisting]   = useState(false);
  const [selectedSlugs, setSelectedSlugs]       = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting]         = useState(false);
  const [bulkConfirm, setBulkConfirm]           = useState(false);

  // GitHub / publish
  const [githubPat, setGithubPat] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("pumpkin_github_pat") ?? "" : ""
  );
  const [patVisible, setPatVisible] = useState(false);
  const [patSaved, setPatSaved]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);

  const [copiedSnippet, setCopiedSnippet] = useState("");
  const textareaRef                       = useRef<HTMLTextAreaElement>(null);
  const saveCallbackRef                   = useRef<() => void>(() => {});

  // === COMPUTED ===
  const wordCount   = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const checks = {
    title:       title.trim().length > 0,
    slug:        /^[a-z0-9-]+$/.test(slug.trim()) && slug.trim().length > 0,
    description: description.trim().length > 0 && description.length <= 160,
    tech:        tech.length > 0,
    content:     wordCount >= 30,
  };
  const allValid    = Object.values(checks).every(Boolean);
  const checksCount = Object.values(checks).filter(Boolean).length;

  const savedAgoText = lastSaved
    ? (() => {
        const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
        if (s < 10) return "just saved";
        if (s < 60) return `saved ${s}s ago`;
        return `saved ${Math.round(s / 60)}m ago`;
      })()
    : null;

  const suggestedTech = TECH_POOL.filter((t) => !tech.includes(t)).slice(0, 8);

  // === DRAFT HELPERS ===
  function readDrafts(): DraftEntry[] {
    try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "[]"); }
    catch { return []; }
  }

  function persistDraft(id: string | null): string {
    const newId = id ?? `draft_${Date.now()}`;
    const entry: DraftEntry = {
      id: newId, title, slug, status, description, startedAt, updatedAt,
      tech: tech.join(", "), links, content,
      savedAt: new Date().toISOString(),
    };
    const all = readDrafts();
    const idx = all.findIndex((d) => d.id === newId);
    if (idx >= 0) all[idx] = entry; else all.unshift(entry);
    const trimmed = all.slice(0, 10);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed));
    setCurrentDraftId(newId);
    setLastSaved(new Date());
    setDrafts(trimmed);
    return newId;
  }

  function loadDraftEntry(d: DraftEntry) {
    setTitle(d.title);
    setSlug(d.slug);
    setSlugEdited(true);
    setStatus(d.status);
    setDescription(d.description);
    setStartedAt(d.startedAt);
    setUpdatedAt(d.updatedAt);
    setTech(d.tech.split(",").map((t) => t.trim()).filter(Boolean));
    setLinks(d.links.length > 0 ? d.links : [{ label: "", url: "" }]);
    setContent(d.content);
    setCurrentDraftId(d.id);
    setLastSaved(new Date(d.savedAt));
    setShowTemplates(false);
    setShowDraftMenu(false);
    setEditingExisting(false);
  }

  function deleteDraftEntry(id: string) {
    const all = readDrafts().filter((d) => d.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
    setDrafts(all);
    if (currentDraftId === id) setCurrentDraftId(null);
  }

  function newEntry() {
    setTitle(""); setSlug(""); setSlugEdited(false); setStatus("active");
    setDescription(""); setStartedAt(todayISO()); setUpdatedAt(todayISO());
    setTech([]); setTechInput(""); setLinks([{ label: "", url: "" }]); setContent("");
    setCurrentDraftId(null); setLastSaved(null); setShowTemplates(true);
    setResult(null); setShowDraftMenu(false); setActivePanel("write");
    setEditingExisting(false);
  }

  // === EFFECTS ===
  useEffect(() => { setDrafts(readDrafts()); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [title, slugEdited]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(420, ta.scrollHeight) + "px";
  }, [content]);

  // Stable autosave every 15s using callback ref pattern
  useEffect(() => {
    saveCallbackRef.current = () => {
      if (title.trim() || content.trim()) persistDraft(currentDraftId);
    };
  });
  useEffect(() => {
    const id = setInterval(() => saveCallbackRef.current(), 15_000);
    return () => clearInterval(id);
  }, []);

  // === INSERTION HELPERS ===
  function insertInline(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel   = content.slice(start, end) || placeholder;
    const next  = content.slice(0, start) + before + sel + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.selectionStart = start + before.length;
      ta.selectionEnd   = start + before.length + sel.length;
      ta.focus();
    });
  }

  function insertBlock(template: string, caretOffset?: number) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos    = ta.selectionStart;
    const before = content.slice(0, pos);
    const suffix = content.slice(pos);
    const pad    = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const next   = before + pad + template + "\n\n" + suffix;
    setContent(next);
    const caret  = pos + pad.length + (caretOffset ?? template.length);
    requestAnimationFrame(() => {
      ta.selectionStart = caret;
      ta.selectionEnd   = caret;
      ta.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key === "b") { e.preventDefault(); insertInline("**", "**", "bold text"); }
    if (e.key === "i") { e.preventDefault(); insertInline("*", "*", "italic text"); }
    if (e.key === "k") { e.preventDefault(); insertInline("[", "](url)", "link text"); }
    if (e.key === "`") { e.preventDefault(); insertInline("`", "`", "code"); }
    if (e.key === "s") { e.preventDefault(); persistDraft(currentDraftId); }
  }

  // === TECH CHIPS ===
  function addTech(t: string) {
    const tag = t.trim();
    if (!tag || tech.includes(tag)) return;
    setTech([...tech, tag]);
    setTechInput("");
  }
  function removeTech(t: string) { setTech(tech.filter((x) => x !== t)); }
  function handleTechKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTech(techInput); }
    if (e.key === "Backspace" && !techInput && tech.length > 0) removeTech(tech[tech.length - 1]);
  }

  // === LINKS ===
  function updateLink(idx: number, field: keyof LabLink, value: string) {
    setLinks((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next; });
  }
  function addLink() { setLinks((prev) => [...prev, { label: "", url: "" }]); }
  function removeLink(idx: number) { setLinks((prev) => prev.filter((_, i) => i !== idx)); }

  // === PAT ===
  function savePat() {
    localStorage.setItem("pumpkin_github_pat", githubPat.trim());
    setPatSaved(true);
    setTimeout(() => setPatSaved(false), 2000);
  }

  // === IMAGE UPLOAD ===
  async function uploadImage(file: File) {
    if (!githubPat.trim()) {
      setShowPublish(true);
      setImgResult({ ok: false, message: "Set your GitHub token in the Publish section first." });
      return;
    }
    setUploadingImg(true);
    setImgResult(null);
    try {
      const reader = new FileReader();
      const b64    = await new Promise<string>((resolve, reject) => {
        reader.onload  = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const apiURL   = `${GITHUB_REPO}/frontend/public/blog/${filename}`;
      const headers  = { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const getRes   = await fetch(apiURL, { headers });
      const body: Record<string, string> = { message: `lab: upload image ${filename}`, content: b64, branch: "main" };
      if (getRes.ok) body.sha = (await getRes.json()).sha;
      const putRes = await fetch(apiURL, { method: "PUT", headers, body: JSON.stringify(body) });
      if (putRes.ok) {
        const imgUrl = `/blog/${filename}`;
        setUploadedImages((prev) => [{ name: filename, url: imgUrl }, ...prev.filter((im) => im.url !== imgUrl)]);
        setImgResult({ ok: true, message: `Uploaded → ${imgUrl}` });
        insertBlock(`![${filename}](${imgUrl})`);
      } else {
        const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
        setImgResult({ ok: false, message: `GitHub: ${(err as { message?: string }).message ?? putRes.statusText}` });
      }
    } catch (e: unknown) {
      setImgResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setUploadingImg(false);
    }
  }

  // === FRONTMATTER PREVIEW ===
  function buildFrontmatterPreview() {
    const techStr = tech.length > 0 ? `[${tech.join(", ")}]` : "[]";
    const linkLines = links.filter((l) => l.label.trim() && l.url.trim());
    const lines = [
      "---",
      `title: "${title || "(untitled)"}"`,
      `status: "${status}"`,
      `description: "${description || "(none)"}"`,
      `startedAt: "${startedAt}"`,
      `updatedAt: "${updatedAt}"`,
      `tech: ${techStr}`,
    ];
    if (linkLines.length > 0) {
      lines.push("links:");
      linkLines.forEach((l) => { lines.push(`  - label: ${l.label}`); lines.push(`    url: ${l.url}`); });
    } else {
      lines.push("links: []");
    }
    lines.push("---");
    return lines.join("\n");
  }

  function copySnippet(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSnippet(text);
      setTimeout(() => setCopiedSnippet(""), 1500);
    });
  }

  // === PUBLISHED ENTRIES (from content.db — no PAT needed) ===
  async function loadEntries(): Promise<LabRow[]> {
    setLoadingEntries(true);
    setEntriesResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/content/lab`);
      if (!res.ok) { setEntriesResult({ ok: false, message: `Error ${res.status}` }); return []; }
      const data: LabRow[] = await res.json();
      setEntries(data ?? []);
      setEntriesResult({ ok: true, message: `${data.length} entr${data.length !== 1 ? "ies" : "y"} live.` });
      return data ?? [];
    } catch (e: unknown) {
      setEntriesResult({ ok: false, message: `Error: ${(e as Error).message}` });
      return [];
    } finally {
      setLoadingEntries(false);
    }
  }

  function loadEntryForEdit(e: LabRow) {
    setTitle(e.title);
    setSlug(e.slug);
    setSlugEdited(true);
    setStatus(e.status);
    setDescription(e.description);
    setStartedAt(e.started_at);
    setUpdatedAt(e.updated_at);
    setTech(e.tech);
    setLinks(e.links.length > 0 ? e.links : [{ label: "", url: "" }]);
    setContent(e.content);
    setCurrentDraftId(null);
    setLastSaved(null);
    setShowTemplates(false);
    setActivePanel("write");
    setEditingExisting(true);
    setShowPublished(false);
    setResult(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  // === GitHub sync (optional — only when PAT present) ===
  async function pushMdxToGitHub(slugVal: string, mdx: string) {
    if (!githubPat.trim()) return;
    try {
      const url  = `${GITHUB_LAB_MDX_BASE}/${slugVal}.mdx`;
      const hdrs = { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const getRes = await fetch(url, { headers: hdrs });
      if (!getRes.ok && getRes.status !== 404) return;
      const sha = getRes.ok ? (await getRes.json() as { sha: string }).sha : undefined;
      const body: Record<string, string> = { message: `lab: ${sha ? "update" : "add"} ${slugVal}`, content: btoa(unescape(encodeURIComponent(mdx))), branch: "main" };
      if (sha) body.sha = sha;
      await fetch(url, { method: "PUT", headers: hdrs, body: JSON.stringify(body) });
    } catch { /* non-fatal — content.db save already succeeded */ }
  }

  async function pushAggregateJson(rows: LabRow[]) {
    if (!githubPat.trim()) return;
    try {
      const output = rows.map((e) => ({
        slug: e.slug, title: e.title, status: e.status, description: e.description,
        startedAt: e.started_at, updatedAt: e.updated_at, tech: e.tech, links: e.links, content: e.content,
      }));
      const hdrs = { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const getRes = await fetch(GITHUB_LAB_JSON, { headers: hdrs });
      if (!getRes.ok && getRes.status !== 404) return;
      const sha = getRes.ok ? (await getRes.json() as { sha: string }).sha : undefined;
      const body: Record<string, string> = { message: "lab: sync from admin", content: btoa(unescape(encodeURIComponent(JSON.stringify(output, null, 2)))), branch: "main" };
      if (sha) body.sha = sha;
      await fetch(GITHUB_LAB_JSON, { method: "PUT", headers: hdrs, body: JSON.stringify(body) });
    } catch { /* non-fatal */ }
  }

  async function deleteMdxFromGitHub(slugVal: string) {
    if (!githubPat.trim()) return;
    try {
      const url  = `${GITHUB_LAB_MDX_BASE}/${slugVal}.mdx`;
      const hdrs = { Authorization: `Bearer ${githubPat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const getRes = await fetch(url, { headers: hdrs });
      if (!getRes.ok) return;
      const { sha } = await getRes.json() as { sha: string };
      await fetch(url, { method: "DELETE", headers: hdrs, body: JSON.stringify({ message: `lab: remove ${slugVal}`, sha, branch: "main" }) });
    } catch { /* non-fatal */ }
  }

  // === PUBLISH (content.db live + optional GitHub sync) ===
  async function publish() {
    if (!allValid) return;
    const tk = adminToken();
    if (!tk) { setResult({ ok: false, message: "Admin token missing — re-authenticate." }); return; }
    setPublishing(true);
    setResult(null);
    const techArr = tech.map((t) => t.trim()).filter(Boolean);
    const cleanLinks = links.filter((l) => l.label.trim() && l.url.trim());
    const body = {
      slug: slug.trim(), title: title.trim(), status, description: description.trim(),
      started_at: startedAt, updated_at: updatedAt, tech: techArr, links: cleanLinks, content,
    };
    const exists = editingExisting || entries.some((e) => e.slug === slug.trim());
    try {
      const url = exists ? `${API_BASE_URL}/content/lab/${slug.trim()}` : `${API_BASE_URL}/content/lab`;
      const res = await fetch(url, {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setResult({ ok: true, message: `${exists ? "Updated" : "Published"}! /lab/${slug.trim()} is live.` });
        setEditingExisting(true);
        triggerReingest();
        // Optional git sync (MDX file + aggregate lab.json)
        const mdx = buildLabMdx({ title: body.title, status: body.status, description: body.description, startedAt, updatedAt, tech: techArr, links: cleanLinks, content });
        void pushMdxToGitHub(slug.trim(), mdx);
        const rows = await loadEntries();
        void pushAggregateJson(rows);
        // Clear the matching draft now that it's live
        if (currentDraftId) deleteDraftEntry(currentDraftId);
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, message: (err as { detail?: string }).detail ?? `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: `Network error: ${(e as Error).message}` });
    } finally {
      setPublishing(false);
    }
  }

  async function deleteEntry(slugVal: string) {
    const tk = adminToken();
    if (!tk) return;
    setDeletingSlug(slugVal);
    try {
      const res = await fetch(`${API_BASE_URL}/content/lab/${slugVal}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${tk}` },
      });
      if (res.ok || res.status === 204) {
        setEntriesResult({ ok: true, message: `Deleted /lab/${slugVal}.` });
        setConfirmDeleteSlug(null);
        if (slug === slugVal) newEntry();
        const rows = await loadEntries();
        triggerReingest();
        void deleteMdxFromGitHub(slugVal);
        void pushAggregateJson(rows);
      } else {
        setEntriesResult({ ok: false, message: `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setEntriesResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setDeletingSlug(null);
    }
  }

  function toggleSelect(slugVal: string) {
    setSelectedSlugs((prev) => { const next = new Set(prev); if (next.has(slugVal)) next.delete(slugVal); else next.add(slugVal); return next; });
  }
  function toggleSelectAll() {
    setSelectedSlugs((prev) => prev.size === entries.length ? new Set<string>() : new Set(entries.map((e) => e.slug)));
  }
  async function handleBulkDelete() {
    if (!bulkConfirm) { setBulkConfirm(true); return; }
    setBulkDeleting(true);
    setBulkConfirm(false);
    const tk = adminToken();
    const slugsToDelete = [...selectedSlugs];
    for (const slugVal of slugsToDelete) {
      try {
        const res = await fetch(`${API_BASE_URL}/content/lab/${slugVal}`, { method: "DELETE", headers: { Authorization: `Bearer ${tk}` } });
        if (res.ok || res.status === 204) {
          if (slug === slugVal) newEntry();
          void deleteMdxFromGitHub(slugVal);
        }
      } catch { /* continue */ }
    }
    setSelectedSlugs(new Set());
    const rows = await loadEntries();
    triggerReingest();
    void pushAggregateJson(rows);
    setBulkDeleting(false);
    setEntriesResult({ ok: true, message: `Deleted ${slugsToDelete.length} entr${slugsToDelete.length !== 1 ? "ies" : "y"}.` });
  }

  const STATUS_PILL: Record<LabStatus, string> = {
    active:  "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    paused:  "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    shipped: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400",
  };

  // === FOCUS MODE ===
  if (focusMode) {
    return (
      <div className="fixed inset-0 z-50 bg-bg flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setFocusMode(false)}
              className="text-xs text-fg-faint hover:text-fg transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Exit focus
            </button>
            {savedAgoText && <span className="text-[10px] text-fg-faint flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{savedAgoText}</span>}
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "B",  title: "Bold (⌘B)",   action: () => insertInline("**","**","bold text") },
              { label: "I",  title: "Italic (⌘I)", action: () => insertInline("*","*","italic text") },
              { label: "`",  title: "Code (⌘`)",   action: () => insertInline("`","`","code") },
              { label: "H2", title: "Heading 2",   action: () => insertBlock("## ") },
              { label: "•",  title: "Bullet list", action: () => insertBlock("- ") },
              { label: "⬡",  title: "Update entry", action: () => insertBlock(`<Update date="${todayISO()}">\n\n</Update>`, 24) },
            ].map((btn) => (
              <button key={btn.label} onClick={btn.action} title={btn.title}
                className="px-2 py-0.5 rounded text-[11px] text-fg-muted hover:text-fg transition-colors font-mono">
                {btn.label}
              </button>
            ))}
            <span className="text-[10px] text-fg-faint tabular-nums ml-2">{wordCount > 0 ? `${wordCount} words · ~${readingTime} min` : ""}</span>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck
          className="flex-1 w-full bg-bg resize-none focus:outline-none overflow-y-auto"
          style={{ padding: "3rem min(8rem, 10vw)", fontFamily: "var(--font-blog, Georgia, serif)", fontSize: "1.1rem", lineHeight: 1.9, color: "var(--color-fg)" }}
          placeholder="Write here…"
        />
      </div>
    );
  }

  // === MAIN RENDER ===
  return (
    <div className="space-y-4 pb-8">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={newEntry}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint hover:text-fg border border-border rounded px-3 py-1.5 transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            New entry
          </button>
          {drafts.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowDraftMenu(!showDraftMenu)}
                className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg border border-border rounded px-3 py-1.5 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Drafts ({drafts.length})
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showDraftMenu ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showDraftMenu && (
                <div className="absolute left-0 top-full mt-1 z-30 w-72 bg-surface border border-border rounded shadow-2xl py-1 overflow-hidden">
                  {drafts.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-raised transition-colors group">
                      <button onClick={() => loadDraftEntry(d)} className="flex-1 text-left min-w-0">
                        <p className="text-xs font-medium text-fg truncate">{d.title || "(untitled)"}</p>
                        <p className="text-[10px] text-fg-faint">{new Date(d.savedAt).toLocaleString()}</p>
                      </button>
                      <button onClick={() => deleteDraftEntry(d.id)}
                        className="shrink-0 text-[10px] text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all px-2 py-0.5 rounded">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {savedAgoText && (
            <span className="text-[10px] text-fg-faint flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              {savedAgoText}
            </span>
          )}
          <button onClick={() => persistDraft(currentDraftId)}
            className="text-xs text-fg-faint hover:text-fg border border-border rounded px-3 py-1.5 transition-colors">
            Save draft
          </button>
        </div>
      </div>

      {/* ── Published entries ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button
          onClick={() => { const next = !showPublished; setShowPublished(next); if (next && entries.length === 0) void loadEntries(); }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
              <path d="M8 3v8l-4 9h16l-4-9V3M6 3h12"/>
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">Published Lab Entries</span>
            {entries.length > 0 && <span className="text-[10px] font-mono text-accent">({entries.length})</span>}
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-fg-faint transition-transform ${showPublished ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showPublished && (
          <div className="border-t border-border p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadEntries}
                disabled={loadingEntries}
                className="inline-flex items-center gap-1.5 text-xs font-medium border border-border rounded px-3 py-1.5 text-fg-muted hover:text-fg hover:border-indigo-400 transition-colors disabled:opacity-40"
              >
                {loadingEntries ? (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Loading…</>
                ) : (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Refresh</>
                )}
              </button>
              {entriesResult && (
                <span className={`text-[10px] ${entriesResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                  {entriesResult.message}
                </span>
              )}
            </div>

            {entries.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox"
                      checked={entries.length > 0 && selectedSlugs.size === entries.length}
                      onChange={toggleSelectAll}
                      className="accent-accent cursor-pointer" />
                    <span className="text-[11px] text-fg-faint">Select all</span>
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
                {entries.map((e) => (
                  <div key={e.slug} className={`flex items-center gap-3 px-4 py-3 rounded border bg-bg hover:bg-surface-raised transition-colors group ${selectedSlugs.has(e.slug) ? "border-rose-300 dark:border-rose-800" : "border-border"}`}>
                    <input type="checkbox"
                      checked={selectedSlugs.has(e.slug)}
                      onChange={() => toggleSelect(e.slug)}
                      className="shrink-0 accent-accent cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{e.title}</p>
                      <p className="text-[10px] font-mono text-fg-faint">/lab/<span className="text-accent">{e.slug}</span></p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[e.status]}`}>{e.status}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => loadEntryForEdit(e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-[11px] font-medium text-fg-muted hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      {confirmDeleteSlug === e.slug ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-500 font-medium">Delete forever?</span>
                          <button onClick={() => deleteEntry(e.slug)} disabled={deletingSlug === e.slug}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
                            {deletingSlug === e.slug ? "…" : "Yes, delete"}
                          </button>
                          <button onClick={() => setConfirmDeleteSlug(null)}
                            className="px-2 py-1 rounded border border-border text-[10px] text-fg-faint hover:text-fg transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteSlug(e.slug)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-[11px] font-medium text-fg-faint hover:border-rose-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {entries.length === 0 && !loadingEntries && entriesResult?.ok && (
              <p className="text-xs text-fg-faint text-center py-2">No lab entries yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Entry header card ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-5 sm:p-7 space-y-4">

          {editingExisting && (
            <div className="flex items-center gap-2 text-[11px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2 text-amber-700 dark:text-amber-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Editing existing entry — publishing will update <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">/lab/{slug}</code></span>
              <button onClick={() => setEditingExisting(false)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity text-sm leading-none">×</button>
            </div>
          )}

          {/* Large title */}
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry title…"
            className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-fg placeholder:text-fg-subtle focus:outline-none leading-tight" />

          {/* Description */}
          <div className="relative">
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line description shown on the lab index…"
              className="w-full bg-transparent text-sm text-fg-subtle placeholder:text-fg-faint focus:outline-none pr-14" />
            <span className={`absolute right-0 top-0 text-[10px] tabular-nums font-mono ${description.length > 160 ? "text-rose-500" : description.length > 130 ? "text-amber-500" : "text-fg-faint"}`}>
              {description.length}/160
            </span>
          </div>

          {/* Tech chips */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
              {tech.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium rounded-sm px-2.5 py-0.5">
                  {t}
                  <button onClick={() => removeTech(t)} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 leading-none ml-0.5">×</button>
                </span>
              ))}
              <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleTechKey} onBlur={() => techInput && addTech(techInput)}
                placeholder={tech.length === 0 ? "Add tech (type then press Enter)…" : "Add tech…"}
                className="bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none min-w-[160px] flex-1" />
            </div>
            {suggestedTech.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {suggestedTech.map((t) => (
                  <button key={t} onClick={() => addTech(t)}
                    className="text-[10px] text-fg-faint hover:text-indigo-600 dark:hover:text-indigo-400 border border-border rounded-sm px-2 py-0.5 transition-colors hover:border-indigo-300 dark:hover:border-indigo-700">
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Slug + status + dates row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-border-subtle text-[11px]">
            <div className="flex items-center gap-1 font-mono text-fg-faint">
              <span>/lab/</span>
              <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="entry-slug"
                className="bg-transparent text-accent focus:outline-none w-40" />
            </div>
            <span className="text-fg-faint">·</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as LabStatus)}
              className="bg-transparent text-fg-faint focus:outline-none focus:text-fg cursor-pointer">
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="shipped">shipped</option>
            </select>
            <span className="text-fg-faint">·</span>
            <span className="text-fg-faint text-[10px] uppercase tracking-wider">Started:</span>
            <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)}
              className="bg-transparent text-accent focus:outline-none focus:text-fg cursor-pointer font-mono text-xs" />
            <span className="text-fg-faint">·</span>
            <span className="text-fg-faint text-[10px] uppercase tracking-wider">Updated:</span>
            <input type="date" value={updatedAt} onChange={(e) => setUpdatedAt(e.target.value)}
              className="bg-transparent text-fg-faint focus:outline-none focus:text-fg cursor-pointer" />
          </div>

          {/* Links */}
          <div className="pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Links</span>
              {links.length < 5 && (
                <button onClick={addLink} className="text-[10px] text-accent hover:text-accent/80 transition-colors">+ Add link</button>
              )}
            </div>
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input value={link.label} onChange={(e) => updateLink(idx, "label", e.target.value)}
                    placeholder="Label (e.g. GitHub)"
                    className="w-1/3 rounded border border-border bg-bg px-2 py-1.5 text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent" />
                  <input value={link.url} onChange={(e) => updateLink(idx, "url", e.target.value)}
                    placeholder="https://…"
                    className="flex-1 rounded border border-border bg-bg px-2 py-1.5 text-xs text-fg font-mono placeholder:text-fg-faint focus:outline-none focus:border-accent" />
                  {links.length > 1 && (
                    <button onClick={() => removeLink(idx)} className="text-[11px] text-rose-500 hover:text-rose-600 px-2 shrink-0">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Template picker ───────────────────────────────────────────────────── */}
      {showTemplates && !content && (
        <div className="rounded border border-dashed border-border bg-surface-raised/40 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-4 text-center">Start with a template — or just type below</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LAB_TEMPLATES.map((t) => {
              const tmplIcons: Record<string, React.ReactNode> = {
                layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
                flask:  <><path d="M9 3h6M10 3v6.5L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L14 9.5V3"/></>,
                wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.4-.6-.6-2.4 2.1-2.1z"/></>,
                zap:    <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
              };
              return (
                <button key={t.id}
                  onClick={() => { setContent(t.content); setShowTemplates(false); setActivePanel("write"); requestAnimationFrame(() => textareaRef.current?.focus()); }}
                  className="rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50 hover:shadow-sm transition-all group">
                  <div className="w-7 h-7 rounded bg-surface-raised flex items-center justify-center mb-2.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-fg-faint group-hover:text-indigo-500 transition-colors">
                      {tmplIcons[t.icon]}
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-fg group-hover:text-accent transition-colors leading-snug">{t.label}</p>
                  <p className="text-[10px] text-fg-faint mt-1 leading-relaxed">{t.desc}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => { setShowTemplates(false); requestAnimationFrame(() => textareaRef.current?.focus()); }}
              className="text-[10px] text-fg-faint hover:text-fg transition-colors">
              Skip — start from blank →
            </button>
          </div>
        </div>
      )}

      {/* ── Editor ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">

        {/* Toolbar */}
        <div className="border-b border-border bg-surface-raised px-3 py-2 flex items-center gap-1 flex-wrap">
          {/* Format */}
          {[
            { label: "B",  title: "Bold (⌘B)",       action: () => insertInline("**", "**", "bold text") },
            { label: "I",  title: "Italic (⌘I)",      action: () => insertInline("*", "*", "italic text") },
            { label: "`",  title: "Inline code (⌘`)", action: () => insertInline("`", "`", "code") },
            { label: "~~", title: "Strikethrough",     action: () => insertInline("~~", "~~", "text") },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Headings */}
          {[
            { label: "H2", action: () => insertBlock("## ") },
            { label: "H3", action: () => insertBlock("### ") },
            { label: "H4", action: () => insertBlock("#### ") },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={`Heading ${b.label.slice(1)}`}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Block elements */}
          {[
            { label: "lnk", title: "Link (⌘K)",       action: () => insertInline("[", "](url)", "link text") },
            { label: ">",   title: "Blockquote",       action: () => insertBlock("> ") },
            { label: "•",   title: "Bullet list",      action: () => insertBlock("- Item 1\n- Item 2") },
            { label: "1.",  title: "Numbered list",    action: () => insertBlock("1. First\n2. Second") },
            { label: "▦",   title: "Insert table",     action: () => insertBlock("| Column A | Column B |\n|----------|----------|\n| Cell     | Cell     |") },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Lab components */}
          {[
            { label: "status",  title: "Status badge",   action: () => insertBlock('<Status status="active" />') },
            { label: "decision",title: "Decision log",   action: () => insertBlock(`<Decision date="${todayISO()}" title="Title">\nWhy.\n</Decision>`) },
            { label: "update",  title: "Progress update",action: () => insertBlock(`<Update date="${todayISO()}">\nWhat changed.\n</Update>`) },
            { label: "stack",   title: "Tech stack row", action: () => insertBlock('<Stack items={["Next.js", "FastAPI"]} />') },
            { label: "metric",  title: "Metric",         action: () => insertBlock('<Metric value="40%" label="latency drop" />') },
            { label: "arch",    title: "Architecture diagram", action: () => insertBlock("```arch\n┌──────────┐\n│ Frontend │\n└──────────┘\n```", 8) },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:bg-surface border border-transparent hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Code blocks */}
          {[
            { label: "</>py", title: "Python code block",     action: () => insertBlock("```python\n# code here\n```", 10) },
            { label: "</>ts", title: "TypeScript code block", action: () => insertBlock("```typescript\n// code here\n```", 14) },
            { label: "</>sh", title: "Shell / bash block",     action: () => insertBlock("```bash\n# command\n```", 7) },
            { label: "</>",   title: "Generic code block",     action: () => insertBlock("```\n\n```", 4) },
          ].map((b) => (
            <button key={b.label} onClick={b.action} title={b.title}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors">
              {b.label}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-0.5 shrink-0" />
          {/* Image manager toggle */}
          <button onClick={() => setShowImageManager(!showImageManager)} title="Image Library"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors whitespace-nowrap ${showImageManager ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "border-transparent text-fg-muted hover:bg-surface hover:text-fg hover:border-border"}`}>
            {uploadingImg ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin shrink-0"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            )}
            {uploadingImg ? "Uploading…" : uploadedImages.length > 0 ? `Images (${uploadedImages.length})` : "Images"}
          </button>
          {/* Spacer + right controls */}
          <div className="flex-1" />
          <span className="text-[10px] text-fg-faint tabular-nums hidden sm:block shrink-0">
            {wordCount > 0 ? `${wordCount} words · ~${readingTime} min` : ""}
          </span>
          <span className="w-px h-4 bg-border mx-0.5 shrink-0 hidden sm:block" />
          <button onClick={() => setActivePanel(activePanel === "preview" ? "write" : "preview")} title="Toggle preview"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors shrink-0 ${activePanel === "preview" ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "border-transparent text-fg-muted hover:bg-surface hover:text-fg hover:border-border"}`}>
            {activePanel === "preview" ? (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"/></svg>Write</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Preview</>
            )}
          </button>
          <button onClick={() => setFocusMode(true)} title="Focus mode"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-fg-muted hover:bg-surface hover:text-fg border border-transparent hover:border-border transition-colors shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            Focus
          </button>
        </div>

        {/* ── Image Manager Panel ─────────────────────────────────────────── */}
        {showImageManager && (
          <div className="border-b border-border bg-bg">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-raised border-b border-border">
              <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Image Library
                {uploadedImages.length > 0 && <span className="font-mono text-accent ml-1">({uploadedImages.length} this session)</span>}
              </span>
              <button onClick={() => setShowImageManager(false)} className="text-base leading-none text-fg-faint hover:text-fg transition-colors px-1">×</button>
            </div>

            <div className="p-4 space-y-3">
              <label className={`flex flex-col items-center justify-center rounded border-2 border-dashed py-6 px-4 cursor-pointer transition-all ${uploadingImg ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 cursor-wait" : "border-border hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"}`}>
                <div className="w-9 h-9 rounded bg-surface-raised border border-border flex items-center justify-center mb-2">
                  {uploadingImg ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-fg-faint"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-fg-faint"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                  )}
                </div>
                <span className="text-xs font-medium text-fg-muted">{uploadingImg ? "Uploading…" : "Click to upload images"}</span>
                <span className="text-[10px] text-fg-faint mt-0.5">JPEG · PNG · WebP · GIF — multiple files supported</span>
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingImg}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) files.reduce<Promise<void>>((p, f) => p.then(() => uploadImage(f)), Promise.resolve());
                    e.target.value = "";
                  }} />
              </label>

              {!githubPat.trim() && (
                <p className="text-[10px] text-center text-amber-600 dark:text-amber-400">
                  Add your GitHub token in the Publish section first — it&apos;s needed to upload images.
                </p>
              )}

              {imgResult && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${imgResult.ok ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"}`}>
                  {imgResult.ok ? "✓" : "✗"} {imgResult.message}
                  <button onClick={() => setImgResult(null)} className="ml-auto opacity-60 hover:opacity-100 leading-none text-sm">×</button>
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Choose how to place each image</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uploadedImages.map((img) => (
                      <div key={img.url} className="rounded-xl border border-border bg-surface overflow-hidden">
                        <div className="flex items-start gap-3 p-3">
                          <div className="shrink-0 w-14 h-14 rounded bg-surface-raised border border-border flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fg-faint"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-fg truncate">{img.name}</p>
                            <p className="text-[10px] text-accent font-mono mt-0.5 truncate">{img.url}</p>
                            {insertingFor === img.url ? (
                              <div className="mt-2 space-y-1.5">
                                <input type="text" value={captionInput} onChange={(e) => setCaptionInput(e.target.value)}
                                  placeholder="Caption (optional) — press Enter to insert" autoFocus
                                  className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:border-indigo-400 transition-colors"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      insertBlock(captionInput.trim() ? `![${img.name}](${img.url} "${captionInput.trim()}")` : `![${img.name}](${img.url})`);
                                      setInsertingFor(null); setCaptionInput("");
                                    }
                                    if (e.key === "Escape") { setInsertingFor(null); setCaptionInput(""); }
                                  }} />
                                <div className="flex gap-1.5">
                                  <button onClick={() => { insertBlock(captionInput.trim() ? `![${img.name}](${img.url} "${captionInput.trim()}")` : `![${img.name}](${img.url})`); setInsertingFor(null); setCaptionInput(""); }}
                                    className="flex-1 px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors">Insert ✓</button>
                                  <button onClick={() => { setInsertingFor(null); setCaptionInput(""); }}
                                    className="px-2 py-1 rounded border border-border text-[10px] text-fg-faint hover:text-fg transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <button onClick={() => insertBlock(`![${img.name}](${img.url})`)} title="Insert at cursor"
                                  className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-medium hover:bg-indigo-700 transition-colors">Insert</button>
                                <button onClick={() => setInsertingFor(img.url)} title="Insert with caption"
                                  className="px-2 py-0.5 rounded-md border border-border bg-surface-raised text-[10px] font-medium text-fg-muted hover:border-indigo-400 hover:text-fg transition-colors">+ Caption</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadedImages.length === 0 && !uploadingImg && (
                <p className="text-[10px] text-fg-faint text-center pb-1">Uploaded images appear here — insert them anywhere in your entry.</p>
              )}
            </div>
          </div>
        )}

        {/* Write panel */}
        {activePanel === "write" && (
          <div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); if (showTemplates && e.target.value) setShowTemplates(false); }}
              onKeyDown={handleKeyDown}
              spellCheck
              className="w-full bg-bg px-5 sm:px-8 py-6 text-sm text-fg font-mono leading-relaxed focus:outline-none resize-none"
              placeholder={`Write your lab entry here…${"\n"}Keyboard shortcuts: ⌘B bold · ⌘I italic · ⌘K link · ⌘\` code · ⌘S save draft`}
              style={{ minHeight: "420px" }}
            />
            <div className="px-5 py-2 border-t border-border flex items-center justify-between text-[10px] text-fg-faint bg-surface-raised">
              <span>{wordCount > 0 ? `${wordCount} words · ~${readingTime} min read` : "Start writing — use the toolbar above or keyboard shortcuts"}</span>
              <span className="font-mono hidden sm:block">⌘B · ⌘I · ⌘K · ⌘S save</span>
            </div>
          </div>
        )}

        {/* Preview panel */}
        {activePanel === "preview" && (
          <div className="bg-bg">
            <pre className="px-5 sm:px-8 pt-5 pb-4 text-[10px] font-mono leading-relaxed text-fg-faint bg-surface border-b border-border whitespace-pre-wrap overflow-x-auto">
              {buildFrontmatterPreview()}
            </pre>
            <div className="px-5 sm:px-8 py-8"
              style={{ fontFamily: "var(--font-blog, Georgia, serif)", lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: mdxToHTML(content) }}
            />
          </div>
        )}
      </div>

      {/* ── Format Reference (collapsible) ───────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button onClick={() => setShowFormatRef(!showFormatRef)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-raised transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            Format Reference — Lab MDX Syntax
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-fg-faint transition-transform shrink-0 ${showFormatRef ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showFormatRef && (
          <div className="border-t border-border px-5 py-5 space-y-6">
            {LAB_FORMAT_GUIDE.map((section) => (
              <div key={section.heading}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{section.heading}</span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <div key={item.label} className="rounded-lg border border-border-subtle bg-bg hover:border-border transition-colors overflow-hidden">
                      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1">
                        <p className="text-[11px] font-semibold text-fg-muted">{item.label}</p>
                        <button onClick={() => copySnippet(item.syntax)}
                          className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-border text-fg-faint hover:text-accent hover:border-accent transition-colors">
                          {copiedSnippet === item.syntax ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      {item.note && <p className="px-3 pb-1 text-[10px] text-fg-faint italic leading-relaxed">{item.note}</p>}
                      <pre onClick={() => copySnippet(item.syntax)}
                        className="px-3 pb-3 text-[11px] font-mono text-zinc-300 bg-zinc-950 leading-relaxed whitespace-pre-wrap overflow-x-auto cursor-pointer">
                        {item.syntax}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Publish section ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button onClick={() => setShowPublish(!showPublish)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised transition-colors">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">Publish</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex gap-0.5">
              {Object.values(checks).map((ok, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-border-strong"}`} />
              ))}
            </div>
            <span className={`text-[10px] font-semibold ${allValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {checksCount}/{Object.keys(checks).length} ready
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-fg-faint transition-transform ${showPublish ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </button>

        {showPublish && (
          <div className="border-t border-border p-5 space-y-5">

            {/* Checklist */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Before you publish</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {[
                  { key: "title",       label: "Entry has a title",                   ok: checks.title },
                  { key: "slug",        label: "Slug is valid (lowercase, no spaces)", ok: checks.slug },
                  { key: "description", label: "Description written (≤160 chars)",     ok: checks.description },
                  { key: "tech",        label: "At least one tech tag added",         ok: checks.tech },
                  { key: "content",     label: "Content is at least 30 words",        ok: checks.content },
                ].map(({ key, label, ok }) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${ok ? "bg-emerald-500 text-white" : "bg-surface-raised border border-border text-fg-faint"}`}>
                      {ok ? "✓" : ""}
                    </span>
                    <span className={ok ? "text-fg-muted" : "text-fg-faint"}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GitHub token (optional) */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-2">GitHub Token <span className="normal-case font-normal text-fg-faint">(optional — for git sync &amp; image upload)</span></p>
              <div className="flex gap-2">
                <input type={patVisible ? "text" : "password"} value={githubPat}
                  onChange={(e) => { setGithubPat(e.target.value); setPatSaved(false); }}
                  placeholder="ghp_… (needs repo write scope)"
                  className="flex-1 min-w-0 rounded border border-border bg-bg px-3 py-2 text-sm text-fg font-mono placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors" />
                <button onClick={() => setPatVisible(!patVisible)}
                  className="shrink-0 px-3 rounded border border-border text-fg-faint hover:text-fg text-xs transition-colors">
                  {patVisible ? "Hide" : "Show"}
                </button>
                <button onClick={savePat}
                  className="shrink-0 px-4 rounded bg-fg text-bg text-xs font-semibold hover:opacity-80 transition-opacity">
                  {patSaved ? "Saved ✓" : "Save"}
                </button>
              </div>
              <p className="text-[10px] text-fg-faint mt-1.5">
                Entries publish to the live site instantly via the Content API. The token only mirrors the entry to the{" "}
                <code className="bg-surface-raised px-1 rounded text-[10px]">lab/{slug || "slug"}.mdx</code> file + <code className="bg-surface-raised px-1 rounded text-[10px]">lab.json</code> in git for version history.
              </p>
            </div>

            {/* Result */}
            {result && (
              <div className={`rounded border px-4 py-3 text-sm flex items-start gap-2 ${result.ok ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"}`}>
                <span className="shrink-0 font-bold">{result.ok ? "✓" : "✗"}</span>
                <span>
                  {result.message}
                  {result.ok && slug && (
                    <> &nbsp;<a href={`/lab/${slug}`} target="_blank" rel="noopener noreferrer" className="underline font-medium">View /lab/{slug} →</a></>
                  )}
                </span>
              </div>
            )}

            {/* Publish button */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="text-[10px] text-fg-faint leading-relaxed">
                <p>Saves to the live Content API — <code className="bg-surface-raised px-1 rounded font-mono">/lab/{slug || "entry-slug"}</code> updates immediately.</p>
                <p>Pumpkin re-indexes automatically.</p>
              </div>
              <button onClick={publish} disabled={publishing || !allValid}
                className="inline-flex items-center gap-2 rounded bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-px transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0">
                {publishing ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Publishing…</>
                ) : (
                  <>{editingExisting ? "Update entry" : "Publish entry"} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg></>
                )}
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
