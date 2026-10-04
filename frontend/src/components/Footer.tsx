"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { profile } from "@/data/profile";
import LiquidWave from "@/components/LiquidWave";
import InstallPWA from "@/components/InstallPWA";
import { footerColumns as COLUMNS } from "@/lib/site-nav";
import blogPosts from "@/data/knowledge/blog.json";

type BlogPostMeta = { slug: string; title: string; date?: string };
const latestPost = [...(blogPosts as BlogPostMeta[])].sort((a, b) =>
  (b.date ?? "").localeCompare(a.date ?? "")
)[0] ?? null;

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/60 text-fg-muted backdrop-blur transition-colors hover:border-fg-muted hover:text-fg"
    >
      {children}
    </a>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
export default function Footer() {
  const [revealed, setRevealed] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRevealed(true); },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <footer ref={footerRef} className="relative mt-auto overflow-hidden bg-bg">
      {/* Depth glow */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-2/3 bg-linear-to-t from-accent/5 via-transparent to-transparent" />
      {/* Liquid wave — absolute bottom decoration */}
      <div className="text-accent"><LiquidWave /></div>
      {/* Dot-grid texture */}
      <div aria-hidden className="hero-dot-grid pointer-events-none absolute inset-0 opacity-[0.3]" />

      <div
        className={`relative z-10 mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] px-4 sm:px-6 pt-16 pb-7 sm:pt-20
                    transition-[opacity,transform] duration-700 ease-out
                    ${revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
      >
        {/* ── Top: brand + link columns ── */}
        <div className="grid gap-10 md:grid-cols-[1.3fr_2fr] lg:gap-16">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="text-2xl font-normal tracking-widest text-fg transition-opacity hover:opacity-70"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              {profile.name.split(" ")[0]}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">{profile.tagline}</p>

            <div className="mt-5 flex items-center gap-2.5">
              {profile.github && (
                <IconLink href={profile.github} label="GitHub">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
                </IconLink>
              )}
              {profile.linkedin && (
                <IconLink href={profile.linkedin} label="LinkedIn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </IconLink>
              )}
              <IconLink href={`mailto:${profile.email}`} label="Email">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </IconLink>
              <InstallPWA variant="icon" />
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-fg-faint">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[13px] text-fg-muted transition-colors hover:text-accent">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px] tracking-[0.06em] text-fg-muted">
              © {new Date().getFullYear()} {profile.name}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Updated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {latestPost && (
              <Link href={`/blog/${latestPost.slug}`} className="font-mono text-[11px] tracking-[0.06em] text-fg-muted transition-colors hover:text-fg line-clamp-1 max-w-[70vw] sm:max-w-[220px]">
                Latest: {latestPost.title}
              </Link>
            )}
            <a href="/feed.xml" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] tracking-[0.06em] text-fg-muted transition-colors hover:text-fg">RSS</a>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] tracking-[0.06em] text-fg-muted transition-colors hover:text-fg">Sitemap</a>
            <a href={profile.resume} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] tracking-[0.06em] text-fg-muted transition-colors hover:text-fg">Résumé</a>
            <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] tracking-[0.06em] text-fg-muted transition-colors hover:text-fg">llms.txt</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
