import type { MDXComponents } from "mdx/types";

/* ── Status badge ──────────────────────────────────────────────────── */
const STATUS_STYLES = {
  active:  { dot: "bg-emerald-400", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800", label: "Active" },
  shipped: { dot: "bg-indigo-400",  text: "text-indigo-700 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800",   label: "Shipped" },
  paused:  { dot: "bg-amber-400",   text: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",     label: "Paused" },
};

export function Status({ status }: { status: "active" | "shipped" | "paused" }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.active;
  return (
    <span className={`not-prose inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === "active" ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

/* ── Architecture block (used via ```arch fenced code blocks) ──────── */
function ArchBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-zinc-950 overflow-hidden">
      {/* Accent top line — ties block to site design tokens */}
      <div className="h-px bg-linear-to-r from-transparent via-accent/40 to-transparent" />
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800/60">
        <span className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
        <span className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
        <span className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
        <span className="ml-2 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">architecture</span>
      </div>
      {/* Diagram scrolls independently — header stays fixed */}
      <div className="overflow-x-auto">
        {/* Inline styles override .prose pre CSS (specificity 11 beats Tailwind utilities 10,
            and !important in the globals reset zeroes out background/border/padding/font-size) */}
        <pre
          className="font-mono whitespace-pre"
          style={{
            padding: "1rem 1.25rem",
            fontSize: "0.6875rem",   /* 11px */
            lineHeight: 1.65,
            color: "rgb(212 212 216)", /* zinc-300 */
            background: "transparent",
          }}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}

/* ── Decision log entry ────────────────────────────────────────────── */
export function Decision({ date, title, children }: { date: string; title: string; children: React.ReactNode }) {
  return (
    <div className="not-prose my-4 flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-2 mb-1.5">
          <span className="text-[10px] font-mono text-fg-faint">{date}</span>
          <span className="text-sm font-semibold text-fg">{title}</span>
        </div>
        <div className="text-sm text-fg-muted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ── Progress update ───────────────────────────────────────────────── */
export function Update({ date, children }: { date: string; children: React.ReactNode }) {
  return (
    <div className="not-prose my-3 flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-border-strong mt-1 shrink-0" />
        <div className="w-px flex-1 bg-border-subtle mt-1" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <span className="text-[10px] font-mono text-fg-faint block mb-1">{date}</span>
        <div className="text-sm text-fg-muted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ── Tech stack row ────────────────────────────────────────────────── */
export function Stack({ items }: { items: string[] }) {
  const list = Array.isArray(items) ? items : String(items).split(",").map((s) => s.trim());
  return (
    <div className="not-prose flex flex-wrap gap-1.5 my-4">
      {list.map((item) => (
        <span key={item} className="px-2.5 py-1 rounded-md bg-surface-raised text-fg-muted text-[11px] font-mono font-medium border border-border">
          {item}
        </span>
      ))}
    </div>
  );
}

/* ── Metric highlight ──────────────────────────────────────────────── */
export function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="not-prose inline-flex flex-col items-center px-4 py-3 rounded-xl border border-border bg-surface text-center">
      <span className="text-xl font-bold text-fg leading-none">{value}</span>
      <span className="text-[10px] text-fg-faint mt-1 font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ── Inline code override ──────────────────────────────────────────── */
function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="bg-surface-raised border border-border rounded px-1.5 py-0.5 text-[0.83em] font-mono text-fuchsia-700 dark:text-fuchsia-400">
      {children}
    </code>
  );
}

/* ── pre override — routes ```arch blocks to ArchBlock ─────────────── */
function Pre({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const child = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  if (child?.props?.className === "language-arch") {
    return <ArchBlock>{child.props.children}</ArchBlock>;
  }
  // Defer to .prose pre CSS — light/dark aware, matches blog code block styling
  return <pre {...props}>{children}</pre>;
}

/* ── MDX component map ─────────────────────────────────────────────── */
export const labMDXComponents: MDXComponents = {
  pre: Pre,
  code: InlineCode,
  h2: ({ children, id }) => (
    <h2 id={id} className="group relative">
      {children}
      {id && (
        <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-40 text-fg-faint no-underline text-sm" aria-hidden>#</a>
      )}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className="group relative">
      {children}
      {id && (
        <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-40 text-fg-faint no-underline text-sm" aria-hidden>#</a>
      )}
    </h3>
  ),
  Status,
  Decision,
  Update,
  Stack,
  Metric,
};
