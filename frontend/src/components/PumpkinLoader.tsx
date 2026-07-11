"use client";

const BOOT_LINES = [
  { tag: "rag", label: "knowledge base",   status: "OK",    statusCls: "text-green-500 dark:text-green-400"  },
  { tag: "vec", label: "bge-base · ONNX",  status: "OK",    statusCls: "text-green-500 dark:text-green-400"  },
  { tag: "llm", label: "gemini-2.5-flash", status: "LIVE",  statusCls: "text-indigo-500 dark:text-indigo-400" },
  { tag: "sys", label: "pumpkin online",   status: "✦ ready", statusCls: "text-emerald-500 dark:text-emerald-400" },
];

export default function PumpkinLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-8 select-none ${
        fullScreen ? "fixed inset-0 z-50 bg-bg" : "min-h-[50vh]"
      }`}
    >
      {/* Glowing pumpkin glyph */}
      <div
        className="animate-fade-up text-5xl"
        style={{ animationFillMode: "both", filter: "drop-shadow(0 0 18px rgba(251,146,60,0.45))" }}
      >
        🎃
      </div>

      {/* Terminal boot sequence */}
      <div className="w-64 space-y-2 font-mono text-[11px] sm:text-xs">
        {BOOT_LINES.map((line, i) => (
          <div
            key={line.tag}
            className="flex items-center gap-2 animate-fade-up"
            style={{ animationDelay: `${i * 260}ms`, animationFillMode: "both" }}
          >
            <span className="shrink-0 text-fg-faint">[{line.tag}]</span>
            <span className="flex-1 text-fg-subtle">{line.label}</span>
            {/* dot leader */}
            <span className="mx-1 text-border">········</span>
            <span className={`shrink-0 font-semibold tabular-nums ${line.statusCls}`}>{line.status}</span>
          </div>
        ))}

        {/* Blinking cursor on last line */}
        <div
          className="animate-fade-up flex items-center gap-1 pt-1"
          style={{ animationDelay: `${BOOT_LINES.length * 260}ms`, animationFillMode: "both" }}
        >
          <span className="text-fg-faint">{">"}</span>
          <span className="h-3.5 w-px bg-indigo-400 cursor-blink" />
        </div>
      </div>
    </div>
  );
}
