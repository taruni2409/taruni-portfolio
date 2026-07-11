import type { Period } from "./types";

const OPTIONS: { value: Period; label: string }[] = [
  { value: "day", label: "24h" },
  { value: "week", label: "7d" },
  { value: "month", label: "30d" },
  { value: "all", label: "All" },
];

export default function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="Time range">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md px-3 py-1 text-[11px] font-medium tabular-nums transition-colors ${
            value === o.value
              ? "bg-accent text-white"
              : "text-fg-faint hover:text-fg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
