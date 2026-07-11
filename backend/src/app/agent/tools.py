"""Shared, provider-agnostic tool registry.

One declarative source of truth for the read-only tools that expose Taruni's
portfolio. Consumed by two surfaces:
  - the public MCP server (app.mcp_server) — hiring managers connect their own
    Claude/Cursor and call these tools directly;
  - the agentic chat loop (routers/ai.py /chat/agentic) — Gemini function-calling
    picks tools per turn.

Every handler wraps an *existing* function or reads the knowledge JSON — there is
no new retrieval logic here, and **no LLM calls**, so the tools are cheap and
abuse-safe. Each Tool carries a JSON-Schema `parameters` block; the MCP and
Gemini adapters translate that into their respective declaration shapes.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

DATA_DIR = Path(__file__).parents[3] / "data" / "knowledge"


def _load(name: str) -> Any:
    try:
        return json.loads((DATA_DIR / f"{name}.json").read_text())
    except Exception:
        return None


# ── Handlers (pure data / retrieval — no LLM) ─────────────────────────────────

def _search_knowledge(query: str, limit: int = 5) -> list[dict]:
    """Run the same hybrid retrieval pipeline the chatbot uses, synchronously."""
    from app.rag import graph as rag_graph
    from app.rag import store as rag_store

    queries = [query, f"{query} Taruni Nallamothu"]
    dense = rag_store.query_batch(queries, n_per_query=6)
    bm25 = rag_store.bm25_query(query, n_results=15)
    merged = rag_store.rrf_merge(dense, bm25, k=60, top_n=20)
    top = rag_store.rerank_cross_encoder(query, merged, top_n=max(1, min(limit, 8)))
    extras = rag_graph.expand_context(
        retrieved_ids=[c["id"] for c in top], rrf_pool=merged, max_expansion=1
    )
    if extras:
        top = top + extras
    return [{"type": c["type"], "id": c["id"], "text": c["text"]} for c in top]


def _get_profile() -> dict:
    p = _load("profile") or {}
    return {k: p.get(k) for k in (
        "name", "tagline", "bio", "summary", "location", "email",
        "github", "linkedin", "interested_domain", "previous",
    )}


def _get_experience() -> list:
    return _load("experience") or []


def _get_projects() -> list:
    return _load("projects") or []


def _get_project(name: str) -> dict | None:
    name_l = (name or "").lower().strip()
    for p in _load("projects") or []:
        title = str(p.get("title", "")).lower()
        if name_l and (name_l in title or title in name_l):
            return p
    return None


def _get_skills() -> Any:
    return _load("skills") or []


def _get_education() -> list:
    return _load("education") or []


def _get_now() -> dict:
    p = _load("profile") or {}
    return {"now": p.get("now"), "currently": p.get("currently")}


def _get_resume() -> dict:
    p = _load("profile") or {}
    return {
        "resume_url": p.get("resume", ""),
        "linkedin": p.get("linkedin", ""),
        "github": p.get("github", ""),
        "email": p.get("email", ""),
    }


def _get_blog(slug: str = "") -> Any:
    """List blog posts (metadata only), or one full post when `slug` is given.

    Reads blog.json fresh on every call, so new posts (admin-published or pushed
    as MDX and re-ingested on deploy) appear automatically with no MCP restart.
    """
    posts = _load("blog") or []
    if slug:
        s = slug.lower().strip()
        for p in posts:
            if s in str(p.get("slug", "")).lower() or s in str(p.get("title", "")).lower():
                return p  # full post incl. content
        return None
    # List view: metadata only — keep the payload small, omit the full body.
    return [
        {k: p.get(k) for k in ("slug", "title", "date", "description", "tags")}
        for p in posts
    ]


def _get_lab(slug: str = "") -> Any:
    """List lab / system-design entries (metadata only), or one full entry by `slug`."""
    entries = _load("lab") or []
    if slug:
        s = slug.lower().strip()
        for e in entries:
            if s in str(e.get("slug", "")).lower() or s in str(e.get("title", "")).lower():
                return e  # full entry incl. content
        return None
    return [
        {k: e.get(k) for k in ("slug", "title", "status", "description", "startedAt", "updatedAt", "tech")}
        for e in entries
    ]


def _get_apps() -> list:
    """List every app/product Taruni hosts under her domain.

    Reads apps.json fresh on every call, so new hosted properties appear
    automatically with no MCP restart or code change.
    """
    apps = _load("apps") or []
    return [
        {k: a.get(k) for k in ("slug", "name", "url", "tagline", "status", "category", "tech")}
        for a in apps
    ]


def _get_app(name: str) -> dict | None:
    """Full details for one hosted app matched by name, slug, or domain."""
    q = (name or "").lower().strip()
    if not q:
        return None
    for a in _load("apps") or []:
        haystack = " ".join(str(a.get(k, "")) for k in ("slug", "name", "url")).lower()
        if q in haystack:
            return a
    return None


def _check_availability() -> str:
    try:
        from app.integrations.calendar import get_availability_summary
        return get_availability_summary() or "Availability is not currently published."
    except Exception:
        return "Availability is not currently published."


def _get_booking_link() -> dict:
    """Open call slots + Taruni's Google booking link, for scheduling intents.

    Always returns a usable card — the booking_url works even when the live
    calendar isn't connected (slots will just be empty).
    """
    try:
        from app.integrations.calendar import get_booking_card
        return get_booking_card()
    except Exception:
        p = _load("profile") or {}
        return {"booking_url": p.get("booking_url", ""), "open": True, "slots": []}


# ── Tool registry ─────────────────────────────────────────────────────────────

def _obj(props: dict | None = None, required: list[str] | None = None) -> dict:
    return {"type": "object", "properties": props or {}, "required": required or []}


@dataclass
class Tool:
    name: str
    description: str
    handler: Callable[..., Any]
    parameters: dict = field(default_factory=_obj)

    def run(self, **kwargs: Any) -> Any:
        return self.handler(**kwargs)


TOOLS: list[Tool] = [
    Tool(
        name="search_knowledge",
        description=(
            "Semantic + keyword search over Taruni's full portfolio knowledge base "
            "(experience, projects, skills, education, blog, lab notes, hosted apps). "
            "Returns the most relevant grounded snippets. Use this for open-ended questions."
        ),
        handler=_search_knowledge,
        parameters=_obj(
            {
                "query": {"type": "string", "description": "Natural-language question or topic."},
                "limit": {"type": "integer", "description": "Max snippets to return (1-8).", "default": 5},
            },
            required=["query"],
        ),
    ),
    Tool(
        name="get_profile",
        description="Taruni's headline profile: name, tagline, bio, summary, location, and contact links.",
        handler=_get_profile,
    ),
    Tool(
        name="get_experience",
        description="Full work history — companies, roles, dates, tech, and impact bullets.",
        handler=_get_experience,
    ),
    Tool(
        name="get_projects",
        description="All projects with title, description, tech tags, awards, and source links.",
        handler=_get_projects,
    ),
    Tool(
        name="get_project",
        description="Details for a single project matched by name (e.g. 'EcoCast', 'LeafCare').",
        handler=_get_project,
        parameters=_obj(
            {"name": {"type": "string", "description": "Project name or partial title."}},
            required=["name"],
        ),
    ),
    Tool(
        name="get_skills",
        description="Technical skills grouped by category.",
        handler=_get_skills,
    ),
    Tool(
        name="get_education",
        description="Degrees, institutions, GPA, and highlights.",
        handler=_get_education,
    ),
    Tool(
        name="get_now",
        description="What Taruni is currently building, learning, and focused on right now.",
        handler=_get_now,
    ),
    Tool(
        name="get_blog",
        description=(
            "List Taruni's blog posts — slug, title, date, description, tags. "
            "Pass `slug` (a slug or title fragment) to fetch one post's full content."
        ),
        handler=_get_blog,
        parameters=_obj(
            {"slug": {"type": "string", "description": "Optional — slug or title fragment to fetch one post's full content."}},
        ),
    ),
    Tool(
        name="get_lab",
        description=(
            "List Taruni's lab / system-design entries — slug, title, status, tech, dates. "
            "Pass `slug` (a slug or title fragment) to fetch one entry's full content."
        ),
        handler=_get_lab,
        parameters=_obj(
            {"slug": {"type": "string", "description": "Optional — slug or title fragment to fetch one entry's full content."}},
        ),
    ),
    Tool(
        name="get_apps",
        description=(
            "List every app and product Taruni hosts under her domain (jayaremala.com) — "
            "with name, URL, status, category, and tech. Use this for "
            "'what else has she built / what's hosted on her site / what products does she run' "
            "questions. The registry is dynamic, so future apps appear here automatically."
        ),
        handler=_get_apps,
    ),
    Tool(
        name="get_app",
        description="Full details for one hosted app matched by name, slug, or domain.",
        handler=_get_app,
        parameters=_obj(
            {"name": {"type": "string", "description": "App name, slug, or domain fragment."}},
            required=["name"],
        ),
    ),
    Tool(
        name="get_resume",
        description="Links to Taruni's latest resume, LinkedIn, GitHub, and email.",
        handler=_get_resume,
    ),
    Tool(
        name="check_availability",
        description=(
            "Whether Taruni is open to opportunities, in natural language. Use for "
            "'is she available / open to work' questions — NOT for actually booking."
        ),
        handler=_check_availability,
    ),
    Tool(
        name="get_booking_link",
        description=(
            "Use when the visitor wants to schedule, book, or set up a call/meeting/interview. "
            "Returns Taruni's real open 30-min slots plus her Google booking link. The UI renders "
            "these as a booking card — so invite the visitor to pick a time, don't list the slots yourself."
        ),
        handler=_get_booking_link,
    ),
]

TOOLS_BY_NAME: dict[str, Tool] = {t.name: t for t in TOOLS}
