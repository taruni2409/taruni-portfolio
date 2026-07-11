import Link from "next/link";
import { profile } from "@/data/profile";
import type { Metadata } from "next";

const SITE_URL = "https://jayaremala.com";

export const metadata: Metadata = {
  title: "Now — Taruni Nallamothu",
  description: "What I'm building, learning, and reading right now.",
  alternates: { canonical: `${SITE_URL}/now` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/now`,
    title: "Now — Taruni Nallamothu",
    description: "What I'm building, learning, and reading right now.",
    siteName: "Taruni Nallamothu",
  },
};

const items = [
  {
    label: "Building",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
      </svg>
    ),
    key: "building" as const,
    color:  "text-indigo-500 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    bg:     "bg-indigo-50/60 dark:bg-indigo-950/25",
    delay:  "0ms",
  },
  {
    label: "Learning",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
    key: "learning" as const,
    color:  "text-violet-500 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    bg:     "bg-violet-50/60 dark:bg-violet-950/25",
    delay:  "80ms",
  },
  {
    label: "Reading",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
    key: "reading" as const,
    color:  "text-emerald-500 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    bg:     "bg-emerald-50/60 dark:bg-emerald-950/25",
    delay:  "160ms",
  },
];

export default function NowPage() {
  const now = profile.now;

  const updated = now?.updated ? new Date(now.updated) : null;
  const updatedLabel = updated
    ? updated.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  // Freshness: amber badge if updated > 30 days ago
  const daysSinceUpdate = updated
    ? Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isStale = daysSinceUpdate !== null && daysSinceUpdate > 30;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Taruni Nallamothu",
    url: SITE_URL,
    jobTitle: "Software Engineer",
    sameAs: [profile.github, profile.linkedin].filter(Boolean),
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-16 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-faint">Now</h2>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mb-3">What I&apos;m up to</h1>
        <p className="text-sm text-fg-subtle leading-relaxed max-w-md">
          A snapshot of what I&apos;m focused on, building, and thinking about. Inspired by{" "}
          <a
            href="https://nownownow.com/about"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover underline underline-offset-2 transition-colors"
          >
            the /now movement
          </a>.
        </p>

        {updatedLabel && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
              isStale
                ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                : "text-fg-subtle bg-surface-raised border-border"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isStale ? "bg-amber-400" : "bg-emerald-500"}`} />
              Updated {updatedLabel}
              {isStale && " · may be stale"}
            </span>
            {now?.location && (
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-faint">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {now.location}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      {now ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.key}>
              <div className={`flex items-start gap-4 rounded-2xl border ${item.border} ${item.bg} px-5 py-5 transition-all duration-300 hover:shadow-sm`}>
                <span className={`mt-0.5 shrink-0 ${item.color}`}>{item.icon}</span>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${item.color}`}>
                    {item.label}
                  </p>
                  <p className="text-sm text-fg leading-relaxed">{now[item.key]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-fg-subtle">Nothing here yet — check back soon.</p>
      )}

      {/* Footer links */}
      <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6 text-xs text-fg-faint">
        <Link href="/" className="hover:text-fg-subtle transition-colors">← Portfolio</Link>
        <Link href="/blog" className="hover:text-fg-subtle transition-colors">Blog</Link>
        <Link href="/projects" className="hover:text-fg-subtle transition-colors">Projects</Link>
        <Link href="/chat" className="hover:text-fg-subtle transition-colors">Ask Pumpkin</Link>
      </div>
    </div>
  );
}
