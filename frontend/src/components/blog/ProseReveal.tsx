"use client";

import { useEffect, useRef } from "react";

const SELECTORS = [
  ":scope > h1", ":scope > h2", ":scope > h3", ":scope > h4",
  ":scope > p", ":scope > pre", ":scope > blockquote",
  ":scope > ul", ":scope > ol", ":scope > figure",
  ":scope > hr", ":scope > table", ":scope > div",
].join(", ");

export default function ProseReveal({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const targets = [...container.querySelectorAll<HTMLElement>(SELECTORS)];
    const vh = window.innerHeight;

    // Only hide elements that start below the fold — above-fold content stays
    // visible (SSR-rendered) with no flash.
    targets.forEach((el) => {
      if (el.getBoundingClientRect().top > vh * 0.9) {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
      }
      el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    });

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.unobserve(el);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );

    targets.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
