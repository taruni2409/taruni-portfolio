import type { Metadata } from "next";
import SystemDashboard from "@/components/SystemDashboard";

const SITE_URL = "https://taruni-portfolio.vercel.app";

export const metadata: Metadata = {
  title: "System — Live observability | Taruni Nallamothu",
  description:
    "Production observability for this site's AI backend: reliability and uptime, latency percentiles, token cost, answer quality, and per-request traces — live.",
  alternates: { canonical: `${SITE_URL}/system` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/system`,
    title: "System — Live observability",
    description:
      "Reliability, latency, cost, and per-request traces for Pumpkin's hybrid RAG pipeline — read live from production.",
    siteName: "Taruni Nallamothu",
  },
};

export default function SystemPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent mb-2">
          Live observability
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg">
          How this site performs, in real time
        </h1>
        <p className="mt-3 text-sm text-fg-muted leading-relaxed max-w-2xl">
          The dashboard an engineer would actually open: reliability and uptime, latency percentiles
          down to each pipeline stage, token cost, answer quality, and a live trace of recent requests.
          Pumpkin runs a hybrid retrieval pipeline — HyDE query expansion, dense (BAAI/bge-base) plus
          BM25 merged with Reciprocal Rank Fusion, a 1-hop knowledge graph, and a model-fallback chain.
          Everything here is read live from the production backend.
        </p>
      </header>

      <SystemDashboard />
    </div>
  );
}
