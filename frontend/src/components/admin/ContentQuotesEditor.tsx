"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { triggerReingest } from "./AdminShared";

const GITHUB_QUOTES_URL = "https://api.github.com/repos/sabarishreddy99/jayaremala/contents/backend/data/knowledge/quotes.json";

interface QuoteRow {
  id: number;
  quote_id: string;
  text: string;
  author: string;
  source?: string | null;
  category: string;
  favorite: boolean;
  featured: boolean;
  added_at: string;
}

const CATEGORIES = ["Work", "Life", "Technology", "Philosophy", "Creativity", "Mindset"];
const todayISO = new Date().toISOString().slice(0, 10);

function adminToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("pumpkin_admin_token") ?? "" : "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken()}`,
  };
}

function Result({ result }: { result: { ok: boolean; message: string } | null }) {
  if (!result) return null;
  return (
    <p className={`text-xs mt-2 ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
      {result.ok ? "✓" : "✗"} {result.message}
    </p>
  );
}

export default function ContentQuotesEditor() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  // New quote form
  const [form, setForm] = useState({
    quote_id: "",
    text: "",
    author: "",
    source: "",
    category: "Philosophy",
    favorite: false,
    featured: false,
    added_at: todayISO,
  });

  async function loadQuotes(): Promise<QuoteRow[] | null> {
    setLoading(true);
    let data: QuoteRow[] | null = null;
    try {
      const res = await fetch(`${API_BASE_URL}/content/quotes`);
      if (res.ok) { data = await res.json(); setQuotes(data ?? []); }
    } catch { /* silent */ }
    setLoading(false);
    return data;
  }

  async function pushToGitHub(rows: QuoteRow[]) {
    const pat = typeof window !== "undefined" ? localStorage.getItem("pumpkin_github_pat") ?? "" : "";
    if (!pat.trim()) return;
    try {
      const output = rows.map((q) => ({
        id: q.quote_id, text: q.text, author: q.author, source: q.source ?? "",
        category: q.category, favorite: q.favorite, featured: q.featured ?? false, addedAt: q.added_at,
      }));
      const hdrs = { Authorization: `Bearer ${pat.trim()}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
      const getRes = await fetch(GITHUB_QUOTES_URL, { headers: hdrs });
      if (!getRes.ok && getRes.status !== 404) return;
      const sha = getRes.ok ? (await getRes.json() as { sha: string }).sha : undefined;
      const body: Record<string, string> = { message: "quotes: sync from admin", content: btoa(unescape(encodeURIComponent(JSON.stringify(output, null, 2)))), branch: "main" };
      if (sha) body.sha = sha;
      await fetch(GITHUB_QUOTES_URL, { method: "PUT", headers: hdrs, body: JSON.stringify(body) });
    } catch { /* non-fatal — API save already succeeded */ }
  }

  useEffect(() => { loadQuotes(); }, []);

  function resetForm() {
    setForm({ quote_id: "", text: "", author: "", source: "", category: "Philosophy", favorite: false, featured: false, added_at: todayISO });
    setEditingId(null);
    setResult(null);
  }

  function startEdit(q: QuoteRow) {
    setEditingId(q.quote_id);
    setForm({
      quote_id: q.quote_id,
      text: q.text,
      author: q.author,
      source: q.source ?? "",
      category: q.category,
      favorite: q.favorite,
      featured: q.featured,
      added_at: q.added_at,
    });
    setResult(null);
  }

  async function handleSave() {
    if (!form.text.trim() || !form.author.trim() || !form.quote_id.trim()) {
      setResult({ ok: false, message: "Text, author, and ID are required." });
      return;
    }
    setSaving(true);
    setResult(null);
    const body = { ...form, source: form.source.trim() || null };
    try {
      const url = editingId
        ? `${API_BASE_URL}/content/quotes/${editingId}`
        : `${API_BASE_URL}/content/quotes`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setResult({ ok: true, message: editingId ? "Updated!" : "Quote added — live immediately." });
        resetForm();
        const updated = await loadQuotes();
        triggerReingest();
        if (updated !== null) void pushToGitHub(updated);
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, message: (err as { detail?: string }).detail ?? `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: (e as Error).message });
    }
    setSaving(false);
  }

  function toggleSelectId(id: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === quotes.length ? new Set<string>() : new Set(quotes.map(q => q.quote_id)));
  }
  async function handleBulkDelete() {
    if (!bulkConfirm) { setBulkConfirm(true); return; }
    setBulkDeleting(true);
    setBulkConfirm(false);
    const idsToDelete = [...selectedIds];
    for (const quote_id of idsToDelete) {
      try {
        await fetch(`${API_BASE_URL}/content/quotes/${quote_id}`, { method: "DELETE", headers: authHeaders() });
      } catch { /* continue */ }
    }
    setSelectedIds(new Set());
    const updated = await loadQuotes();
    triggerReingest();
    if (updated !== null) void pushToGitHub(updated);
    setBulkDeleting(false);
    setResult({ ok: true, message: `Deleted ${idsToDelete.length} quote${idsToDelete.length !== 1 ? "s" : ""}.` });
  }

  async function handleDelete(quote_id: string) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/content/quotes/${quote_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        setResult({ ok: true, message: "Deleted." });
        setConfirmDelete(null);
        const updated = await loadQuotes();
        triggerReingest();
        if (updated !== null) void pushToGitHub(updated);
      } else {
        setResult({ ok: false, message: `Error ${res.status}` });
      }
    } catch (e: unknown) {
      setResult({ ok: false, message: (e as Error).message });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-fg mb-1">Quotes — Content API</h2>
        <p className="text-xs text-fg-faint mb-6">Changes are live immediately — no git push, no rebuild.</p>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">ID (stable, unique)</label>
              <input
                value={form.quote_id}
                onChange={(e) => setForm(f => ({ ...f, quote_id: e.target.value }))}
                placeholder="q13"
                disabled={!!editingId}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Quote text</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))}
              rows={3}
              placeholder="The best way to predict the future is to invent it."
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Author</label>
              <input
                value={form.author}
                onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))}
                placeholder="Alan Kay"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-fg-faint mb-1 uppercase tracking-wider">Source (optional)</label>
              <input
                value={form.source}
                onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                placeholder="1971 PARC Staff Meeting"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.favorite} onChange={(e) => setForm(f => ({ ...f, favorite: e.target.checked }))} className="rounded" />
              <span className="text-sm text-fg">Favorite ★</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
              <span className="text-sm text-fg">Featured (shown first)</span>
            </label>
            <div className="flex-1" />
            <label className="block text-[11px] font-semibold text-fg-faint uppercase tracking-wider">
              Added
              <input
                type="date"
                value={form.added_at}
                onChange={(e) => setForm(f => ({ ...f, added_at: e.target.value }))}
                className="ml-2 rounded border border-border bg-bg px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update Quote" : "Add Quote"}
            </button>
            {editingId && (
              <button onClick={resetForm} className="text-xs text-fg-faint hover:text-fg transition-colors">
                Cancel
              </button>
            )}
          </div>

          <Result result={result} />
        </div>

        {/* Quote list */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={quotes.length > 0 && selectedIds.size === quotes.length}
              onChange={toggleSelectAll}
              disabled={quotes.length === 0}
              className="accent-accent cursor-pointer"
            />
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-faint">
              {loading ? "Loading…" : `${quotes.length} quotes`}
            </h3>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-fg-muted">{selectedIds.size} selected</span>
              {bulkConfirm ? (
                <>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting}
                    className="px-3 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
                    {bulkDeleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button onClick={() => setBulkConfirm(false)}
                    className="px-2 py-1 rounded border border-border text-[11px] text-fg-faint hover:text-fg transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="px-3 py-1 rounded border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                  Delete selected ({selectedIds.size})
                </button>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {quotes.map((q) => (
            <div key={q.quote_id} className={`flex items-start gap-3 rounded-xl border bg-bg p-3 ${selectedIds.has(q.quote_id) ? "border-rose-300 dark:border-rose-800" : "border-border"}`}>
              <input
                type="checkbox"
                checked={selectedIds.has(q.quote_id)}
                onChange={() => toggleSelectId(q.quote_id)}
                className="mt-1 shrink-0 accent-accent cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg leading-snug line-clamp-2">&ldquo;{q.text}&rdquo;</p>
                <p className="text-[11px] text-fg-faint mt-0.5">— {q.author}{q.source ? `, ${q.source}` : ""}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] bg-surface-raised px-2 py-0.5 rounded-full text-fg-muted">{q.category}</span>
                  {q.favorite && <span className="text-[10px] text-amber-500">★ favorite</span>}
                  {q.featured && <span className="text-[10px] text-indigo-500">◈ featured</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(q)} className="text-[11px] text-accent hover:text-accent/80 transition-colors">Edit</button>
                {confirmDelete === q.quote_id ? (
                  <span className="flex gap-1">
                    <button onClick={() => handleDelete(q.quote_id)} className="text-[11px] text-rose-600 hover:text-rose-500">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[11px] text-fg-faint">Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDelete(q.quote_id)} className="text-[11px] text-fg-faint hover:text-rose-600 transition-colors">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
