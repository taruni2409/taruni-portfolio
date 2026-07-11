"use client";

import { useState } from "react";
import type { Quote, QuoteCategory } from "@/data/quotes";
import { profile } from "@/data/profile";

// ── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<QuoteCategory, {
  border: string;
  badge: string;
  quote: string;
  pill: string;
  pillActive: string;
}> = {
  Work: {
    border: "border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-200 dark:hover:border-indigo-800",
    badge: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400",
    quote: "text-indigo-200 dark:text-indigo-900",
    pill: "bg-surface border border-border text-fg-faint hover:text-fg hover:border-indigo-300 dark:hover:border-indigo-700",
    pillActive: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
  },
  Life: {
    border: "border-emerald-100 dark:border-emerald-900/60 hover:border-emerald-200 dark:hover:border-emerald-800",
    badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
    quote: "text-emerald-200 dark:text-emerald-900",
    pill: "bg-surface border border-border text-fg-faint hover:text-fg hover:border-emerald-300 dark:hover:border-emerald-700",
    pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
  },
  Technology: {
    border: "border-blue-100 dark:border-blue-900/60 hover:border-blue-200 dark:hover:border-blue-800",
    badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
    quote: "text-blue-200 dark:text-blue-900",
    pill: "bg-surface border border-border text-fg-faint hover:text-fg hover:border-blue-300 dark:hover:border-blue-700",
    pillActive: "bg-blue-600 text-white border-blue-600 shadow-sm",
  },
  Philosophy: {
    border: "border-violet-100 dark:border-violet-900/60 hover:border-violet-200 dark:hover:border-violet-800",
    badge: "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400",
    quote: "text-violet-200 dark:text-violet-900",
    pill: "bg-surface border border-border text-fg-faint hover:text-fg hover:border-violet-300 dark:hover:border-violet-700",
    pillActive: "bg-violet-600 text-white border-violet-600 shadow-sm",
  },
  Creativity: {
    border: "border-amber-100 dark:border-amber-900/60 hover:border-amber-200 dark:hover:border-amber-800",
    badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
    quote: "text-amber-200 dark:text-amber-900",
    pill: "bg-surface border border-border text-fg-faint hover:text-fg hover:border-amber-300 dark:hover:border-amber-700",
    pillActive: "bg-amber-500 text-white border-amber-500 shadow-sm",
  },
  Mindset: {
    border: "border-teal-100 dark:border-teal-900/60 hover:border-teal-200 dark:hover:border-teal-800",
    badge: "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400",
    quote: "text-teal-200 dark:text-teal-900",
    pill: "bg-surface border border-border text-fg-faint hover:text-fg hover:border-teal-300 dark:hover:border-teal-700",
    pillActive: "bg-teal-600 text-white border-teal-600 shadow-sm",
  },
};

const ALL_CATEGORIES: QuoteCategory[] = ["Work", "Life", "Technology", "Philosophy", "Creativity", "Mindset"];

// ── QuoteCard ────────────────────────────────────────────────────────────────

function QuoteCard({ quote }: { quote: Quote }) {
  const cfg = CAT_CONFIG[quote.category];
  return (
    <div className={`relative rounded-2xl border bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md ${cfg.border}`}>
      {/* Category badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {quote.category}
        </span>
        <div className="flex items-center gap-1.5">
          {quote.featured && (
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Featured
            </span>
          )}
          {quote.favorite && (
            <span className="text-amber-400 text-sm" title="Favorite">★</span>
          )}
        </div>
      </div>

      {/* Large opening quote mark */}
      <div className={`text-6xl font-serif leading-none mb-1 select-none ${cfg.quote}`} aria-hidden>
        ❝
      </div>

      {/* Quote text */}
      <p className="text-sm text-fg leading-relaxed">{quote.text}</p>

      {/* Divider + attribution */}
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs font-semibold text-fg-muted">— {quote.author}</p>
        {quote.source && (
          <p className="text-[10px] text-fg-faint italic mt-0.5">{quote.source}</p>
        )}
      </div>
    </div>
  );
}

// ── FeaturedQuote ────────────────────────────────────────────────────────────

function FeaturedQuote({ quote }: { quote: Quote }) {
  const cfg = CAT_CONFIG[quote.category];
  return (
    <div className={`relative rounded-3xl border-2 bg-surface p-8 sm:p-10 overflow-hidden ${cfg.border}`}>
      {/* Background decorative quote mark */}
      <div className={`absolute -top-4 -left-2 text-[120px] font-serif leading-none select-none pointer-events-none ${cfg.quote} opacity-60`} aria-hidden>
        ❝
      </div>

      <div className="relative z-10">
        <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-6 ${cfg.badge}`}>
          Featured · {quote.category}
        </span>
        <blockquote className="text-xl sm:text-2xl font-medium text-fg leading-snug italic">
          {quote.text}
        </blockquote>
        <div className="mt-6 flex items-center gap-2">
          <div className="h-px flex-1 max-w-12 bg-border" />
          <p className="text-sm font-semibold text-fg-muted">
            {quote.author}
            {quote.source && <span className="text-fg-faint font-normal">, <em>{quote.source}</em></span>}
          </p>
          <span className="text-amber-400">★</span>
        </div>
      </div>
    </div>
  );
}

// ── Quote of the Week ────────────────────────────────────────────────────────

function getQuoteOfWeek(quotes: Quote[]): Quote {
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return quotes[weekIndex % quotes.length];
}

function WeeklyQuote({ quote }: { quote: Quote }) {
  const cfg = CAT_CONFIG[quote.category];
  return (
    <div className="relative rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 dark:from-indigo-950/30 dark:to-violet-950/20 p-6 sm:p-7 overflow-hidden mb-10">
      <div className="absolute top-3 right-4 text-[11px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
        Quote of the Week
      </div>
      <div className={`text-5xl font-serif leading-none mb-3 select-none ${cfg.quote} opacity-80`} aria-hidden>❝</div>
      <blockquote className="text-base sm:text-lg font-medium text-fg leading-relaxed italic mb-4">
        {quote.text}
      </blockquote>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-fg-muted">
          — {quote.author}
          {quote.source && <span className="text-fg-faint font-normal">, <em>{quote.source}</em></span>}
        </p>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {quote.category}
        </span>
      </div>
    </div>
  );
}

// ── Main Client Component ────────────────────────────────────────────────────

export default function QuotesClient({ quotes }: { quotes: Quote[] }) {
  const [activeCategory, setActiveCategory] = useState<QuoteCategory | "All">("All");

  const featured = quotes.find((q) => q.featured);
  const weeklyQuote = getQuoteOfWeek(quotes);

  const filtered = activeCategory === "All"
    ? quotes
    : quotes.filter((q) => q.category === activeCategory);

  const countByCategory = ALL_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = quotes.filter((q) => q.category === cat).length;
    return acc;
  }, {});

  const favoriteCount = quotes.filter((q) => q.favorite).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-12 sm:py-16">

      {/* Hero */}
      <div className="mb-14 sm:mb-16">
        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-faint mb-3">
          Collected Wisdom
        </p>

        {/* Large gradient ❝ */}
        <div
          className="text-[96px] leading-none font-serif mb-2 select-none"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          aria-hidden
        >
          ❝
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg mb-2">
          Favorite Quotes
        </h1>
        {profile.page_quotes && (
          <p className="text-sm text-fg-subtle mb-6 max-w-lg">
            {profile.page_quotes}
          </p>
        )}

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: `${quotes.length} quotes` },
            { label: `${ALL_CATEGORIES.length} categories` },
            { label: `${favoriteCount} favorites` },
          ].map(({ label }) => (
            <span
              key={label}
              className="inline-flex items-center text-[11px] font-medium text-fg-muted bg-surface border border-border rounded-full px-3 py-1"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Quote of the Week */}
      <WeeklyQuote quote={weeklyQuote} />

      {/* Featured quote */}
      {featured && featured.id !== weeklyQuote.id && (
        <div className="mb-12">
          <FeaturedQuote quote={featured} />
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {/* All pill */}
        <button
          onClick={() => setActiveCategory("All")}
          className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3.5 py-1.5 border transition-all duration-150 ${
            activeCategory === "All"
              ? "bg-fg text-bg border-fg shadow-sm"
              : "bg-surface border-border text-fg-faint hover:text-fg"
          }`}
        >
          All
          <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
            activeCategory === "All" ? "bg-bg/20 text-bg" : "bg-surface-raised text-fg-faint"
          }`}>
            {quotes.length}
          </span>
        </button>

        {ALL_CATEGORIES.map((cat) => {
          const cfg = CAT_CONFIG[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3.5 py-1.5 border transition-all duration-150 ${
                isActive ? cfg.pillActive : cfg.pill
              }`}
            >
              {cat}
              <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                isActive ? "bg-white/20 text-white" : "bg-surface-raised text-fg-faint"
              }`}>
                {countByCategory[cat]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-fg-faint">No quotes in this category yet.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 xl:columns-3 gap-4">
          {filtered.map((quote) => (
            <div key={quote.id} className="break-inside-avoid mb-4">
              <QuoteCard quote={quote} />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
