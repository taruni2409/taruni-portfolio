"use client";

import { useEffect, useState } from "react";
import type { HeroStat } from "@/data/profile";

const FALLBACK_STATS: HeroStat[] = [
  { value: 78,  suffix: "%",  label: "Latency Cut",      sub: "P99 RAG on 3K+ RPS" },
  { value: 3,   suffix: "K+", label: "Peak RPS",         sub: "99.9% uptime" },
  { value: 15,  suffix: "ms", label: "Edge Inference",   sub: "Snapdragon NPU" },
  { value: 115, suffix: "GB", label: "Daily Throughput", sub: "Zero data loss" },
];

export default function HeroStats({ stats, cols = 4 }: { stats?: HeroStat[]; cols?: 2 | 4 }) {
  const STATS = (stats && stats.length > 0) ? stats : FALLBACK_STATS;
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    // Hero is always above the fold — delay slightly so the page paint settles
    const delay = setTimeout(() => {
      const duration = 1100;
      const start = performance.now();

      function tick(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - t) ** 3; // ease-out cubic
        setCounts(STATS.map((s) => Math.round(s.value * eased)));
        if (t < 1) requestAnimationFrame(tick);
        else setCounts(STATS.map((s) => s.value));
      }

      requestAnimationFrame(tick);
    }, 380);

    return () => clearTimeout(delay);
  }, []);

  return (
    <div className={`grid gap-2 sm:gap-3 ${cols === 2 ? "grid-cols-2" : "grid-cols-4"}`}>
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className={`group relative rounded border bg-surface p-3 sm:p-4 overflow-hidden cursor-default select-none transition-all duration-300 ${
            hovered === i
              ? "border-border-strong shadow-sm"
              : "border-border hover:border-border-strong"
          }`}
        >
          {/* Hover glow */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-accent/4 via-transparent to-accent/2 transition-opacity duration-300"
            style={{ opacity: hovered === i ? 1 : 0 }}
          />

          {/* Number */}
          <p className="relative font-mono leading-none tabular-nums">
            <span className={`text-xl sm:text-2xl lg:text-[1.75rem] font-bold transition-colors duration-300 ${hovered === i ? "text-accent" : "text-fg"}`}>
              {counts[i]}
            </span>
            <span className={`text-sm sm:text-base font-bold transition-colors duration-300 ${hovered === i ? "text-accent" : "text-fg-subtle"}`}>
              {stat.suffix}
            </span>
          </p>

          {/* Label */}
          <p className="relative mt-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-fg-faint leading-tight">
            {stat.label}
          </p>

          {/* Sub — fades in on hover */}
          <p
            className="relative mt-0.5 text-[9px] leading-tight text-fg-faint/70 transition-all duration-200 overflow-hidden"
            style={{
              maxHeight: hovered === i ? "2rem" : "0px",
              opacity: hovered === i ? 1 : 0,
            }}
          >
            {stat.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
