"use client";

import useSWR from "swr";
import QuotesClient from "@/components/QuotesClient";
import type { Quote } from "@/data/quotes";
import { QUOTES_KEY, fetchQuotes, normalizeQuote, type ApiQuote } from "@/lib/api/content";

interface Props {
  staticQuotes: Quote[];
}

const fetcher = () => fetchQuotes();

/**
 * Fetches quotes from the content API on the client.
 * Falls back to staticQuotes (bundled at build time) if the API is unreachable.
 */
export default function QuotesFeed({ staticQuotes }: Props) {
  const { data: apiQuotes } = useSWR<ApiQuote[]>(QUOTES_KEY, fetcher, {
    fallbackData: undefined,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const quotes: Quote[] = apiQuotes && apiQuotes.length > 0
    ? apiQuotes.map(normalizeQuote)
    : staticQuotes;

  return <QuotesClient quotes={quotes} />;
}
