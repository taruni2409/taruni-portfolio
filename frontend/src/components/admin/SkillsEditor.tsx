"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/skills.json";

interface SkillGroup { category: string; items: string[]; }

export default function SkillsEditor() {
  const gh = useGitHubFile(FILE);
  const [groups, setGroups]     = useState<SkillGroup[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty]       = useState(false);

  const group = selected !== null ? groups[selected] : null;

  function setCategory(val: string) {
    if (selected === null) return;
    setGroups(p => p.map((g, i) => i === selected ? { ...g, category: val } : g));
    setDirty(true);
  }

  function setItems(raw: string) {
    if (selected === null) return;
    setGroups(p => p.map((g, i) => i === selected
      ? { ...g, items: raw.split(",").map(s => s.trim()).filter(Boolean) }
      : g
    ));
    setDirty(true);
  }

  function addItem(item: string) {
    if (selected === null || !item.trim()) return;
    setGroups(p => p.map((g, i) => i === selected
      ? { ...g, items: [...g.items, item.trim()] }
      : g
    ));
    setDirty(true);
  }

  function removeItem(itemIdx: number) {
    if (selected === null) return;
    setGroups(p => p.map((g, i) => i === selected
      ? { ...g, items: g.items.filter((_, j) => j !== itemIdx) }
      : g
    ));
    setDirty(true);
  }

  function add() {
    const next = [...groups, { category: "New Category", items: [] }];
    setGroups(next); setSelected(next.length - 1); setDirty(true);
  }

  function del(i: number) {
    setGroups(p => p.filter((_, j) => j !== i));
    setSelected(null); setDirty(true);
  }

  function move(idx: number, dir: -1 | 1) {
    const a = [...groups], t = idx + dir;
    if (t < 0 || t >= a.length) return;
    [a[idx], a[t]] = [a[t], a[idx]];
    setGroups(a); setSelected(t); setDirty(true);
  }

  async function handleLoad() {
    const data = await gh.load<SkillGroup[]>();
    if (data) { setGroups(data); setSelected(null); setDirty(false); }
  }

  async function handleSave() {
    const ok = await gh.save(groups, "chore: update skills");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [newItem, setNewItem] = useState("");

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Skills</h2>
        <DirtyBadge dirty={dirty} />
      </div>

      <GithubPATRow {...gh} onLoad={handleLoad} />

      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        {/* List */}
        <div className="space-y-1.5">
          {groups.map((g, i) => (
            <div key={i}
              onClick={() => setSelected(i)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                selected === i ? "border-accent bg-accent-light" : "border-border bg-surface hover:border-fg-muted"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-fg truncate">{g.category}</p>
                <p className="text-[10px] text-fg-faint">{g.items.length} items</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <MoveButtons idx={i} total={groups.length} onMove={d => move(i, d)} />
                <button onClick={ev => { ev.stopPropagation(); del(i); }}
                  className="text-[11px] text-rose-500 hover:text-rose-600 px-1">×</button>
              </div>
            </div>
          ))}
          <button onClick={add} disabled={!gh.loaded}
            className="w-full rounded-xl border-2 border-dashed border-border hover:border-accent text-xs text-fg-faint hover:text-accent transition-colors py-2.5 disabled:opacity-40">
            + Add Category
          </button>
        </div>

        {/* Form */}
        {group && selected !== null ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div>
              <FieldLabel>Category Name</FieldLabel>
              <TextInput value={group.category} onChange={setCategory} placeholder="Languages" />
            </div>

            {/* Tag chips */}
            <div>
              <FieldLabel>Skills ({group.items.length})</FieldLabel>
              <div className="flex flex-wrap gap-1.5 min-h-[40px] rounded-xl border border-border bg-bg p-2 mb-2">
                {group.items.map((item, j) => (
                  <span key={j}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-raised border border-border px-2.5 py-0.5 text-xs font-medium text-fg-subtle">
                    {item}
                    <button onClick={() => removeItem(j)} className="text-fg-faint hover:text-rose-500 transition-colors leading-none">×</button>
                  </span>
                ))}
                {group.items.length === 0 && <span className="text-[11px] text-fg-faint">No skills yet</span>}
              </div>
              <div className="flex gap-2">
                <TextInput
                  value={newItem} onChange={setNewItem}
                  placeholder="Add skill (or paste comma-separated list)"
                />
                <button
                  onClick={() => {
                    if (newItem.includes(",")) {
                      setItems([...group.items, ...newItem.split(",").map(s => s.trim()).filter(Boolean)].join(", "));
                    } else {
                      addItem(newItem);
                    }
                    setNewItem("");
                  }}
                  disabled={!newItem.trim()}
                  className="px-3 py-2 rounded-xl border border-border text-xs text-fg-muted hover:text-fg transition-colors disabled:opacity-40 shrink-0"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Bulk edit */}
            <details>
              <summary className="text-[11px] text-fg-faint cursor-pointer select-none hover:text-fg transition-colors">
                Bulk edit (comma-separated)
              </summary>
              <div className="mt-2">
                <TextInput
                  value={group.items.join(", ")}
                  onChange={setItems}
                  placeholder="Python, Java, TypeScript…"
                />
              </div>
            </details>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface flex items-center justify-center py-16 text-sm text-fg-faint">
            {gh.loaded ? "Select a category to edit" : "Load data first"}
          </div>
        )}
      </div>

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
