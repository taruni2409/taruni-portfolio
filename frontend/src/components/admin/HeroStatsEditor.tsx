"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/profile.json";

interface HeroStat { value: number; suffix: string; label: string; sub: string; }

const DEFAULT_STAT: HeroStat = { value: 0, suffix: "", label: "", sub: "" };

export default function HeroStatsEditor() {
  const gh = useGitHubFile(FILE);
  const [stats, setStats] = useState<HeroStat[]>([]);
  const [dirty, setDirty] = useState(false);

  function update(idx: number, key: keyof HeroStat, val: string) {
    setStats(prev => prev.map((s, i) => i === idx
      ? { ...s, [key]: key === "value" ? Number(val) || 0 : val }
      : s
    ));
    setDirty(true);
  }

  function add()    { setStats(p => [...p, { ...DEFAULT_STAT }]); setDirty(true); }
  function del(i: number) { setStats(p => p.filter((_, j) => j !== i)); setDirty(true); }
  function move(idx: number, dir: -1 | 1) {
    const a = [...stats], t = idx + dir;
    if (t < 0 || t >= a.length) return;
    [a[idx], a[t]] = [a[t], a[idx]];
    setStats(a); setDirty(true);
  }

  async function handleLoad() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await gh.load<any>();
    if (profile) { setStats(profile.heroStats ?? []); setDirty(false); }
  }

  async function handleSave() {
    const res = await fetch(`https://api.github.com/repos/sabarishreddy99/jayaremala/contents/${FILE}`, {
      headers: { Authorization: `Bearer ${gh.pat}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const data  = await res.json();
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
    const full  = JSON.parse(new TextDecoder("utf-8").decode(bytes));
    const ok = await gh.save({ ...full, heroStats: stats }, "chore: update hero stats");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Hero Stats</h2>
        <DirtyBadge dirty={dirty} />
      </div>

      <GithubPATRow {...gh} onLoad={handleLoad} />

      <div className="space-y-3">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-fg-muted">Stat {i + 1}</span>
              <div className="flex items-center gap-2">
                <MoveButtons idx={i} total={stats.length} onMove={d => move(i, d)} />
                <button onClick={() => del(i)}
                  className="text-[11px] text-rose-500 hover:text-rose-600 transition-colors px-1">
                  Delete
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Value (number)</FieldLabel>
                <TextInput value={String(s.value)} onChange={v => update(i, "value", v)} placeholder="78" disabled={!gh.loaded} type="number" />
              </div>
              <div>
                <FieldLabel>Suffix</FieldLabel>
                <TextInput value={s.suffix} onChange={v => update(i, "suffix", v)} placeholder="%, ms, K+, GB…" disabled={!gh.loaded} />
              </div>
            </div>
            <div>
              <FieldLabel>Label</FieldLabel>
              <TextInput value={s.label} onChange={v => update(i, "label", v)} placeholder="Latency Cut" disabled={!gh.loaded} />
            </div>
            <div>
              <FieldLabel>Sub-label</FieldLabel>
              <TextInput value={s.sub} onChange={v => update(i, "sub", v)} placeholder="P99 RAG on 3K+ RPS" disabled={!gh.loaded} />
            </div>
            {/* Live preview */}
            <div className="rounded-xl border border-border bg-surface-raised px-3 py-2 flex items-end gap-1">
              <span className="text-lg font-bold tabular-nums text-fg">{s.value}</span>
              <span className="text-sm font-bold text-accent">{s.suffix}</span>
              <span className="ml-2 text-xs text-fg-muted">{s.label}</span>
              {s.sub && <span className="text-[10px] text-fg-faint ml-1">· {s.sub}</span>}
            </div>
          </div>
        ))}
        <button onClick={add} disabled={!gh.loaded}
          className="w-full rounded-2xl border-2 border-dashed border-border hover:border-accent text-xs text-fg-faint hover:text-accent transition-colors py-3 disabled:opacity-40">
          + Add Stat
        </button>
      </div>

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
