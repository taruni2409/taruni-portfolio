"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, TextArea, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/education.json";

interface Education {
  institution: string; school: string; degree: string; field: string;
  location: string; start: string; end: string; gpa?: string; highlights?: string[];
}

const DEFAULT: Education = {
  institution: "", school: "", degree: "", field: "",
  location: "", start: "", end: "", gpa: "", highlights: [],
};

export default function EducationEditor() {
  const gh = useGitHubFile(FILE);
  const [entries, setEntries]   = useState<Education[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty]       = useState(false);

  const entry = selected !== null ? entries[selected] : null;

  function set(key: keyof Education, val: string | string[]) {
    if (selected === null) return;
    setEntries(p => p.map((e, i) => i === selected ? { ...e, [key]: val } : e));
    setDirty(true);
  }

  function setHighlights(raw: string) {
    set("highlights", raw.split("\n").map(s => s.trim()).filter(Boolean));
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
    const data = await gh.load<Education[]>();
    if (data) { setEntries(data); setSelected(null); setDirty(false); }
  }

  async function handleSave() {
    const ok = await gh.save(entries, "chore: update education");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Education</h2>
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
                <p className="text-xs font-semibold text-fg truncate">{e.institution || "New Entry"}</p>
                <p className="text-[10px] text-fg-faint truncate">{e.degree} {e.field && `· ${e.field}`}</p>
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
            + Add Degree
          </button>
        </div>

        {/* Form */}
        {entry && selected !== null ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Editing: {entry.institution || "New Entry"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><FieldLabel>Institution</FieldLabel><TextInput value={entry.institution} onChange={v => set("institution", v)} placeholder="New York University" /></div>
              <div><FieldLabel>School / Faculty</FieldLabel><TextInput value={entry.school} onChange={v => set("school", v)} placeholder="Tandon School of Engineering" /></div>
              <div><FieldLabel>Degree</FieldLabel><TextInput value={entry.degree} onChange={v => set("degree", v)} placeholder="Master of Science" /></div>
              <div><FieldLabel>Field of Study</FieldLabel><TextInput value={entry.field} onChange={v => set("field", v)} placeholder="Computer Science" /></div>
              <div><FieldLabel>Location</FieldLabel><TextInput value={entry.location} onChange={v => set("location", v)} placeholder="New York, NY" /></div>
              <div><FieldLabel>GPA (optional)</FieldLabel><TextInput value={entry.gpa ?? ""} onChange={v => set("gpa", v)} placeholder="3.8 / 4.0" /></div>
              <div><FieldLabel>Start</FieldLabel><TextInput value={entry.start} onChange={v => set("start", v)} placeholder="Aug 2023" /></div>
              <div><FieldLabel>End</FieldLabel><TextInput value={entry.end} onChange={v => set("end", v)} placeholder="May 2025" /></div>
            </div>
            <div>
              <FieldLabel>Highlights (one per line, optional)</FieldLabel>
              <TextArea value={(entry.highlights ?? []).join("\n")} onChange={setHighlights} rows={5}
                placeholder="Coursework: Algorithms, ML…&#10;TA — Data Structures…" />
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
