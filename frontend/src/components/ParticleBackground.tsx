"use client";

import { useEffect, useRef } from "react";

// Particle network — drifting nodes connected by fading lines.
// Rendered as position:absolute to fill its parent container.
// Parent must have position:relative (or absolute/fixed) and isolation:isolate.

const BASE_COUNT   = 58;   // nodes on ≥ sm screens
const MOBILE_COUNT = 28;   // nodes on xs
const CONNECT_DIST = 145;  // px — max distance that draws a connecting line
const SPEED        = 0.26; // px per frame (base)
const DOT_R        = 1.8;  // dot radius (logical px)

interface P { x: number; y: number; vx: number; vy: number }

export default function ParticleBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 639px)").matches) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1;
    let particles: P[] = [];
    let raf = 0;

    function resize() {
      // Use the canvas's own bounding rect — it fills the section via CSS
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width  = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      const count = w < 640 ? MOBILE_COUNT : BASE_COUNT;
      particles = Array.from({ length: count }, () => ({
        x:  Math.random() * w,
        y:  Math.random() * h,
        vx: (Math.random() - 0.5) * SPEED * 2,
        vy: (Math.random() - 0.5) * SPEED * 2,
      }));
    }

    function tick() {
      ctx!.clearRect(0, 0, w, h);

      const dark = document.documentElement.classList.contains("dark");
      const dotRgb        = dark ? "129,140,248" : "99,102,241";
      const dotBaseAlpha  = dark ? 0.55 : 0.25;
      const lineMaxAlpha  = dark ? 0.22 : 0.10;

      // Move + bounce
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0) { p.x = 0; p.vx =  Math.abs(p.vx); }
        if (p.x >= w) { p.x = w; p.vx = -Math.abs(p.vx); }
        if (p.y <= 0) { p.y = 0; p.vy =  Math.abs(p.vy); }
        if (p.y >= h) { p.y = h; p.vy = -Math.abs(p.vy); }
      }

      // Connection lines
      const cd2 = CONNECT_DIST * CONNECT_DIST;
      ctx!.lineWidth = 0.6;
      ctx!.strokeStyle = `rgb(${dotRgb})`;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < cd2) {
            const t = 1 - Math.sqrt(d2) / CONNECT_DIST;
            ctx!.globalAlpha = lineMaxAlpha * t * t;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      // Dots
      ctx!.fillStyle = `rgb(${dotRgb})`;
      ctx!.globalAlpha = dotBaseAlpha;
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, DOT_R, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    // ResizeObserver on the canvas itself — fires when the section height changes
    const ro = new ResizeObserver(() => {
      const prevW = w, prevH = h;
      resize();
      if (prevW > 0 && prevH > 0) {
        const sx = w / prevW, sy = h / prevH;
        for (const p of particles) {
          p.x = Math.min(Math.max(0, p.x * sx), w);
          p.y = Math.min(Math.max(0, p.y * sy), h);
        }
      }
    });

    resize();
    spawn();
    ro.observe(canvas);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="hidden sm:block"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: -20,
      }}
    />
  );
}
