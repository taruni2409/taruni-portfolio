"use client";

import { useEffect, useRef } from "react";

const LIFETIME  = 500;  // ms to fully fade
const THROTTLE  = 18;   // ms min between particle spawns
const COLORS    = ["99,102,241", "139,92,246", "167,139,250", "196,181,253"];

interface Particle {
  x: number; y: number;
  size: number; alpha: number;
  color: string; t: number;
}

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Desktop only — no cursor on touch devices
    if (window.matchMedia("(hover: none)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const section = canvas.parentElement;
    if (!section) return;

    // Keep canvas size in sync with the hero section
    const sync = () => {
      canvas.width  = section.offsetWidth;
      canvas.height = section.offsetHeight;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(section);

    const particles: Particle[] = [];
    let lastSpawn = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawn < THROTTLE) return;
      lastSpawn = now;

      const rect = canvas.getBoundingClientRect();
      particles.push({
        x:     e.clientX - rect.left,
        y:     e.clientY - rect.top,
        size:  2.5 + Math.random() * 3.5,
        alpha: 0.45 + Math.random() * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        t:     now,
      });
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Prune dead particles in place
      let write = 0;
      for (let i = 0; i < particles.length; i++) {
        if (now - particles[i].t < LIFETIME) particles[write++] = particles[i];
      }
      particles.length = write;

      for (const p of particles) {
        const progress = (now - p.t) / LIFETIME;
        const a = p.alpha * (1 - progress);
        const r = p.size  * (1 - progress * 0.45);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(r, 0.1), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${a.toFixed(3)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    section.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(draw);

    return () => {
      section.removeEventListener("mousemove", onMove);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
}
