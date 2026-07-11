"use client";

import { useEffect, useRef } from "react";

const SECTIONS = ["hero", "about", "projects", "skills", "contact"];

// Each section gets a subtle radial gradient at a different anchor point + hue
const GRADIENTS: Record<string, string> = {
  hero:         "radial-gradient(ellipse 80% 55% at 60% 0%,   rgba(99,102,241,0.09) 0%, transparent 65%)",
  about:        "radial-gradient(ellipse 70% 55% at 20% 35%,  rgba(59,130,246,0.07)  0%, transparent 65%)",
  projects:     "radial-gradient(ellipse 75% 55% at 80% 40%,  rgba(139,92,246,0.08)  0%, transparent 65%)",
  skills:       "radial-gradient(ellipse 70% 50% at 50% 55%,  rgba(168,85,247,0.07)  0%, transparent 65%)",
  contact:      "radial-gradient(ellipse 70% 60% at 50% 80%,  rgba(16,185,129,0.07)  0%, transparent 65%)",
};

export default function ScrollAtmosphere() {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const grad = GRADIENTS[entry.target.id] ?? GRADIENTS.hero;
            el.style.background = grad;
          }
        }
      },
      { threshold: 0.25 }
    );

    SECTIONS.forEach((id) => {
      const section = document.getElementById(id);
      if (section) obs.observe(section);
    });

    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={divRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: GRADIENTS.hero,
        transition: "background 1.4s cubic-bezier(0.16,1,0.3,1)",
      }}
    />
  );
}
