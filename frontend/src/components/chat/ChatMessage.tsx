"use client";

import React, { useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  message: Message;
  streaming?: boolean;
}

// ── Inline formatter ─────────────────────────────────────────────────────────

const INLINE = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+))/g;

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${match.index}`;

    if (match[2] !== undefined) {
      nodes.push(<strong key={key} className="font-semibold text-fg">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={key}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      nodes.push(<code key={key} className="rounded bg-surface-raised px-1 py-0.5 text-[11px] font-mono text-fg-muted">{match[4]}</code>);
    } else if (match[5] !== undefined) {
      nodes.push(<a key={key} href={match[6]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-accent hover:text-accent-hover transition-colors">{match[5]}</a>);
    } else if (match[7] !== undefined) {
      nodes.push(<a key={key} href={match[7]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-accent hover:text-accent-hover break-all transition-colors">{match[7]}</a>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ── Block renderer ────────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    if (line.startsWith("### ")) {
      elements.push(
        <p key={k++} className="font-semibold text-fg mt-2 mb-0.5 text-[13px]">
          {inline(line.slice(4), String(k))}
        </p>
      );
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={k++} className="font-bold text-fg mt-2 mb-1 text-sm">
          {inline(line.slice(3), String(k))}
        </p>
      );
      i++; continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        const idx = i;
        items.push(
          <li key={idx} className="flex gap-2">
            <span className="mt-[5px] w-1 h-1 rounded-full bg-fg-subtle shrink-0" />
            <span>{inline(lines[i].replace(/^[-*]\s/, ""), `li-${idx}`)}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={k++} className="space-y-1 my-1 text-fg-muted">{items}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const idx = i;
        items.push(
          <li key={idx} className="flex gap-2">
            <span className="shrink-0 text-fg-faint text-[11px] font-mono mt-px">{num++}.</span>
            <span>{inline(lines[i].replace(/^\d+\.\s/, ""), `ol-${idx}`)}</span>
          </li>
        );
        i++;
      }
      elements.push(<ol key={k++} className="space-y-1 my-1 text-fg-muted">{items}</ol>);
      continue;
    }

    if (line.trim() === "---") {
      elements.push(<hr key={k++} className="border-border my-2" />);
      i++; continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3}\s|[-*]\s|\d+\.\s|---)/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const combined = paraLines.join("\n");
      const parts: React.ReactNode[] = [];
      combined.split("\n").forEach((ln, li) => {
        if (li > 0) parts.push(<br key={`br-${k}-${li}`} />);
        parts.push(...inline(ln, `p-${k}-${li}`));
      });
      elements.push(<p key={k++} className="leading-relaxed">{parts}</p>);
    }
  }

  return <div className="space-y-1.5">{elements}</div>;
}

// ── Component ─────────────────────────────────────────────────────────────────

async function hashContent(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export default function ChatMessage({ message, streaming }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState<1 | -1 | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleFeedback(rating: 1 | -1) {
    if (rated !== null) return;
    setRated(rating);
    const hash = await hashContent(message.content);
    fetch(`${API_BASE_URL}/ai/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_hash: hash, rating }),
    }).catch(() => {});
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-md bg-surface-raised px-4 py-2.5 text-[15px] leading-relaxed text-fg">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center text-base mt-0.5" title="Pumpkin">
        🎃
      </div>
      <div className="relative min-w-0 flex-1 max-w-[calc(100%-2.5rem)] pl-3.5">
        {/* Left accent bar — refined pull-quote marker for Pumpkin's replies */}
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-gradient-to-b from-accent to-accent/20 opacity-60"
        />
        {/* Plain text — no card, no border, no shadow (minimalist) */}
        <div className="text-[15px] leading-[1.7] text-fg pt-0.5">
          {streaming && !message.content ? (
            <span className="inline-flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-fg-faint animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-fg-faint animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-fg-faint animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            <>
              {renderMarkdown(message.content)}
              {streaming && <span className="cursor-blink ml-0.5 text-fg-faint">|</span>}
            </>
          )}
        </div>
        {!streaming && message.content && (
          <div className="mt-2 flex items-center gap-1 opacity-0 animate-[fadeUp_0.3s_ease_0.1s_forwards]">
            {/* Thumbs up */}
            {rated !== -1 && (
              <button
                onClick={() => handleFeedback(1)}
                disabled={rated !== null}
                aria-label="Good response"
                title="Good response"
                className={`flex items-center rounded-full border px-1.5 py-0.5 text-[10px] shadow-sm transition-colors ${
                  rated === 1
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-surface text-fg-faint hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/>
                  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
              </button>
            )}
            {/* Thumbs down */}
            {rated !== 1 && (
              <button
                onClick={() => handleFeedback(-1)}
                disabled={rated !== null}
                aria-label="Bad response"
                title="Bad response"
                className={`flex items-center rounded-full border px-1.5 py-0.5 text-[10px] shadow-sm transition-colors ${
                  rated === -1
                    ? "border-rose-400 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                    : "border-border bg-surface text-fg-faint hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400"
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"/>
                  <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                </svg>
              </button>
            )}
            {/* Divider */}
            <span className="w-px h-3 bg-border mx-0.5" />
            {/* Copy */}
            <button
              onClick={handleCopy}
              aria-label="Copy response"
              className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-fg-faint hover:text-fg-muted hover:border-fg-faint shadow-sm transition-colors"
            >
              {copied ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
