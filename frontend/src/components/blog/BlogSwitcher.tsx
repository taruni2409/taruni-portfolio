"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface PostStub {
  slug: string;
  title: string;
  date: string;
}

interface Props {
  posts: PostStub[];
  currentSlug?: string;
  label?: string;
  listTitle?: string;
  basePath?: string;
}

export default function BlogSwitcher({ posts, currentSlug, label = "Browse", listTitle = "All posts", basePath = "/blog" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg transition-colors px-2.5 py-1.5 rounded-lg border border-border hover:border-border-strong bg-surface hover:bg-surface-raised"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
          <path d="M4 6h16M4 12h16M4 18h7"/>
        </svg>
        {label}
        <svg
          width="10" height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">{listTitle}</p>
          </div>
          <ul className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {posts.map((post) => {
              const isCurrent = post.slug === currentSlug;
              return (
                <li key={post.slug} role="option" aria-selected={isCurrent}>
                  <Link
                    href={`${basePath}/${post.slug}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-raised transition-colors group ${isCurrent ? "bg-accent/5" : ""}`}
                  >
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? "bg-accent" : "bg-transparent"}`} aria-hidden />
                    <div className="min-w-0">
                      <p className={`text-sm leading-snug truncate ${isCurrent ? "text-accent font-medium" : "text-fg-muted group-hover:text-fg"} transition-colors`}>
                        {post.title}
                      </p>
                      <p className="text-[10px] text-fg-faint mt-0.5">{post.date}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
