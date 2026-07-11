import { useState } from "react";
import { useGitHubStaging } from "@/lib/githubStaging";

const REPO    = "taruni2409/taruni-portfolio";
const PAT_KEY = "pumpkin_github_pat";
const BASE    = `https://api.github.com/repos/${REPO}/contents`;

export function useGitHubFile(filePath: string) {
  const staging = useGitHubStaging();
  const [pat, setPat]           = useState(() => typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) ?? "" : "");
  const [patVisible, setPatVisible] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [result, setResult]     = useState<{ ok: boolean; message: string } | null>(null);

  function updatePat(v: string) {
    const t = v.trim();
    if (typeof window !== "undefined") localStorage.setItem(PAT_KEY, t);
    setPat(t);
  }

  function gh() {
    return { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" };
  }

  async function load<T = unknown>(): Promise<T | null> {
    if (!pat) return null;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/${filePath}`, { headers: gh() });
      if (!res.ok) { setResult({ ok: false, message: `GitHub ${res.status}: ${res.statusText}` }); return null; }
      const d = await res.json();
      const bytes = Uint8Array.from(atob(d.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      const parsed = JSON.parse(new TextDecoder("utf-8").decode(bytes)) as T;
      setLoaded(true);
      return parsed;
    } catch (e: unknown) {
      setResult({ ok: false, message: `Error: ${(e as Error).message}` });
      return null;
    } finally {
      setLoading(false);
    }
  }

  // Save now STAGES the change (no commit). The PublishBar commits everything staged
  // across all editors in a single GitHub commit → one CI deploy.
  async function save(data: unknown, message: string): Promise<boolean> {
    if (!pat || !loaded) return false;
    if (!staging) {
      setResult({ ok: false, message: "Staging unavailable (open inside the admin page)." });
      return false;
    }
    setSaving(true);
    staging.stage(filePath, data, message);
    setResult({ ok: true, message: "Staged — hit “Publish all” at the bottom to deploy." });
    setSaving(false);
    return true;
  }

  return { pat, patVisible, setPatVisible, updatePat, loading, saving, loaded, result, load, save };
}
