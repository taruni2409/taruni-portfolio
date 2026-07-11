"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
const CYCLE: Mode[] = ["light", "dark", "system"];

const LABELS: Record<Mode, string> = {
  light:  "Switch to dark mode",
  dark:   "Switch to system mode",
  system: "Switch to light mode",
};

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

const ICONS: Record<Mode, React.ReactNode> = {
  light:  <SunIcon />,
  dark:   <MoonIcon />,
  system: <MonitorIcon />,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <button aria-label="Toggle theme" className="w-11 h-11 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-fg-faint" />;
  }

  const current = (CYCLE.includes(theme as Mode) ? theme : "system") as Mode;
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={LABELS[current]}
      title={LABELS[current]}
      className="w-11 h-11 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors"
    >
      {ICONS[current]}
    </button>
  );
}
