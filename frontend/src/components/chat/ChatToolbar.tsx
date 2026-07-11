"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";
import { INTERNAL_LINKS, type PersonaOption } from "./ChatLanding";

type ChatToolbarProps = {
  personas: PersonaOption[];
  persona: string | null;
  onChoosePersona: (id: string) => void;
  onBook: () => void;
  activeModel: string | null;
};

/**
 * Slim chip tray shown above the input during a conversation — keeps the
 * promoted landing tiles (persona / book / links / model) reachable without
 * cluttering the message stream. Horizontally scrollable on mobile.
 */
export default function ChatToolbar({ personas, persona, onChoosePersona, onBook, activeModel }: ChatToolbarProps) {
  const [menu, setMenu] = useState<null | "persona" | "links">(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on Escape + outside click.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menu]);

  const personaLabel = persona ? personas.find((p) => p.id === persona)?.label : null;

  const chip =
    "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors";
  const chipIdle = "border-border bg-surface/70 text-fg-muted hover:border-accent/50 hover:text-accent";

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 pb-0.5">
      {/* Persona */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenu(menu === "persona" ? null : "persona")}
          aria-haspopup="menu"
          aria-expanded={menu === "persona"}
          className={`${chip} ${persona ? "border-accent/50 bg-accent-light text-accent" : chipIdle}`}
        >
          <span aria-hidden>◑</span>
          {personaLabel ?? "Persona"}
        </button>
        {menu === "persona" && (
          <div
            role="menu"
            className="absolute bottom-full left-0 mb-2 z-30 w-44 rounded-panel border border-border bg-surface/95 backdrop-blur-sm p-1 shadow-md animate-fade-up"
          >
            {personas.map((p) => (
              <button
                key={p.id}
                role="menuitem"
                onClick={() => { onChoosePersona(p.id); setMenu(null); }}
                className={`flex w-full items-center justify-between rounded-chip px-2.5 py-2 text-left text-[12px] transition-colors ${
                  persona === p.id ? "bg-accent text-accent-fg" : "text-fg-muted hover:bg-surface-raised"
                }`}
              >
                <span>{p.label}</span>
                <span className={`text-[10px] ${persona === p.id ? "text-accent-fg/80" : "text-fg-faint"}`}>{p.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Book a call */}
      <button onClick={onBook} className={`${chip} ${chipIdle}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Book a call
      </button>

      {/* Explore links */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenu(menu === "links" ? null : "links")}
          aria-haspopup="menu"
          aria-expanded={menu === "links"}
          className={`${chip} ${chipIdle}`}
        >
          <span aria-hidden>◈</span>
          Explore
        </button>
        {menu === "links" && (
          <div
            role="menu"
            className="absolute bottom-full left-0 mb-2 z-30 w-44 rounded-panel border border-border bg-surface/95 backdrop-blur-sm p-1 shadow-md animate-fade-up"
          >
            {INTERNAL_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                role="menuitem"
                className="flex items-center gap-2 rounded-chip px-2.5 py-2 text-[12px] text-fg-muted hover:bg-surface-raised hover:text-accent transition-colors"
              >
                <span className="text-fg-faint" aria-hidden>{l.glyph}</span>
                {l.label}
              </a>
            ))}
            <div className="my-1 h-px bg-border/60" />
            {profile.resume && (
              <a href={profile.resume} target="_blank" rel="noopener noreferrer" role="menuitem"
                className="flex items-center rounded-chip px-2.5 py-2 text-[12px] text-fg-muted hover:bg-surface-raised hover:text-accent transition-colors">
                Résumé ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Model status (display) */}
      <span className={`${chip} border-border/60 bg-surface/40 text-fg-faint cursor-default`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden />
        <span className="font-mono">{activeModel || "Gemini"}</span>
      </span>
    </div>
  );
}
