// Shared stat card used across the /system panels.
export default function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const valueTone =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-rose-600 dark:text-rose-400"
          : "text-fg";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-faint">{label}</p>
      <p className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-fg-faint">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-fg-faint mb-3">{children}</h2>
  );
}
