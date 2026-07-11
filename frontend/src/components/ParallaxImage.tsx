"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle parallax for card cover images. The image is scaled up slightly so it can
 * translate within an overflow-hidden box without revealing edges. rAF-throttled and
 * disabled under prefers-reduced-motion. Use inside a fixed-aspect, overflow-hidden box.
 */
export default function ParallaxImage({
  src,
  alt = "",
  className = "",
  intensity = 10,
}: {
  src: string;
  alt?: string;
  className?: string;
  intensity?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -80 || r.top > vh + 80) return; // off-screen, skip
      const prog = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1..1
      img.style.transform = `translate3d(0, ${(prog * intensity).toFixed(1)}px, 0) scale(1.16)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return (
    <div ref={wrapRef} className={`overflow-hidden ${className}`}>
      {/* Static export + images.unoptimized — plain img is intentional. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
        style={{ transform: "scale(1.16)", willChange: "transform" }}
      />
    </div>
  );
}
