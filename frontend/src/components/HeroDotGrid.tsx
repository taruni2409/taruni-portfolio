"use client";

import { useRef, useEffect } from "react";

const GRID   = 24;   // px between dots — matches hero-dot-pattern CSS
const RADIUS = 1.5;  // dot radius px
const GLOW   = 80;   // mouse influence radius px

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    fg:     style.getPropertyValue("--border-strong").trim() || "#d4d4d4",
    accent: style.getPropertyValue("--accent").trim()        || "#4f46e5",
  };
}

type Dot = { x: number; y: number };

export default function HeroDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef   = useRef<Dot[]>([]);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;

    function buildDots() {
      dotsRef.current = [];
      const cols = Math.ceil(w / GRID) + 1;
      const rows = Math.ceil(h / GRID) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dotsRef.current.push({ x: c * GRID, y: r * GRID });
        }
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const { fg, accent } = getThemeColors();
      const { x: mx, y: my } = mouseRef.current;

      for (const { x, y } of dotsRef.current) {
        const d = Math.hypot(x - mx, y - my);

        ctx!.beginPath();
        ctx!.arc(x, y, RADIUS, 0, Math.PI * 2);

        if (d < GLOW) {
          const t = 1 - d / GLOW;
          ctx!.fillStyle   = accent;
          ctx!.globalAlpha = 0.15 + t * 0.75;
        } else {
          ctx!.fillStyle   = fg;
          ctx!.globalAlpha = 0.5;
        }

        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
    }

    function resize() {
      const dpr  = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width  = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
      draw();
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x    = e.clientX - rect.left;
      const y    = e.clientY - rect.top;
      mouseRef.current =
        x >= 0 && x <= rect.width && y >= 0 && y <= rect.height
          ? { x, y }
          : { x: -9999, y: -9999 };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }

    function onLeave() {
      mouseRef.current = { x: -9999, y: -9999 };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }

    const mo = new MutationObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    window.addEventListener("mousemove", onMove,  { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      mo.disconnect();
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
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
