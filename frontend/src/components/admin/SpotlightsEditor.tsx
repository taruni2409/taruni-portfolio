"use client";

import { useEffect, useState } from "react";
import { useGitHubFile } from "@/lib/useGitHubFile";
import { FieldLabel, TextInput, TextArea, Toggle, GithubPATRow, SaveRow, ResultBanner, DirtyBadge, MoveButtons, triggerReingest } from "./AdminShared";

const FILE = "backend/data/knowledge/spotlights.json";

interface Cta { label: string; url: string; }
interface Metric { value: string; label: string; }
interface Spotlight {
  slug: string;
  enabled: boolean;
  eyebrow: string;
  name: string;
  logo?: string;
  subtitle?: string;
  headline: string;
  headlineEmphasis?: string;
  description?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  footnote?: string;
  metrics: Metric[];
}

const DEFAULT: Spotlight = {
  slug: "", enabled: true, eyebrow: "Live Product · Spotlight", name: "", logo: "",
  subtitle: "", headline: "", headlineEmphasis: "", description: "",
  primaryCta: { label: "", url: "" }, secondaryCta: { label: "", url: "" },
  footnote: "", metrics: [],
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

export default function SpotlightsEditor() {
  const gh = useGitHubFile(FILE);
  const [entries, setEntries]   = useState<Spotlight[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dirty, setDirty]       = useState(false);

  const entry = selected !== null ? entries[selected] : null;

  function setS<K extends keyof Spotlight>(key: K, val: Spotlight[K]) {
    if (selected === null) return;
    setEntries(p => p.map((e, i) => i === selected ? { ...e, [key]: val } : e));
    setDirty(true);
  }

  function setName(name: string) {
    if (selected === null) return;
    setEntries(p => p.map((e, i) => i === selected
      ? { ...e, name, slug: e.slug && e.slug !== slugify(e.name) ? e.slug : slugify(name) }
      : e));
    setDirty(true);
  }

  function setCta(which: "primaryCta" | "secondaryCta", key: keyof Cta, val: string) {
    if (!entry) return;
    setS(which, { ...(entry[which] ?? { label: "", url: "" }), [key]: val });
  }

  // ── Metrics (repeatable) ──
  function addMetric() { if (!entry) return; setS("metrics", [...entry.metrics, { value: "", label: "" }]); }
  function updateMetric(mi: number, key: keyof Metric, val: string) {
    if (!entry) return;
    setS("metrics", entry.metrics.map((m, j) => j === mi ? { ...m, [key]: val } : m));
  }
  function removeMetric(mi: number) {
    if (!entry) return;
    setS("metrics", entry.metrics.filter((_, j) => j !== mi));
  }

  function add() {
    const next = [...entries, { ...DEFAULT, metrics: [], primaryCta: { label: "", url: "" }, secondaryCta: { label: "", url: "" } }];
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
    const data = await gh.load<Spotlight[]>();
    if (data) { setEntries(data); setSelected(null); setDirty(false); }
  }
  async function handleSave() {
    const ok = await gh.save(entries, "chore: update spotlights");
    if (ok) { setDirty(false); triggerReingest(); }
  }

  useEffect(() => { if (gh.pat.trim()) handleLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Spotlights</h2>
        <DirtyBadge dirty={dirty} />
      </div>
      <p className="text-[11px] text-fg-muted leading-relaxed max-w-2xl">
        Product-spotlight cards shown on the portfolio home — the &quot;live product&quot; advertising break.
        Add as many as you like and toggle each on/off. Edits push to <code className="font-mono">spotlights.json</code> via
        GitHub and go live on the next deploy.
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
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.enabled ? "bg-emerald-400" : "bg-fg-faint/40"}`} />
                  <p className="text-xs font-semibold text-fg truncate">{e.name || "New Spotlight"}</p>
                </div>
                <p className="text-[10px] text-fg-faint truncate">{e.subtitle || e.eyebrow}</p>
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
            + Add Spotlight
          </button>
        </div>

        {/* Form */}
        {entry && selected !== null ? (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Editing: {entry.name || "New Spotlight"}
              </p>
              <Toggle checked={entry.enabled} onChange={v => setS("enabled", v)} label="Enabled (shown on site)" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={entry.name} onChange={setName} placeholder="My Product" />
              </div>
              <div>
                <FieldLabel>Slug</FieldLabel>
                <TextInput value={entry.slug} onChange={v => setS("slug", v)} placeholder="my-product" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Eyebrow (small uppercase label)</FieldLabel>
                <TextInput value={entry.eyebrow} onChange={v => setS("eyebrow", v)} placeholder="Live Product · Spotlight" />
              </div>
              <div>
                <FieldLabel>Subtitle (under the name)</FieldLabel>
                <TextInput value={entry.subtitle ?? ""} onChange={v => setS("subtitle", v)} placeholder="A product, not just a project" />
              </div>
            </div>

            <div>
              <FieldLabel>Logo path (optional)</FieldLabel>
              <TextInput value={entry.logo ?? ""} onChange={v => setS("logo", v)} placeholder="/my-product/logo.png" />
            </div>

            <div>
              <FieldLabel>Headline (large pitch line)</FieldLabel>
              <TextArea value={entry.headline} onChange={v => setS("headline", v)} rows={2} />
            </div>
            <div>
              <FieldLabel>Headline emphasis (optional — appended, highlighted)</FieldLabel>
              <TextInput value={entry.headlineEmphasis ?? ""} onChange={v => setS("headlineEmphasis", v)} placeholder="designed, shipped, and still run by me." />
            </div>

            <div>
              <FieldLabel>Description</FieldLabel>
              <TextArea value={entry.description ?? ""} onChange={v => setS("description", v)} rows={3} />
            </div>

            {/* CTAs */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel>Primary button</FieldLabel>
                <TextInput value={entry.primaryCta?.label ?? ""} onChange={v => setCta("primaryCta", "label", v)} placeholder="See it live" />
                <TextInput value={entry.primaryCta?.url ?? ""} onChange={v => setCta("primaryCta", "url", v)} placeholder="https://… or /path" />
              </div>
              <div className="space-y-2">
                <FieldLabel>Secondary button (optional)</FieldLabel>
                <TextInput value={entry.secondaryCta?.label ?? ""} onChange={v => setCta("secondaryCta", "label", v)} placeholder="Explore the journey" />
                <TextInput value={entry.secondaryCta?.url ?? ""} onChange={v => setCta("secondaryCta", "url", v)} placeholder="/gallery?focus=…" />
              </div>
            </div>

            <div>
              <FieldLabel>Footnote (optional)</FieldLabel>
              <TextInput value={entry.footnote ?? ""} onChange={v => setS("footnote", v)} placeholder="free, no sign-up at …" />
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <FieldLabel>Metric cards (value + label)</FieldLabel>
              {entry.metrics.map((m, mi) => (
                <div key={mi} className="flex gap-2 items-center">
                  <TextInput value={m.value} onChange={v => updateMetric(mi, "value", v)} placeholder="17K+" />
                  <TextInput value={m.label} onChange={v => updateMetric(mi, "label", v)} placeholder="Monthly active users" />
                  <button onClick={() => removeMetric(mi)} className="text-rose-500 hover:text-rose-600 text-sm shrink-0">×</button>
                </div>
              ))}
              <button onClick={addMetric} className="text-[11px] text-accent hover:text-accent-hover transition-colors">
                + Add metric
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface flex items-center justify-center py-16 text-sm text-fg-faint">
            {gh.loaded ? "Select a spotlight to edit" : "Load data first"}
          </div>
        )}
      </div>

      <SaveRow onSave={handleSave} saving={gh.saving} loaded={gh.loaded} pat={gh.pat} dirty={dirty} />
      <ResultBanner result={gh.result} />
    </div>
  );
}
