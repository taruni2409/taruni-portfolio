"use client";

import { createContext, useCallback, useContext, useState } from "react";

const REPO = "taruni2409/taruni-portfolio";
const PAT_KEY = "pumpkin_github_pat";
const API = `https://api.github.com/repos/${REPO}`;

export function getPat(): string {
  return typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) ?? "" : "";
}

type StagedFile = { data: unknown; message: string };
type Staged = Record<string, StagedFile>;

interface StagingCtx {
  staged: Staged;
  count: number;
  stage: (path: string, data: unknown, message: string) => void;
  unstage: (path: string) => void;
  clear: () => void;
  publishAll: () => Promise<boolean>;
  publishing: boolean;
  result: { ok: boolean; message: string } | null;
  dismissResult: () => void;
}

const Ctx = createContext<StagingCtx | null>(null);

export function GitHubStagingProvider({ children }: { children: React.ReactNode }) {
  const [staged, setStaged] = useState<Staged>({});
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const stage = useCallback((path: string, data: unknown, message: string) => {
    setStaged((prev) => ({ ...prev, [path]: { data, message } }));
  }, []);
  const unstage = useCallback((path: string) => {
    setStaged((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);
  const clear = useCallback(() => setStaged({}), []);
  const dismissResult = useCallback(() => setResult(null), []);

  const publishAll = useCallback(async (): Promise<boolean> => {
    const pat = getPat();
    const entries = Object.entries(staged);
    if (!pat) {
      setResult({ ok: false, message: "Add your GitHub token in any editor first." });
      return false;
    }
    if (entries.length === 0) return false;

    setPublishing(true);
    setResult(null);
    const headers = {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };
    const j = async (res: Response) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { message?: string }).message || `GitHub ${res.status}`);
      return body;
    };
    try {
      // 1. latest commit on main + its base tree
      const ref = await j(await fetch(`${API}/git/ref/heads/main`, { headers }));
      const latest = ref.object.sha as string;
      const baseCommit = await j(await fetch(`${API}/git/commits/${latest}`, { headers }));
      const baseTree = baseCommit.tree.sha as string;

      // 2. one tree with every staged file (GitHub creates the blobs)
      const tree = entries.map(([path, { data }]) => ({
        path,
        mode: "100644",
        type: "blob",
        content: JSON.stringify(data, null, 2) + "\n",
      }));
      const newTree = await j(
        await fetch(`${API}/git/trees`, { method: "POST", headers, body: JSON.stringify({ base_tree: baseTree, tree }) }),
      );

      // 3. one commit, 4. move main to it
      const message =
        `chore(admin): update ${entries.length} section${entries.length > 1 ? "s" : ""}\n\n` +
        entries.map(([p, { message }]) => `- ${p}: ${message}`).join("\n");
      const commit = await j(
        await fetch(`${API}/git/commits`, { method: "POST", headers, body: JSON.stringify({ message, tree: newTree.sha, parents: [latest] }) }),
      );
      await j(
        await fetch(`${API}/git/refs/heads/main`, { method: "PATCH", headers, body: JSON.stringify({ sha: commit.sha }) }),
      );

      setResult({ ok: true, message: `Published ${entries.length} change${entries.length > 1 ? "s" : ""} in one commit — CI redeploys in ~2 min.` });
      setStaged({});
      return true;
    } catch (e) {
      setResult({ ok: false, message: `Publish failed: ${(e as Error).message}` });
      return false;
    } finally {
      setPublishing(false);
    }
  }, [staged]);

  return (
    <Ctx.Provider value={{ staged, count: Object.keys(staged).length, stage, unstage, clear, publishAll, publishing, result, dismissResult }}>
      {children}
    </Ctx.Provider>
  );
}

/** Null when used outside the admin provider. */
export function useGitHubStaging(): StagingCtx | null {
  return useContext(Ctx);
}
