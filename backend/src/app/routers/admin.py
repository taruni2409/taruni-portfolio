import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.admin_auth import verify_password
from app.core.settings import settings
from app.rag.ingest import DATA_DIR, run_ingest

router = APIRouter(prefix="/admin", tags=["admin"])
_bearer = HTTPBearer(auto_error=False)

# In-memory state for the long-running reingest task (single Railway instance)
_reingest_state: dict = {"running": False, "result": None, "error": None}


def _require_token(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> None:
    if not settings.admin_password_hash:
        raise HTTPException(status_code=403, detail="Admin endpoint disabled")
    if creds is None or not verify_password(creds.credentials, settings.admin_password_hash):
        raise HTTPException(status_code=401, detail="Invalid token")


async def _run_ingest_background(force: bool) -> None:
    """Run blocking ingest in a thread so the event loop stays free."""
    try:
        result = await asyncio.to_thread(run_ingest, force)
        _reingest_state["result"] = result
        _reingest_state["error"] = None
    except Exception as exc:
        _reingest_state["result"] = None
        _reingest_state["error"] = str(exc)
    finally:
        _reingest_state["running"] = False


@router.post("/reingest", dependencies=[Depends(_require_token)])
async def reingest(background_tasks: BackgroundTasks, force: bool = False) -> dict:
    """Start a knowledge-base rebuild in the background and return immediately.

    Poll GET /admin/reingest/status to check progress.
    Pass ?force=true to re-embed every document regardless of hash.
    """
    if _reingest_state["running"]:
        return {"status": "already_running"}
    _reingest_state["running"] = True
    _reingest_state["result"] = None
    _reingest_state["error"] = None
    background_tasks.add_task(_run_ingest_background, force)
    return {"status": "started"}


@router.get("/reingest/status", dependencies=[Depends(_require_token)])
def reingest_status() -> dict:
    """Poll this endpoint to check if a background reingest has finished."""
    return {
        "running": _reingest_state["running"],
        "result": _reingest_state["result"],
        "error": _reingest_state["error"],
    }


@router.get("/sync-status", dependencies=[Depends(_require_token)])
def sync_status() -> dict:
    """Return per-content-type counts from content.db, JSON knowledge files, and ChromaDB.

    Used by the admin Sync panel to surface what's indexed, what's in the DB,
    and when the last full sync completed. All reads are fast (no embedding).
    """
    from app.db import content as content_db  # noqa: PLC0415

    def count_json(filename: str) -> int:
        path = DATA_DIR / filename
        try:
            return len(json.loads(path.read_text())) if path.exists() else 0
        except Exception:
            return 0

    # content.db row counts
    db_blogs  = len(content_db.list_blog_posts(include_drafts=True))
    db_labs   = len(content_db.list_lab_entries())
    db_quotes = len(content_db.list_quotes())

    # Knowledge JSON file counts
    json_counts = {
        "blog":         count_json("blog.json"),
        "lab":          count_json("lab.json"),
        "quotes":       count_json("quotes.json"),
        "experience":   count_json("experience.json"),
        "education":    count_json("education.json"),
        "projects":     count_json("projects.json"),
        "apps":         count_json("apps.json"),
        "skills":       count_json("skills.json"),
        "testimonials": count_json("testimonials.json"),
        "gallery":      count_json("gallery.json"),
    }

    # ChromaDB — total count + per-type by ID prefix (single get() call)
    chroma_total = 0
    chroma_by_type: dict[str, int] = {}
    try:
        from app.rag.store import get_collection  # noqa: PLC0415
        collection = get_collection()
        chroma_total = collection.count()
        if chroma_total > 0:
            all_ids: list[str] = collection.get(include=[])["ids"]
            prefixes = ["blog", "lab", "quote", "exp", "edu", "proj", "app", "skills",
                        "testimonial", "gallery", "faq", "profile"]
            for prefix in prefixes:
                chroma_by_type[prefix] = sum(1 for id_ in all_ids if id_.startswith(f"{prefix}_"))
    except Exception:
        pass

    # Last ingest time — mtime of .doc_hashes.json
    last_ingest_ts: float | None = None
    try:
        hashes_path = Path(settings.chroma_db_path) / ".doc_hashes.json"
        if hashes_path.exists():
            last_ingest_ts = hashes_path.stat().st_mtime
    except Exception:
        pass

    return {
        "content_db": {"blogs": db_blogs, "labs": db_labs, "quotes": db_quotes},
        "json_files": json_counts,
        "chromadb": {"total": chroma_total, "by_type": chroma_by_type},
        "last_ingest_ts": last_ingest_ts,
        "ingest_running": _reingest_state["running"],
    }


# ── Google Auth endpoints ─────────────────────────────────────────────────────

@router.get("/google-auth/status", dependencies=[Depends(_require_token)])
def google_auth_status() -> dict:
    """Return Google OAuth connection status and which scopes are live."""
    try:
        from app.integrations.google_auth import get_status
        return get_status()
    except ImportError:
        return {"connected": False, "error": "google-auth not installed"}


@router.get("/google-auth/init", dependencies=[Depends(_require_token)])
def google_auth_init(request: Request) -> dict:
    """Return the Google OAuth authorization URL for the admin to open."""
    try:
        from app.integrations.google_auth import get_auth_url
        from app.core.settings import settings
        # Redirect back to the admin panel after OAuth
        origin = settings.frontend_origin.split(",")[0].strip()
        redirect_uri = f"{origin}/admin/google-callback"
        url = get_auth_url(redirect_uri)
        return {"auth_url": url, "redirect_uri": redirect_uri}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


class GoogleCallbackBody(BaseModel):
    code: str
    redirect_uri: str


@router.post("/google-auth/callback", dependencies=[Depends(_require_token)])
def google_auth_callback(body: GoogleCallbackBody) -> dict:
    """Exchange an OAuth code for tokens and persist them."""
    try:
        from app.integrations.google_auth import exchange_code
        return exchange_code(body.code, body.redirect_uri)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/google-auth/revoke", dependencies=[Depends(_require_token)])
def google_auth_revoke() -> dict:
    """Delete the stored Google OAuth token."""
    from app.integrations.google_auth import revoke
    revoke()
    return {"ok": True}


# ── Gmail / Inbox Digest endpoints ────────────────────────────────────────────

@router.post("/gmail/digest", dependencies=[Depends(_require_token)])
async def gmail_inbox_digest() -> dict:
    """Fetch recruiter inbox signals, summarize, write inbox_signals.json, and re-ingest."""
    try:
        from app.integrations.gmail import fetch_recruiter_signals, summarize_signals
        signals = await asyncio.to_thread(fetch_recruiter_signals)
        summary = await asyncio.to_thread(summarize_signals, signals)

        from app.rag.ingest import DATA_DIR
        import json
        out_path = DATA_DIR / "inbox_signals.json"
        out_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False))

        # Incremental re-ingest in background
        if not _reingest_state["running"]:
            _reingest_state["running"] = True
            asyncio.create_task(_run_ingest_background(False))

        return summary
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Calendar preview endpoints ────────────────────────────────────────────────

@router.get("/calendar/status", dependencies=[Depends(_require_token)])
async def calendar_status() -> dict:
    """Return Google Calendar connection status + next 3 free slots."""
    try:
        from app.integrations.google_auth import get_status
        status = get_status()
        if not status.get("connected") or not status.get("has_calendar"):
            return {"connected": False}

        from app.integrations.calendar import get_free_slots
        slots = await asyncio.to_thread(get_free_slots, 7)
        return {"connected": True, "next_slots": slots[:3]}
    except Exception as exc:
        return {"connected": False, "error": str(exc)}


@router.get("/calendar/preview", dependencies=[Depends(_require_token)])
async def calendar_preview() -> dict:
    """Return what Pumpkin would say about availability right now."""
    try:
        from app.integrations.calendar import get_availability_summary
        summary = await asyncio.to_thread(get_availability_summary)
        return {"summary": summary}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Drive endpoints ───────────────────────────────────────────────────────────

@router.post("/drive/sync-resume", dependencies=[Depends(_require_token)])
async def drive_sync_resume(background_tasks: BackgroundTasks) -> dict:
    """Sync resume PDF from Drive → extract text → write drive_resume.json → re-ingest."""
    try:
        from app.integrations.drive import sync_resume
        result = await asyncio.to_thread(sync_resume)
        if result.get("ok"):
            if not _reingest_state["running"]:
                _reingest_state["running"] = True
                background_tasks.add_task(_run_ingest_background, False)
        return result
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/drive/resume-status", dependencies=[Depends(_require_token)])
def drive_resume_status() -> dict:
    """Return the current cached resume metadata from drive_resume.json."""
    from app.integrations.drive import get_resume_status
    return get_resume_status()


@router.get("/drive/draft-docs", dependencies=[Depends(_require_token)])
async def drive_draft_docs() -> dict:
    """List Google Docs in the Portfolio Drafts folder."""
    try:
        from app.integrations.drive import list_draft_docs
        docs = await asyncio.to_thread(list_draft_docs)
        return {"docs": docs}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/drive/draft-docs/{doc_id}/import", dependencies=[Depends(_require_token)])
async def drive_import_doc(doc_id: str) -> dict:
    """Export a Google Doc as text for pre-filling the blog editor."""
    try:
        from app.integrations.drive import export_doc_as_text
        text = await asyncio.to_thread(export_doc_as_text, doc_id)
        if not text:
            raise HTTPException(status_code=404, detail="Could not export document")
        return {"text": text, "word_count": len(text.split())}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Weekly Digest endpoints ───────────────────────────────────────────────────

@router.get("/digest/preview", dependencies=[Depends(_require_token)])
def digest_preview() -> dict:
    """Build and return the digest HTML without sending it."""
    from app.db import analytics, blog_stats
    from app.integrations.digest import build_digest_html

    p = ["week", "month", "all"]
    stats = {
        "conversations":  {x: analytics.get_stats(x) for x in p},
        "feedback":       {x: analytics.get_feedback_summary(x) for x in p},
        "top_questions":  {x: analytics.get_top_questions(15, x) for x in p},
        "blog":           blog_stats.get_summary(),
        "lead_captures":  {x: analytics.get_lead_capture_stats(x) for x in p},
    }
    html = build_digest_html(stats)
    return {"html": html}


@router.post("/digest/send", dependencies=[Depends(_require_token)])
def digest_send() -> dict:
    """Build and send the weekly digest email immediately."""
    from app.db import analytics, blog_stats
    from app.integrations.digest import build_digest_html, send_digest

    p = ["week", "month", "all"]
    stats = {
        "conversations":  {x: analytics.get_stats(x) for x in p},
        "feedback":       {x: analytics.get_feedback_summary(x) for x in p},
        "top_questions":  {x: analytics.get_top_questions(15, x) for x in p},
        "blog":           blog_stats.get_summary(),
        "lead_captures":  {x: analytics.get_lead_capture_stats(x) for x in p},
    }
    try:
        html = build_digest_html(stats)
        send_digest(html)
        return {"ok": True, "message": "Digest sent successfully"}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/prune-analytics", dependencies=[Depends(_require_token)])
def prune_analytics() -> dict:
    """Remove analytics rows for blog posts and lab entries that no longer exist in content.db.

    Reads the current live slug lists from content.db, then deletes orphaned rows from:
    - blog_views, blog_claps, blog_sessions (by slug)
    - site_visits for /blog/* and /lab/* paths

    Safe to call at any time — read-then-delete, no destructive side effects on live content.
    """
    from app.db import content as content_db
    from app.db.blog_stats import prune_orphaned_stats
    from app.db.analytics import prune_orphaned_page_visits

    blog_slugs = {p["slug"] for p in content_db.list_blog_posts(include_drafts=True)}
    lab_slugs  = {e["slug"] for e in content_db.list_lab_entries()}

    valid_pages = {f"/blog/{s}" for s in blog_slugs} | {f"/lab/{s}" for s in lab_slugs}

    blog_removed  = prune_orphaned_stats(blog_slugs)
    pages_removed = prune_orphaned_page_visits(valid_pages)

    return {
        "blog_views_removed":    blog_removed["views"],
        "blog_claps_removed":    blog_removed["claps"],
        "blog_sessions_removed": blog_removed["sessions"],
        "page_visits_removed":   pages_removed,
        "total_removed":         sum(blog_removed.values()) + pages_removed,
        "live_blogs":            len(blog_slugs),
        "live_labs":             len(lab_slugs),
    }
