"use client";

import { useEffect, useRef } from "react";

const nameStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), 'Helvetica Neue', Arial, sans-serif",
  fontSize: "clamp(4.25rem, 20vw, 14rem)",
  fontWeight: 800,
  lineHeight: 1.0,
  color: "var(--fg-subtle)",
  whiteSpace: "nowrap",
  paddingBottom: "0.08em",
};

const dotStyle: React.CSSProperties = {
  display: "inline-block",
  width: "clamp(0.5rem, 1.3vw, 1.1rem)",
  height: "clamp(0.5rem, 1.3vw, 1.1rem)",
  borderRadius: "50%",
  background: "var(--accent)",
  margin: "0 clamp(0.75rem, 2.4vw, 2.25rem)",
  flexShrink: 0,
};

/** One seamless-loop unit: the name repeated a few times, each trailed by an accent dot. */
function NameGroup({ name }: { name: string }) {
  return (
    <div className="flex items-center shrink-0" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center shrink-0">
          <span className="hero-name-word" style={nameStyle}>{name}</span>
          <span className="hero-name-dot" style={dotStyle} />
        </span>
      ))}
    </div>
  );
}

/**
 * Oversized hero wordmark — a heavy grotesque marquee that idles leftward and
 * reacts to page scroll: scrolling down pushes the name left faster, scrolling
 * up glides it right, then it eases back to the gentle idle drift. Driven by a
 * single rAF loop that owns the track transform; two tiled groups wrap modulo
 * one group width for a seamless loop. Honours prefers-reduced-motion.
 */
export default function HeroName({ name }: { name: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Tunables — restrained for a formal feel.
    const IDLE_VEL = -0.45;      // px/frame, idle leftward drift
    const SCROLL_FACTOR = 0.04;  // how much scroll velocity contributes
    const DECAY = 0.9;           // per-frame fade of scroll impulse → glide
    const SMOOTH = 0.15;         // velocity easing, absorbs scroll spikes
    const MAX_VEL = 14;          // px/frame clamp, never frantic

    const measureGroup = () =>
      (track.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;

    let groupWidth = measureGroup();
    let x = 0;
    let vel = 0;            // smoothed px/frame
    let scrollImpulse = 0;  // decaying accumulator of scroll deltas
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;

    const onResize = () => { groupWidth = measureGroup(); };
    window.addEventListener("resize", onResize);
    // Re-measure once webfonts settle (changes glyph widths).
    document.fonts?.ready.then(onResize).catch(() => {});

    const frame = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05); // s, clamp tab-switch gaps
      lastT = t;
      const f = dt * 60; // ~1 at 60fps → framerate independent

      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      scrollImpulse = scrollImpulse * DECAY + delta;

      // Scroll down (delta > 0) pushes left (more negative).
      const target = IDLE_VEL - scrollImpulse * SCROLL_FACTOR;
      vel += (target - vel) * SMOOTH;
      const v = Math.max(-MAX_VEL, Math.min(MAX_VEL, vel));

      x += v * f;
      if (groupWidth > 0) {
        x %= groupWidth;        // JS % keeps sign → x in (-gw, gw)
        if (x > 0) x -= groupWidth; // normalise into (-gw, 0]
      }
      track.style.transform = `translate3d(${x}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <h1
      className="hero-name-band w-full self-stretch overflow-hidden select-none m-0"
      aria-label={name}
    >
      <div ref={trackRef} className="hero-name-track flex items-center w-max">
        <NameGroup name={name} />
        <NameGroup name={name} />
      </div>
    </h1>
  );
}
