"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { getOrCreateVisitorId } from "@/lib/visitor";

interface Stats {
  views: number;
  claps: number;
  user_claps: number;
}

interface ConfettiParticle {
  id: number;
  tx: string;
  ty: string;
  rot: string;
  color: string;
  size: number;
  dur: string;
  circle: boolean;
}

const CONFETTI_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316"];

function spawnConfetti(count = 18): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist  = 28 + Math.random() * 52;
    return {
      id:     Date.now() + i,
      tx:     `${Math.round(Math.cos(angle) * dist)}px`,
      ty:     `${Math.round(Math.sin(angle) * dist - 18)}px`,
      rot:    `${200 + Math.round(Math.random() * 340)}deg`,
      color:  CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:   5 + Math.floor(Math.random() * 4),
      dur:    `${620 + Math.floor(Math.random() * 280)}ms`,
      circle: Math.random() > 0.45,
    };
  });
}

const MAX_USER_CLAPS = 50;

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default function BlogEngagement({ slug }: { slug: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [localClaps, setLocalClaps] = useState(0);
  const [burst, setBurst] = useState(false);
  const [floats, setFloats] = useState<number[]>([]);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const pendingRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextFloatKey = useRef(0);

  useEffect(() => {
    // POST /view returns the updated stats (including this visit) — use that as
    // the initial state so the count the user sees already reflects their view.
    // Fall back to a plain GET if the POST fails for any reason.
    const vid = getOrCreateVisitorId();
    fetch(`${API_BASE_URL}/blog/${slug}/view`, {
      method: "POST",
      headers: { "x-visitor-id": vid },
    })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data: Stats) => { setStats(data); setLocalClaps(0); })
      .catch(() => {
        fetch(`${API_BASE_URL}/blog/${slug}/stats`, {
          headers: { "x-visitor-id": vid },
        })
          .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
          .then((data: Stats) => { setStats(data); setLocalClaps(0); })
          .catch(() => setStats({ views: 0, claps: 0, user_claps: 0 }));
      });
  }, [slug]);

  const flushClaps = useCallback(async () => {
    const count = pendingRef.current;
    if (count === 0) return;
    pendingRef.current = 0;
    try {
      const res = await fetch(`${API_BASE_URL}/blog/${slug}/clap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-visitor-id": getOrCreateVisitorId() },
        body: JSON.stringify({ count }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: Stats = await res.json();
      setStats(data);
    } catch {
      // Clap sync failed — local optimistic state remains
    }
  }, [slug]);

  const handleClap = useCallback(() => {
    if (!stats) return;
    const totalUserClaps = stats.user_claps + localClaps;
    if (totalUserClaps >= MAX_USER_CLAPS) return;

    setLocalClaps((c) => c + 1);
    setStats((s) => s ? { ...s, claps: s.claps + 1 } : s);

    const key = nextFloatKey.current++;
    setFloats((f) => [...f, key]);
    setTimeout(() => setFloats((f) => f.filter((k) => k !== key)), 800);

    setBurst(true);
    setTimeout(() => setBurst(false), 200);

    // Confetti burst — skip if user prefers reduced motion
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setConfetti(spawnConfetti());
      setTimeout(() => setConfetti([]), 1050);
    }

    pendingRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushClaps, 1500);
  }, [stats, localClaps, flushClaps]);

  useEffect(() => () => { flushClaps(); }, [flushClaps]);

  const userClapsTotal = (stats?.user_claps ?? 0) + localClaps;
  const atMax = userClapsTotal >= MAX_USER_CLAPS;

  return (
    <>
    {/* Editorial end-mark — a quiet fleuron that closes the piece before engagement */}
    <div aria-hidden className="mt-12 flex items-center justify-center gap-3 text-fg-faint">
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-border" />
      <span className="text-base leading-none font-[family-name:var(--font-garamond)] text-accent/70">❦</span>
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-border" />
    </div>

    <div className="flex items-center gap-6 py-6 border-b border-border-subtle mt-4 mb-8 select-none">

      {/* Clap button */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          {/* +1 floaters */}
          {floats.map((k) => (
            <span
              key={k}
              className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-bold text-accent pointer-events-none animate-float-up"
            >
              +1
            </span>
          ))}
          {/* Confetti burst */}
          {confetti.map((p) => (
            <span
              key={p.id}
              aria-hidden
              className="confetti-particle pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                "--tx": p.tx,
                "--ty": p.ty,
                "--rot": p.rot,
                "--dur": p.dur,
                width:  p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.circle ? "50%" : "2px",
              } as React.CSSProperties}
            />
          ))}
          <button
            onClick={handleClap}
            disabled={atMax}
            title={atMax ? "You've given the maximum claps!" : "Clap for this post"}
            className={`
              relative w-12 h-12 rounded-full border-2 flex items-center justify-center
              transition-all duration-150
              ${atMax
                ? "border-border-strong bg-accent-light cursor-default opacity-60"
                : "border-border bg-surface hover:border-accent/50 hover:bg-accent-light cursor-pointer active:scale-90"
              }
              ${burst ? "scale-125 border-accent bg-accent-light" : "scale-100"}
            `}
          >
            <svg
              width="22" height="22"
              viewBox="0 0 24 24"
              fill={burst || atMax ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className={`transition-all duration-150 ${burst || atMax ? "text-accent" : "text-fg-muted"}`}
            >
              {/* Palm */}
              <path d="M8 13V7.5a1.5 1.5 0 0 1 3 0V12"/>
              {/* Index finger */}
              <path d="M11 11.5V6a1.5 1.5 0 0 1 3 0v5.5"/>
              {/* Middle finger */}
              <path d="M14 10.5V8a1.5 1.5 0 0 1 3 0v4.5"/>
              {/* Ring finger + wrist curve */}
              <path d="M17 12.5V10a1.5 1.5 0 0 1 2.5 1.1V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-1l-1-3.5a1.5 1.5 0 0 1 2.8-1L8 13"/>
            </svg>
          </button>
        </div>
        <span className="text-xs font-semibold text-fg-muted">
          {stats ? formatCount(stats.claps) : "—"}
        </span>
        <span className="text-[10px] text-fg-faint">claps</span>
        {userClapsTotal > 0 && (
          <span className="text-[10px] text-accent font-medium">
            You clapped {userClapsTotal}×
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-border-subtle" />

      {/* Views */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-fg-faint">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="text-sm font-semibold text-fg-muted">
            {stats ? formatCount(stats.views) : "—"}
          </span>
        </div>
        <span className="text-[10px] text-fg-faint pl-0.5">unique views</span>
      </div>

    </div>
    </>
  );
}
