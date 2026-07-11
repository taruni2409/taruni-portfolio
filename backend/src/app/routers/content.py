"""Content CRUD API — blog posts, lab entries, quotes.

Public GET endpoints return live data from content.db.
Write endpoints (POST/PUT/DELETE) require Bearer <admin password>, verified against
ADMIN_PASSWORD_HASH.
After every write, a background task regenerates the corresponding JSON file
and triggers run_ingest() so ChromaDB stays in sync — zero user-visible latency.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.db import content as content_db
from app.rag.ingest import remove_docs_by_id, run_ingest
from app.routers.admin import _require_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["content"])


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class BlogPostIn(BaseModel):
    slug: str
    title: str
    date: str = ""
    published_at: str = ""
    description: str = ""
    tags: list[str] = []
    image: str | None = None
    content: str = ""
    published: bool = True

    @field_validator("slug")
    @classmethod
    def slug_safe(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return v


class BlogPostOut(BlogPostIn):
    id: int
    created_at: str
    updated_at: str


class LabEntryIn(BaseModel):
    slug: str
    title: str
    status: Literal["active", "paused", "shipped"] = "active"
    description: str = ""
    started_at: str = ""
    updated_at: str = ""
    tech: list[str] = []
    links: list[dict[str, str]] = []
    content: str = ""

    @field_validator("slug")
    @classmethod
    def slug_safe(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return v


class LabEntryOut(LabEntryIn):
    id: int
    created_at: str


class QuoteIn(BaseModel):
    quote_id: str
    text: str
    author: str
    source: str | None = None
    category: str = "Philosophy"
    favorite: bool = False
    featured: bool = False
    added_at: str = ""


class QuoteOut(QuoteIn):
    id: int
    created_at: str


# ── Background RAG sync ────────────────────────────────────────────────────────

def _sync_blog_to_rag() -> None:
    try:
        content_db.regenerate_blog_json()
        run_ingest()
    except Exception as exc:
        logger.error("Blog RAG sync failed (non-fatal): %s", exc)


def _sync_lab_to_rag() -> None:
    try:
        content_db.regenerate_lab_json()
        run_ingest()
    except Exception as exc:
        logger.error("Lab RAG sync failed (non-fatal): %s", exc)


def _cleanup_blog_analytics(slug: str) -> None:
    try:
        from app.db.blog_stats import delete_post_stats
        from app.db.analytics import delete_page_visits
        delete_post_stats(slug)
        delete_page_visits(f"/blog/{slug}")
    except Exception as exc:
        logger.error("Blog analytics cleanup failed (non-fatal): %s", exc)


def _rag_sync_after_delete() -> None:
    """Run incremental ingest after any content deletion.

    The JSON knowledge files are already regenerated synchronously in the delete
    handler before this task runs, so ingest sees the correct (post-delete) state
    and removes the stale ChromaDB documents detected via hash comparison.
    Also rebuilds the BM25 index and updates FAQ summary documents.
    """
    try:
        run_ingest()
    except Exception as exc:
        logger.error("RAG sync after delete failed (non-fatal): %s", exc)


def _sync_quotes_to_rag() -> None:
    try:
        content_db.regenerate_quotes_json()
        run_ingest()
    except Exception as exc:
        logger.error("Quotes RAG sync failed (non-fatal): %s", exc)


def _cleanup_lab_analytics(slug: str) -> None:
    try:
        from app.db.analytics import delete_page_visits
        delete_page_visits(f"/lab/{slug}")
    except Exception as exc:
        logger.error("Lab analytics cleanup failed (non-fatal): %s", exc)


# ── Blog endpoints ─────────────────────────────────────────────────────────────

@router.get("/blog")
def list_blog_posts(
    include_drafts: bool = False,
    _token: Any = Depends(_require_token) if False else None,
) -> list[dict]:
    # include_drafts requires auth — checked below to avoid coupling to Depends
    return content_db.list_blog_posts(include_drafts=False)


@router.get("/blog/drafts", dependencies=[Depends(_require_token)])
def list_blog_drafts() -> list[dict]:
    return content_db.list_blog_posts(include_drafts=True)


@router.get("/blog/{slug}")
def get_blog_post(slug: str) -> dict:
    post = content_db.get_blog_post(slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/blog", status_code=201, dependencies=[Depends(_require_token)])
def create_blog_post(body: BlogPostIn, background_tasks: BackgroundTasks) -> dict:
    if content_db.get_blog_post(body.slug):
        raise HTTPException(status_code=409, detail="Slug already exists")
    result = content_db.create_blog_post(body.model_dump())
    background_tasks.add_task(_sync_blog_to_rag)
    return result


@router.put("/blog/{slug}", dependencies=[Depends(_require_token)])
def update_blog_post(slug: str, body: BlogPostIn, background_tasks: BackgroundTasks) -> dict:
    result = content_db.update_blog_post(slug, body.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Post not found")
    background_tasks.add_task(_sync_blog_to_rag)
    return result


@router.delete("/blog/{slug}", status_code=204, dependencies=[Depends(_require_token)])
def delete_blog_post(slug: str, background_tasks: BackgroundTasks) -> None:
    if not content_db.delete_blog_post(slug):
        raise HTTPException(status_code=404, detail="Post not found")
    # Regenerate blog.json synchronously so any reingest triggered by the
    # frontend (triggerReingest) sees the correct post-delete state.
    content_db.regenerate_blog_json()
    # Directly evict the document from ChromaDB + hash file immediately.
    remove_docs_by_id([f"blog_{slug}"])
    # Full incremental ingest in background: updates faq_blog count, BM25 index,
    # and removes any remaining stale hashes.
    background_tasks.add_task(_rag_sync_after_delete)
    background_tasks.add_task(_cleanup_blog_analytics, slug)


# ── Lab endpoints ──────────────────────────────────────────────────────────────

@router.get("/lab")
def list_lab_entries() -> list[dict]:
    return content_db.list_lab_entries()


@router.get("/lab/{slug}")
def get_lab_entry(slug: str) -> dict:
    entry = content_db.get_lab_entry(slug)
    if not entry:
        raise HTTPException(status_code=404, detail="Lab entry not found")
    return entry


@router.post("/lab", status_code=201, dependencies=[Depends(_require_token)])
def create_lab_entry(body: LabEntryIn, background_tasks: BackgroundTasks) -> dict:
    if content_db.get_lab_entry(body.slug):
        raise HTTPException(status_code=409, detail="Slug already exists")
    result = content_db.create_lab_entry(body.model_dump())
    background_tasks.add_task(_sync_lab_to_rag)
    return result


@router.put("/lab/{slug}", dependencies=[Depends(_require_token)])
def update_lab_entry(slug: str, body: LabEntryIn, background_tasks: BackgroundTasks) -> dict:
    result = content_db.update_lab_entry(slug, body.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Lab entry not found")
    background_tasks.add_task(_sync_lab_to_rag)
    return result


@router.delete("/lab/{slug}", status_code=204, dependencies=[Depends(_require_token)])
def delete_lab_entry(slug: str, background_tasks: BackgroundTasks) -> None:
    if not content_db.delete_lab_entry(slug):
        raise HTTPException(status_code=404, detail="Lab entry not found")
    content_db.regenerate_lab_json()
    remove_docs_by_id([f"lab_{slug}"])
    background_tasks.add_task(_rag_sync_after_delete)
    background_tasks.add_task(_cleanup_lab_analytics, slug)


# ── Quotes endpoints ───────────────────────────────────────────────────────────

@router.get("/quotes")
def list_quotes() -> list[dict]:
    return content_db.list_quotes()


@router.get("/quotes/{quote_id}")
def get_quote(quote_id: str) -> dict:
    q = content_db.get_quote(quote_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")
    return q


@router.post("/quotes", status_code=201, dependencies=[Depends(_require_token)])
def create_quote(body: QuoteIn, background_tasks: BackgroundTasks) -> dict:
    if content_db.get_quote(body.quote_id):
        raise HTTPException(status_code=409, detail="quote_id already exists")
    result = content_db.create_quote(body.model_dump())
    background_tasks.add_task(_sync_quotes_to_rag)
    return result


@router.put("/quotes/{quote_id}", dependencies=[Depends(_require_token)])
def update_quote(quote_id: str, body: QuoteIn, background_tasks: BackgroundTasks) -> dict:
    result = content_db.update_quote(quote_id, body.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Quote not found")
    background_tasks.add_task(_sync_quotes_to_rag)
    return result


@router.delete("/quotes/{quote_id}", status_code=204, dependencies=[Depends(_require_token)])
def delete_quote(quote_id: str, background_tasks: BackgroundTasks) -> None:
    if not content_db.delete_quote(quote_id):
        raise HTTPException(status_code=404, detail="Quote not found")
    content_db.regenerate_quotes_json()
    # Quote ChromaDB IDs use a stable slug derived from quote_id (matches ingest.py).
    stable = re.sub(r"[^a-z0-9]+", "_", str(quote_id).lower()).strip("_")
    remove_docs_by_id([f"quote_{stable}"])
    background_tasks.add_task(_rag_sync_after_delete)
