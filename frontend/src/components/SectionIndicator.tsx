"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { id: "hero",         label: "Intro"      },
  { id: "about",        label: "About"      },
  { id: "projects",     label: "Projects"   },
  { id: "skills",       label: "Skills"     },
  { id: "contact",      label: "Connect"    },
];

export default function SectionIndicator() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [active,  setActive]  = useState("hero");
  const [visible, setVisible] = useState(false);

  // All hooks must run unconditionally — guard inside the effect
  useEffect(() => {
    if (!isHome) return;

    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { threshold: 0.35 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, [isHome]);

  // Guard render — after all hooks
  if (!isHome) return null;

  return (
    <nav
      aria-label="Page sections"
      className={`hidden xl:flex fixed right-7 top-1/2 -translate-y-1/2 z-40
                  flex-col items-end gap-3
                  transition-all duration-500 ease-out
                  ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}
    >
      {SECTIONS.map((s) => {
        const isActive = s.id === active;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-label={s.label}
            className="group flex items-center gap-2.5"
          >
            <span
              className={`text-[9px] font-semibold uppercase tracking-[0.18em]
                          transition-all duration-200
                          ${isActive
                            ? "opacity-60 text-fg translate-x-0"
                            : "opacity-0 text-fg-faint translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"
                          }`}
            >
              {s.label}
            </span>
            <span
              className={`rounded-full transition-all duration-300 ease-out
                          ${isActive
                            ? "w-5 h-1.5 bg-accent"
                            : "w-1.5 h-1.5 bg-border-strong hover:bg-fg-faint"
                          }`}
            />
          </a>
        );
      })}
    </nav>
  );
}
