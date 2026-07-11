"""SQLite-backed blog engagement — views (unique per IP) and claps (up to 50 per IP per post).
Shares the same DB file as analytics.py, path controlled by ANALYTICS_DB_PATH env var.
"""
from __future__ import annotations

import hashlib
import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)
MAX_CLAPS_PER_USER = 50


def _db_path() -> Path:
    from app.core.settings import settings
    return Path(settings.analytics_db_path)


def _connect() -> sqlite3.Connection:
    """Open a WAL-mode connection with a busy timeout for concurrent safety."""
    conn = sqlite3.connect(_db_path(), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def init_db() -> None:
    p = _db_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS blog_views (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT    NOT NULL,
                ip_hash    TEXT    NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(slug, ip_hash)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS blog_claps (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT    NOT NULL,
                ip_hash    TEXT    NOT NULL,
                count      INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(slug, ip_hash)
            )
        """)
        # One row per 10-min-gapped open per (slug, ip_hash) — tracks revisits
        conn.execute("""
            CREATE TABLE IF NOT EXISTS blog_sessions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT    NOT NULL,
                ip_hash    TEXT    NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_view_slug    ON blog_views(slug)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_clap_slug    ON blog_claps(slug)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bsess_slug   ON blog_sessions(slug)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bsess_ip     ON blog_sessions(ip_hash)")
    logger.info("Blog stats DB ready")


def _hash(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


_SESSION_GAP = 600  # 10 minutes


def record_blog_session(slug: str, ip: str) -> None:
    """Record a blog open as a new session if 10+ min have passed since the last one.
    Uses an atomic INSERT…SELECT…WHERE NOT EXISTS to avoid a race condition under
    concurrent requests from the same IP.
    """
    h = _hash(ip)
    try:
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO blog_sessions (slug, ip_hash)
                SELECT ?, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM blog_sessions
                    WHERE slug = ? AND ip_hash = ?
                    AND created_at >= datetime('now', ?)
                )
                """,
                (slug, h, slug, h, f"-{_SESSION_GAP} seconds"),
            )
    except Exception as exc:
        logger.warning("record_blog_session failed: %s", exc)


def record_view(slug: str, ip: str) -> dict[str, int]:
    """Record a unique view (idempotent) and a session open (10-min deduped)."""
    h = _hash(ip)
    try:
        with _connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO blog_views (slug, ip_hash) VALUES (?, ?)", (slug, h)
            )
    except Exception as exc:
        logger.warning("record_view failed: %s", exc)
    record_blog_session(slug, ip)
    return get_post_stats(slug, ip)


def record_clap(slug: str, ip: str, count: int) -> dict[str, int]:
    """Add claps for a post. Caps total per-IP claps at MAX_CLAPS_PER_USER atomically."""
    h = _hash(ip)
    try:
        with _connect() as conn:
            # Single atomic statement: cap is enforced inside SQL so concurrent
            # requests can't race past MAX_CLAPS_PER_USER.
            conn.execute("""
                INSERT INTO blog_claps (slug, ip_hash, count)
                VALUES (?, ?, MIN(?, ?))
                ON CONFLICT(slug, ip_hash) DO UPDATE SET
                    count = MIN(count + excluded.count, ?),
                    updated_at = CURRENT_TIMESTAMP
            """, (slug, h, count, MAX_CLAPS_PER_USER, MAX_CLAPS_PER_USER))
    except Exception as exc:
        logger.warning("record_clap failed: %s", exc)
    return get_post_stats(slug, ip)


def get_post_stats(slug: str, ip: str) -> dict[str, int]:
    h = _hash(ip)
    try:
        with _connect() as conn:
            views = conn.execute(
                "SELECT COUNT(*) FROM blog_views WHERE slug=?", (slug,)
            ).fetchone()[0]
            claps = conn.execute(
                "SELECT COALESCE(SUM(count),0) FROM blog_claps WHERE slug=?", (slug,)
            ).fetchone()[0]
            user_claps = conn.execute(
                "SELECT COALESCE(count,0) FROM blog_claps WHERE slug=? AND ip_hash=?", (slug, h)
            ).fetchone()
            user_claps = user_claps[0] if user_claps else 0
        return {"views": views, "claps": claps, "user_claps": user_claps}
    except Exception as exc:
        logger.warning("get_post_stats failed: %s", exc)
        return {"views": 0, "claps": 0, "user_claps": 0}


_CUTOFFS = {
    "week":  "datetime('now', '-7 days')",
    "month": "datetime('now', '-30 days')",
    "year":  "datetime('now', '-365 days')",
}


def get_blog_engagement_stats(period: str = "all") -> dict:
    """Session-based blog analytics: total opens, unique readers, revisit rates per post."""
    and_clause = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            total_opens = conn.execute(
                f"SELECT COUNT(*) FROM blog_sessions WHERE 1=1 {and_clause}"
            ).fetchone()[0]
            rows = conn.execute(f"""
                SELECT
                    slug,
                    COUNT(DISTINCT ip_hash)                                    AS unique_readers,
                    COUNT(*)                                                   AS total_opens,
                    SUM(CASE WHEN session_count > 1 THEN 1 ELSE 0 END)        AS revisiting_readers
                FROM (
                    SELECT slug, ip_hash, COUNT(*) AS session_count
                    FROM blog_sessions
                    WHERE 1=1 {and_clause}
                    GROUP BY slug, ip_hash
                )
                GROUP BY slug
                ORDER BY total_opens DESC
            """).fetchall()
        posts = [
            {
                "slug":               r[0],
                "unique_readers":     r[1],
                "total_opens":        r[2],
                "revisiting_readers": r[3],
                "revisit_rate":       round(r[3] / r[1] * 100) if r[1] > 0 else 0,
            }
            for r in rows
        ]
        return {"total_opens": total_opens, "posts": posts}
    except Exception as exc:
        logger.warning("get_blog_engagement_stats failed: %s", exc)
        return {"total_opens": 0, "posts": []}


def prune_orphaned_stats(valid_slugs: set[str]) -> dict[str, int]:
    """Delete blog analytics rows whose slug is not in `valid_slugs`.

    Pass the full set of currently live blog slugs (including drafts).
    If `valid_slugs` is empty every row is deleted.
    Returns counts of removed rows per table.
    """
    removed = {"views": 0, "claps": 0, "sessions": 0}
    try:
        with _connect() as conn:
            if valid_slugs:
                ph = ",".join("?" * len(valid_slugs))
                sl = list(valid_slugs)
                removed["views"]    = conn.execute(f"DELETE FROM blog_views    WHERE slug NOT IN ({ph})", sl).rowcount
                removed["claps"]    = conn.execute(f"DELETE FROM blog_claps    WHERE slug NOT IN ({ph})", sl).rowcount
                removed["sessions"] = conn.execute(f"DELETE FROM blog_sessions WHERE slug NOT IN ({ph})", sl).rowcount
            else:
                removed["views"]    = conn.execute("DELETE FROM blog_views").rowcount
                removed["claps"]    = conn.execute("DELETE FROM blog_claps").rowcount
                removed["sessions"] = conn.execute("DELETE FROM blog_sessions").rowcount
        logger.info("Pruned orphaned blog analytics: %s", removed)
    except Exception as exc:
        logger.warning("prune_orphaned_stats failed: %s", exc)
    return removed


def delete_post_stats(slug: str) -> None:
    """Remove all views, claps, and sessions for a deleted blog post."""
    try:
        with _connect() as conn:
            conn.execute("DELETE FROM blog_views    WHERE slug=?", (slug,))
            conn.execute("DELETE FROM blog_claps    WHERE slug=?", (slug,))
            conn.execute("DELETE FROM blog_sessions WHERE slug=?", (slug,))
        logger.info("Deleted blog analytics for slug=%s", slug)
    except Exception as exc:
        logger.warning("delete_post_stats failed: %s", exc)


def get_summary(period: str = "all") -> dict:
    """Returns blog stats. period filters views only.

    Claps are stored as a cumulative total per (slug, ip_hash) row — there is no
    per-event timestamp, so filtering by updated_at would sum the entire stored total
    for any row touched in that window, not the actual claps given in that period.
    Clap totals are therefore always all-time; only view counts respect the period.
    """
    view_where = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            total_claps = conn.execute(
                "SELECT COALESCE(SUM(count),0) FROM blog_claps"
            ).fetchone()[0]
            total_views = conn.execute(
                f"SELECT COUNT(*) FROM blog_views WHERE 1=1 {view_where}"
            ).fetchone()[0]
            rows = conn.execute(f"""
                SELECT slug,
                       (SELECT COUNT(*) FROM blog_views v WHERE v.slug = s.slug {view_where}) AS views,
                       (SELECT COALESCE(SUM(count),0) FROM blog_claps c WHERE c.slug = s.slug) AS claps
                FROM (SELECT DISTINCT slug FROM blog_views
                      UNION SELECT DISTINCT slug FROM blog_claps) s
            """).fetchall()
        posts = [{"slug": r[0], "views": r[1], "claps": r[2]} for r in rows]
        return {"total_claps": total_claps, "total_views": total_views, "posts": posts}
    except Exception as exc:
        logger.warning("get_summary failed: %s", exc)
        return {"total_claps": 0, "total_views": 0, "posts": []}
