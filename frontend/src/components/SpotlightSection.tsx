import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { spotlights, type Spotlight, type SpotlightCta } from "@/data/spotlights";

const isInternal = (url: string) => url.startsWith("/") && !url.startsWith("//");

/** CTA that renders a Next <Link> for internal paths and an external <a> otherwise. */
function PrimaryCta({ cta }: { cta: SpotlightCta }) {
  const cls =
    "group/cta inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-sm font-semibold text-bg transition-opacity duration-200 hover:opacity-80";
  const inner = (
    <>
      {cta.label}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className="transition-transform duration-200 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5">
        <path d="M7 17L17 7M17 7H7M17 7v10" />
      </svg>
    </>
  );
  return isInternal(cta.url) ? (
    <Link href={cta.url} className={cls}>{inner}</Link>
  ) : (
    <a href={cta.url} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  );
}

function SecondaryCta({ cta }: { cta: SpotlightCta }) {
  const cls =
    "group/j inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-fg transition-colors duration-200 hover:border-border-strong hover:bg-surface-raised";
  const inner = (
    <>
      {cta.label}
      <span className="text-fg-faint transition-transform duration-200 group-hover/j:translate-x-0.5">→</span>
    </>
  );
  return isInternal(cta.url) ? (
    <Link href={cta.url} className={cls}>{inner}</Link>
  ) : (
    <a href={cta.url} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  );
}

/**
 * One product-spotlight card — an advertising break for a live product Jaya
 * builds and runs. Distinct from the numbered chapters: it reads as a "this
 * person ships and scales real products" proof point for recruiters.
 */
function SpotlightCard({ s }: { s: Spotlight }) {
  return (
    <section className="relative">
      {/* Eyebrow — signals "this is different from a portfolio project" */}
      <div className="flex items-center gap-3 mb-8">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          {s.eyebrow}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" aria-hidden />
      </div>

      <ScrollReveal>
        <div className="group relative overflow-hidden rounded-3xl border border-border bg-surface">
          {/* Ambient brand glow */}
          <div aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl transition-opacity duration-500 group-hover:opacity-80" />
          <div aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

          <div className="relative grid gap-10 p-7 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            {/* ── Left: pitch ── */}
            <div>
              <div className="flex items-center gap-3.5">
                {s.logo && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-bg p-1.5">
                    <Image src={s.logo} alt={`${s.name} logo`} width={48} height={48} className="h-full w-full object-contain" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{s.name}</h2>
                  {s.subtitle && (
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">{s.subtitle}</p>
                  )}
                </div>
              </div>

              <p className="mt-6 text-lg font-light leading-relaxed text-fg-muted sm:text-xl text-balance">
                {s.headline}
                {s.headlineEmphasis && (
                  <> <span className="text-fg font-normal">{s.headlineEmphasis}</span></>
                )}
              </p>

              {s.description && (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-subtle">{s.description}</p>
              )}

              {(s.primaryCta || s.secondaryCta) && (
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {s.primaryCta && <PrimaryCta cta={s.primaryCta} />}
                  {s.secondaryCta && <SecondaryCta cta={s.secondaryCta} />}
                </div>
              )}

              {s.footnote && <p className="mt-3 text-[11px] text-fg-faint">{s.footnote}</p>}
            </div>

            {/* ── Right: credibility metrics ── */}
            {s.metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {s.metrics.map((m) => (
                  <div key={m.label}
                    className="rounded-2xl border border-border bg-bg/60 p-4 backdrop-blur-sm transition-colors group-hover:border-border-strong">
                    <p className="font-mono text-2xl font-bold tabular-nums text-fg sm:text-3xl">{m.value}</p>
                    <p className="mt-1 text-[11px] leading-tight text-fg-faint">{m.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

/**
 * Renders every enabled spotlight, stacked. Data-driven from spotlights.json
 * (managed in /admin → Spotlights). Returns null when none are enabled.
 */
export default function SpotlightSection() {
  const active = spotlights.filter((s) => s.enabled);
  if (active.length === 0) return null;
  return (
    <div className="space-y-16">
      {active.map((s) => (
        <SpotlightCard key={s.slug} s={s} />
      ))}
    </div>
  );
}
