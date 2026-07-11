from __future__ import annotations

import logging
import time
from pathlib import Path

import httpx
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from pydantic import BaseModel

from app.core.admin_auth import verify_password
from app.core.settings import settings
from app.db import analytics, blog_stats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stats", tags=["stats"])

_PERIODS = ["week", "month", "year", "all"]
_ADMIN_PERIODS = ["week", "month", "all"]
_SYSTEM_PERIODS = ("day", "week", "month", "all")

# Process boot time — uptime for the /system reliability strip.
_BOOT = time.time()


def _last_ingest_at() -> str | None:
    """ISO timestamp of the last knowledge-base ingest, from the .ingest_hash file mtime."""
    try:
        from datetime import datetime, timezone
        hash_file = Path(settings.chroma_db_path) / ".ingest_hash"
        if hash_file.exists():
            return datetime.fromtimestamp(hash_file.stat().st_mtime, tz=timezone.utc).isoformat()
    except Exception:
        pass
    return None


# ── Geo helper (runs as background task) ──────────────────────────────────────

async def _geo_update(table: str, row_id: int, ip: str) -> None:
    from app.db.analytics import _PRIVATE_IP_PREFIXES
    if not ip or ip in ("unknown", "localhost") or any(ip.startswith(p) for p in _PRIVATE_IP_PREFIXES):
        return
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            r = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,country,city"},
            )
            data = r.json()
            if data.get("status") == "success":
                analytics.update_visit_geo(table, row_id, data.get("country", ""), data.get("city", ""))
    except Exception:
        pass


# ── Public endpoints ──────────────────────────────────────────────────────────

class ExperienceRatingIn(BaseModel):
    rating: int


class VisitIn(BaseModel):
    page: str = "/"


@router.get("")
def get_stats() -> dict[str, int]:
    chat = analytics.get_stats()
    site = analytics.get_site_visitor_stats()
    return {**chat, "site_unique_visitors": site["unique_visitors"]}


@router.get("/overview")
def get_overview() -> dict:
    return {
        "site": {p: analytics.get_stats(p) for p in _PERIODS},
        "blog": {p: blog_stats.get_summary(p) for p in _PERIODS},
    }


@router.get("/system")
def get_system(period: str = "all") -> dict:
    """Public observability snapshot for the /system dashboard: end-to-end + per-stage
    latency, model mix + fallback, reliability (uptime/error rate/deploy), token cost,
    answer quality, request volume, knowledge-base size, and live component health.

    `period` (day|week|month|all) windows the time-series + aggregate metrics.
    Privacy: only aggregates here — top questions, geo, and lead captures stay admin-only.
    """
    if period not in _SYSTEM_PERIODS:
        period = "all"

    models = analytics.get_model_breakdown(period)
    total_model = sum(m["count"] for m in models) or 1
    primary = settings.gemini_model
    fallback = sum(m["count"] for m in models if m["model"] != primary)

    health = {"api": "ok", "analytics_db": "ok", "rag": "ok"}
    try:
        with analytics._connect() as c:
            c.execute("SELECT 1")
    except Exception:
        health["analytics_db"] = "degraded"
    try:
        from app.rag.store import get_collection
        kb_docs = get_collection().count()
    except Exception:
        health["rag"] = "degraded"
        kb_docs = 0

    reliability = analytics.get_reliability(period)
    quality = {
        "satisfaction_pct": analytics.get_feedback_summary(period)["satisfaction_pct"],
        "experience": analytics.get_experience_rating_summary(period),
        **analytics.get_retrieval_quality(period),
    }

    return {
        "period": period,
        "latency": analytics.get_latency_percentiles(period),
        "stages": analytics.get_stage_latency_averages(period),
        "latency_stages": analytics.get_stage_percentiles(period),
        "throughput": analytics.get_peak_throughput(period),
        "models": models,
        "fallback_rate_pct": round(fallback / total_model * 100, 1),
        "primary_model": primary,
        "model_chain": settings.model_chain,
        "cost": analytics.get_token_cost_summary(period),
        "quality": quality,
        "volume": analytics.get_daily_counts("interactions", 30),
        "totals": analytics.get_stats(period),
        "pages": analytics.get_page_stats(period),
        "kb_docs": kb_docs,
        "reliability": {
            "uptime_seconds": int(time.time() - _BOOT),
            "deploy_sha": settings.deploy_sha[:7] if settings.deploy_sha else "",
            "last_ingest_at": _last_ingest_at(),
            **reliability,
        },
        "health": {"status": "ok" if all(v == "ok" for v in health.values()) else "degraded", **health},
        "retrieval": {
            "embed_model": "BAAI/bge-base-en-v1.5",
            "embed_dim": 768,
            "method": "hybrid dense + BM25 → Reciprocal Rank Fusion (k=60) → 1-hop graph expansion",
        },
    }


@router.get("/system/traces")
def get_system_traces() -> dict:
    """Live trace feed for the /system waterfall — the last ~12 chat responses with
    their per-stage timing breakdown. PII-free: no IP, question text, or geo."""
    return {"traces": analytics.get_recent_traces(12)}


@router.post("/visit", status_code=204)
async def record_visit(
    request: Request,
    background_tasks: BackgroundTasks,
    body: VisitIn | None = None,
) -> None:
    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip", "").strip()
        or (request.client.host if request.client else "unknown")
    )
    # Prefer the stable per-device UUID sent by the frontend (localStorage).
    # This counts devices individually even when they share a public IP (same WiFi/NAT).
    identifier = request.headers.get("x-visitor-id", "").strip() or ip
    page = body.page if body else "/"
    row_id = analytics.record_site_visit(identifier, page)
    if row_id:
        background_tasks.add_task(_geo_update, "site_visits", row_id, ip)


@router.post("/experience-rating", status_code=204)
def post_experience_rating(body: ExperienceRatingIn) -> None:
    if not 1 <= body.rating <= 5:
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")
    analytics.record_experience_rating(body.rating)


# ── Admin endpoint ────────────────────────────────────────────────────────────

@router.get("/admin")
def get_admin_stats(authorization: str = Header(default="")) -> dict:
    if not settings.admin_password_hash:
        raise HTTPException(status_code=403, detail="Admin access not configured — set ADMIN_PASSWORD_HASH env var")
    token = authorization.removeprefix("Bearer ").strip()
    if not verify_password(token, settings.admin_password_hash):
        raise HTTPException(status_code=403, detail="Invalid token")

    p = _ADMIN_PERIODS
    return {
        "conversations":  {x: analytics.get_stats(x) for x in p},
        "feedback":       {x: analytics.get_feedback_summary(x) for x in p},
        "top_questions":  {x: analytics.get_top_questions(15, x) for x in p},
        "experience":     {x: analytics.get_experience_rating_summary(x) for x in p},
        "blog":           blog_stats.get_summary(),
        "site_visitors":  {x: analytics.get_site_visitor_stats(x) for x in p},
        "blog_engagement":{x: blog_stats.get_blog_engagement_stats(x) for x in p},
        "location": {
            "site": {x: analytics.get_location_stats("site_visits", x) for x in p},
            "chat": {x: analytics.get_location_stats("interactions", x) for x in p},
        },
        "pages": {x: analytics.get_page_stats(x) for x in p},
        "models": {x: analytics.get_model_breakdown(x) for x in p},
        "trends": {
            "visitors":      analytics.get_daily_counts("site_visits", 30),
            "conversations": analytics.get_daily_counts("interactions", 30),
        },
        "lead_captures": {x: analytics.get_lead_capture_stats(x) for x in p},
    }
