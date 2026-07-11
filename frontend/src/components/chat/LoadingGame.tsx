"use client";

import { useEffect, useState } from "react";

const THOUGHTS = [
  "Retrieving context from knowledge base…",
  "Running HyDE query expansion…",
  "Fusing vector + BM25 results…",
  "Expanding via entity graph…",
  "Generating response with Gemini…",
];

export default function LoadingGame() {
  const [thoughtIdx, setThoughtIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setThoughtIdx((i) => (i + 1) % THOUGHTS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-2 animate-in fade-in duration-300">


      {/* Main thinking row */}
      <div className="flex justify-start gap-3">

        {/* Avatar with counter-rotating thinking rings */}
        <div className="flex-shrink-0 relative mt-0.5" style={{ width: 28, height: 28 }}>

          {/* Outer ring — clockwise, tracks the accent token */}
          <svg
            className="absolute animate-spin"
            style={{ top: -7, left: -7, width: 42, height: 42, animationDuration: "2.8s" }}
            viewBox="0 0 42 42"
            aria-hidden
          >
            <circle
              cx="21" cy="21" r="19"
              fill="none"
              style={{ stroke: "var(--accent)" }}
              strokeWidth="1.5"
              strokeDasharray="32 88"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>

          {/* Inner ring — counter-clockwise, green */}
          <svg
            className="absolute animate-spin-ccw"
            style={{ top: -4, left: -4, width: 36, height: 36 }}
            viewBox="0 0 36 36"
            aria-hidden
          >
            <circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="#4ade80"
              strokeWidth="1.5"
              strokeDasharray="14 80"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>

          {/* Pumpkin avatar */}
          <div className="relative z-10 w-7 h-7 rounded-full bg-accent flex items-center justify-center text-base select-none">
            🎃
          </div>
        </div>

        {/* Thinking bubble */}
        <div className="max-w-[80%] sm:max-w-[75%] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 shadow-sm">

          {/* EQ wave bars */}
          <div className="flex items-end gap-[3px] mb-2.5" style={{ height: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-indigo-400/60 animate-think-wave"
                style={{
                  height: 14,
                  animationDelay: `${i * 0.12}s`,
                  transformOrigin: "bottom",
                }}
              />
            ))}
          </div>

          {/* Cycling thought text */}
          <p
            key={thoughtIdx}
            className="text-sm text-fg-faint leading-snug animate-fade-up"
          >
            {THOUGHTS[thoughtIdx]}
          </p>
        </div>
      </div>

    </div>
  );
}
