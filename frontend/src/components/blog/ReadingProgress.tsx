"use client";

import { useEffect, useRef } from "react";

export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let docHeight = 0;
    let ticking = false;

    // Layout read — runs only on mount / resize / content-size change,
    // never on the scroll hot path (scrollHeight is a forced reflow).
    const measure = () => {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
      paint();
    };

    // Paint — reads only window.scrollY (no layout reflow). Clamped to
    // [0,1] so iOS rubber-band overscroll can't push the bar past full.
    const paint = () => {
      const pct = docHeight > 0
        ? Math.min(1, Math.max(0, window.scrollY / docHeight))
        : 0;
      bar.style.transform = `scaleX(${pct})`;
    };

    // rAF-batched scroll — at most one paint per animation frame.
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        paint();
        ticking = false;
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    // Recompute when the article height changes (images/fonts load, MDX hydrates)
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 pointer-events-none overflow-hidden">
      <div
        ref={barRef}
        className="h-full w-full bg-accent origin-left will-change-transform"
        style={{ transform: "scaleX(0)", transition: "transform 80ms linear" }}
      />
    </div>
  );
}
