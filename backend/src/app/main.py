import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.limiter import limiter
from app.core.settings import settings
from app.db import analytics, blog_stats, content
from app.rag import graph as rag_graph
from app.rag.ingest import run_ingest
from app.rag.store import warmup as rag_warmup
from app.routers.admin import router as admin_router
from app.routers.ai import router as ai_router
from app.routers.blog import router as blog_router
from app.routers.content import router as content_router
from app.routers.stats import router as stats_router
from app.routers.tools import router as tools_router

logger = logging.getLogger(__name__)

# Build the public MCP server once at import. Non-fatal if fastmcp is missing —
# the rest of the API keeps working.
try:
    from app.mcp_server import build_mcp_app
    _mcp_app = build_mcp_app(path="/")
except Exception as exc:  # noqa: BLE001
    logger.warning("MCP server unavailable (non-fatal): %s", exc)
    _mcp_app = None


def _background_startup() -> None:
    logger.info("Starting up — ingesting knowledge base...")
    try:
        result = run_ingest()
        logger.info("Knowledge base ready: %s", result)
        rag_graph.build_graph()
    except Exception as exc:
        logger.warning("RAG ingest failed (non-fatal): %s", exc)
    try:
        rag_warmup()
    except Exception as exc:
        logger.warning("Model warmup failed (non-fatal): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        analytics.init_db()
    except Exception as exc:
        logger.error("analytics.init_db failed (non-fatal): %s", exc)
    try:
        blog_stats.init_db()
    except Exception as exc:
        logger.error("blog_stats.init_db failed (non-fatal): %s", exc)
    try:
        content.init_db()
    except Exception as exc:
        logger.error("content.init_db failed (non-fatal): %s", exc)
    threading.Thread(target=_background_startup, daemon=True).start()
    # The MCP streamable-HTTP app manages its own session lifespan — enter it so
    # the mounted /mcp endpoint works.
    if _mcp_app is not None:
        async with _mcp_app.lifespan(app):
            yield
    else:
        yield


app = FastAPI(title="Portfolio API", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

_origins = [o.strip() for o in settings.frontend_origin.split(",") if o.strip()]


class ScopedCORSMiddleware:
    """Path-aware CORS: permissive for the public /mcp endpoint, restrictive
    everywhere else.

    A single global CORSMiddleware is the outermost layer and so handles *all*
    OPTIONS preflights — including those for /mcp — before they can reach a
    permissive wrapper mounted deeper. That meant preflights from connector
    origins we can't enumerate (e.g. https://claude.ai) were rejected with
    400 "Disallowed CORS origin", breaking the connector handshake. Dispatching
    by path here lets /mcp accept any origin while the rest of the API keeps its
    locked-down policy.
    """

    def __init__(self, app):
        self._permissive = CORSMiddleware(
            app,
            allow_origins=["*"],
            allow_methods=["GET", "POST", "OPTIONS", "DELETE"],
            allow_headers=["*"],
            expose_headers=["Mcp-Session-Id", "Mcp-Protocol-Version"],
        )
        self._restrictive = CORSMiddleware(
            app,
            allow_origins=_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http" and scope.get("path", "").startswith("/mcp"):
            await self._permissive(scope, receive, send)
        else:
            await self._restrictive(scope, receive, send)


class MCPTrailingSlashShim:
    """Serve the MCP endpoint at both /mcp and /mcp/.

    The streamable-HTTP app is mounted at /mcp, so its route lives at /mcp/; a
    bare /mcp would otherwise 307-redirect to add the slash. Browser MCP clients
    (and some connectors) won't follow that redirect on a preflight, so the
    handshake fails. Rewriting the exact path /mcp -> /mcp/ before the router
    sees it makes both forms work with no redirect. Must run as app-level
    middleware: the redirect is decided at routing time, before the mounted app
    is reached.
    """

    def __init__(self, app):
        self._app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http" and scope.get("path") == "/mcp":
            scope = dict(scope)
            scope["path"] = "/mcp/"
            raw = scope.get("raw_path")
            if raw is not None:
                scope["raw_path"] = raw + b"/"
        await self._app(scope, receive, send)


app.add_middleware(ScopedCORSMiddleware)
# Added last → outermost, so the rewrite happens before CORS and routing.
app.add_middleware(MCPTrailingSlashShim)

app.include_router(admin_router)
app.include_router(ai_router)
app.include_router(blog_router)
app.include_router(content_router)
app.include_router(stats_router)
app.include_router(tools_router)

# Mount the public MCP server (read-only portfolio tools over streamable-HTTP).
# The main API's CORS is locked to Taruni's domains, but MCP is meant to be reached
# from anywhere — including browser-based clients (e.g. claude.ai connectors) whose
# origin we can't enumerate. Permissive CORS for this path is applied by
# ScopedCORSMiddleware above (it must run for OPTIONS preflights, which a mount
# wrapper never sees). Lifespan is still entered on _mcp_app (see lifespan()), so
# the session manager that serves requests is the same one started at startup.
if _mcp_app is not None:
    app.mount("/mcp", _mcp_app)


@app.get("/health")
def health() -> dict:
    status: dict[str, str] = {
        "api": "ok",
        "analytics_db": "ok",
        "content_db": "ok",
        "rag": "ok",
    }
    try:
        with analytics._connect() as c:
            c.execute("SELECT 1")
    except Exception:
        status["analytics_db"] = "degraded"
    try:
        with content._connect() as c:
            c.execute("SELECT 1")
    except Exception:
        status["content_db"] = "degraded"
    try:
        from app.rag.store import get_collection
        get_collection().count()
    except Exception:
        status["rag"] = "degraded"
    overall = "ok" if all(v == "ok" for v in status.values()) else "degraded"
    return {"status": overall, **status}
