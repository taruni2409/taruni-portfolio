import { experience } from "@/data/experience";
import { profile } from "@/data/profile";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata = {
  title: "Experience",
  description:
    "3+ years building production AI and distributed systems — NYU High-Speed Research Network, Shell PLC, Wipro. From maritime telemetry at 115 GB/day to 3 K+ RPS RAG pipelines.",
  alternates: { canonical: "https://taruni-portfolio.vercel.app/experience" },
  openGraph: {
    type: "website" as const,
    url: "https://taruni-portfolio.vercel.app/experience",
    title: "Experience — Taruni Nallamothu",
    description: "Career timeline: NYU IT, Shell PLC, Wipro — production AI and distributed systems at scale.",
  },
};

export default function ExperiencePage() {
  const uniqueCompanies = new Set(experience.map((e) => e.company)).size;
  const isActive = experience.some((e) => e.end === "Present");

  return (
    <div className="mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 xl:px-8 py-12 sm:py-16">

      {/* Header */}
      <header className="mb-12 sm:mb-16 relative">
        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">Career · Timeline</p>

        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-fg">Experience</h1>
          <span className="text-2xl sm:text-3xl select-none text-fg-faint" aria-hidden>◈</span>
        </div>

        {profile.page_experience && (
          <p className="text-sm text-fg-subtle max-w-xl leading-relaxed mb-4">
            {profile.page_experience}
          </p>
        )}

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {isActive && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Currently active
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent bg-accent-light border border-border rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {experience.length} roles
          </span>
          <span className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
            {uniqueCompanies} companies
          </span>
        </div>
      </header>

      {/* Timeline */}
      <ol className="relative space-y-0">
        {experience.map((job, i) => (
          <li key={i} className="relative pl-8 pb-12 last:pb-0">
            {/* Timeline line — gradient fades toward bottom */}
            {i < experience.length - 1 && (
              <div className="absolute left-[10px] top-5 bottom-0 w-px bg-gradient-to-b from-border-strong to-border" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-0 top-1 h-[22px] w-[22px] rounded-full bg-accent ring-2 ring-border flex items-center justify-center">
              <div className="w-1.5 h-1.5 rotate-45 bg-accent-fg" />
            </div>

            <ScrollReveal delay={Math.min(i * 70, 280)} className="w-full">
              <div className="group relative rounded-card border border-border bg-surface p-5 sm:p-6 hover:border-border-strong transition-all overflow-hidden card-lift">
                {/* Hover sweep */}
                <div className="absolute inset-x-0 top-0 h-px bg-fg/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                {/* Corner bracket accents */}
                <svg className="absolute top-2.5 left-2.5 text-border/50 group-hover:text-accent/30 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M9 1 L1 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg className="absolute bottom-2.5 right-2.5 text-border/50 group-hover:text-accent/30 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M1 9 L9 9 L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-base font-bold text-fg leading-tight">{job.role}</h2>
                    <p className="text-sm font-medium text-accent">{job.company}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block rounded-full border border-border px-3 py-0.5 text-[11px] font-medium text-fg-muted">
                      {job.start} – {job.end}
                    </span>
                    <p className="text-[11px] text-fg-faint mt-0.5">{job.location}</p>
                  </div>
                </div>

                {job.tech && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {job.tech.split(", ").map((t) => (
                      <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-fg-subtle tracking-wide">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <ul className="space-y-2.5">
                  {job.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2.5 text-sm text-fg-muted leading-relaxed">
                      <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-border-strong" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
