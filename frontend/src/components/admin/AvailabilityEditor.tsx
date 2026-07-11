"use client";

import { useEffect, useState } from "react";
import { triggerReingest } from "./AdminShared";

const REPO      = "sabarishreddy99/jayaremala";
const FILE_PATH = "backend/data/knowledge/profile.json";
const API_URL   = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
const PAT_KEY   = "pumpkin_github_pat";

const WORK_TYPES = ["Full-time", "Part-time", "Contract", "Freelance"];
const LOCATIONS  = ["Remote", "NYC", "Hybrid", "On-site"];

interface Availability {
  open: boolean;
  label: string;
  types: string[];
  locations: string[];
}

export default function AvailabilityEditor() {
  const [pat, setPat]         = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) ?? "" : ""
  );
  const [patVisible, setPatVisible] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);
  const [loaded, setLoaded]         = useState(false);

  const [open, setOpen]           = useState(true);
  const [label, setLabel]         = useState("Available");
  const [types, setTypes]         = useState<string[]>(["Full-time"]);
  const [locations, setLocations] = useState<string[]>(["Remote", "NYC"]);

  function savePat(value: string) {
    localStorage.setItem(PAT_KEY, value.trim());
    setPat(value.trim());
  }

  async function load() {
    if (!pat.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) { setResult({ ok: false, message: `GitHub ${res.status}: ${res.statusText}` }); return; }
      const data  = await res.json();
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      const profile = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      const avail: Partial<Availability> = profile.availability ?? {};
      setOpen(avail.open ?? true);
      setLabel(avail.label ?? "Available");
      setTypes(avail.types ?? ["Full-time"]);
      setLocations(avail.locations ?? ["Remote", "NYC"]);
      setLoaded(true);
    } catch (e: unknown) {
      setResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!pat.trim() || !loaded) return;
    setSaving(true);
    setResult(null);
    try {
      const getRes = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json" },
      });
      if (!getRes.ok) throw new Error(`GET failed: ${getRes.status}`);
      const data    = await getRes.json();
      const bytes   = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      const profile = JSON.parse(new TextDecoder("utf-8").decode(bytes));

      profile.availability = { open, label, types, locations };

      const updated = JSON.stringify(profile, null, 2) + "\n";
      const encoded = btoa(unescape(encodeURIComponent(updated)));

      const putRes = await fetch(API_URL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${pat.trim()}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "chore: update availability status",
          content: encoded,
          sha: data.sha,
          branch: "main",
        }),
      });
      if (putRes.ok) {
        setResult({ ok: true, message: "Saved! GH Actions rebuilds the site in ~2 min." });
        triggerReingest();
      } else {
        const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
        setResult({ ok: false, message: `GitHub: ${(err as { message?: string }).message ?? putRes.statusText}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (pat.trim()) load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleType(t: string) {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function toggleLocation(l: string) {
    setLocations(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  }

  const preview = [label, ...types, ...locations].join(" · ");

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${open ? "bg-green-500" : "bg-zinc-400"}`} />
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Availability Status</h2>
      </div>

      {/* PAT */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">GitHub Token</p>
        <div className="flex gap-2">
          <input
            type={patVisible ? "text" : "password"}
            value={pat}
            onChange={e => savePat(e.target.value)}
            placeholder="ghp_…"
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={() => setPatVisible(v => !v)}
            className="px-3 py-2 rounded-xl border border-border text-xs text-fg-muted hover:text-fg transition-colors"
          >
            {patVisible ? "Hide" : "Show"}
          </button>
          <button
            onClick={load}
            disabled={!pat.trim() || loading}
            className="px-3 py-2 rounded-xl border border-border text-xs text-fg-muted hover:text-fg transition-colors disabled:opacity-40"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
        <p className="text-[10px] text-fg-faint">Same token as blog editor — needs repo write access.</p>
      </div>

      {/* Open / Not looking toggle */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Status</p>
        <div className="flex gap-2">
          <button
            onClick={() => { setOpen(true); setLabel("Available"); }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${
              open
                ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                : "border-border text-fg-muted hover:border-fg-muted"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-green-500 animate-pulse" : "bg-fg-faint"}`} />
            Open to work
          </button>
          <button
            onClick={() => { setOpen(false); setLabel("Not currently looking"); }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${
              !open
                ? "bg-zinc-500/10 border-zinc-400/30 text-fg"
                : "border-border text-fg-muted hover:border-fg-muted"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${!open ? "bg-zinc-400" : "bg-fg-faint"}`} />
            Not looking
          </button>
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Badge Label</p>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Available"
          className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Work types */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Work Type</p>
        <div className="flex flex-wrap gap-2">
          {WORK_TYPES.map(t => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                types.includes(t)
                  ? "bg-indigo-500/10 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                  : "border-border text-fg-muted hover:border-fg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Location</p>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map(l => (
            <button
              key={l}
              onClick={() => toggleLocation(l)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                locations.includes(l)
                  ? "bg-indigo-500/10 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                  : "border-border text-fg-muted hover:border-fg-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Preview</p>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${open ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-faint">
            {preview}
          </span>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={save}
          disabled={!pat.trim() || !loaded || saving}
          className="rounded-xl bg-fg text-bg px-5 py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save & Deploy"}
        </button>
        {!loaded && pat.trim() && !loading && (
          <p className="text-[11px] text-fg-faint">Click Load to fetch current status first.</p>
        )}
      </div>

      {result && (
        <p className={`text-xs rounded-lg px-3 py-2 ${
          result.ok
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
            : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
        }`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
