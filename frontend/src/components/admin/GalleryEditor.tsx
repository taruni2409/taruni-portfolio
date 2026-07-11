"use client";

import { useState, useRef } from "react";
import { triggerReingest } from "./AdminShared";

interface GalleryItem {
  id: string;
  title: string;
  caption?: string;
  src: string;
  category?: string;
  date?: string;
}

interface QueuedFile {
  file: File;
  id: string;
  title: string;
  caption: string;
  category: string;
  date: string;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const REPO         = "taruni2409/taruni-portfolio";
const BASE         = `https://api.github.com/repos/${REPO}/contents`;
const GIT          = `https://api.github.com/repos/${REPO}/git`;
const GALLERY_JSON = "backend/data/knowledge/gallery.json";
const IMG_DIR      = "frontend/public/gallery";
const PAT_KEY      = "pumpkin_github_pat";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 40) || "photo";
}

function nameToTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export default function GalleryEditor() {
  const [pat, setPat]       = useState(() => typeof window !== "undefined" ? localStorage.getItem(PAT_KEY) ?? "" : "");
  const [items, setItems]   = useState<GalleryItem[]>([]);
  const [sha, setSha]       = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy]     = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tab, setTab]       = useState<"single" | "bulk">("single");

  // Single upload
  const [file, setFile]       = useState<File | null>(null);
  const [title, setTitle]     = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate]       = useState("");

  // Bulk upload
  const [queue, setQueue]   = useState<QueuedFile[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const headers = () => ({ Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" });

  function savePat(v: string) {
    const t = v.trim();
    localStorage.setItem(PAT_KEY, t);
    setPat(t);
  }

  async function load() {
    if (!pat) { setResult({ ok: false, msg: "Enter your GitHub PAT first." }); return; }
    setBusy(true); setResult(null);
    try {
      const res = await fetch(`${BASE}/${GALLERY_JSON}`, { headers: headers() });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const d = await res.json();
      const bytes = Uint8Array.from(atob(d.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
      setItems(JSON.parse(new TextDecoder().decode(bytes)));
      setSha(d.sha);
      setLoaded(true);
      setResult({ ok: true, msg: "Loaded gallery." });
    } catch (e) {
      setResult({ ok: false, msg: `Load failed: ${(e as Error).message}` });
    } finally { setBusy(false); }
  }

  async function putJson(next: GalleryItem[], message: string): Promise<boolean> {
    const cur = await fetch(`${BASE}/${GALLERY_JSON}`, { headers: headers() });
    const curData = cur.ok ? await cur.json() : null;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(next, null, 2) + "\n")));
    const res = await fetch(`${BASE}/${GALLERY_JSON}`, {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: encoded, sha: curData?.sha ?? sha, branch: "main" }),
    });
    if (res.ok) { setSha((await res.json()).content.sha); return true; }
    throw new Error(`gallery.json PUT ${res.status}`);
  }

  // ── Single upload ──────────────────────────────────────────────────────────
  async function addPhoto() {
    if (!file)        { setResult({ ok: false, msg: "Pick an image first." }); return; }
    if (!title.trim()) { setResult({ ok: false, msg: "Add a title." }); return; }
    if (!loaded)      { setResult({ ok: false, msg: "Load the gallery first." }); return; }
    setBusy(true); setResult(null);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const id  = `${slugify(title)}-${Date.now().toString(36)}`;
      const imgPath = `${IMG_DIR}/${id}.${ext}`;
      const b64 = await fileToBase64(file);

      const imgRes = await fetch(`${BASE}/${imgPath}`, {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: `gallery: add ${id}.${ext}`, content: b64, branch: "main" }),
      });
      if (!imgRes.ok) throw new Error(`image upload ${imgRes.status}`);

      const entry: GalleryItem = {
        id, title: title.trim(), src: `/gallery/${id}.${ext}`,
        ...(caption.trim()  && { caption:  caption.trim()  }),
        ...(category.trim() && { category: category.trim() }),
        ...(date.trim()     && { date:     date.trim()     }),
      };
      const next = [entry, ...items];
      await putJson(next, `gallery: add "${entry.title}"`);

      setItems(next);
      setFile(null); setTitle(""); setCaption(""); setCategory(""); setDate("");
      setResult({ ok: true, msg: "Uploaded! Live in ~2 min after the rebuild." });
      triggerReingest();
    } catch (e) {
      setResult({ ok: false, msg: `Upload failed: ${(e as Error).message}` });
    } finally { setBusy(false); }
  }

  // ── Bulk upload — single commit via Git Trees API ─────────────────────────
  function enqueueFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    const newItems: QueuedFile[] = images.map((f) => ({
      file: f,
      id: `${slugify(nameToTitle(f.name))}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      title: nameToTitle(f.name),
      caption: "", category: "", date: "",
      preview: fileToObjectUrl(f),
      status: "pending",
    }));
    setQueue((q) => [...q, ...newItems]);
  }

  function updateQueued(id: string, field: keyof Pick<QueuedFile, "title" | "caption" | "category" | "date">, val: string) {
    setQueue((q) => q.map((it) => it.id === id ? { ...it, [field]: val } : it));
  }

  function removeQueued(id: string) {
    setQueue((q) => {
      const item = q.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return q.filter((i) => i.id !== id);
    });
  }

  async function bulkUpload() {
    if (!loaded)        { setResult({ ok: false, msg: "Load the gallery first." }); return; }
    if (queue.length === 0) { setResult({ ok: false, msg: "Add images to the queue." }); return; }
    const missing = queue.find((q) => !q.title.trim());
    if (missing) { setResult({ ok: false, msg: `Give a title to "${missing.file.name}".` }); return; }

    setBusy(true); setResult(null);
    setBulkProgress({ done: 0, total: queue.length });

    try {
      // 1. Get latest commit on main
      const refRes = await fetch(`${GIT}/ref/heads/main`, { headers: headers() });
      if (!refRes.ok) throw new Error(`ref fetch ${refRes.status}`);
      const refData = await refRes.json();
      const latestCommitSha: string = refData.object.sha;

      // 2. Get its tree SHA
      const commitRes = await fetch(`${GIT}/commits/${latestCommitSha}`, { headers: headers() });
      if (!commitRes.ok) throw new Error(`commit fetch ${commitRes.status}`);
      const baseTreeSha: string = (await commitRes.json()).tree.sha;

      // 3. Create blobs for each image (sequentially to avoid rate limits)
      const newEntries: GalleryItem[] = [];
      const treeNodes: { path: string; mode: string; type: string; sha: string }[] = [];

      for (let i = 0; i < queue.length; i++) {
        const q = queue[i];
        setQueue((prev) => prev.map((it) => it.id === q.id ? { ...it, status: "uploading" } : it));

        const ext = (q.file.name.split(".").pop() || "jpg").toLowerCase();
        const id  = q.id;
        const path = `${IMG_DIR}/${id}.${ext}`;
        const b64  = await fileToBase64(q.file);

        const blobRes = await fetch(`${GIT}/blobs`, {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({ content: b64, encoding: "base64" }),
        });
        if (!blobRes.ok) {
          setQueue((prev) => prev.map((it) => it.id === q.id ? { ...it, status: "error", error: `blob ${blobRes.status}` } : it));
          throw new Error(`blob creation failed for ${q.file.name}: ${blobRes.status}`);
        }
        const blobSha: string = (await blobRes.json()).sha;

        treeNodes.push({ path, mode: "100644", type: "blob", sha: blobSha });
        newEntries.push({
          id, title: q.title.trim(), src: `/gallery/${id}.${ext}`,
          ...(q.caption.trim()  && { caption:  q.caption.trim()  }),
          ...(q.category.trim() && { category: q.category.trim() }),
          ...(q.date.trim()     && { date:     q.date.trim()     }),
        });

        setQueue((prev) => prev.map((it) => it.id === q.id ? { ...it, status: "done" } : it));
        setBulkProgress({ done: i + 1, total: queue.length });
      }

      // 4. Build updated gallery.json blob
      const nextItems = [...newEntries.reverse(), ...items];
      const jsonContent = JSON.stringify(nextItems, null, 2) + "\n";
      const jsonBlobRes = await fetch(`${GIT}/blobs`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: jsonContent, encoding: "utf-8" }),
      });
      if (!jsonBlobRes.ok) throw new Error(`gallery.json blob ${jsonBlobRes.status}`);
      const jsonBlobSha: string = (await jsonBlobRes.json()).sha;
      treeNodes.push({ path: GALLERY_JSON, mode: "100644", type: "blob", sha: jsonBlobSha });

      // 5. Create new tree
      const treeRes = await fetch(`${GIT}/trees`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeNodes }),
      });
      if (!treeRes.ok) throw new Error(`tree creation ${treeRes.status}`);
      const newTreeSha: string = (await treeRes.json()).sha;

      // 6. Create commit
      const titles = newEntries.map((e) => `"${e.title}"`).join(", ");
      const commitRes2 = await fetch(`${GIT}/commits`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `gallery: bulk add ${newEntries.length} photo${newEntries.length !== 1 ? "s" : ""} — ${titles}`,
          tree: newTreeSha,
          parents: [latestCommitSha],
        }),
      });
      if (!commitRes2.ok) throw new Error(`commit ${commitRes2.status}`);
      const newCommitSha: string = (await commitRes2.json()).sha;

      // 7. Update main ref
      const updateRef = await fetch(`${GIT}/refs/heads/main`, {
        method: "PATCH",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ sha: newCommitSha }),
      });
      if (!updateRef.ok) throw new Error(`ref update ${updateRef.status}`);

      setItems(nextItems);
      // clean up previews
      queue.forEach((q) => URL.revokeObjectURL(q.preview));
      setQueue([]);
      setBulkProgress(null);
      setResult({ ok: true, msg: `Pushed ${newEntries.length} photo${newEntries.length !== 1 ? "s" : ""} in one commit! Live in ~2 min after rebuild.` });
      triggerReingest();
    } catch (e) {
      setResult({ ok: false, msg: `Bulk upload failed: ${(e as Error).message}` });
    } finally {
      setBusy(false);
      setBulkProgress(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this photo from the gallery? (the image file stays in the repo)")) return;
    setBusy(true); setResult(null);
    try {
      const next = items.filter((i) => i.id !== id);
      await putJson(next, `gallery: remove ${id}`);
      setItems(next);
      setResult({ ok: true, msg: "Removed." });
      triggerReingest();
    } catch (e) {
      setResult({ ok: false, msg: `Remove failed: ${(e as Error).message}` });
    } finally { setBusy(false); }
  }

  const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-0.5 h-3.5 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500 shrink-0" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg-faint">Gallery — Upload Photos</h2>
      </div>

      {/* PAT + load */}
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-fg-subtle mb-1.5 block">GitHub Personal Access Token (repo scope)</label>
          <input type="password" value={pat} onChange={(e) => savePat(e.target.value)} placeholder="ghp_…" className={inputCls} />
        </div>
        <button onClick={load} disabled={busy} className="rounded-lg bg-fg text-bg px-4 py-2 text-sm font-semibold hover:opacity-80 disabled:opacity-50 transition-opacity">
          {busy ? "Working…" : loaded ? "Reload gallery" : "Load gallery"}
        </button>
      </div>

      {/* Tabs */}
      {loaded && (
        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border w-fit">
          {(["single", "bulk"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${tab === t ? "bg-indigo-600 text-white" : "text-fg-subtle hover:text-fg"}`}>
              {t === "bulk" ? "Bulk upload" : "Single upload"}
            </button>
          ))}
        </div>
      )}

      {/* Single upload */}
      {loaded && tab === "single" && (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint">Add a photo</p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:opacity-80" />
          {file && <p className="text-[11px] text-fg-faint">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Qualcomm Hackathon — Winner)" className={inputCls} />
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (Awards, Events…)" className={inputCls} />
            <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date (e.g. Nov 2024)" className={inputCls} />
          </div>
          <button onClick={addPhoto} disabled={busy} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors inline-flex items-center gap-2">
            {busy ? "Uploading…" : "Upload photo"}
          </button>
        </div>
      )}

      {/* Bulk upload */}
      {loaded && tab === "bulk" && (
        <div className="space-y-3">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-indigo-500"); }}
            onDragLeave={() => dropRef.current?.classList.remove("border-indigo-500")}
            onDrop={(e) => {
              e.preventDefault();
              dropRef.current?.classList.remove("border-indigo-500");
              enqueueFiles(Array.from(e.dataTransfer.files));
            }}
            className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-center transition-colors cursor-pointer hover:border-indigo-400"
            onClick={() => document.getElementById("bulk-file-input")?.click()}
          >
            <input id="bulk-file-input" type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => enqueueFiles(Array.from(e.target.files ?? []))} />
            <p className="text-sm font-medium text-fg-subtle">Drop images here or click to select</p>
            <p className="text-[11px] text-fg-faint mt-1">Supports multiple files — all pushed in one commit</p>
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint">{queue.length} image{queue.length !== 1 ? "s" : ""} queued</p>
                <button onClick={() => { queue.forEach((q) => URL.revokeObjectURL(q.preview)); setQueue([]); }}
                  className="text-[11px] text-rose-500 hover:text-rose-400 font-medium">Clear all</button>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {queue.map((q) => (
                  <div key={q.id} className="flex gap-3 p-3 rounded-xl border border-border bg-surface-raised">
                    {/* Preview */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={q.preview} alt="" className="w-20 h-16 rounded-lg object-cover shrink-0" />

                    {/* Fields */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <input value={q.title} onChange={(e) => updateQueued(q.id, "title", e.target.value)}
                        placeholder="Title *" className={inputCls + " text-xs"} />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={q.caption} onChange={(e) => updateQueued(q.id, "caption", e.target.value)}
                          placeholder="Caption" className={inputCls + " text-xs"} />
                        <input value={q.category} onChange={(e) => updateQueued(q.id, "category", e.target.value)}
                          placeholder="Category" className={inputCls + " text-xs"} />
                      </div>
                      <input value={q.date} onChange={(e) => updateQueued(q.id, "date", e.target.value)}
                        placeholder="Date (e.g. Nov 2024)" className={inputCls + " text-xs"} />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-fg-faint truncate">{q.file.name} · {(q.file.size / 1024).toFixed(0)} KB</p>
                        {q.status === "done"     && <span className="text-[10px] text-emerald-500 font-medium">Done</span>}
                        {q.status === "uploading" && <span className="text-[10px] text-indigo-400 font-medium">Uploading…</span>}
                        {q.status === "error"    && <span className="text-[10px] text-rose-500 font-medium">{q.error}</span>}
                      </div>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeQueued(q.id)} disabled={busy}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-fg-faint hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-40">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {bulkProgress && (
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-fg-faint text-right">{bulkProgress.done} / {bulkProgress.total}</p>
                </div>
              )}

              <button onClick={bulkUpload} disabled={busy || queue.length === 0}
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors inline-flex items-center gap-2">
                {busy
                  ? bulkProgress ? `Uploading ${bulkProgress.done}/${bulkProgress.total}…` : "Working…"
                  : `Push ${queue.length} photo${queue.length !== 1 ? "s" : ""} in one commit`}
              </button>
            </div>
          )}
        </div>
      )}

      {result && (
        <p className={`text-xs rounded-lg px-3 py-2 border ${result.ok ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"}`}>
          {result.msg}
        </p>
      )}

      {/* Existing items */}
      {loaded && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">{items.length} photo{items.length !== 1 ? "s" : ""}</p>
          {items.length === 0 ? (
            <p className="text-sm text-fg-faint">No photos yet.</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((it) => (
                <li key={it.id} className="group relative rounded-lg border border-border overflow-hidden bg-surface-raised">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.src} alt={it.title} className="w-full aspect-[4/3] object-cover" />
                  <div className="p-2">
                    <p className="text-[11px] font-medium text-fg truncate">{it.title}</p>
                    {it.category && <p className="text-[10px] text-fg-faint">{it.category}</p>}
                  </div>
                  <button onClick={() => remove(it.id)} disabled={busy} aria-label="Remove"
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
