import spotlightsJson from "@/data/knowledge/spotlights.json";

export interface SpotlightCta {
  label: string;
  /** External URL (https://…) or internal path (/gallery…). */
  url: string;
}

export interface SpotlightMetric {
  value: string;
  label: string;
}

export interface Spotlight {
  /** URL-safe identifier / registry key. */
  slug: string;
  /** Whether this spotlight renders on the portfolio home. */
  enabled: boolean;
  /** Small uppercase eyebrow, e.g. "Live Product · Spotlight". */
  eyebrow: string;
  /** Product / project name (heading). */
  name: string;
  /** Optional logo image path (e.g. /my-product/logo.png). */
  logo?: string;
  /** Small line under the name. */
  subtitle?: string;
  /** Large pitch line. */
  headline: string;
  /** Optional emphasized tail appended to the headline. */
  headlineEmphasis?: string;
  /** Supporting paragraph. */
  description?: string;
  /** Primary call-to-action button. */
  primaryCta?: SpotlightCta;
  /** Secondary call-to-action button. */
  secondaryCta?: SpotlightCta;
  /** Small footnote under the CTAs. */
  footnote?: string;
  /** Credibility metric cards. */
  metrics: SpotlightMetric[];
}

export const spotlights = spotlightsJson as Spotlight[];
