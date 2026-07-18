"use client";

import { useEffect, useRef } from "react";

// Flowing data particles — dots drifting left-to-right along gentle sine-wave
// paths, no connecting lines. Reads as data streaming through a pipeline
// rather than a network/graph.

const BASE_COUNT   = 40;
const MOBILE_COUNT = 18;
const SPEED        = 0.35;
const R_MIN        = 1.2;
const R_MAX        = 2.6;

interface Particle {
  x: number;
  baseY: number;
  speed: number;
  amp: number;
  freq: number;
  phase: number;
  r: number;
  alpha: number;
}

export default function HeroDataFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let accent = "#4f46e5";

    function readAccent() {
      accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4f46e5";
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width  = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      const count = w < 640 ? MOBILE_COUNT : BASE_COUNT;
      particles = Array.from({ length: count }, () => ({
        x:      Math.random() * w,
        baseY:  Math.random() * h,
        speed:  SPEED * (0.6 + Math.random() * 0.8),
        amp:    10 + Math.random() * 24,
        freq:   0.004 + Math.random() * 0.006,
        phase:  Math.random() * Math.PI * 2,
        r:      R_MIN + Math.random() * (R_MAX - R_MIN),
        alpha:  0.08 + Math.random() * 0.14,
      }));
    }

    function tick() {
      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = accent;

      for (const p of particles) {
        p.x += p.speed;
        if (p.x > w + 20) p.x = -20;
        const y = p.baseY + Math.sin(p.x * p.freq + p.phase) * p.amp;

        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath();
        ctx!.arc(p.x, y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      raf = requestAnimationFrame(tick);
    }

    const mo = new MutationObserver(readAccent);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const ro = new ResizeObserver(() => {
      resize();
      spawn();
    });

    readAccent();
    resize();
    spawn();
    ro.observe(canvas);
    raf = requestAnimationFrame(tick);

    return () => {
      mo.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
