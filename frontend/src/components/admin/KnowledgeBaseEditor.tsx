"use client";

import { useEffect, useState } from "react";

const REPO    = "taruni2409/taruni-portfolio";
const PAT_KEY = "pumpkin_github_pat";

interface Props {
  filePath: string;     // e.g. "backend/data/knowledge/profile.json"
  label: string;
  description?: string;
}

export default function KnowledgeBaseEditor({ filePath, label, description }: Props) {
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${filePath}`;

  const [pat, setPat]       = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) ?? "" : ""
  );
  const [text, setText]     = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; message: string } | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  function savePat(v: string) {
    localStorage.setItem(PAT_KEY, v.trim());
    setPat(v.trim());
  }

  function validate(s: string): string | null {
    try { JSON.parse(s); return null; }
    catch (e) { return (e as Error).message; }
  }

  function handleChange(s: string) {
    setText(s);
    setJsonError(validate(s));
  }

  function formatJson() {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2) + "\n");
      setJsonError(null);
    } catch { /* jsonError already set */ }
  }

  async function load() {
    if (!pat.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) { setResult({ ok: false, message: `GitHub ${res.status}: ${res.statusText}` }); return; }
      const data  = await res.json();
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      const raw   = new TextDecoder("utf-8").decode(bytes);
      const fmt   = JSON.stringify(JSON.parse(raw), null, 2) + "\n";
      setText(fmt);
      setJsonError(null);
      setLoaded(true);
    } catch (e: unknown) {
      setResult({ ok: false, message: `Error: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!pat.trim() || !loaded || jsonError) return;
    setSaving(true);
    setResult(null);
    try {
      const getRes = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json" },
      });
      if (!getRes.ok) throw new Error(`GET failed: ${getRes.status}`);
      const current = await getRes.json();
      const encoded = btoa(unescape(encodeURIComponent(text)));
      const putRes  = await fetch(apiUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `data: update ${label.toLowerCase()}`,
          content: encoded,
          sha: current.sha,
          branch: "main",
        }),
      });
      if (putRes.ok) {
        setResult({ ok: true, message: "Saved! GH Actions syncs & rebuilds the site in ~2 min." });
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

  useEffect(() => { if (pat.trim()) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lineCount = text.split("\n").length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* File info */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {description && <p className="text-xs text-fg-faint">{description}</p>}
          <p className="font-mono text-[10px] text-accent mt-0.5">{filePath}</p>
        </div>
        {loaded && (
          <span className="text-[10px] text-fg-faint bg-surface-raised border border-border rounded-full px-2.5 py-1">
            {lineCount} lines
          </span>
        )}
      </div>

      {/* Token row */}
      <div className="flex gap-2">
        <input
          type="password"
          value={pat}
          onChange={e => savePat(e.target.value)}
          placeholder="GitHub PAT (ghp_…)"
          className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={load}
          disabled={!pat.trim() || loading}
          className="px-4 py-2 rounded-xl border border-border text-xs text-fg-muted hover:text-fg transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {loading ? "Loading…" : loaded ? "Reload" : "Load"}
        </button>
      </div>

      {/* Editor */}
      {loaded && (
        <div className="space-y-2">

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium flex items-center gap-1 ${
              jsonError ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {jsonError
                ? <><svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Invalid JSON</>
                : <><svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Valid JSON</>
              }
            </span>
            <button
              onClick={formatJson}
              disabled={!!jsonError}
              className="text-[10px] text-fg-muted hover:text-fg border border-border rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40"
            >
              Format JSON
            </button>
          </div>

          {/* Code textarea */}
          <textarea
            value={text}
            onChange={e => handleChange(e.target.value)}
            spellCheck={false}
            className={`w-full rounded-xl border bg-zinc-950 text-zinc-200 px-4 py-3 font-mono text-[12px] leading-relaxed resize-none focus:outline-none transition-colors ${
              jsonError ? "border-rose-500/60" : "border-border focus:border-accent"
            }`}
            style={{ minHeight: 420, height: Math.max(420, lineCount * 19 + 32) }}
          />

          {/* JSON error */}
          {jsonError && (
            <p className="font-mono text-xs text-rose-500 bg-rose-950/30 border border-rose-800 rounded-lg px-3 py-2">
              {jsonError}
            </p>
          )}

          {/* Save row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={saving || !!jsonError}
              className="rounded-xl bg-fg text-bg px-6 py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save & Deploy"}
            </button>
            <span className="text-[11px] text-fg-faint">
              Commits to <code className="text-accent">main</code> → GH Actions syncs → Railway redeploys (chatbot re-indexes)
            </span>
          </div>

          {result && (
            <p className={`text-xs rounded-lg px-3 py-2 border ${
              result.ok
                ? "bg-emerald-950/30 text-emerald-400 border-emerald-800"
                : "bg-rose-950/30 text-rose-400 border-rose-800"
            }`}>
              {result.message}
            </p>
          )}
        </div>
      )}

      {!loaded && pat.trim() && !loading && (
        <p className="text-sm text-fg-faint">
          Click <button onClick={load} className="text-accent hover:underline">Load</button> to fetch the current file.
        </p>
      )}
      {!pat.trim() && (
        <p className="text-sm text-fg-faint">Enter your GitHub PAT above to load and edit this file.</p>
      )}
    </div>
  );
}
