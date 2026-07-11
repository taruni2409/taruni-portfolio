"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, TextArea, Toggle, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/projects.json";

interface SourceLink { label: string; url: string; }
interface Project {
  title: string; description: string; tags: string[];
  featured: boolean; award?: string; sourceLinks: SourceLink[]; note?: string;
}

const DEFAULT: Project = {
  title: "", description: "", tags: [], featured: false, award: "", sourceLinks: [], note: "",
};

export default function ProjectsEditor() {
  const gh = useGitHubFile(FILE);
  const [entries, setEntries]   = useState<Project[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty]       = useState(false);

  const entry = selected !== null ? entries[selected] : null;

  function setP<K extends keyof Project>(key: K, val: Project[K]) {
    if (selected === null) return;
    setEntries(p => p.map((e, i) => i === selected ? { ...e, [key]: val } : e));
    setDirty(true);
  }

  function setTags(raw: string) { setP("tags", raw.split(",").map(s => s.trim()).filter(Boolean)); }

  function addLink() { if (selected === null) return; setP("sourceLinks", [...(entry?.sourceLinks ?? []), { label: "", url: "" }]); }
  function updateLink(li: number, key: keyof SourceLink, val: string) {
    if (!entry) return;
    setP("sourceLinks", entry.sourceLinks.map((l, j) => j === li ? { ...l, [key]: val } : l));
  }
  function removeLink(li: number) {
    if (!entry) return;
    setP("sourceLinks", entry.sourceLinks.filter((_, j) => j !== li));
  }

  function add() {
    const next = [...entries, { ...DEFAULT, tags: [], sourceLinks: [] }];
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
    const data = await gh.load<Project[]>();
    if (data) { setEntries(data); setSelected(null); setDirty(false); }
  }

  async function handleSave() {
    const ok = await gh.save(entries, "chore: update projects");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Projects</h2>
        <DirtyBadge dirty={dirty} />
      </div>

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
                  <p className="text-xs font-semibold text-fg truncate">{e.title || "New Project"}</p>
                </div>
                {e.award && <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px] mr-1" aria-hidden><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 0-3 3" /></svg>{e.award}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <MoveButtons idx={i} total={entries.length} onMove={d => move(i, d)} />
                <button onClick={ev => { ev.stopPropagation(); del(i); }}
                  className="text-[11px] text-rose-500 hover:text-rose-600 px-1">×</button>
              </div>
            </div>
          ))}
          <button onClick={add} disabled={!gh.loaded}
            className="w-full rounded-xl border-2 border-dashed border-border hover:border-accent text-xs text-fg-faint hover:text-accent transition-colors py-2.5 disabled:opacity-40">
            + Add Project
          </button>
        </div>

        {/* Form */}
        {entry && selected !== null ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Editing: {entry.title || "New Project"}
            </p>
            <div>
              <FieldLabel>Title</FieldLabel>
              <TextInput value={entry.title} onChange={v => setP("title", v)} placeholder="My Project" />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <TextArea value={entry.description} onChange={v => setP("description", v)} rows={4} />
            </div>
            <div>
              <FieldLabel>Tags (comma-separated)</FieldLabel>
              <TextInput value={entry.tags.join(", ")} onChange={setTags} placeholder="Python, FastAPI, AWS" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Toggle checked={entry.featured} onChange={v => setP("featured", v)} label="Featured on homepage" />
            </div>
            <div>
              <FieldLabel>Award (optional)</FieldLabel>
              <TextInput value={entry.award ?? ""} onChange={v => setP("award", v)} placeholder="Qualcomm Edge AI Hackathon Winner" />
            </div>
            <div>
              <FieldLabel>Note (shown as amber callout, optional)</FieldLabel>
              <TextInput value={entry.note ?? ""} onChange={v => setP("note", v)} placeholder="In active development…" />
            </div>
            {/* Source links */}
            <div className="space-y-2">
              <FieldLabel>Source Links</FieldLabel>
              {entry.sourceLinks.map((l, li) => (
                <div key={li} className="flex gap-2 items-center">
                  <TextInput value={l.label} onChange={v => updateLink(li, "label", v)} placeholder="GitHub" />
                  <TextInput value={l.url}   onChange={v => updateLink(li, "url",   v)} placeholder="https://…" />
                  <button onClick={() => removeLink(li)}
                    className="text-rose-500 hover:text-rose-600 text-sm shrink-0">×</button>
                </div>
              ))}
              <button onClick={addLink}
                className="text-[11px] text-accent hover:text-accent-hover transition-colors">
                + Add link
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface flex items-center justify-center py-16 text-sm text-fg-faint">
            {gh.loaded ? "Select a project to edit" : "Load data first"}
          </div>
        )}
      </div>

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
