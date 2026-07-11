"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Direction = "up" | "right" | "left" | "scale";

const INITIAL: Record<Direction, string> = {
  up:    "translateY(18px)",
  right: "translateX(-20px)",
  left:  "translateX(20px)",
  scale: "scale(0.96) translateY(8px)",
};

export default function ScrollReveal({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: Direction;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";
    el.style.transform = INITIAL[direction];
    el.style.filter = "blur(6px)";
    el.style.transition =
      "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s cubic-bezier(0.16,1,0.3,1)";
    el.style.willChange = "opacity, transform, filter";

    const reveal = () => {
      el.style.opacity = "1";
      el.style.transform = direction === "scale" ? "scale(1) translateY(0)" : "translate(0)";
      el.style.filter = "blur(0px)";
      el.style.willChange = "auto";
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (delay > 0) {
          setTimeout(reveal, delay);
        } else {
          requestAnimationFrame(() => requestAnimationFrame(reveal));
        }
        observer.unobserve(el);
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
