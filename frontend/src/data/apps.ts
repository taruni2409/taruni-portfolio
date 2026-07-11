import appsJson from "@/data/knowledge/apps.json";

export type AppStatus = "live" | "beta" | "wip" | "archived";

export interface HostedApp {
  /** URL-safe identifier, also used as the registry key. */
  slug: string;
  /** Display name. */
  name: string;
  /** Public URL where the app is hosted. */
  url: string;
  /** One-line summary. */
  tagline: string;
  /** Longer description for cards, RAG, and MCP. */
  description: string;
  /** Lifecycle status. */
  status: AppStatus;
  /** Free-text category, e.g. "Web App (PWA)". */
  category: string;
  /** Tech stack tags. */
  tech: string[];
  /** Whether to highlight this app. */
  featured: boolean;
  /** Optional launch year/date. */
  launchedAt?: string;
}

export const apps = appsJson as HostedApp[];
