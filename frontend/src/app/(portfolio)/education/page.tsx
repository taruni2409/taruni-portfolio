import { education } from "@/data/education";
import { profile } from "@/data/profile";

export const metadata = {
  title: "Education",
  description:
    "M.Sc. Data Science, University of Hertfordshire. Academic foundation in data engineering, machine learning, and software engineering.",
  alternates: { canonical: "https://jayaremala.com/education" },
  openGraph: {
    type: "website" as const,
    url: "https://jayaremala.com/education",
    title: "Education — Taruni Nallamothu",
    description: "University of Hertfordshire — Data Science. Academic foundation in data engineering and machine learning.",
  },
};

export default function EducationPage() {
  const primaryEdu   = education[0];
  const primaryGPA   = primaryEdu?.gpa;
  const gradYear     = primaryEdu?.end?.split(" ").pop() ?? "";

  return (
    <div className="mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 xl:px-8 py-12 sm:py-16">

      {/* Header */}
      <header className="mb-12 sm:mb-16 relative">
        {/* Decorative bloom */}
        <div
          className="absolute -top-8 -right-8 w-72 h-72 rounded-full blur-3xl pointer-events-none -z-10"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 60%, transparent 100%)" }}
          aria-hidden
        />

        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">Background · Academia</p>

        {/* Title with gradient glyph */}
        <div className="flex items-baseline gap-4 mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-fg">Education</h1>
          <span
            className="text-2xl sm:text-3xl select-none"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            aria-hidden
          >
            ✺
          </span>
        </div>

        {profile.page_education && (
          <p className="text-sm text-fg-subtle max-w-xl leading-relaxed mb-4">
            {profile.page_education}
          </p>
        )}

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {primaryGPA && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              GPA {primaryGPA}
            </span>
          )}
          {gradYear && (
            <span className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
              Class of {gradYear}
            </span>
          )}
          <span className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1">
            {education.length} institution{education.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-0 top-3 bottom-3 w-px bg-gradient-to-b from-amber-300 dark:from-amber-700 to-border" />

        <div className="space-y-10">
          {education.map((edu, i) => (
            <div key={i} className="pl-8 sm:pl-10 relative">
              {/* Timeline dot */}
              <div className="flex absolute left-0 top-3 -translate-x-1/2 w-3 h-3 rotate-45 bg-surface border-2 border-amber-400 dark:border-amber-500 ring-2 ring-amber-100 dark:ring-amber-900" />

              <div className="group relative rounded-card border border-border bg-surface p-6 sm:p-7 hover:border-border-strong transition-all overflow-hidden card-lift">
                {/* Hover sweep */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                {/* Corner bracket accents */}
                <svg className="absolute top-2.5 left-2.5 text-border/50 group-hover:text-amber-400/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M9 1 L1 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg className="absolute bottom-2.5 right-2.5 text-border/50 group-hover:text-amber-400/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M1 9 L9 9 L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Top row: institution + period */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                  <div>
                    <h2 className="text-base font-bold text-fg leading-tight">
                      {edu.institution}
                    </h2>
                    <p className="text-xs text-fg-faint mt-0.5">{edu.school}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="rounded-full border border-border px-3 py-0.5 text-[11px] font-medium text-fg-muted whitespace-nowrap">
                      {edu.start} – {edu.end}
                    </span>
                    {edu.gpa && (
                      <span className="rounded-sm bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        GPA {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>

                {/* Degree + location row */}
                <div className="flex flex-wrap items-center gap-3 mt-3 mb-1">
                  <p className="text-sm font-semibold text-accent">
                    {edu.degree} — {edu.field}
                  </p>
                  <span className="flex items-center gap-1 text-[11px] text-fg-faint">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {edu.location}
                  </span>
                </div>

                {/* Highlights */}
                {edu.highlights && edu.highlights.length > 0 && (
                  <ul className="mt-4 space-y-2.5 border-t border-border-subtle pt-4">
                    {edu.highlights.map((h, j) => {
                      const isAward = h.toLowerCase().includes("award") || h.toLowerCase().includes("outstanding") || h.toLowerCase().includes("winner");
                      return (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-fg-muted leading-relaxed">
                          <span className={`mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full ${isAward ? "bg-amber-400" : "bg-border-strong"}`} />
                          <span>{isAward ? <span className="font-medium text-fg">{h}</span> : h}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
