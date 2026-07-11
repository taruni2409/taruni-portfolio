"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, TextArea, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/testimonials.json";

interface Testimonial {
  name: string; designation: string; company: string;
  linkedin: string; description: string; givenAt: string; source: string;
}

const DEFAULT: Testimonial = {
  name: "", designation: "", company: "",
  linkedin: "", description: "", givenAt: "", source: "LinkedIn",
};

export default function TestimonialsEditor() {
  const gh = useGitHubFile(FILE);
  const [entries, setEntries]   = useState<Testimonial[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty]       = useState(false);

  const entry = selected !== null ? entries[selected] : null;

  function set(key: keyof Testimonial, val: string) {
    if (selected === null) return;
    setEntries(p => p.map((e, i) => i === selected ? { ...e, [key]: val } : e));
    setDirty(true);
  }

  function add() {
    const next = [...entries, { ...DEFAULT }];
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
    const data = await gh.load<Testimonial[]>();
    if (data) { setEntries(data); setSelected(null); setDirty(false); }
  }

  async function handleSave() {
    const ok = await gh.save(entries, "chore: update testimonials");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Testimonials</h2>
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
                <p className="text-xs font-semibold text-fg truncate">{e.name || "New Entry"}</p>
                <p className="text-[10px] text-fg-faint truncate">{e.company} {e.givenAt && `· ${e.givenAt}`}</p>
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
            + Add Testimonial
          </button>
        </div>

        {/* Form */}
        {entry && selected !== null ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Editing: {entry.name || "New Entry"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><FieldLabel>Name</FieldLabel><TextInput value={entry.name} onChange={v => set("name", v)} placeholder="Jane Smith" /></div>
              <div><FieldLabel>Designation</FieldLabel><TextInput value={entry.designation} onChange={v => set("designation", v)} placeholder="Senior Engineer" /></div>
              <div><FieldLabel>Company</FieldLabel><TextInput value={entry.company} onChange={v => set("company", v)} placeholder="Shell" /></div>
              <div><FieldLabel>Source</FieldLabel><TextInput value={entry.source} onChange={v => set("source", v)} placeholder="LinkedIn" /></div>
              <div><FieldLabel>Given At (YYYY-MM-DD)</FieldLabel><TextInput value={entry.givenAt} onChange={v => set("givenAt", v)} placeholder="2023-01-16" /></div>
              <div><FieldLabel>LinkedIn URL (optional)</FieldLabel><TextInput value={entry.linkedin} onChange={v => set("linkedin", v)} placeholder="https://linkedin.com/in/…" /></div>
            </div>
            <div>
              <FieldLabel>Testimonial Text</FieldLabel>
              <TextArea value={entry.description} onChange={v => set("description", v)} rows={6} placeholder="Write the testimonial quote here…" />
              <p className="text-[10px] text-fg-faint mt-1">{entry.description.length} characters</p>
            </div>
            {/* Preview */}
            {entry.name && entry.description && (
              <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Preview</p>
                <p className="text-xs text-fg-muted italic leading-relaxed line-clamp-3">&ldquo;{entry.description}&rdquo;</p>
                <p className="text-xs font-semibold text-fg-subtle">— {entry.name}, {entry.designation} @ {entry.company}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface flex items-center justify-center py-16 text-sm text-fg-faint">
            {gh.loaded ? "Select a testimonial to edit" : "Load data first"}
          </div>
        )}
      </div>

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
