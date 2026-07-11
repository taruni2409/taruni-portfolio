"use client";

import { useEffect, useState } from "react";
import { triggerReingest } from "./AdminShared";

const REPO      = "taruni2409/taruni-portfolio";
const FILE_PATH = "backend/data/knowledge/profile.json";
const API_URL   = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
const PAT_KEY   = "pumpkin_github_pat";

interface NowBlock {
  building: string;
  learning: string;
  reading: string;
  location: string;
  updated: string;
}

const FIELDS: { key: keyof Omit<NowBlock, "updated">; label: string; placeholder: string }[] = [
  {
    key: "building",
    label: "Building",
    placeholder: "e.g. itsjaya.com — AI-powered portfolio with RAG chatbot",
  },
  {
    key: "learning",
    label: "Learning",
    placeholder: "e.g. Recommendation systems at scale — collaborative filtering, two-tower models",
  },
  {
    key: "reading",
    label: "Reading",
    placeholder: "e.g. Designing Data-Intensive Applications — Martin Kleppmann",
  },
  {
    key: "location",
    label: "Location",
    placeholder: "e.g. New York, NY",
  },
];

export default function NowEditor() {
  const [pat, setPat]     = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) ?? "" : ""
  );
  const [patVisible, setPatVisible] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);
  const [loaded, setLoaded]         = useState(false);

  const [fields, setFields] = useState<Omit<NowBlock, "updated">>({
    building: "",
    learning: "",
    reading: "",
    location: "",
  });

  function savePat(value: string) {
    localStorage.setItem(PAT_KEY, value.trim());
    setPat(value.trim());
  }

  function setField(key: keyof Omit<NowBlock, "updated">, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
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
      const data    = await res.json();
      const bytes   = Uint8Array.from(atob(data.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
      const profile = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      const now: Partial<NowBlock> = profile.now ?? {};
      setFields({
        building: now.building ?? "",
        learning: now.learning ?? "",
        reading:  now.reading  ?? "",
        location: now.location ?? "",
      });
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
      const bytes   = Uint8Array.from(atob(data.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
      const profile = JSON.parse(new TextDecoder("utf-8").decode(bytes));

      profile.now = {
        ...fields,
        updated: new Date().toISOString().split("T")[0],
      };

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
          message: "chore: update now page",
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

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-faint">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Now Page</h2>
      </div>

      {/* PAT */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">GitHub Token</p>
        <div className="flex gap-2">
          <input
            type={patVisible ? "text" : "password"}
            value={pat}
            onChange={(e) => savePat(e.target.value)}
            placeholder="ghp_…"
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={() => setPatVisible((v) => !v)}
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
        <p className="text-[10px] text-fg-faint">Same token as other editors — needs repo write access.</p>
      </div>

      {/* Fields */}
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">{label}</p>
          <textarea
            rows={2}
            value={fields[key]}
            onChange={(e) => setField(key, e.target.value)}
            placeholder={placeholder}
            disabled={!loaded}
            className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors disabled:opacity-40"
          />
        </div>
      ))}

      {/* Preview */}
      {loaded && (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">Preview</p>
          {FIELDS.map(({ key, label }) => fields[key] && (
            <div key={key} className="flex gap-2 text-xs">
              <span className="text-fg-faint w-16 shrink-0">{label}</span>
              <span className="text-fg-subtle line-clamp-1">{fields[key]}</span>
            </div>
          ))}
          <p className="text-[10px] text-fg-faint">Updated: {new Date().toISOString().split("T")[0]}</p>
        </div>
      )}

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
          <p className="text-[11px] text-fg-faint">Click Load to fetch current content first.</p>
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
