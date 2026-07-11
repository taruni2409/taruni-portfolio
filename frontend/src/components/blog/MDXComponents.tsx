import React from "react";
import type { MDXComponents } from "mdx/types";
import BlogImageClient from "./BlogImage";
import CodeBlock from "./CodeBlock";

/* ── Callout ─────────────────────────────────────────── */
type CalloutVariant = "info" | "tip" | "warning" | "quote";

const CALLOUT_STYLES: Record<CalloutVariant, { border: string; bg: string; icon: string; label: string; text: string }> = {
  info:    { border: "border-blue-200 dark:border-blue-800",   bg: "bg-blue-50 dark:bg-blue-950/50",   icon: "ℹ",  label: "text-blue-700 dark:text-blue-400",   text: "text-blue-800 dark:text-blue-300" },
  tip:     { border: "border-green-200 dark:border-green-800", bg: "bg-green-50 dark:bg-green-950/50", icon: "✦",  label: "text-green-700 dark:text-green-400", text: "text-green-800 dark:text-green-300" },
  warning: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-950/50", icon: "⚠",  label: "text-amber-700 dark:text-amber-400", text: "text-amber-900 dark:text-amber-300" },
  quote:   { border: "border-indigo-200 dark:border-indigo-800", bg: "bg-indigo-50 dark:bg-indigo-950/50", icon: "❝", label: "text-indigo-600 dark:text-indigo-400", text: "text-indigo-900 dark:text-indigo-300" },
};

export function Callout({ type = "info", title, children }: { type?: CalloutVariant; title?: string; children: React.ReactNode }) {
  const s = CALLOUT_STYLES[type];
  return (
    <div className={`not-prose my-6 rounded-xl border ${s.border} ${s.bg} px-5 py-4`}>
      <div className={`flex items-center gap-2 mb-1.5 text-sm font-semibold ${s.label}`}>
        <span>{s.icon}</span>
        <span>{title ?? type.charAt(0).toUpperCase() + type.slice(1)}</span>
      </div>
      <div className={`text-sm leading-relaxed ${s.text}`}>{children}</div>
    </div>
  );
}

/* ── BlogImage — delegates to client component for lightbox ── */
export function BlogImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return <BlogImageClient src={src} alt={alt} caption={caption} />;
}

/* ── PullQuote — large editorial inline quote, optional attribution ── */
export function PullQuote({ children, author }: { children: React.ReactNode; author?: string }) {
  return (
    <figure className="not-prose my-10 sm:my-12 text-center px-2 sm:px-6">
      <blockquote className="relative font-[family-name:var(--font-garamond)] italic tracking-tight text-balance text-fg text-[1.45rem] sm:text-[1.75rem] leading-[1.35]">
        <span aria-hidden className="absolute -left-1 -top-4 sm:-left-3 text-accent/25 text-5xl leading-none select-none font-[family-name:var(--font-garamond)]">&ldquo;</span>
        {children}
      </blockquote>
      {author && (
        <figcaption className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-faint not-italic">
          <span className="inline-block w-6 h-px align-middle bg-border mr-2.5" />
          {author}
        </figcaption>
      )}
    </figure>
  );
}

/* ── Divider ─────────────────────────────────────────── */
export function Divider() {
  return (
    <div className="not-prose my-8 flex items-center gap-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-fg-faint text-xs">✦</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ── MDX component overrides ─────────────────────────── */
export const mdxComponents: MDXComponents = {
  // Images: auto-wrap with caption if title provided
  img: ({ src, alt, title }) => (
    <BlogImageClient src={src as string} alt={alt ?? ""} caption={title} />
  ),

  // Prevent hydration errors: MDX wraps block-level components (BlogImage, Callout, Divider)
  // in <p> tags — invalid HTML. When a custom component is the only child, skip the <p>.
  p: ({ children }) => {
    const arr = React.Children.toArray(children);
    const hasBlock = arr.some(c => React.isValidElement(c) && typeof c.type === "function");
    return hasBlock ? <>{arr}</> : <p>{children}</p>;
  },

  // Code blocks — Shiki highlights the tokens; CodeBlock adds the copy button.
  // Inline code (single backtick) is NOT a pre element — handled by CSS only.
  pre: (props) => <CodeBlock {...(props as React.ComponentPropsWithoutRef<"pre">)} />,

  // Headings with anchor links
  h2: ({ children, id }) => (
    <h2 id={id} className="group relative">
      {children}
      {id && (
        <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-40 text-fg-faint no-underline text-sm" aria-hidden>
          #
        </a>
      )}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className="group relative">
      {children}
      {id && (
        <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-40 text-fg-faint no-underline text-sm" aria-hidden>
          #
        </a>
      )}
    </h3>
  ),

  // Expose custom components directly usable in MDX
  Callout,
  BlogImage,
  Divider,
  PullQuote,
};
