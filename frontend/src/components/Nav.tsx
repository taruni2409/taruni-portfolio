"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { profile } from "@/data/profile";
import ThemeToggle from "@/components/ThemeToggle";
import SoundToggle from "@/components/SoundToggle";
import SparkleIcon from "@/components/SparkleIcon";
import InstallPWA from "@/components/InstallPWA";
import ReadingProgress from "@/components/blog/ReadingProgress";
import { playClick } from "@/lib/sound";
import { siteGroups as groups } from "@/lib/site-nav";

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round"
    className={`ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    aria-hidden
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  // Default to Mac (⌘) so the SSR/first-paint hint matches this audience; correct on mount.
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
  }, []);

  // ── Scroll-hide/show refs ─────────────────────────────────────
  const lastScrollY   = useRef(0);
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef       = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  // ── Dropdown menus (desktop) ──────────────────────────────────
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menubarRef = useRef<HTMLDivElement>(null);

  // ── Magnetic spotlight indicator (now glides across the 3 group triggers) ──
  const triggerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [spot, setSpot] = useState<{ left: number; width: number; opacity: number }>({
    left: 0, width: 0, opacity: 0,
  });

  const activeGroupIdx = groups.findIndex((g) => g.items.some((it) => pathname.startsWith(it.href)));

  // Close any open dropdown on navigation — React's "adjust state during render"
  // pattern (preferred over an effect for resetting state when a value changes).
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    if (openIdx !== null) setOpenIdx(null);
  }

  const openMenu = (i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenIdx(i);
    setHoverIdx(i);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { setOpenIdx(null); setHoverIdx(null); }, 150);
  };

  // Move the spotlight to the open → hovered → active group, in that priority.
  useEffect(() => {
    const idx = openIdx ?? hoverIdx ?? activeGroupIdx;
    const el = idx != null && idx >= 0 ? triggerRefs.current[idx] : null;
    if (el) setSpot({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
    else setSpot((s) => ({ ...s, opacity: 0 }));
  }, [openIdx, hoverIdx, activeGroupIdx, pathname]);

  // Re-measure on resize (font / layout shifts)
  useEffect(() => {
    const remeasure = () => {
      const el = activeGroupIdx >= 0 ? triggerRefs.current[activeGroupIdx] : null;
      if (el) setSpot({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
    };
    const id = setTimeout(remeasure, 80); // after font swap
    window.addEventListener("resize", remeasure);
    return () => { clearTimeout(id); window.removeEventListener("resize", remeasure); };
  }, [activeGroupIdx]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenIdx(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click (covers click-opened menus where the cursor never leaves)
  useEffect(() => {
    if (openIdx === null) return;
    const onDown = (e: MouseEvent) => {
      if (menubarRef.current && !menubarRef.current.contains(e.target as Node)) setOpenIdx(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openIdx]);

  useEffect(() => {
    const onScroll = () => {
      const y     = window.scrollY;
      const delta = y - lastScrollY.current;

      setScrolled(y > 48);

      if (y <= 10) {
        // At the very top — always reveal immediately
        clearTimeout(hideTimer.current ?? undefined);
        clearTimeout(idleTimer.current ?? undefined);
        setNavVisible(true);
      } else if (delta > 6 && !openRef.current) {
        // Scrolling DOWN — hide after a short pause (feels deliberate, not twitchy)
        clearTimeout(idleTimer.current ?? undefined);
        clearTimeout(hideTimer.current ?? undefined);
        hideTimer.current = setTimeout(() => setNavVisible(false), 120);
      } else if (delta < -4) {
        // Scrolling UP — reveal immediately
        clearTimeout(hideTimer.current ?? undefined);
        clearTimeout(idleTimer.current ?? undefined);
        setNavVisible(true);
      }

      // Reveal after the user rests (stops scrolling for 900 ms)
      clearTimeout(idleTimer.current ?? undefined);
      idleTimer.current = setTimeout(() => setNavVisible(true), 900);

      lastScrollY.current = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(hideTimer.current ?? undefined);
      clearTimeout(idleTimer.current ?? undefined);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 relative will-change-transform bg-bg ${
        navVisible
          /* Reveal: spring easing — feels like it "settles" into place */
          ? "translate-y-0 transition-transform duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          /* Hide: quick ease-in — snaps away crisply */
          : "-translate-y-[110%] transition-transform duration-[220ms] ease-in"
      }`}
    >

      {/* ── Gradient scrim ── softly bleeds the page bg colour downward,
           creating a visual "air gap" between the nav and page content   */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-16"
        style={{ background: "linear-gradient(to bottom, var(--bg) 0%, transparent 100%)" }}
      />

      {/* ── Floating wrapper — gap on all screen sizes ── */}
      <div className="py-2 px-2 lg:px-4">
        {/* ── The nav pill ── layout never changes; only visual props animate ── */}
        <div
          className={`relative z-10 mx-auto flex w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] items-center justify-between
            px-4 py-2
            transition-[background-color,box-shadow] duration-400 ease-out
            ${scrolled
              ? "bg-bg dark:bg-surface [box-shadow:0_8px_32px_-8px_rgb(0_0_0/0.08),0_2px_8px_-2px_rgb(0_0_0/0.04)] dark:[box-shadow:0_8px_32px_-8px_rgb(0_0_0/0.45),0_2px_8px_-2px_rgb(0_0_0/0.25)]"
              : "bg-transparent shadow-none"
            }`}
        >
          {/* Dot grid: its OWN overflow-hidden+rounded wrapper so it clips to pill
              corners without clipping the color-picker dropdown that lives outside */}
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden pointer-events-none"
          >
            <div className={`hero-dot-grid absolute inset-0 transition-opacity duration-400 ${scrolled ? "opacity-[0.18]" : "opacity-0"}`} />
          </div>
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xl font-normal tracking-widest text-fg hover:opacity-70 transition-opacity"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          onClick={() => { setOpen(false); playClick("ui"); }}
        >
          {profile.name.split(" ")[0]}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Spotlight group — a soft indigo highlight glides between the 3 menu triggers */}
          <div
            ref={menubarRef}
            className="relative flex items-center gap-1"
            onMouseLeave={scheduleClose}
          >
            {/* The gliding spotlight */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-8 rounded-md
                         bg-surface-raised dark:bg-surface-raised
                         ring-1 ring-border dark:ring-border"
              style={{
                left: spot.left,
                width: spot.width,
                opacity: spot.opacity,
                transition: "left 0.42s cubic-bezier(0.22,1,0.36,1), width 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
              }}
            />
            {groups.map((g, i) => {
              const groupActive = g.items.some((it) => pathname.startsWith(it.href));
              const isOpen = openIdx === i;
              return (
                <div
                  key={g.label}
                  ref={(el) => { triggerRefs.current[i] = el; }}
                  className="relative"
                  onMouseEnter={() => openMenu(i)}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    onClick={() => { setOpenIdx(isOpen ? null : i); playClick("ui"); }}
                    className={`relative z-10 inline-flex items-center px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-200 ${
                      groupActive || isOpen
                        ? "text-fg font-semibold"
                        : hoverIdx === i
                        ? "text-fg"
                        : "text-fg-subtle"
                    }`}
                  >
                    {g.label}
                    <Chevron open={isOpen} />
                  </button>

                  {/* Dropdown panel — same glass treatment as the mobile drawer */}
                  <div
                    role="menu"
                    aria-label={g.label}
                    className={`absolute left-0 top-full mt-2 min-w-[252px] origin-top rounded-xl p-1.5
                      bg-surface/95 backdrop-blur-[14px] ring-1 ring-border
                      [box-shadow:0_8px_32px_-8px_rgb(0_0_0/0.12),0_2px_8px_-2px_rgb(0_0_0/0.06)]
                      dark:[box-shadow:0_8px_32px_-8px_rgb(0_0_0/0.5),0_2px_8px_-2px_rgb(0_0_0/0.3)]
                      transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen
                          ? "visible opacity-100 translate-y-0 scale-100"
                          : "invisible opacity-0 -translate-y-1 scale-[0.98] pointer-events-none"
                      }`}
                  >
                    {g.items.map((it) => {
                      const active = pathname.startsWith(it.href);
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          role="menuitem"
                          onClick={() => { setOpenIdx(null); playClick("nav"); }}
                          className={`group/item flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 ${
                            active
                              ? "bg-surface-raised"
                              : "hover:bg-surface-raised"
                          }`}
                        >
                          <span className={`mt-0.5 shrink-0 transition-colors ${active ? "text-accent" : "text-fg-faint group-hover/item:text-fg-muted"}`}>
                            {it.icon}
                          </span>
                          <span className="min-w-0">
                            <span className={`block text-[13px] leading-tight ${active ? "text-fg font-semibold" : "text-fg-muted group-hover/item:text-fg font-medium"}`}>
                              {it.label}
                            </span>
                            <span className="block text-[11px] leading-tight text-fg-faint mt-0.5">
                              {it.desc}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cmd+K search trigger — wide rounded pill that reads like a search field */}
          <button
            onClick={() => { playClick("ui"); window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })); }}
            className="group/search ml-1.5 inline-flex items-center gap-2 w-44 lg:w-56 rounded-full border border-border bg-surface-raised pl-3.5 pr-1.5 py-1.5 text-xs text-fg-faint hover:text-fg hover:border-fg-muted transition-colors"
            aria-label="Search"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-fg-faint group-hover/search:text-fg-muted transition-colors">Search…</span>
            <kbd className="ml-auto rounded-md border border-border bg-bg px-1.5 py-0.5 font-sans text-[10px] leading-none text-fg-faint">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <SoundToggle />
          <ThemeToggle />
          <Link
            href="/chat"
            onClick={() => playClick("primary")}
            className="group ml-2 relative inline-flex items-center px-5 py-1.5 rounded-full bg-fg text-bg text-sm font-medium hover:opacity-75 transition-opacity duration-200 overflow-hidden"
          >
            <span className="flex items-center gap-1.5 transition-all duration-300 ease-in-out group-hover:-translate-x-10 group-hover:opacity-0">
              <SparkleIcon size={13} className="shrink-0" />
              Ask Pumpkin
            </span>
            <span className="absolute inset-0 flex items-center justify-center translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-sm font-medium">
              Chat →
            </span>
          </Link>

          {/* Utility buttons — visually separated at the far right */}
          <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-border">
            <InstallPWA variant="nav" />
            <Link
              href="/admin"
              title="Admin"
              className={`p-2 rounded transition-colors ${
                pathname === "/admin"
                  ? "text-fg bg-surface-raised"
                  : "text-fg-faint hover:text-fg-subtle hover:bg-surface-raised"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </Link>
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={() => { playClick("ui"); window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })); }}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 min-h-11 text-xs transition-all duration-300 ${
              scrolled
                ? "border border-border bg-surface-raised text-fg-faint hover:text-fg hover:border-fg-muted"
                : "border border-transparent text-fg-subtle hover:text-fg"
            }`}
            aria-label="Search"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span>Search</span>
          </button>
          <SoundToggle />
          <ThemeToggle />
          <button
            className="inline-flex items-center justify-center w-11 h-11 rounded text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors"
            onClick={() => { setOpen(!open); playClick("ui"); }}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            )}
          </button>
        </div>
        </div>{/* ↑ pill */}

        {/* ── Mobile drawer — floats below pill, same glass treatment, grouped by section ── */}
        {open && (
          <div className="md:hidden mt-1.5 overflow-hidden rounded-xl
            bg-surface/92 backdrop-blur-[14px]
            [box-shadow:0_8px_32px_-8px_rgb(0_0_0/0.10),_0_2px_8px_-2px_rgb(0_0_0/0.06)]
            dark:[box-shadow:0_8px_32px_-8px_rgb(0_0_0/0.45),_0_2px_8px_-2px_rgb(0_0_0/0.25)]">
            <nav className="flex flex-col px-2 pt-2 pb-2">
              {groups.map((g, gi) => (
                <div key={g.label} className={gi > 0 ? "mt-1 pt-1 border-t border-border/60" : ""}>
                  <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-faint">
                    {g.label}
                  </p>
                  {g.items.map((it) => {
                    const active = pathname.startsWith(it.href);
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={() => { setOpen(false); playClick("nav"); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                          active
                            ? "bg-surface-raised text-fg font-medium"
                            : "text-fg-muted hover:bg-surface-raised hover:text-fg"
                        }`}
                      >
                        <span className={`shrink-0 ${active ? "text-accent" : "text-fg-faint"}`}>
                          {it.icon}
                        </span>
                        {it.label}
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div className="mt-1 pt-1 border-t border-border/60">
                <InstallPWA variant="mobile" onTrigger={() => setOpen(false)} />
                <a
                  href={profile.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded text-sm text-fg-muted hover:bg-surface-raised transition-colors flex items-center gap-1.5"
                >
                  Resume
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 17L17 7M17 7H7M17 7v10"/>
                  </svg>
                </a>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded text-sm text-fg-faint hover:bg-surface-raised transition-colors flex items-center gap-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Admin
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>{/* ↑ floating wrapper */}

      {/* Reading progress — only on individual blog/lab posts */}
      {/^\/(blog|lab)\/.+/.test(pathname) && <ReadingProgress />}
    </header>
  );
}
