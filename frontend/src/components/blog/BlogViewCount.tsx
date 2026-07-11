"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";

export default function BlogViewCount({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/blog/${slug}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.views) setViews(d.views); })
      .catch(() => {});
  }, [slug]);

  if (!views) return null;

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

  return (
    <span className="inline-flex items-center gap-1 text-sm text-fg-faint tabular-nums">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      </svg>
      {fmt(views)}
    </span>
  );
}
