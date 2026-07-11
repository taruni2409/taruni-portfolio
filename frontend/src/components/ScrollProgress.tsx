"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Thin scroll-progress bar pinned to the very top. Writes transform directly (no React
 *  re-render) for smoothness. Hidden on individual blog/lab posts, where the dedicated
 *  ReadingProgress bar already runs. */
export default function ScrollProgress() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const onPost = /^\/(blog|lab)\/.+/.test(pathname);

  useEffect(() => {
    if (onPost) return;
    const bar = ref.current;
    if (!bar) return;
    let raf = 0;
    const render = () => {
      raf = 0;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(render); // throttle to one write per frame
    };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [onPost]);

  if (onPost) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-accent"
      style={{ transform: "scaleX(0)", willChange: "transform", backfaceVisibility: "hidden" }}
    />
  );
}
