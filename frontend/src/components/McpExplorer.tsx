"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";

interface ToolParam {
  type: string;
  description?: string;
  default?: unknown;
}
interface ToolDef {
  name: string;
  description: string;
  parameters: { properties?: Record<string, ToolParam>; required?: string[] };
}

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-faint">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="text-[10px] font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[11px] leading-relaxed font-mono text-fg-muted whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

export default function McpExplorer() {
  const mcpUrl = `${API_BASE_URL.replace(/\/$/, "")}/mcp`;

  const [tools, setTools] = useState<ToolDef[]>([]);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/tools`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setTools(d.tools ?? []); setActive(d.tools?.[0]?.name ?? null); })
      .catch(() => setError(true));
  }, []);

  const activeTool = useMemo(() => tools.find((t) => t.name === active), [tools, active]);

  const claudeConfig = useMemo(
    () =>
      JSON.stringify(
        { mcpServers: { "jaya-portfolio": { command: "npx", args: ["mcp-remote", mcpUrl] } } },
        null,
        2,
      ),
    [mcpUrl],
  );
  const cursorConfig = useMemo(
    () => JSON.stringify({ mcpServers: { "jaya-portfolio": { url: mcpUrl } } }, null, 2),
    [mcpUrl],
  );

  async function run() {
    if (!activeTool) return;
    setRunning(true);
    setResult(null);
    const props = activeTool.parameters.properties ?? {};
    const body: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(args)) {
      if (val === "" || !(key in props)) continue;
      body[key] = props[key].type === "integer" ? Number(val) : val;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/tools/${activeTool.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(JSON.stringify(res.ok ? data.result : data, null, 2));
    } catch {
      setResult("Request failed — the backend may be warming up. Try again in a moment.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Connect config */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-fg-faint mb-1">
          Connect your AI client
        </h2>
        <p className="text-sm text-fg-muted mb-4">
          Point Claude Desktop or Cursor at the server below, then ask your model about Taruni — it will
          call these tools directly. Endpoint:{" "}
          <code className="rounded bg-surface-raised px-1.5 py-0.5 text-[12px] font-mono text-accent break-all">
            {mcpUrl}
          </code>
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <CopyBlock label="Claude Desktop — claude_desktop_config.json" code={claudeConfig} />
          <CopyBlock label="Cursor — ~/.cursor/mcp.json" code={cursorConfig} />
        </div>
      </section>

      {/* Live playground */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-fg-faint mb-1">
          Live playground
        </h2>
        <p className="text-sm text-fg-muted mb-4">
          The same read-only tools, callable right here. No login, no LLM cost — these return Taruni&apos;s
          real data.
        </p>

        {error && (
          <p className="text-sm text-fg-faint">The tools API is warming up — refresh in a moment.</p>
        )}

        {!error && tools.length === 0 && (
          <div className="h-32 rounded-xl bg-surface-raised animate-pulse" />
        )}

        {tools.length > 0 && (
          <div className="grid sm:grid-cols-[200px_1fr] gap-4">
            {/* Tool list */}
            <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
              {tools.map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setActive(t.name); setArgs({}); setResult(null); }}
                  className={`text-left rounded-lg px-3 py-2 text-[12px] font-mono whitespace-nowrap transition-colors ${
                    active === t.name
                      ? "bg-accent text-white"
                      : "bg-surface border border-border text-fg-muted hover:border-accent/50 hover:text-accent"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Tool detail + runner */}
            <div className="rounded-xl border border-border bg-surface p-4 min-w-0">
              {activeTool && (
                <>
                  <p className="text-[13px] text-fg-muted leading-relaxed mb-3">{activeTool.description}</p>
                  <div className="space-y-2 mb-3">
                    {Object.entries(activeTool.parameters.properties ?? {}).map(([key, p]) => {
                      const required = activeTool.parameters.required?.includes(key);
                      return (
                        <label key={key} className="block">
                          <span className="text-[11px] font-medium text-fg-subtle">
                            {key}
                            {required && <span className="text-accent"> *</span>}
                            <span className="text-fg-faint font-mono"> : {p.type}</span>
                          </span>
                          <input
                            value={args[key] ?? ""}
                            onChange={(e) => setArgs((a) => ({ ...a, [key]: e.target.value }))}
                            placeholder={p.description ?? ""}
                            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-[13px] text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none"
                          />
                        </label>
                      );
                    })}
                    {Object.keys(activeTool.parameters.properties ?? {}).length === 0 && (
                      <p className="text-[11px] text-fg-faint italic">No parameters — just run it.</p>
                    )}
                  </div>
                  <button
                    onClick={run}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-hover disabled:opacity-60 transition-colors"
                  >
                    {running ? "Running…" : "Run tool"}
                  </button>

                  {result && (
                    <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-border bg-bg p-3 text-[11px] leading-relaxed font-mono text-fg-muted whitespace-pre-wrap break-words">
                      {result}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
