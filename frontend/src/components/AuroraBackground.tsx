"use client";

// Light mode: warm gradient mesh — microsoft.ai-inspired
// Soft peach, lavender, amber, rose, sage at low opacity
const LIGHT = [
  { cls: "aurora-1", bg: "rgba(251,146,60,0.24)",  w: 800, h: 620, top: "-22%", left: "-16%" },
  { cls: "aurora-2", bg: "rgba(196,163,255,0.24)",  w: 680, h: 540, top: "-10%", left: "50%"  },
  { cls: "aurora-3", bg: "rgba(251,191,36,0.18)",   w: 580, h: 480, top: "50%",  left: "25%"  },
  { cls: "aurora-4", bg: "rgba(244,114,182,0.20)",  w: 540, h: 460, top: "26%",  left: "64%"  },
  { cls: "aurora-5", bg: "rgba(52,211,153,0.14)",   w: 500, h: 420, top: "58%",  left: "-8%"  },
] as const;

// Dark mode: cooler indigo/violet palette
const DARK = [
  { cls: "aurora-1", bg: "rgba(99,102,241,0.30)",  w: 720, h: 580, top: "-18%", left: "-12%" },
  { cls: "aurora-2", bg: "rgba(139,92,246,0.26)",  w: 620, h: 520, top: "4%",   left: "52%"  },
  { cls: "aurora-3", bg: "rgba(56,189,248,0.20)",  w: 540, h: 460, top: "48%",  left: "12%"  },
  { cls: "aurora-4", bg: "rgba(168,85,247,0.22)",  w: 560, h: 480, top: "36%",  left: "60%"  },
] as const;

type BlobProps = { cls: string; bg: string; w: number; h: number; top: string; left: string };

function Blob({ cls, bg, w, h, top, left }: BlobProps) {
  return (
    <div
      className={cls}
      style={{
        position: "absolute",
        top, left,
        width: w,
        height: h,
        borderRadius: "9999px",
        background: `radial-gradient(ellipse at center, ${bg} 0%, transparent 70%)`,
        filter: "blur(80px)",
        willChange: "transform",
      }}
    />
  );
}

export default function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">

      {/* Light mode — warm gradient mesh */}
      <div className="dark:hidden absolute inset-0">
        {LIGHT.map((f, i) => <Blob key={i} {...f} />)}
      </div>

      {/* Dark mode — cool gradient mesh */}
      <div className="hidden dark:block absolute inset-0">
        {DARK.map((f, i) => <Blob key={i} {...f} />)}
      </div>

      {/* Fine grain — kills gradient banding on large blobs */}
      <div
        className="absolute inset-0 opacity-[0.018] dark:opacity-[0.030] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
