/**
 * Single source of truth for the site's navigable pages.
 *
 * Both the top Nav (components/Nav.tsx) and the Footer (components/Footer.tsx)
 * derive their links from this list — so adding a new page here makes it appear
 * in BOTH the navigation and the footer automatically. No need to update them
 * separately.
 */
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; desc: string; icon: ReactNode };
export type NavGroup = { label: string; items: NavItem[] };

export const siteGroups: NavGroup[] = [
  {
    label: "Work",
    items: [
      {
        href: "/experience", label: "Experience", desc: "Roles, companies & impact",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
      },
      {
        href: "/education", label: "Education", desc: "Degrees & foundations",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
      },
      {
        href: "/projects", label: "Projects", desc: "What I've shipped",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
      },
      {
        href: "/lab", label: "Lab", desc: "Live system designs",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4m-6 0h6"/></svg>,
      },
      {
        href: "/apps", label: "Apps", desc: "Products I host & run",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
      },
      {
        href: "/now", label: "Now", desc: "What I'm doing right now",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
      },
    ],
  },
  {
    label: "Writing",
    items: [
      {
        href: "/blog", label: "Blog", desc: "Notes on building",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
      },
      {
        href: "/quotes", label: "Quotes", desc: "Words I live by",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/></svg>,
      },
      {
        href: "/gallery", label: "Gallery", desc: "Milestones & moments",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>,
      },
    ],
  },
  {
    label: "Developers",
    items: [
      {
        href: "/mcp", label: "MCP", desc: "Connect your LLM to my work",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/><rect x="6" y="8" width="12" height="6" rx="2"/><path d="M9 14v3M15 14v3"/></svg>,
      },
      {
        href: "/system", label: "System", desc: "Live observability",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
      },
    ],
  },
];

/**
 * Footer columns derived from the same nav config. Optional per-group title
 * overrides keep the footer's own wording; "extras" are footer-only links
 * (e.g. the Pumpkin chat CTA) appended to a given group.
 */
const FOOTER_TITLE: Record<string, string> = { Work: "Explore", Developers: "Build" };
const FOOTER_EXTRAS: Record<string, { label: string; href: string }[]> = {
  Developers: [{ label: "Ask Pumpkin", href: "/chat" }],
};

export const footerColumns: { title: string; links: { label: string; href: string }[] }[] =
  siteGroups.map((g) => ({
    title: FOOTER_TITLE[g.label] ?? g.label,
    links: [
      ...g.items.map((it) => ({ label: it.label, href: it.href })),
      ...(FOOTER_EXTRAS[g.label] ?? []),
    ],
  }));
