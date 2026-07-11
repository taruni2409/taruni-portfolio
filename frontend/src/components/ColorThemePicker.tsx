"use client";

import { useEffect, useRef, useState } from "react";

// ── Theme registry ────────────────────────────────────────────────────────────

export const COLOR_THEMES = [
  {
    id:    "midnight",
    label: "Midnight",
    desc:  "Editorial newspaper — cool blue-slate",
    light: { bg: "#eff1f6", surface: "#e6eaf0", accent: "#4f46e5" },
    dark:  { bg: "#000000", surface: "#181818", accent: "#818cf8" },
  },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

const STORAGE_KEY = "color-theme";

export function applyColorTheme(id: string) {
  document.documentElement.setAttribute("data-theme", id);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ColorThemePicker() {
  const [current, setCurrent] = useState<ColorThemeId>("midnight");
  const [open, setOpen]       = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage without FOUC (the inline script in layout.tsx
  // already applied the attribute; here we just sync React state to match)
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) ?? "midnight") as ColorThemeId;
    setCurrent(saved);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function pick(id: ColorThemeId) {
    setCurrent(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyColorTheme(id);
    setOpen(false);
  }

  const activeTheme = COLOR_THEMES.find((t) => t.id === current) ?? COLOR_THEMES[0];

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button — shows a small split-swatch of the active theme */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Choose color theme"
        title={`Theme: ${activeTheme.label}`}
        className={`group relative p-2 rounded-lg transition-colors ${
          open
            ? "bg-surface-raised text-fg"
            : "text-fg-faint hover:text-fg hover:bg-surface-raised"
        }`}
      >
        {/* Split swatch circle */}
        <span className="relative flex w-[14px] h-[14px] rounded-full overflow-hidden ring-1 ring-border-strong/40">
          <span className="absolute inset-0"         style={{ background: activeTheme.light.bg }} />
          <span className="absolute inset-0"
            style={{
              background:  activeTheme.dark.bg,
              clipPath:    "polygon(100% 0, 100% 100%, 0 100%)",
            }}
          />
          <span className="absolute top-[2px] left-[2px] w-[5px] h-[5px] rounded-full"
            style={{ background: activeTheme.light.accent }}
          />
          <span className="absolute bottom-[2px] right-[2px] w-[5px] h-[5px] rounded-full"
            style={{ background: activeTheme.dark.accent }}
          />
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-[60] w-[310px] rounded-2xl border border-border bg-surface shadow-2xl shadow-black/20 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint">
              Color Theme
            </p>
            <p className="text-xs text-fg-subtle mt-0.5">Saved to your browser</p>
          </div>

          {/* Theme grid */}
          <div className="p-4 grid grid-cols-5 gap-3">
            {COLOR_THEMES.map((theme) => {
              const isActive = theme.id === current;
              return (
                <button
                  key={theme.id}
                  onClick={() => pick(theme.id)}
                  title={`${theme.label} — ${theme.desc}`}
                  className="group flex flex-col items-center gap-2 focus:outline-none"
                >
                  {/* Large split swatch */}
                  <span
                    className={`relative w-12 h-12 rounded-2xl overflow-hidden transition-all duration-200 ${
                      isActive
                        ? "ring-2 ring-offset-2 ring-offset-surface shadow-lg scale-105"
                        : "ring-1 ring-border group-hover:ring-2 group-hover:scale-105"
                    }`}
                    style={isActive ? { outline: `2px solid ${theme.light.accent}`, outlineOffset: "2px" } : {}}
                  >
                    {/* Light half (top-left) */}
                    <span className="absolute inset-0" style={{ background: theme.light.bg }} />
                    {/* Dark half (bottom-right triangle) */}
                    <span
                      className="absolute inset-0"
                      style={{
                        background: theme.dark.bg,
                        clipPath:   "polygon(100% 0, 100% 100%, 0 100%)",
                      }}
                    />
                    {/* Light accent dot */}
                    <span
                      className="absolute top-[7px] left-[7px] w-[10px] h-[10px] rounded-full shadow-sm"
                      style={{ background: theme.light.accent }}
                    />
                    {/* Dark accent dot */}
                    <span
                      className="absolute bottom-[7px] right-[7px] w-[10px] h-[10px] rounded-full shadow-sm"
                      style={{ background: theme.dark.accent }}
                    />
                    {/* Light surface sliver */}
                    <span
                      className="absolute top-[3px] left-[3px] right-[40%] h-[3px] rounded-full opacity-70"
                      style={{ background: theme.light.surface }}
                    />
                    {/* Active checkmark */}
                    {isActive && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </span>
                      </span>
                    )}
                  </span>

                  {/* Label */}
                  <span className={`text-[9px] font-semibold transition-colors ${
                    isActive ? "text-fg" : "text-fg-faint group-hover:text-fg-subtle"
                  }`}>
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-4 pb-4">
            <p className="text-[10px] text-fg-faint leading-relaxed">
              Each theme works in both <span className="text-fg-subtle">light</span> and <span className="text-fg-subtle">dark</span> mode.
              Top-left = light · bottom-right = dark.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile swatches (used in mobile drawer) ───────────────────────────────────

export function ColorThemeSwatches() {
  const [current, setCurrent] = useState<ColorThemeId>("midnight");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) ?? "midnight") as ColorThemeId;
    setCurrent(saved);
  }, []);

  function pick(id: ColorThemeId) {
    setCurrent(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyColorTheme(id);
  }

  return (
    <div className="px-3 py-3 border-t border-border-subtle">
      <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint mb-2.5 px-0.5">
        Color Theme
      </p>
      <div className="flex items-center gap-2.5 flex-wrap">
        {COLOR_THEMES.map((theme) => {
          const isActive = theme.id === current;
          return (
            <button
              key={theme.id}
              onClick={() => pick(theme.id)}
              title={theme.label}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className={`relative w-10 h-10 rounded-xl overflow-hidden transition-all duration-200 ${
                  isActive
                    ? "ring-2 ring-offset-1 ring-offset-surface scale-110 shadow-md"
                    : "ring-1 ring-border group-hover:scale-105 group-hover:ring-fg-faint"
                }`}
              >
                <span className="absolute inset-0" style={{ background: theme.light.bg }} />
                <span className="absolute inset-0" style={{ background: theme.dark.bg, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
                <span className="absolute top-[6px] left-[6px] w-[9px] h-[9px] rounded-full" style={{ background: theme.light.accent }} />
                <span className="absolute bottom-[6px] right-[6px] w-[9px] h-[9px] rounded-full" style={{ background: theme.dark.accent }} />
                {isActive && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center">
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  </span>
                )}
              </span>
              <span className={`text-[9px] font-semibold ${isActive ? "text-fg" : "text-fg-faint"}`}>
                {theme.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
