"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, TextArea, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/experience.json";

interface Experience {
  company: string; role: string; start: string; end: string;
  location: string; description: string; tech: string; bullets: string[];
}

const DEFAULT: Experience = {
  company: "", role: "", start: "", end: "", location: "",
  description: "", tech: "", bullets: [""],
};

export default function ExperienceEditor() {
  const gh = useGitHubFile(FILE);
  const [entries, setEntries]   = useState<Experience[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty]       = useState(false);

  const entry = selected !== null ? entries[selected] : null;

  function set(key: keyof Experience, val: string | string[]) {
    if (selected === null) return;
    setEntries(p => p.map((e, i) => i === selected ? { ...e, [key]: val } : e));
    setDirty(true);
  }

  function setBullets(raw: string) {
    set("bullets", raw.split("\n").map(s => s.trim()).filter(Boolean));
  }

  function add() {
    const next = [...entries, { ...DEFAULT, bullets: [""] }];
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
    setEntries(a);
    setSelected(t); setDirty(true);
  }

  async function handleLoad() {
    const data = await gh.load<Experience[]>();
    if (data) { setEntries(data); setSelected(null); setDirty(false); }
  }

  async function handleSave() {
    const ok = await gh.save(entries, "chore: update experience");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Experience</h2>
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
                <p className="text-xs font-semibold text-fg truncate">{e.company || "New Entry"}</p>
                <p className="text-[10px] text-fg-faint truncate">{e.role} {e.start && `· ${e.start}`}</p>
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
            + Add Role
          </button>
        </div>

        {/* Form */}
        {entry && selected !== null ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Editing: {entry.company || "New Entry"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><FieldLabel>Company</FieldLabel><TextInput value={entry.company} onChange={v => set("company", v)} placeholder="NYU IT" /></div>
              <div><FieldLabel>Role</FieldLabel><TextInput value={entry.role} onChange={v => set("role", v)} placeholder="Software Engineer" /></div>
              <div><FieldLabel>Start</FieldLabel><TextInput value={entry.start} onChange={v => set("start", v)} placeholder="Jun 2025" /></div>
              <div><FieldLabel>End</FieldLabel><TextInput value={entry.end} onChange={v => set("end", v)} placeholder="Present" /></div>
              <div><FieldLabel>Location</FieldLabel><TextInput value={entry.location} onChange={v => set("location", v)} placeholder="New York, NY" /></div>
              <div><FieldLabel>Tech (comma-separated)</FieldLabel><TextInput value={entry.tech} onChange={v => set("tech", v)} placeholder="Python, FastAPI, AWS" /></div>
            </div>
            <div>
              <FieldLabel>Description (card summary)</FieldLabel>
              <TextArea value={entry.description} onChange={v => set("description", v)} rows={2} />
            </div>
            <div>
              <FieldLabel>Bullets (one per line)</FieldLabel>
              <TextArea value={entry.bullets.join("\n")} onChange={setBullets} rows={8}
                placeholder="Architected a production Multi-Agent…&#10;Reduced P99 latency by 78%…" />
              <p className="text-[10px] text-fg-faint mt-1">{entry.bullets.filter(Boolean).length} bullets</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface flex items-center justify-center py-16 text-sm text-fg-faint">
            {gh.loaded ? "Select an entry to edit" : "Load data first"}
          </div>
        )}
      </div>

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
