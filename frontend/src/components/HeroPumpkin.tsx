"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { saveMessages, loadMessages } from "@/lib/session";

const ROTATE_PLACEHOLDERS = [
  "How did she improve forecasting accuracy from 78% to 92%?",
  "What did she build at Shell PLC?",
  "What Google & Microsoft certifications does she hold?",
  "What is she excited about right now?",
  "What data stack does she work with?",
];

const CHIPS = [
  "Is Taruni open to new opportunities?",
  "What's her background and expertise?",
  "What are her biggest career wins?",
  "What kind of teams does Taruni thrive in?",
];


function Prose({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((chunk, i) => {
        if (chunk.startsWith("**") && chunk.endsWith("**")) {
          return <strong key={i} className="text-zinc-100">{chunk.slice(2, -2)}</strong>;
        }
        return chunk.split("\n").map((line, j, arr) => (
          <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
        ));
      })}
    </>
  );
}

export default function HeroPumpkin() {
  const router = useRouter();
  const [input, setInput]               = useState("");
  const [asked, setAsked]               = useState("");
  const [reply, setReply]               = useState("");
  const [streaming, setStreaming]       = useState(false);
  const [error, setError]               = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [totalResponses, setTotalResponses] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (asked !== "") return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % ROTATE_PLACEHOLDERS.length), 3000);
    return () => clearInterval(id);
  }, [asked]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/stats`)
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((d) => { if (d.total_responses > 0) setTotalResponses(d.total_responses); })
      .catch(() => {});
  }, []);

  async function submit(q: string) {
    q = q.trim();
    if (!q || streaming) return;

    if (asked !== "") {
      router.push(`/chat?q=${encodeURIComponent(q)}`);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAsked(q);
    setInput("");
    setReply("");
    setError(false);
    setStreaming(true);
    let fullReply = "";
    let hadError = false;
    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, messages: [] }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("stream failed");
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.token) { fullReply += msg.token; setReply((p) => p + msg.token); }
            if (msg.done || msg.error) { setStreaming(false); if (msg.error) { hadError = true; setError(true); } }
          } catch { /* skip */ }
        }
      }
      if (fullReply && !hadError) {
        const existing = loadMessages() ?? [];
        saveMessages([
          ...existing,
          { role: "user",      content: q         },
          { role: "assistant", content: fullReply  },
        ]);
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") setError(true);
    } finally {
      setStreaming(false);
    }
  }

  function handleForm(e: React.FormEvent) {
    e.preventDefault();
    submit(input);
  }

  const hasReply = asked !== "";

  return (
    <div className="w-full max-w-xl">

      {/* ── Desktop header — hidden on mobile ── */}
      <div className="hidden sm:flex mb-3 items-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-fg-faint">Ask Pumpkin</span>
        <span className="text-sm leading-none">🎃</span>
        <div className="h-px flex-1 bg-border" />
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full transition-colors ${streaming ? "animate-pulse bg-green-400" : "bg-green-500"}`} />
          <span className="text-[10px] text-fg-faint">{streaming ? "thinking…" : "online"}</span>
        </span>
      </div>

      {/* ── Desktop description — hidden on mobile ── */}
      <p className="hidden sm:block mb-4 text-[12px] text-fg-faint leading-relaxed">
        Ask anything about my work, projects, or experience — powered by RAG + Gemini.
      </p>

      {/* ── Chips — desktop only ── */}
      {!hasReply && (
        <div className="hidden sm:flex mb-4 flex-row flex-wrap gap-2">
          {CHIPS.map((q, i) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              disabled={streaming}
              className="animate-fade-up rounded-full border border-border bg-surface-raised/70 px-3 py-1.5 text-left text-[11px] text-fg-muted/70 backdrop-blur-sm transition-all hover:border-indigo-400 hover:text-indigo-600 hover:opacity-100 disabled:opacity-40 dark:hover:border-indigo-600 dark:hover:text-indigo-400"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Chat window — question + reply ── */}
      {hasReply && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/90 text-[12px] font-mono backdrop-blur-sm">
          <div className="flex gap-3 border-b border-zinc-800/50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">You</span>
            <span className="text-zinc-300 leading-relaxed">{asked}</span>
          </div>
          <div className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">🎃</span>
            <div className="max-h-52 overflow-y-auto text-zinc-300 leading-relaxed">
              {error ? (
                <span className="text-rose-400">
                  Connection error —{" "}
                  <Link href="/chat" className="underline">try full chat</Link>
                </span>
              ) : reply ? (
                <>
                  <Prose text={reply} />
                  {streaming && (
                    <span className="ml-0.5 inline-block h-[13px] w-1.5 animate-pulse align-text-bottom bg-indigo-400" />
                  )}
                </>
              ) : (
                <span className="inline-block h-[13px] w-1.5 animate-pulse align-text-bottom bg-indigo-400" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Input form ── */}
      <form
        onSubmit={handleForm}
        className="flex items-center rounded-full border border-border bg-bg/80 backdrop-blur-sm pr-1 py-1 transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20
                   pl-3 sm:pl-4"
      >
        {/* Mobile-only inline label with live status — hidden on desktop */}
        <span className="sm:hidden flex items-center gap-1.5 shrink-0 pr-2.5 mr-1 border-r border-border">
          <span className="text-base leading-none">🎃</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">Ask</span>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${streaming ? "animate-pulse bg-amber-400" : "bg-green-500"}`} />
        </span>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasReply ? "Ask another question…" : ROTATE_PLACEHOLDERS[placeholderIdx]}
          disabled={streaming}
          className="min-w-0 flex-1 bg-transparent py-2 text-base sm:text-sm text-fg placeholder:text-fg-faint focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="Ask"
          className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {streaming ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          )}
        </button>
      </form>

      {/* ── Footer ── */}
      {/* Desktop: response count + full chat link */}
      <div className="hidden sm:flex mt-2 items-center justify-between gap-3">
        {totalResponses !== null ? (
          <p className="text-[10px] text-fg-faint">
            <span className="font-semibold text-fg-muted">✦ {totalResponses.toLocaleString()}</span>{" "}questions answered from visitors
          </p>
        ) : (
          <p className="text-[10px] text-fg-faint">Gemini · BGE-base · BM25 · RRF · knowledge graph</p>
        )}
        <Link
          href="/chat"
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400 shrink-0"
        >
          Full chat
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7v10"/>
          </svg>
        </Link>
      </div>
      {/* Mobile: response count left, full chat right */}
      <div className="sm:hidden mt-2 flex items-center justify-between gap-2">
        {totalResponses !== null && (
          <p className="text-[10px] text-fg-faint">
            <span className="font-semibold text-fg-muted">✦ {totalResponses.toLocaleString()}</span>{" "}answered
          </p>
        )}
        <Link
          href="/chat"
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 ml-auto"
        >
          Full chat
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7v10"/>
          </svg>
        </Link>
      </div>

    </div>
  );
}
