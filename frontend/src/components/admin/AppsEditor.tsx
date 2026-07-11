"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, TextArea, Toggle, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/apps.json";

type AppStatus = "live" | "beta" | "wip" | "archived";

interface HostedApp {
  slug: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  status: AppStatus;
  category: string;
  tech: string[];
  featured: boolean;
  launchedAt?: string;
}

const DEFAULT: HostedApp = {
  slug: "", name: "", url: "", tagline: "", description: "",
  status: "live", category: "", tech: [], featured: false, launchedAt: "",
};

const STATUS_PILL: Record<AppStatus, string> = {
  live:     "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  beta:     "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400",
  wip:      "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  archived: "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

export default function AppsEditor() {
  const gh = useGitHubFile(FILE);
  const [entries, setEntries]   = useState<HostedApp[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty]       = useState(false);

  const entry = selected !== null ? entries[selected] : null;

  function setA<K extends keyof HostedApp>(key: K, val: HostedApp[K]) {
    if (selected === null) return;
    setEntries(p => p.map((e, i) => i === selected ? { ...e, [key]: val } : e));
    setDirty(true);
  }

  function setName(name: string) {
    if (selected === null) return;
    // Auto-fill slug from name until the user types a slug manually.
    setEntries(p => p.map((e, i) => i === selected
      ? { ...e, name, slug: e.slug && e.slug !== slugify(e.name) ? e.slug : slugify(name) }
      : e));
    setDirty(true);
  }

  function setTech(raw: string) { setA("tech", raw.split(",").map(s => s.trim()).filter(Boolean)); }

  function add() {
    const next = [...entries, { ...DEFAULT, tech: [] }];
    setEntries(next); setSelected(next.length - 1); setDirty(true);
  }

  function del(i: number) {
    setEntries(p => p.filter((_, j) => j !== i));
    setSelected(null); setDirty(true);
  }

  function move(idx: number, dir: -1 | 1) {
    const a = [...entries], t = idx + dir;
    if (t < 0 || t >= a.length) return;
    [a[idx], a[t]] = [a[t], a[idx]];
    setEntries(a); setSelected(t); setDirty(true);
  }

  async function handleLoad() {
    const data = await gh.load<HostedApp[]>();
    if (data) { setEntries(data); setSelected(null); setDirty(false); }
  }

  async function handleSave() {
    const ok = await gh.save(entries, "chore: update hosted apps");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Hosted Apps</h2>
        <DirtyBadge dirty={dirty} />
      </div>
      <p className="text-[11px] text-fg-muted leading-relaxed max-w-2xl">
        Everything hosted under your domain — apps, products, and sub-domains.
        This single registry is what Pumpkin and the public MCP server read, so new entries surface there automatically
        after a re-index. Edits push to <code className="font-mono">apps.json</code> via GitHub and go live on the next deploy.
      </p>

      <GithubPATRow {...gh} onLoad={handleLoad} />

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* List */}
        <div className="space-y-1.5">
          {entries.map((e, i) => (
            <div key={i}
              onClick={() => setSelected(i)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                selected === i ? "border-accent bg-accent-light" : "border-border bg-surface hover:border-fg-muted"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {e.featured && <span className="text-amber-400 text-[10px]">★</span>}
                  <p className="text-xs font-semibold text-fg truncate">{e.name || "New App"}</p>
                </div>
                <p className="text-[10px] text-fg-faint truncate font-mono">{e.url || "—"}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_PILL[e.status] ?? ""}`}>{e.status}</span>
                <MoveButtons idx={i} total={entries.length} onMove={d => move(i, d)} />
                <button onClick={ev => { ev.stopPropagation(); del(i); }}
                  className="text-[11px] text-rose-500 hover:text-rose-600 px-1">×</button>
              </div>
            </div>
          ))}
          <button onClick={add} disabled={!gh.loaded}
            className="w-full rounded-xl border-2 border-dashed border-border hover:border-accent text-xs text-fg-faint hover:text-accent transition-colors py-2.5 disabled:opacity-40">
            + Add App
          </button>
        </div>

        {/* Form */}
        {entry && selected !== null ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Editing: {entry.name || "New App"}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={entry.name} onChange={setName} placeholder="My App" />
              </div>
              <div>
                <FieldLabel>Slug</FieldLabel>
                <TextInput value={entry.slug} onChange={v => setA("slug", v)} placeholder="my-app" />
              </div>
            </div>
            <div>
              <FieldLabel>URL</FieldLabel>
              <TextInput value={entry.url} onChange={v => setA("url", v)} placeholder="https://my-app.example.com" />
            </div>
            <div>
              <FieldLabel>Tagline (one line)</FieldLabel>
              <TextInput value={entry.tagline} onChange={v => setA("tagline", v)} placeholder="GPA & attendance toolkit for VIT students" />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <TextArea value={entry.description} onChange={v => setA("description", v)} rows={4} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={entry.status}
                  onChange={e => setA("status", e.target.value as AppStatus)}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
                >
                  <option value="live">Live</option>
                  <option value="beta">Beta</option>
                  <option value="wip">WIP</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <TextInput value={entry.category} onChange={v => setA("category", v)} placeholder="Web App (PWA)" />
              </div>
              <div>
                <FieldLabel>Launched (optional)</FieldLabel>
                <TextInput value={entry.launchedAt ?? ""} onChange={v => setA("launchedAt", v)} placeholder="2025" />
              </div>
            </div>
            <div>
              <FieldLabel>Tech (comma-separated)</FieldLabel>
              <TextInput value={entry.tech.join(", ")} onChange={setTech} placeholder="Next.js, FastAPI, SQLite, PWA" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Toggle checked={entry.featured} onChange={v => setA("featured", v)} label="Featured" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface flex items-center justify-center py-16 text-sm text-fg-faint">
            {gh.loaded ? "Select an app to edit" : "Load data first"}
          </div>
        )}
      </div>

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
