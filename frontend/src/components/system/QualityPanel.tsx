import type { SystemData } from "./types";
import Stat, { SectionTitle } from "./Stat";

// Answer quality: satisfaction, visitor experience rating, retrieval relevance.
export default function QualityPanel({ data }: { data: SystemData }) {
  const q = data.quality;
  const exp = q.experience;
  const maxRating = Math.max(...Object.values(exp.distribution), 1);

  return (
    <section className="space-y-4">
      <SectionTitle>Answer quality</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Satisfaction"
          value={`${q.satisfaction_pct}%`}
          sub="rated helpful"
          tone={q.satisfaction_pct >= 70 ? "good" : "default"}
        />
        <Stat
          label="Experience"
          value={exp.total > 0 ? `${exp.average.toFixed(1)}★` : "—"}
          sub={`${exp.total} ratings`}
        />
        <Stat label="Retrieval score" value={q.avg_top_score.toFixed(3)} sub="avg top match" />
        <Stat
          label="Grounded"
          value={`${q.grounded_pct}%`}
          sub="answers w/ context"
          tone={q.grounded_pct >= 70 ? "good" : "default"}
        />
      </div>

      {exp.total > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-faint mb-2">
            Experience rating distribution
          </p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = exp.distribution[String(star)] ?? 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-[11px] tabular-nums text-fg-faint">{star}★</span>
                  <div className="h-2 flex-1 rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(count ? 4 : 0, (count / maxRating) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-fg-faint">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
