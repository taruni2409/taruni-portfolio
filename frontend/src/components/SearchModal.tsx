"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { profile } from "@/data/profile";
import type { SearchItem } from "@/lib/searchIndex";

// Re-export so callers don't need a separate import
export type { SearchItem };

// ── Badge styles ───────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { bg: string; text: string; label: string }> = {
  page:        { bg: "bg-zinc-100 dark:bg-zinc-800",           text: "text-zinc-500 dark:text-zinc-400",       label: "Page"      },
  blog:        { bg: "bg-indigo-50 dark:bg-indigo-950/50",     text: "text-indigo-600 dark:text-indigo-400",   label: "Post"      },
  lab:         { bg: "bg-emerald-50 dark:bg-emerald-950/50",   text: "text-emerald-600 dark:text-emerald-400", label: "Lab"       },
  project:     { bg: "bg-blue-50 dark:bg-blue-950/50",         text: "text-blue-600 dark:text-blue-400",       label: "Project"   },
  skill:       { bg: "bg-amber-50 dark:bg-amber-950/50",       text: "text-amber-600 dark:text-amber-400",     label: "Skill"     },
  quote:       { bg: "bg-violet-50 dark:bg-violet-950/50",     text: "text-violet-600 dark:text-violet-400",   label: "Quote"     },
  experience:  { bg: "bg-orange-50 dark:bg-orange-950/40",     text: "text-orange-600 dark:text-orange-400",   label: "Work"      },
  education:   { bg: "bg-sky-50 dark:bg-sky-950/40",           text: "text-sky-600 dark:text-sky-400",         label: "Education" },
  testimonial: { bg: "bg-rose-50 dark:bg-rose-950/40",         text: "text-rose-600 dark:text-rose-400",       label: "Reference" },
  gallery:     { bg: "bg-teal-50 dark:bg-teal-950/40",         text: "text-teal-600 dark:text-teal-400",       label: "Gallery"   },
  tag:         { bg: "bg-purple-50 dark:bg-purple-950/40",     text: "text-purple-600 dark:text-purple-400",   label: "Tag"       },
  action:      { bg: "bg-indigo-100 dark:bg-indigo-900/50",    text: "text-indigo-700 dark:text-indigo-300",   label: "Action"    },
};

/** Returns metadata for any type — known types get their colour, unknown types get a neutral fallback */
function typeMeta(type: string) {
  return TYPE_META[type] ?? {
    bg:    "bg-zinc-100 dark:bg-zinc-800",
    text:  "text-zinc-500 dark:text-zinc-400",
    label: type.charAt(0).toUpperCase() + type.slice(1),
  };
}

// ── Multi-word scored search ───────────────────────────────────────────────────

function search(query: string, items: SearchItem[]): SearchItem[] {
  const raw   = query.trim().toLowerCase();
  if (!raw) return [];
  const words = raw.split(/\s+/);

  const scored = items.flatMap((r) => {
    const haystack  = [r.title, r.description, ...(r.tags ?? [])].join(" ").toLowerCase();
    const titleLow  = r.title.toLowerCase();
    if (!words.every((w) => haystack.includes(w))) return [];

    let score = 0;
    if (titleLow === raw)         score += 100;
    if (titleLow.startsWith(raw)) score += 60;
    if (titleLow.includes(raw))   score += 40;
    for (const w of words) if (titleLow.includes(w)) score += 10;
    return [{ r, score }];
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((s) => s.r);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** Pre-built search index from getSearchIndex() — passed once at build time */
  items: SearchItem[];
}

export default function SearchModal({ items }: Props) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);
  const router   = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const close = useCallback(() => { setOpen(false); setQuery(""); setSelected(0); }, []);

  // ── Quick actions (dynamic — need hooks, built client-side) ───
  const latestPost = useMemo(() => items.find((i) => i.type === "blog"), [items]);
  const actions = useMemo<SearchItem[]>(() => {
    const list: SearchItem[] = [
      { type: "action", title: "Ask Pumpkin",      description: "Chat with the AI assistant",      href: "/chat" },
      { type: "action", title: `Email ${profile.name.split(" ")[0]}`, description: profile.email,     href: `mailto:${profile.email}`,
        action: () => { window.location.href = `mailto:${profile.email}`; } } as SearchItem & { action: () => void },
      { type: "action", title: "Download résumé",   description: "Open the PDF",                    href: profile.resume,
        action: () => window.open(profile.resume, "_blank", "noopener") } as SearchItem & { action: () => void },
      { type: "action", title: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`,
        description: "Toggle appearance", href: "#",
        action: () => setTheme(resolvedTheme === "dark" ? "light" : "dark") } as SearchItem & { action: () => void },
      { type: "action", title: "Book a call",       description: "30-min intro on Google Calendar", href: "#",
        action: () => window.open(profile.booking_url ?? "https://calendar.app.google/3sScGpHpeSpvPjpSA", "_blank", "noopener") } as SearchItem & { action: () => void },
      { type: "action", title: "Copy link to site", description: "Share jayaremala.com",            href: "#",
        action: () => navigator.clipboard?.writeText("https://jayaremala.com").catch(() => {}) } as SearchItem & { action: () => void },
    ];
    if (latestPost) {
      list.push({ type: "action", title: "Latest post", description: latestPost.title, href: latestPost.href });
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, setTheme, latestPost]);

  const searchPool  = useMemo(() => [...actions, ...items], [actions, items]);
  const results     = useMemo(() => query.trim() ? search(query, searchPool) : [], [query, searchPool]);
  const navItems    = query.trim() ? results : actions;

  function run(r: SearchItem & { action?: () => void }) {
    if (r.action) r.action();
    else router.push(r.href);
    close();
  }

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Sitelinks search box (/?q=…): open the palette pre-filled when a visitor
  // arrives from Google's search box. The URL param is only readable client-side.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim()) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuery(q);
      setOpen(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, navItems.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && navItems[selected]) run(navItems[selected] as SearchItem & { action?: () => void });
  }

  if (!open) return null;

  // Group results by type for display
  const grouped = query.trim()
    ? Object.entries(results.reduce<Record<string, SearchItem[]>>((acc, r) => {
        (acc[r.type] ??= []).push(r);
        return acc;
      }, {}))
    : null;

  // Flat ordered list for keyboard index
  const flatItems = grouped ? grouped.flatMap(([, g]) => g) : navItems;
  let kidx = 0;

  // Count of unique content types in the index (for the hint)
  const indexTypes = [...new Set(items.map((i) => i.type))];

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] px-4" onClick={close}>
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" aria-hidden />

      <div
        className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-faint shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search anything on the site…"
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(""); setSelected(0); inputRef.current?.focus(); }}
              className="text-fg-faint hover:text-fg transition-colors p-0.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-fg-faint">esc</kbd>
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

          {/* ── Grouped search results ── */}
          {grouped && grouped.length > 0 && (
            <ul ref={listRef} className="py-1.5">
              {grouped.map(([groupKey, groupItems]) => {
                const meta = typeMeta(groupKey);
                return (
                  <li key={groupKey}>
                    <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-fg-faint select-none">
                      {meta.label}
                    </p>
                    {groupItems.map((r) => {
                      const idx      = kidx++;
                      const isActive = idx === selected;
                      return (
                        <button
                          key={`${r.type}-${r.href}-${r.title}-${idx}`}
                          onClick={() => run(r as SearchItem & { action?: () => void })}
                          onMouseEnter={() => setSelected(idx)}
                          className={`w-full text-left flex items-center gap-3 px-4 py-2 transition-colors ${isActive ? "bg-surface-raised" : "hover:bg-surface-raised"}`}
                        >
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.bg} ${meta.text}`}>
                            {meta.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-fg truncate">{r.title}</p>
                            {r.description && (
                              <p className="text-[11px] text-fg-faint truncate mt-0.5">{r.description}</p>
                            )}
                          </div>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`shrink-0 text-fg-faint transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </button>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── No results ── */}
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-fg-faint">No results for <strong className="text-fg">&ldquo;{query}&rdquo;</strong></p>
              <p className="text-[11px] text-fg-faint mt-1.5">Try a role, company, technology, post title, or tag</p>
            </div>
          )}

          {/* ── Idle: quick actions ── */}
          {!query.trim() && (
            <div className="px-2 py-2 space-y-1">
              <p className="px-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-fg-faint select-none">Quick actions</p>
              <ul ref={listRef}>
                {actions.map((r, i) => {
                  const meta = typeMeta(r.type);
                  return (
                    <li key={r.title}>
                      <button
                        onClick={() => run(r as SearchItem & { action?: () => void })}
                        onMouseEnter={() => setSelected(i)}
                        className={`w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${i === selected ? "bg-surface-raised" : "hover:bg-surface-raised"}`}
                      >
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-fg truncate">{r.title}</p>
                          {r.description && <p className="text-[11px] text-fg-faint truncate">{r.description}</p>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Dynamic hint — shows actual content types in the index */}
              <div className="mx-2 px-3 py-2 rounded-lg bg-surface-raised border border-border">
                <p className="text-[10px] text-fg-faint leading-relaxed">
                  <span className="text-fg-muted font-medium">Search across </span>
                  {indexTypes.map((t) => typeMeta(t).label).join(" · ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-fg-faint">
          <span className="flex items-center gap-1"><kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">esc</kbd> close</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">⌘K</kbd></span>
        </div>
      </div>
    </div>
  );
}
