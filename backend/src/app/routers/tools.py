"""Browser-friendly REST view of the shared tool registry.

Real MCP clients (Claude Desktop / Cursor) connect to the MCP server at /mcp.
Browsers can't speak the MCP transport directly, so this thin REST surface lets
the public /mcp playground page list the tools and invoke them. Same registry,
same read-only handlers, no LLM calls.
"""
from __future__ import annotations

import logging

import anyio
from fastapi import APIRouter, HTTPException, Request

from app.agent.tools import TOOLS, TOOLS_BY_NAME
from app.core.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("")
def list_tools() -> dict:
    return {
        "mcp_endpoint": "/mcp",
        "tools": [
            {"name": t.name, "description": t.description, "parameters": t.parameters}
            for t in TOOLS
        ],
    }


@router.post("/{name}")
@limiter.limit("30/minute")
async def run_tool(name: str, request: Request, body: dict | None = None) -> dict:
    tool = TOOLS_BY_NAME.get(name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {name}")
    args = body or {}
    allowed = set(tool.parameters.get("properties", {}).keys())
    kwargs = {k: v for k, v in args.items() if k in allowed}
    try:
        result = await anyio.to_thread.run_sync(lambda: tool.run(**kwargs))
    except TypeError as exc:  # missing/extra args
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("tool %s failed: %s", name, exc)
        raise HTTPException(status_code=500, detail="tool execution failed") from exc
    return {"tool": name, "result": result}
