import type { Metadata } from "next";
import McpExplorer from "@/components/McpExplorer";

const SITE_URL = "https://taruni-portfolio.vercel.app";

export const metadata: Metadata = {
  title: "MCP — Connect your LLM to my work | Taruni Nallamothu",
  description:
    "A public Model Context Protocol server exposing Taruni's portfolio as read-only tools. Connect Claude Desktop or Cursor and let your own AI query her experience, projects, and availability.",
  alternates: { canonical: `${SITE_URL}/mcp` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/mcp`,
    title: "MCP — Connect your LLM to my work",
    description:
      "Public MCP server exposing Taruni's portfolio as read-only tools for Claude Desktop / Cursor.",
    siteName: "Taruni Nallamothu",
  },
};

export default function McpPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent mb-2">
          Model Context Protocol
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg">
          Connect your own LLM to my work
        </h1>
        <p className="mt-3 text-sm text-fg-muted leading-relaxed max-w-2xl">
          This site runs a public <strong className="text-fg">MCP server</strong> — the open standard
          for giving AI assistants tools. Add it to Claude Desktop or Cursor and your model can query
          my experience, projects, skills, and availability directly, grounded in real data. The tools
          are <strong className="text-fg">read-only</strong> and make no LLM calls of their own — your
          model does the reasoning. Try them live below.
        </p>
      </header>

      <McpExplorer />
    </div>
  );
}
