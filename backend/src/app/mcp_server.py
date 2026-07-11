"""Public, read-only MCP server for Taruni's portfolio.

Exposes the shared tool registry (app.agent.tools) over the MCP streamable-HTTP
transport so a hiring manager can connect their own Claude Desktop / Cursor and
query Taruni's experience, projects, availability, and resume directly. No LLM
calls happen here — the client's model does the reasoning — so it is cheap and
abuse-safe. Mounted into the FastAPI app at /mcp by app.main.
"""
from __future__ import annotations

import logging

from app.agent.tools import TOOLS

logger = logging.getLogger(__name__)

INSTRUCTIONS = (
    "Tools for exploring the professional portfolio of Taruni Nallamothu — "
    "a Data Engineer & Machine Learning Engineer specializing in scalable ETL pipelines, "
    "predictive modelling, and cloud analytics on Azure and GCP. Use search_knowledge for "
    "open-ended questions; use the get_* tools for structured facts; use check_availability "
    "for scheduling. All data is read-only."
)

# Heavier handlers touch ChromaDB / external calendar — run them off the event loop.
_RUN_IN_THREAD = {"search_knowledge", "check_availability"}


def build_mcp_app(path: str = "/"):
    """Construct the FastMCP streamable-HTTP ASGI app. Returns an app whose
    `.lifespan` must be entered by the host application (see app.main)."""
    from fastmcp import FastMCP
    from fastmcp.tools import Tool as FunctionTool

    mcp = FastMCP(name="Taruni Nallamothu — Portfolio", instructions=INSTRUCTIONS)
    for tool in TOOLS:
        mcp.add_tool(
            FunctionTool.from_function(
                tool.handler,
                name=tool.name,
                description=tool.description,
                run_in_thread=(tool.name in _RUN_IN_THREAD),
            )
        )
    logger.info("MCP server built with %d tools", len(TOOLS))
    # stateless_http=True drops the per-session handshake: every request is
    # independent, so public clients can POST without first negotiating (and
    # carrying) an Mcp-Session-Id header. Required for a connect-from-anywhere
    # endpoint and for running behind a load balancer with no session affinity.
    return mcp.http_app(path=path, transport="http", stateless_http=True)
