"use client";

import { useState } from "react";

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in (node as React.ReactElement)) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

export default function CodeBlock({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(extractText(children).trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (non-https, etc.)
    }
  }

  return (
    <div className="relative group/code not-prose">
      <pre {...props}>{children}</pre>
      <button
        onClick={copy}
        aria-label={copied ? "Copied!" : "Copy code"}
        className="absolute top-3 right-3 opacity-0 group-hover/code:opacity-100 focus-visible:opacity-100
                   transition-opacity flex items-center gap-1.5 rounded-lg
                   bg-zinc-900/10 dark:bg-white/10 hover:bg-zinc-900/20 dark:hover:bg-white/20
                   px-2.5 py-1 text-[10px] font-medium
                   text-zinc-600 dark:text-zinc-300 backdrop-blur-sm"
      >
        {copied ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  );
}
