import Link from "next/link";
import Image from "next/image";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { skills } from "@/data/skills";
import { quotes } from "@/data/quotes";
import { getAllPosts } from "@/lib/blog";
import ContactForm from "@/components/ContactForm";
import ScrollReveal from "@/components/ScrollReveal";
import HeroName from "@/components/HeroName";
import HeroStats from "@/components/HeroStats";
import Parallax from "@/components/Parallax";
import RagPipelineCard from "@/components/RagPipelineCard";
import StackSection from "@/components/StackSection";
import SkillsSection from "@/components/SkillsSection";
import SkillsConstellation from "@/components/SkillsConstellation";
import MobileNoBg from "@/components/MobileNoBg";
import HeroDotGrid from "@/components/HeroDotGrid";
import HeroDataFlow from "@/components/HeroDataFlow";
import SiteVitals from "@/components/SiteVitals";
import InstallPWA from "@/components/InstallPWA";
import SparkleIcon from "@/components/SparkleIcon";
import { experience } from "@/data/experience";

export const metadata = {
  title: "Taruni Nallamothu — Data Engineer & ML Engineer",
  description:
    "Data Engineer & Machine Learning Engineer specializing in scalable ETL pipelines, predictive modelling, and cloud analytics on Azure and GCP. Google & Microsoft Certified. Previously at Tata Consultancy Services (Shell PLC).",
  alternates: { canonical: "https://jayaremala.com/" },
  openGraph: {
    type: "website",
    url: "https://jayaremala.com/",
    title: "Taruni Nallamothu — Data Engineer & ML Engineer",
    description:
      "Data Engineer & Machine Learning Engineer specializing in scalable ETL pipelines, predictive modelling, and cloud analytics on Azure and GCP. Google & Microsoft Certified.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Taruni Nallamothu",
  url: "https://jayaremala.com",
  jobTitle: "Data Engineer & Machine Learning Engineer",
  description:
    "Data Engineer & Machine Learning Engineer specializing in scalable ETL pipelines, predictive modelling, and cloud analytics on Azure and GCP. Google & Microsoft Certified.",
  email: "taruninallamothu24@gmail.com",
  sameAs: [
    "https://www.linkedin.com/in/taruninallamothu24/",
    "https://github.com/taruni2409",
    "https://jayaremala.com",
  ],
  alumniOf: {
    "@type": "EducationalOrganization",
    name: "University of Hertfordshire",
  },
  knowsAbout: [
    "Data Engineering", "Machine Learning", "ETL Pipelines", "Python",
    "SQL", "Microsoft Azure", "Google Cloud Platform", "Power BI",
    "Predictive Modelling", "Anomaly Detection",
  ],
  address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
};

/** Shared inner-content constraint */
function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] px-4 sm:px-6 xl:px-8 ${className}`}>
      {children}
    </div>
  );
}

/** Wrap standalone numbers (optionally with unit suffix) in mono-bold spans */
function HighlightNumbers({ text }: { text: string }) {
  const parts = text.split(/(\d+(?:\.\d+)?(?:%|ms|GB|TB|MB|K\+?|M\+?|x|\+)?)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\d/.test(part) ? (
          <span key={i} className="font-mono font-bold text-fg">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
}


const EXPLORE_PAGES = [
  {
    href: "/experience",
    label: "Experience",
    desc: "Work history & roles",
    accent: "from-blue-500 to-cyan-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
  },
  {
    href: "/education",
    label: "Education",
    desc: "Degrees & institutions",
    accent: "from-violet-500 to-purple-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    desc: "What I've shipped",
    accent: "from-emerald-500 to-teal-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    href: "/lab",
    label: "Lab",
    desc: "Building in public",
    accent: "from-rose-500 to-pink-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4m-6 0h6"/>
      </svg>
    ),
  },
  {
    href: "/blog",
    label: "Blog",
    desc: "Notes & deep dives",
    accent: "from-amber-500 to-yellow-400",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    href: "/gallery",
    label: "Gallery",
    desc: "Moments & visuals",
    accent: "from-indigo-500 to-blue-400",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>
      </svg>
    ),
  },
  {
    href: "/quotes",
    label: "Quotes",
    desc: "Lines that stuck",
    accent: "from-fuchsia-500 to-violet-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/>
      </svg>
    ),
  },
  {
    href: "/now",
    label: "Now",
    desc: "What I'm up to",
    accent: "from-cyan-500 to-sky-400",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
] as const;

/** Find the most relevant experience entry for a company chip name */
function findExp(chipName: string) {
  const n = chipName.toLowerCase().trim();
  return experience.find(
    (e) => e.company.toLowerCase().includes(n.split(" ")[0]) || n.includes(e.company.toLowerCase().split(" ")[0])
  );
}

export default function PortfolioHome() {
  const featured = projects.filter((p) => p.featured);
  const latestPost = getAllPosts()[0] ?? null;
  const latestQuote = quotes.find((q) => q.featured) ?? [...quotes].sort((a, b) => b.addedAt.localeCompare(a.addedAt))[0] ?? null;

  return (
    <div className="w-full">
      <MobileNoBg />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── 1 · Hero — full-viewport, scrolls away naturally ──────── */}
      <section id="hero" className="relative overflow-x-clip scroll-mt-[50px] hero-section-bg sm:min-h-[calc(100dvh-50px)] flex flex-col">

        {/* ── Hero background — interactive dot grid with subtle scroll parallax ── */}
        <Parallax speed={0.18} className="pointer-events-none absolute inset-0">
          <div aria-hidden className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-accent/[0.05] via-transparent to-transparent" />
          <HeroDataFlow />
          <HeroDotGrid />
        </Parallax>

        {/* ── Editorial cover — meta intro on top, oversized scrolling name anchored bottom ── */}
        <div className="relative z-[1] flex-1 flex flex-col">

          {/* ── Top — editorial intro, left-aligned ── */}
          <Inner className="pt-8 sm:pt-14">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-8 sm:gap-10">
            <div className="flex flex-col gap-5 sm:gap-7 min-w-0 flex-1">

              {/* Status badge — eyebrow */}
              {(() => {
                const avail = profile.availability;
                const isOpen = avail?.open ?? true;
                const label = avail?.label ?? "Open to opportunities";
                const parts = avail
                  ? [...(avail.types ?? []), ...(avail.locations ?? [])]
                  : [profile.location];
                const chipText = parts.length > 0 ? `${label} · ${parts.join(" · ")}` : label;
                return (
                  <div className="animate-fade-up flex items-center gap-2" style={{ animationDelay: "0ms" }}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isOpen ? "bg-green-500 animate-pulse" : "bg-zinc-400 dark:bg-zinc-500"}`} />
                    <span className="text-[11px] font-medium tracking-wide text-fg-faint/80">{chipText}</span>
                  </div>
                );
              })()}

              {/* Headline + tagline */}
              <div className="animate-fade-up flex flex-col gap-2.5 sm:gap-3 max-w-3xl" style={{ animationDelay: "100ms" }}>
                <p
                  className="text-[1.7rem] sm:text-3xl lg:text-4xl font-bold leading-[1.12] tracking-tight text-fg text-balance"
                  style={{ fontFamily: "var(--font-display), 'Helvetica Neue', Arial, sans-serif" }}
                >
                  {profile.bio.split(". ")[0]}.
                </p>
                <p className="text-sm sm:text-lg font-light text-fg-muted leading-relaxed text-balance">
                  {profile.tagline}
                </p>
              </div>

              {/* CTAs + social */}
              <div className="animate-fade-up flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3" style={{ animationDelay: "200ms" }}>
                {/* Primary actions */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                  <Link
                    href="/chat"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-fg text-bg px-7 py-3 text-sm font-medium hover:opacity-75 transition-opacity duration-200"
                  >
                    <SparkleIcon size={14} className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    Ask Pumpkin
                  </Link>
                  <a
                    href="#contact"
                    className="group inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors duration-200"
                  >
                    Schedule a Call
                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
                  </a>
                </div>

                <span className="w-px h-5 bg-border shrink-0 hidden sm:inline-block" aria-hidden />

                {/* Social + resume — comfortable tap targets */}
                <div className="flex items-center gap-1 -ml-2 sm:ml-0">
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                    className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full text-fg-faint hover:text-accent hover:bg-surface-raised transition-colors">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  </a>
                  <a href={profile.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub"
                    className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full text-fg-faint hover:text-fg hover:bg-surface-raised transition-colors">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  </a>
                  {profile.resume && (
                    <a href={profile.resume} target="_blank" rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center text-[11px] font-medium text-fg-faint hover:text-fg bg-surface dark:bg-surface-raised border border-border/60 dark:border-border-strong rounded-chip px-3 py-2.5 sm:py-1.5 hover:border-fg-muted transition-all">
                      Resume ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Proof stats */}
              <div className="animate-fade-up max-w-3xl" style={{ animationDelay: "300ms" }}>
                <div className="hidden sm:block">
                  <HeroStats stats={profile.heroStats} />
                </div>
                {profile.heroStats && profile.heroStats.length >= 2 && (
                  <div className="sm:hidden">
                    <HeroStats stats={profile.heroStats.slice(0, 2)} cols={2} />
                  </div>
                )}
              </div>

              {/* Utility chips — latest post + install + LLM hint */}
              <div className="animate-fade-up flex flex-wrap items-center gap-2" style={{ animationDelay: "360ms" }}>
                {latestPost && (
                  <Link href={`/blog/${latestPost.slug}`} className="group inline-flex items-center gap-2 rounded-sm border border-border/60 dark:border-border-strong bg-surface dark:bg-surface-raised px-3.5 py-1.5 hover:border-border-strong transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-faint shrink-0">Latest</span>
                    <span className="w-px h-3 bg-border shrink-0" />
                    <span className="text-[11px] text-fg-subtle group-hover:text-accent transition-colors line-clamp-1 max-w-[55vw] sm:max-w-xs">
                      {latestPost.title}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-fg-faint group-hover:text-accent shrink-0 transition-colors">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                )}
                <span className="inline-flex"><InstallPWA variant="chip" /></span>
                <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-fg-faint hover:text-accent transition-colors px-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 animate-pulse group-hover:animate-none text-accent">
                    <path d="M4 17l6-6-6-6"/><path d="M12 19h8"/>
                  </svg>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Want your LLM to read my work?</span>
                </a>
              </div>
            </div>

              {/* Headshot — right; stretches to match the left column's height down through the stats row */}
              <div className="animate-fade-up self-center sm:self-stretch shrink-0 w-32 h-32 sm:h-auto sm:w-60 lg:w-80" style={{ animationDelay: "0ms" }}>
                <div className="relative w-full h-full min-h-[140px] rounded-full sm:rounded-3xl overflow-hidden border-2 border-border shadow-sm">
                  <Image
                    src="/headshot.jpg"
                    alt={profile.name}
                    fill
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 240px, 128px"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </Inner>

          {/* Spacer — pushes the wordmark to the bottom of the viewport (desktop only) */}
          <div className="hidden sm:block sm:flex-1 sm:min-h-[5vh]" />

          {/* ── Bottom — meta row + oversized scrolling name ── */}
          <div className="flex flex-col gap-2 sm:gap-3 mt-9 sm:mt-0">
            <Inner>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-x-8 gap-y-2 border-t border-border pt-3 sm:pt-4">
                {/* Roles — left */}
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm font-medium text-fg-muted">
                  {["Data Engineer", "Machine Learning", "Cloud Analytics"].map((role, i, arr) => (
                    <span key={role} className="flex items-center gap-2.5">
                      {role}
                      {i < arr.length - 1 && <span className="text-accent" aria-hidden>/</span>}
                    </span>
                  ))}
                </p>
                {/* Contact — right */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm text-fg-muted">
                  <a href={`mailto:${profile.email}`} className="hover:text-accent transition-colors break-all">{profile.email}</a>
                  <span className="text-fg-subtle">{profile.location}</span>
                </div>
              </div>
            </Inner>

            {/* Name — oversized grotesque, scrolls right → left */}
            <HeroName name={profile.name} />

            {/* Signature tagline */}
            <Inner className="pt-1.5 pb-6 sm:pb-7">
              <p className="flex items-center gap-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-fg-subtle">
                <span className="h-px w-7 bg-accent shrink-0" aria-hidden />
                Do hard things!
              </p>
            </Inner>
          </div>
        </div>

      </section>


      {/* ── 2 · At a Glance ── z-[2] ───────────────────────────── */}
      <StackSection z={2} seamless id="about">
<Inner className="py-20 sm:py-28 relative">
          {/* Ghost number */}
          <span aria-hidden className="pointer-events-none absolute -top-4 right-0 select-none font-black text-fg/[0.03] dark:text-fg/[0.04] leading-none"
            style={{ fontSize: "clamp(7rem,18vw,14rem)" }}>01</span>
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fg-faint shrink-0">At a Glance</h2>
            <div className="flex-1 h-px bg-border" aria-hidden />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_300px] 2xl:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <ScrollReveal>
              <p className="text-xl sm:text-2xl font-light leading-[1.75] text-fg-muted max-w-2xl">
                <HighlightNumbers text={profile.bio} />
              </p>
              </ScrollReveal>

              <ScrollReveal delay={80}>
              <div className="hanging-quote border-l border-border-strong pl-4 max-w-2xl">
                <p className="text-sm sm:text-base leading-7 text-fg-muted italic">{profile.obsession}</p>
              </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <SiteVitals />
              </ScrollReveal>

            </div>

            <div className="hidden sm:flex flex-col gap-6 lg:pt-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint mb-3">Previously</p>
                <div className="flex flex-wrap gap-2">
                  {profile.prev_domain.split(",").map((d) => (
                    <span key={d} className="rounded-md border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-fg-subtle">
                      {d.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint mb-3">Excited in</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interested_domain.split(",").map((d) => (
                    <span key={d} className="rounded-md border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-fg-subtle">
                      {d.trim()}
                    </span>
                  ))}
                  <span className="rounded-md border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-fg-faint italic">& more</span>
                </div>
              </div>

              {/* Company mini-timeline with hover tooltips */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint mb-3">Career path</p>
                <div className="flex flex-col">
                  {profile.previous.split(",").map((co, i, arr) => {
                    const exp = findExp(co.trim());
                    return (
                      <div key={co} className="flex items-start gap-2.5">
                        <div className="flex flex-col items-center">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${i === 0 ? "bg-accent" : "bg-border-strong"}`} />
                          {i < arr.length - 1 && (
                            <div className="w-px h-6 bg-gradient-to-b from-border-strong/60 to-transparent mt-0.5" />
                          )}
                        </div>
                        <div className="relative group/co pb-4">
                          <span
                            tabIndex={exp ? 0 : undefined}
                            aria-label={exp ? `${co.trim()}: ${exp.role}, ${exp.start} – ${exp.end}` : undefined}
                            className={`text-xs rounded-chip outline-offset-2 ${exp ? "cursor-help" : "cursor-default"} ${i === 0 ? "text-fg font-medium" : "text-fg-subtle"}`}>
                            {co.trim()}
                          </span>
                          {exp && (
                            <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover/co:block group-focus-within/co:block bg-surface border border-border rounded-chip px-3 py-2 shadow-md whitespace-nowrap pointer-events-none">
                              <p className="text-[11px] font-semibold text-fg">{exp.role}</p>
                              <p className="text-[10px] text-fg-faint font-mono tabular-nums">{exp.start} – {exp.end}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* ── Explore tabs — all pages at a glance ── */}
          <div className="mt-10 pt-8 border-t border-border">
            <div className="flex items-center gap-3 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fg-faint shrink-0">Quick Explore</p>
              <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" aria-hidden />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {EXPLORE_PAGES.map(({ href, label, desc, accent, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group relative flex flex-col gap-2.5 p-4 rounded-card border border-border bg-surface hover:bg-surface-raised hover:border-border-strong transition-all overflow-hidden"
                >
                  {/* Sweep bar — per-page accent gradient */}
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
                  {/* Icon */}
                  <span className="text-fg-faint group-hover:text-accent transition-colors">{icon}</span>
                  {/* Label + desc */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-fg leading-tight">{label}</p>
                    <p className="text-[10px] text-fg-faint leading-tight mt-0.5">{desc}</p>
                  </div>
                  {/* Arrow */}
                  <svg className="self-end text-fg-faint/40 group-hover:text-accent transition-colors" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-border flex items-center justify-end">
            <a href="#projects" className="inline-flex items-center gap-1.5 text-[11px] text-fg-faint hover:text-fg transition-colors">
              See what I&apos;ve built
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </a>
          </div>
        </Inner>
      </StackSection>

      {/* ── 3 · Featured Projects ── z-[3] ─────────────────────── */}
      {featured.length > 0 && (
        <StackSection z={3} id="projects">
          <Inner className="py-20 sm:py-28 relative">
            {/* Ghost number */}
            <span aria-hidden className="pointer-events-none absolute -top-4 right-0 select-none font-black text-fg/[0.03] dark:text-fg/[0.04] leading-none"
              style={{ fontSize: "clamp(7rem,18vw,14rem)" }}>02</span>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fg-faint shrink-0">Featured Projects</h2>
              </div>
              <Link href="/projects" className="text-xs font-medium text-accent hover:text-accent-hover">
                All projects →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((p, i) => (
                <ScrollReveal key={p.title} delay={i * 80} className="flex" direction="scale">
                  {p.title.startsWith("jayaremala") ? (
                    <RagPipelineCard
                      title={p.title}
                      description={p.description}
                      tags={p.tags}
                      award={p.award}
                      note={p.note}
                      sourceLinks={p.sourceLinks}
                    />
                  ) : (
                    <div className="group relative flex-1 rounded-card border border-border bg-surface p-6 space-y-3 hover:border-border-strong card-lift overflow-hidden">
                      <div className={`absolute inset-x-0 top-0 h-px ${p.award ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-fg/20"} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
                      {/* Corner bracket accents — ridealso-style geometric marks */}
                      <svg className="absolute top-2.5 left-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <path d="M9 1 L1 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <svg className="absolute bottom-2.5 right-2.5 text-border/50 group-hover:text-accent/40 transition-colors duration-200 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <path d="M1 9 L9 9 L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-fg text-sm leading-snug group-hover:text-accent transition-colors">{p.title}</h3>
                        {p.award && (
                          <span className="text-[10px] font-semibold rounded-sm bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px] mr-1" aria-hidden><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 0-3 3" /></svg>{p.award}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-5 text-fg-subtle">{p.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.tags.slice(0, 4).map((t) => (
                          <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-fg-subtle tracking-wide">
                            {t}
                          </span>
                        ))}
                      </div>
                      {p.note && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 rounded-sm px-2.5 py-1.5 leading-relaxed">
                          {p.note}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {p.sourceLinks && p.sourceLinks.length > 0
                          ? p.sourceLinks.map((link) => (
                              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold text-accent hover:border-accent/50 transition-colors">
                                {link.label}
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                              </a>
                            ))
                          : null}
                      </div>
                    </div>
                  )}
                </ScrollReveal>
              ))}
            </div>
          <div className="mt-10 pt-5 border-t border-border flex items-center justify-end">
            <a href="#skills" className="inline-flex items-center gap-1.5 text-[11px] text-fg-faint hover:text-fg transition-colors">
              Technologies I work with
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </a>
          </div>
          </Inner>
        </StackSection>
      )}

      {/* ── 4 · Skills ── z-[5] ────────────────────────────────── */}
      <StackSection z={5} id="skills">
        <Inner className="py-20 sm:py-28 relative">
          {/* Ghost number */}
          <span aria-hidden className="pointer-events-none absolute -top-4 right-0 select-none font-black text-fg/[0.03] dark:text-fg/[0.04] leading-none"
            style={{ fontSize: "clamp(7rem,18vw,14rem)" }}>03</span>
          <SkillsSection skills={skills} featuredProjects={featured} />

          {/* Interactive skills ↔ projects constellation — desktop only */}
          <div className="hidden lg:block mt-12 pt-10 border-t border-border">
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fg-faint shrink-0">Skills in Action</h3>
              <div className="flex-1 h-px bg-border" aria-hidden />
            </div>
            <SkillsConstellation />
          </div>

          <div className="mt-10 pt-5 border-t border-border flex items-center justify-end">
            <a href="#contact" className="inline-flex items-center gap-1.5 text-[11px] text-fg-faint hover:text-fg transition-colors">
              Let&apos;s connect
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </a>
          </div>
        </Inner>
      </StackSection>

      {/* ── 6 · Contact ── z-[7] ───────────────────────────────── */}
      <StackSection z={7} className="pb-16 sm:pb-24" id="contact">
        <Inner className="py-20 sm:py-28 relative">
          {/* Ghost number */}
          <span aria-hidden className="pointer-events-none absolute -top-4 right-0 select-none font-black text-fg/[0.03] dark:text-fg/[0.04] leading-none"
            style={{ fontSize: "clamp(7rem,18vw,14rem)" }}>04</span>
          <ContactForm />
        </Inner>
      </StackSection>
    </div>
  );
}
