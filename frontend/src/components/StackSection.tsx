"use client";

import { useEffect, useRef } from "react";

const NAV_H = 50;

/*
 * Sticky card-stacking scroll with content scrubbing.
 *
 * Structure (siblings in page root — no wrapper so page is the containing block):
 *   <div h-0 sentinel>   — non-sticky, tracks true page scroll offset
 *   <section sticky>     — stacks via z-index; height = viewport - nav
 *     <div content>      — translateY driven by scroll (GPU, no reflow)
 *   <div spacer>         — height = content overflow; updated only on resize, not scroll
 *
 * Scroll handler only writes transform (paint-only, no layout).
 * Spacer height (layout) only updates on ResizeObserver / window resize.
 * Debounced resize prevents iOS address-bar height changes from causing layout jank.
 */
export default function StackSection({
  children,
  z,
  className = "",
  seamless = false,
  id,
}: {
  children: React.ReactNode;
  z: number;
  className?: string;
  seamless?: boolean;
  id?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef(0);

  const absTopRef = useRef(0); // sentinel's absolute offset from document top (cached)

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const content = contentRef.current;
    const spacer = spacerRef.current;
    if (!sentinel || !content || !spacer) return;

    // Only run the sticky-stack scrubbing on tablet/desktop. On mobile the
    // sections render as normal flow (via the `.stack-pin` CSS media query),
    // so we attach NO scroll work at all → fully native, buttery scroll.
    const mq = window.matchMedia("(min-width: 768px)");

    let ticking = false;
    let resizeTimer: ReturnType<typeof setTimeout>;
    let ro: ResizeObserver | null = null;
    let attached = false;

    // ── Layout pass — only on mount / content or window resize ─────────────
    // Caches the sentinel's absolute document offset so the scroll hot path
    // never needs getBoundingClientRect (no forced reflow per tick).
    function measure() {
      absTopRef.current = sentinel!.getBoundingClientRect().top + window.scrollY;
      const viewH = window.innerHeight - NAV_H;
      overflowRef.current = Math.max(0, content!.scrollHeight - viewH);
      spacer!.style.height = `${overflowRef.current}px`;
      updateTransform();
    }

    // ── Paint pass — reads only window.scrollY (no layout reflow) ──────────
    function updateTransform() {
      // rect.top === absTop - scrollY  ⇒  scrolledPast = NAV_H - rect.top
      const scrolledPast = NAV_H - (absTopRef.current - window.scrollY);
      const ov = overflowRef.current;
      const translateY = ov > 0 ? -Math.min(Math.max(0, scrolledPast), ov) : 0;
      content!.style.transform =
        translateY !== 0 ? `translateY(${translateY}px)` : "";
    }

    // rAF-batched scroll — transform writes at most once per frame
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateTransform();
        ticking = false;
      });
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 120);
    }

    function attach() {
      if (attached) return;
      attached = true;
      measure();
      ro = new ResizeObserver(measure);
      ro.observe(content!);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
    }

    function detach() {
      if (!attached) return;
      attached = false;
      clearTimeout(resizeTimer);
      ro?.disconnect();
      ro = null;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      content!.style.transform = ""; // reset scrub so mobile flow is clean
    }

    function sync() {
      if (mq.matches) attach();
      else detach();
    }

    sync();
    mq.addEventListener("change", sync);

    return () => {
      mq.removeEventListener("change", sync);
      detach();
    };
  }, []);

  return (
    <>
      {/* sentinel — plain div, never sticks, gives us the true scroll offset */}
      <div ref={sentinelRef} id={id} className="h-0 scroll-mt-[50px]" aria-hidden />
      <section
        className={`stack-pin sticky top-[50px] overflow-hidden bg-bg${seamless ? "" : " stack-sect"}`}
        style={{ height: "calc(100dvh - 50px)", zIndex: z }}
      >
        <div
          ref={contentRef}
          className={className}
          style={{ willChange: "transform" }}
        >
          {children}
        </div>
      </section>
      {/* spacer — grows to fill overflow, creating the scroll distance for content scrubbing */}
      <div ref={spacerRef} className="stack-spacer" />
    </>
  );
}
