from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.db import blog_stats

router = APIRouter(prefix="/blog", tags=["blog"])


def _get_ip(request: Request) -> str:
    # Prefer the stable per-browser UUID sent by the frontend (stored in localStorage).
    # This correctly identifies different devices as different visitors even when
    # they share a public IP (e.g. same WiFi / same NAT). Falls back to IP for
    # requests that don't include the header (e.g. direct API calls).
    vid = request.headers.get("x-visitor-id", "").strip()
    if vid:
        return vid
    return (
        request.headers.get("x-forwarded-for", "")
        .split(",")[0]
        .strip()
        or (request.client.host if request.client else "unknown")
    )


class ClapRequest(BaseModel):
    count: int = Field(default=1, ge=1, le=10)


@router.post("/{slug}/view")
def record_view(slug: str, request: Request) -> dict:
    return blog_stats.record_view(slug, _get_ip(request))


@router.post("/{slug}/clap")
def record_clap(slug: str, body: ClapRequest, request: Request) -> dict:
    return blog_stats.record_clap(slug, _get_ip(request), body.count)


@router.get("/stats/summary")
def get_summary() -> dict:
    return blog_stats.get_summary()


@router.get("/{slug}/stats")
def get_post_stats(slug: str, request: Request) -> dict:
    return blog_stats.get_post_stats(slug, _get_ip(request))
