"use client";

import { useState } from "react";

const SITE_URL = "https://jayaremala.com";
const SHARE_TITLE = "Taruni Nallamothu — Data Engineer & ML Engineer";
const SHARE_TEXT = "Check out Taruni's portfolio — data engineering, machine learning, and an AI assistant you can chat with.";

export default function ShareSiteChip() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Native share sheet on mobile / supported browsers
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SITE_URL });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Share this site"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
        copied
          ? "border-green-400/60 bg-green-500/10 text-green-600 dark:text-green-400"
          : "border-border dark:border-border-strong bg-surface dark:bg-surface-raised text-fg-faint hover:text-accent hover:border-accent/50"
      }`}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Link copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
