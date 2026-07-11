"use client";

import Link from "next/link";
import type { ReactNode, MouseEventHandler } from "react";

/**
 * Tile — the site's card canon as a reusable primitive.
 *
 * Encapsulates the recipe copy-pasted across the portfolio cards:
 *   rounded-card + border + bg-surface + (card-lift when interactive)
 *   + optional animated gradient sweep bar + optional corner-bracket motif.
 *
 * Renders as a <div> (static), <button> (onClick), <Link> (internal href),
 * or <a> (external href). Elevation comes from the `card-lift` class — there
 * is intentionally no `shadow-card` utility.
 */
export type TileProps = {
  children: ReactNode;
  className?: string;
  /** Tailwind gradient endpoints for the top sweep bar, e.g. "from-blue-500 to-cyan-500". */
  sweep?: string;
  /** Show the geometric corner-bracket accents. */
  brackets?: boolean;
  /** Force interactive styling (card-lift + hover). Defaults to true when onClick/href is set. */
  interactive?: boolean;
  onClick?: MouseEventHandler;
  href?: string;
  external?: boolean;
  ariaLabel?: string;
  title?: string;
};

const BASE = "group relative rounded-card border border-border bg-surface overflow-hidden";

function Brackets() {
  return (
    <>
      <svg
        className="absolute top-2.5 left-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none"
        width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden
      >
        <path d="M9 1 L1 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg
        className="absolute bottom-2.5 right-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none"
        width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden
      >
        <path d="M1 9 L9 9 L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
}

export default function Tile({
  children,
  className = "",
  sweep,
  brackets,
  interactive,
  onClick,
  href,
  external,
  ariaLabel,
  title,
}: TileProps) {
  const isInteractive = interactive ?? (!!onClick || !!href);
  const cls = `${BASE} ${isInteractive ? "card-lift hover:border-border-strong text-left" : ""} ${className}`;

  const inner = (
    <>
      {sweep && (
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${sweep} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
        />
      )}
      {brackets && <Brackets />}
      {children}
    </>
  );

  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} title={title} className={cls}>
        {inner}
      </a>
    ) : (
      <Link href={href} aria-label={ariaLabel} title={title} className={cls}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} title={title} className={cls}>
        {inner}
      </button>
    );
  }

  return (
    <div className={cls} aria-label={ariaLabel} title={title}>
      {inner}
    </div>
  );
}
