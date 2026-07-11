"use client";

/*
 * Grid background — a faint blueprint grid that slowly drifts, crossed by two
 * perpendicular glowing scan-lines (one horizontal sweeping down, one vertical
 * sweeping across). Reads as a calm technical schematic in motion. All movement
 * is disabled under prefers-reduced-motion (CSS).
 */
export default function GridBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      {/* Drifting graph grid (masked to fade at the edges) */}
      <div className="grid-lines absolute inset-0" />

      {/* Horizontal scan-line — sweeps top → bottom */}
      <div className="grid-scan-h absolute left-0 right-0 h-px" />

      {/* Vertical scan-line — sweeps left → right */}
      <div className="grid-scan-v absolute top-0 bottom-0 w-px" />
    </div>
  );
}
