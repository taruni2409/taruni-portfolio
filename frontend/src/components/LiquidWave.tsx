export default function LiquidWave({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`lw-svg pointer-events-none absolute bottom-0 left-1/2 w-full min-w-[680px] -translate-x-1/2 ${className}`}
      style={{ height: "clamp(110px, 22vh, 220px)", zIndex: 0 }}
      viewBox="0 0 1440 180"
      preserveAspectRatio="none"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Front wave — paths extend past the viewBox so no edge walls appear */}
      <path
        className="lw-path"
        fill="currentColor"
        opacity="0.35"
        d="M -80,85 C 360,15 1080,158 1520,60 L 1520,200 L -80,200 Z"
      />
      {/* Back wave — offset phase for depth */}
      <path
        className="lw-path"
        fill="currentColor"
        opacity="0.15"
        style={{ animationDelay: "-8s", animationDuration: "28s" }}
        d="M -80,112 C 300,45 1140,168 1520,88 L 1520,200 L -80,200 Z"
      />
    </svg>
  );
}
