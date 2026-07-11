export function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function StatCard({
  label, value, sub, color = "default",
}: { label: string; value: string | number; sub?: string; color?: "default" | "emerald" | "rose" | "indigo" }) {
  const accent = {
    default: "text-fg",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
  }[color];
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${accent}`}>{typeof value === "number" ? fmt(value) : value}</p>
      {sub && <p className="text-[10px] text-fg-faint leading-snug">{sub}</p>}
    </div>
  );
}
