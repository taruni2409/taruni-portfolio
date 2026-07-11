"""SQLite-backed analytics — tracks unique visitors (hashed IPs) and total responses.
DB path is controlled by ANALYTICS_DB_PATH env var so it always resolves to the
persistent volume regardless of working directory changes between deploys.
"""
from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
from datetime import date, timedelta
from pathlib import Path
from urllib.request import urlopen

logger = logging.getLogger(__name__)

_PRIVATE_IP_PREFIXES = ("127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.",
                        "172.19.", "172.20.", "172.21.", "172.22.", "172.23.",
                        "172.24.", "172.25.", "172.26.", "172.27.", "172.28.",
                        "172.29.", "172.30.", "172.31.", "::1")


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
            CREATE TABLE IF NOT EXISTS interactions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_hash    TEXT    NOT NULL,
                country    TEXT    DEFAULT '',
                city       TEXT    DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ip ON interactions(ip_hash)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                message_hash TEXT    NOT NULL,
                rating       INTEGER NOT NULL CHECK(rating IN (1, -1)),
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_feedback_hash ON feedback(message_hash)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                text       TEXT    NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS experience_ratings (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS site_visits (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_hash    TEXT    NOT NULL,
                page       TEXT    DEFAULT '/',
                country    TEXT    DEFAULT '',
                city       TEXT    DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_site_visit_ip ON site_visits(ip_hash)")
        # Migrate existing tables first (adds page/country/city if missing),
        # then create the page index — order matters: column must exist before index.
        _migrate(conn)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_site_visit_page ON site_visits(page)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS lead_captures (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                email_hash  TEXT    NOT NULL,
                company     TEXT    DEFAULT '',
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_lead_email ON lead_captures(email_hash)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stage_timings (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                interaction_id INTEGER,
                stage          TEXT    NOT NULL,
                ms             REAL    NOT NULL,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_stage_name ON stage_timings(stage)")
    logger.info("Analytics DB ready: %s", p.resolve())


def _migrate(conn: sqlite3.Connection) -> None:
    """Add new columns to tables that may have been created before these columns existed."""
    for table, col_def in [
        ("interactions", "country TEXT DEFAULT ''"),
        ("interactions", "city TEXT DEFAULT ''"),
        ("interactions", "model TEXT DEFAULT ''"),
        ("interactions", "latency_ms INTEGER DEFAULT 0"),
        # Observability columns for the /system dashboard
        ("interactions", "status TEXT DEFAULT 'ok'"),         # 'ok' | 'error'
        ("interactions", "error_code TEXT DEFAULT ''"),       # e.g. quota_exhausted
        ("interactions", "prompt_tokens INTEGER DEFAULT 0"),  # cost accounting
        ("interactions", "completion_tokens INTEGER DEFAULT 0"),
        ("interactions", "top_score REAL DEFAULT 0"),         # max RRF score of retrieved context
        ("site_visits",  "page TEXT DEFAULT '/'"),
        ("site_visits",  "country TEXT DEFAULT ''"),
        ("site_visits",  "city TEXT DEFAULT ''"),
    ]:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
        except sqlite3.OperationalError:
            pass  # Column already exists


# ── Geo lookup ────────────────────────────────────────────────────────────────

def _geo_lookup(ip: str) -> tuple[str, str]:
    """Returns (country, city). Empty strings for private IPs or on any failure."""
    if not ip or ip in ("unknown", "localhost") or any(ip.startswith(p) for p in _PRIVATE_IP_PREFIXES):
        return "", ""
    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,country,city"
        with urlopen(url, timeout=2) as resp:  # noqa: S310
            data = json.loads(resp.read())
        if data.get("status") == "success":
            return data.get("country", ""), data.get("city", "")
    except Exception:
        pass
    return "", ""


def update_visit_geo(table: str, row_id: int, country: str, city: str) -> None:
    if not country and not city:
        return
    try:
        with _connect() as conn:
            conn.execute(
                f"UPDATE {table} SET country=?, city=? WHERE id=?",  # noqa: S608
                (country, city, row_id),
            )
    except Exception as exc:
        logger.warning("update_visit_geo failed: %s", exc)


def geo_update_sync(table: str, row_id: int, ip: str) -> None:
    """Resolve geo for an already-inserted row. Designed to run in a daemon thread."""
    country, city = _geo_lookup(ip)
    update_visit_geo(table, row_id, country, city)


# ── Record helpers ────────────────────────────────────────────────────────────

_CUTOFFS = {
    "day":   "datetime('now', '-1 days')",
    "week":  "datetime('now', '-7 days')",
    "month": "datetime('now', '-30 days')",
    "year":  "datetime('now', '-365 days')",
}

# Grounded-context threshold — mirrors the value used when assembling RAG context
# in routers/ai.py (_build_context). A response whose best retrieved chunk scores
# below this answered from the system-prompt fallback rather than fresh retrieval.
GROUNDED_SCORE_THRESHOLD = 0.005

SESSION_GAP_SECONDS = 600  # 10 minutes


def record(
    identifier: str,
    model: str = "",
    latency_ms: int = 0,
    *,
    status: str = "ok",
    error_code: str = "",
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    top_score: float = 0.0,
) -> int | None:
    """Record a chat response. identifier is a visitor UUID or raw IP.
    `model` is the model that served it; `latency_ms` the end-to-end time. The
    keyword-only observability fields feed the /system dashboard (reliability,
    token cost, retrieval relevance). Returns the new row id (for geo back-fill).
    """
    id_hash = hashlib.sha256(identifier.encode()).hexdigest()
    try:
        with _connect() as conn:
            cur = conn.execute(
                "INSERT INTO interactions "
                "(ip_hash, model, latency_ms, status, error_code, prompt_tokens, completion_tokens, top_score) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (id_hash, model or "", int(latency_ms) or 0, status or "ok", error_code or "",
                 int(prompt_tokens) or 0, int(completion_tokens) or 0, float(top_score) or 0.0),
            )
            return cur.lastrowid
    except Exception as exc:
        logger.warning("Analytics record failed (non-fatal): %s", exc)
        return None


def record_error(identifier: str, model: str, error_code: str, latency_ms: int = 0) -> None:
    """Record a failed chat response so it counts toward the error/success rate.
    Best-effort and non-fatal — the user already saw an error, this is just telemetry."""
    record(identifier, model, latency_ms, status="error", error_code=error_code or "stream_error")


def record_stage_timings(interaction_id: int | None, stages: list[dict]) -> None:
    """Persist the per-stage latency breakdown for one chat response.
    `stages` is a list of {"stage": str, "ms": float} (from obs.trace.Trace).
    Best-effort and non-fatal — designed to run in a daemon thread.
    """
    if not stages:
        return
    try:
        with _connect() as conn:
            conn.executemany(
                "INSERT INTO stage_timings (interaction_id, stage, ms) VALUES (?, ?, ?)",
                [(interaction_id, s.get("stage", ""), float(s.get("ms", 0))) for s in stages],
            )
    except Exception as exc:
        logger.warning("record_stage_timings failed (non-fatal): %s", exc)


def get_stage_latency_averages(period: str = "all") -> list[dict]:
    """Average duration per pipeline stage, for the /system dashboard bar chart."""
    where = f"WHERE created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT stage, AVG(ms) AS avg_ms, COUNT(*) AS n "
                f"FROM stage_timings {where} GROUP BY stage ORDER BY avg_ms DESC"
            ).fetchall()
        return [{"stage": r[0], "avg_ms": round(r[1], 1) if r[1] else 0.0, "count": r[2]} for r in rows]
    except Exception as exc:
        logger.warning("get_stage_latency_averages failed: %s", exc)
        return []


def get_latency_percentiles(period: str = "all") -> dict:
    """P50/P95/P99 + average of end-to-end chat latency (ms).
    SQLite lacks percentile functions, so we pull non-zero samples and compute
    in Python — the sample count is small (one row per chat response).
    """
    where_clauses = ["latency_ms > 0", "status = 'ok'"]
    if period in _CUTOFFS:
        where_clauses.append(f"created_at >= {_CUTOFFS[period]}")
    where = "WHERE " + " AND ".join(where_clauses)
    try:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT latency_ms FROM interactions {where} ORDER BY latency_ms"
            ).fetchall()
        samples = [r[0] for r in rows]
    except Exception as exc:
        logger.warning("get_latency_percentiles failed: %s", exc)
        samples = []
    if not samples:
        return {"count": 0, "p50": 0, "p95": 0, "p99": 0, "avg": 0}

    def _pct(p: float) -> int:
        # Nearest-rank percentile on the pre-sorted samples.
        idx = min(len(samples) - 1, max(0, round(p / 100 * len(samples)) - 1))
        return int(samples[idx])

    return {
        "count": len(samples),
        "p50": _pct(50),
        "p95": _pct(95),
        "p99": _pct(99),
        "avg": int(sum(samples) / len(samples)),
    }


def get_model_breakdown(period: str = "all") -> list[dict]:
    """Per-model response count + avg latency in the period.
    If the primary isn't dominant, the fallback chain is churning (quota/429)."""
    clauses = ["model != ''", "status = 'ok'"]
    if period in _CUTOFFS:
        clauses.append(f"created_at >= {_CUTOFFS[period]}")
    where = "WHERE " + " AND ".join(clauses)
    try:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT model, COUNT(*) AS c, AVG(NULLIF(latency_ms, 0)) AS avg_ms "
                f"FROM interactions {where} GROUP BY model ORDER BY c DESC"
            ).fetchall()
        return [{"model": r[0], "count": r[1], "avg_ms": int(r[2]) if r[2] else 0} for r in rows]
    except Exception as exc:
        logger.warning("get_model_breakdown failed: %s", exc)
        return []


def get_daily_counts(table: str, days: int = 30) -> list[dict]:
    """Daily counts for the last `days` days (zero-filled), for trend sparklines."""
    if table not in ("interactions", "site_visits"):
        return []
    try:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT date(created_at) AS d, COUNT(*) AS c FROM {table} "
                f"WHERE created_at >= datetime('now', '-{int(days)} days') GROUP BY d"
            ).fetchall()
        counts = {r[0]: r[1] for r in rows}
        today = date.today()
        return [
            {"date": (today - timedelta(days=i)).isoformat(),
             "count": counts.get((today - timedelta(days=i)).isoformat(), 0)}
            for i in range(days - 1, -1, -1)
        ]
    except Exception as exc:
        logger.warning("get_daily_counts failed: %s", exc)
        return []


def record_site_visit(identifier: str, page: str = "/") -> int | None:
    """Insert a site-visit session row and return its id, or None if within the
    10-minute window for the same (identifier, page) pair.
    identifier is a visitor UUID (x-visitor-id header) or raw IP as fallback.
    Dedup is per (identifier, page) so each page is counted separately.
    """
    id_hash = hashlib.sha256(identifier.encode()).hexdigest()
    try:
        with _connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO site_visits (ip_hash, page)
                SELECT ?, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM site_visits
                    WHERE ip_hash = ?
                    AND page = ?
                    AND created_at >= datetime('now', ?)
                )
                """,
                (id_hash, page, id_hash, page, f"-{SESSION_GAP_SECONDS} seconds"),
            )
            if cur.rowcount == 0:
                return None  # Same session on this page — skip
            return cur.lastrowid
    except Exception as exc:
        logger.warning("record_site_visit failed (non-fatal): %s", exc)
        return None


def record_feedback(message_hash: str, rating: int) -> None:
    try:
        with _connect() as conn:
            conn.execute(
                "INSERT INTO feedback (message_hash, rating) VALUES (?, ?)",
                (message_hash, rating),
            )
    except Exception as exc:
        logger.warning("Feedback record failed (non-fatal): %s", exc)


def record_question(text: str) -> None:
    normalized = text.strip()[:500]
    if not normalized:
        return
    try:
        with _connect() as conn:
            conn.execute("INSERT INTO questions (text) VALUES (?)", (normalized,))
    except Exception as exc:
        logger.warning("record_question failed (non-fatal): %s", exc)


def record_experience_rating(rating: int) -> None:
    if not 1 <= rating <= 5:
        return
    try:
        with _connect() as conn:
            conn.execute("INSERT INTO experience_ratings (rating) VALUES (?)", (rating,))
    except Exception as exc:
        logger.warning("record_experience_rating failed (non-fatal): %s", exc)


# ── Query helpers ─────────────────────────────────────────────────────────────

def get_top_questions(n: int = 15, period: str = "all") -> list[dict]:
    and_clause = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            rows = conn.execute(f"""
                SELECT text, COUNT(*) AS cnt
                FROM questions
                WHERE 1=1 {and_clause}
                GROUP BY lower(trim(text))
                ORDER BY cnt DESC
                LIMIT ?
            """, (n,)).fetchall()
        return [{"text": r[0], "count": r[1]} for r in rows]
    except Exception as exc:
        logger.warning("get_top_questions failed: %s", exc)
        return []


def get_feedback_summary(period: str = "all") -> dict:
    and_clause = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            row = conn.execute(f"""
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN rating=1  THEN 1 ELSE 0 END) AS positive,
                    SUM(CASE WHEN rating=-1 THEN 1 ELSE 0 END) AS negative
                FROM feedback WHERE 1=1 {and_clause}
            """).fetchone()
        total, positive, negative = row[0], row[1] or 0, row[2] or 0
        satisfaction = round(positive / total * 100) if total > 0 else 0
        return {"total": total, "positive": positive, "negative": negative, "satisfaction_pct": satisfaction}
    except Exception as exc:
        logger.warning("get_feedback_summary failed: %s", exc)
        return {"total": 0, "positive": 0, "negative": 0, "satisfaction_pct": 0}


def get_experience_rating_summary(period: str = "all") -> dict:
    where = f"WHERE created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT rating, COUNT(*) FROM experience_ratings {where} GROUP BY rating"
            ).fetchall()
        dist = {i: 0 for i in range(1, 6)}
        for r, c in rows:
            dist[int(r)] = c
        total = sum(dist.values())
        avg = round(sum(r * c for r, c in dist.items()) / total, 1) if total > 0 else 0
        return {"total": total, "average": avg, "distribution": dist}
    except Exception as exc:
        logger.warning("get_experience_rating_summary failed: %s", exc)
        return {"total": 0, "average": 0, "distribution": {i: 0 for i in range(1, 6)}}


def get_stats(period: str = "all") -> dict[str, int]:
    """Chat interaction stats. sessions = distinct 10-min windows (via SQL LAG).
    Counts successful responses only (status='ok') — failures are tracked separately
    via get_reliability()."""
    clauses = ["status = 'ok'"]
    if period in _CUTOFFS:
        clauses.append(f"created_at >= {_CUTOFFS[period]}")
    where = "WHERE " + " AND ".join(clauses)
    try:
        with _connect() as conn:
            total  = conn.execute(f"SELECT COUNT(*) FROM interactions {where}").fetchone()[0]
            unique = conn.execute(f"SELECT COUNT(DISTINCT ip_hash) FROM interactions {where}").fetchone()[0]
            # A new session starts when: first row for this IP, OR 10+ min gap since previous row
            sessions = conn.execute(f"""
                SELECT COUNT(*) FROM (
                    SELECT ip_hash, created_at,
                           LAG(created_at) OVER (PARTITION BY ip_hash ORDER BY created_at) AS prev
                    FROM interactions {where}
                ) WHERE prev IS NULL
                   OR (strftime('%s', created_at) - strftime('%s', prev)) >= {SESSION_GAP_SECONDS}
            """).fetchone()[0]
        return {"total_responses": total, "unique_visitors": unique, "sessions": sessions}
    except Exception as exc:
        logger.warning("Analytics query failed: %s", exc)
        return {"total_responses": 0, "unique_visitors": 0, "sessions": 0}


def get_site_visitor_stats(period: str = "all") -> dict[str, int]:
    """Each row in site_visits already represents a session (10-min dedup on insert)."""
    where = f"WHERE created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            total  = conn.execute(f"SELECT COUNT(*) FROM site_visits {where}").fetchone()[0]
            unique = conn.execute(f"SELECT COUNT(DISTINCT ip_hash) FROM site_visits {where}").fetchone()[0]
        return {"total_visits": total, "unique_visitors": unique}
    except Exception as exc:
        logger.warning("get_site_visitor_stats failed: %s", exc)
        return {"total_visits": 0, "unique_visitors": 0}


def get_location_stats(table: str, period: str = "all") -> list[dict]:
    """Top countries for a given table (site_visits or interactions)."""
    and_clause = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            rows = conn.execute(f"""
                SELECT country, COUNT(*) AS visits, COUNT(DISTINCT ip_hash) AS unique_v
                FROM {table}
                WHERE country != '' {and_clause}
                GROUP BY country
                ORDER BY unique_v DESC
                LIMIT 8
            """).fetchall()
        return [{"country": r[0], "visits": r[1], "unique_visitors": r[2]} for r in rows]
    except Exception as exc:
        logger.warning("get_location_stats(%s) failed: %s", table, exc)
        return []


def prune_orphaned_page_visits(valid_pages: set[str]) -> int:
    """Delete site_visits rows for /blog/* and /lab/* pages not in `valid_pages`.

    Only touches content-routed pages — all other paths (/, /experience, etc.) are untouched.
    Returns the number of rows removed.
    """
    try:
        with _connect() as conn:
            if valid_pages:
                ph = ",".join("?" * len(valid_pages))
                removed = conn.execute(
                    f"DELETE FROM site_visits WHERE (page LIKE '/blog/%' OR page LIKE '/lab/%') AND page NOT IN ({ph})",
                    list(valid_pages),
                ).rowcount
            else:
                removed = conn.execute(
                    "DELETE FROM site_visits WHERE page LIKE '/blog/%' OR page LIKE '/lab/%'"
                ).rowcount
        if removed:
            logger.info("Pruned %d orphaned site_visits rows", removed)
        return removed
    except Exception as exc:
        logger.warning("prune_orphaned_page_visits failed: %s", exc)
        return 0


def delete_page_visits(page: str) -> None:
    """Remove all site_visits rows for a deleted page path."""
    try:
        with _connect() as conn:
            conn.execute("DELETE FROM site_visits WHERE page=?", (page,))
        logger.info("Deleted site_visits for page=%s", page)
    except Exception as exc:
        logger.warning("delete_page_visits failed: %s", exc)


def record_lead_capture(email: str, company: str) -> None:
    email_hash = hashlib.sha256(email.strip().lower().encode()).hexdigest()
    try:
        with _connect() as conn:
            conn.execute(
                "INSERT INTO lead_captures (email_hash, company) VALUES (?, ?)",
                (email_hash, company[:100]),
            )
    except Exception as exc:
        logger.warning("record_lead_capture failed: %s", exc)


def get_lead_capture_stats(period: str = "all") -> dict:
    and_clause = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            total = conn.execute(
                f"SELECT COUNT(*) FROM lead_captures WHERE 1=1 {and_clause}"
            ).fetchone()[0]
            companies = conn.execute(
                f"SELECT company, COUNT(*) AS c FROM lead_captures WHERE company != '' {and_clause} "
                f"GROUP BY company ORDER BY c DESC LIMIT 5"
            ).fetchall()
        return {
            "total": total,
            "top_companies": [{"company": r[0], "count": r[1]} for r in companies],
        }
    except Exception as exc:
        logger.warning("get_lead_capture_stats failed: %s", exc)
        return {"total": 0, "top_companies": []}


def get_page_stats(period: str = "all") -> list[dict]:
    """Top visited pages by session count."""
    and_clause = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            rows = conn.execute(f"""
                SELECT page, COUNT(*) AS sessions, COUNT(DISTINCT ip_hash) AS unique_v
                FROM site_visits
                WHERE 1=1 {and_clause}
                GROUP BY page
                ORDER BY sessions DESC
                LIMIT 10
            """).fetchall()
        return [{"page": r[0], "sessions": r[1], "unique_visitors": r[2]} for r in rows]
    except Exception as exc:
        logger.warning("get_page_stats failed: %s", exc)
        return []


# ── System observability helpers (public /system dashboard) ───────────────────

def get_reliability(period: str = "all") -> dict:
    """Error / success rate over chat requests (status='ok' vs 'error') + a breakdown
    of error codes. Powers the reliability strip an EM scans first."""
    where = f"WHERE created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM interactions {where}").fetchone()[0]
            and_clause = f"AND created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
            errors = conn.execute(
                f"SELECT COUNT(*) FROM interactions WHERE status='error' {and_clause}"
            ).fetchone()[0]
            codes = conn.execute(
                f"SELECT error_code, COUNT(*) AS c FROM interactions "
                f"WHERE status='error' AND error_code != '' {and_clause} "
                f"GROUP BY error_code ORDER BY c DESC"
            ).fetchall()
        error_rate = round(errors / total * 100, 2) if total else 0.0
        return {
            "total": total,
            "errors": errors,
            "error_rate_pct": error_rate,
            "success_rate_pct": round(100 - error_rate, 2),
            "by_code": [{"code": r[0], "count": r[1]} for r in codes],
        }
    except Exception as exc:
        logger.warning("get_reliability failed: %s", exc)
        return {"total": 0, "errors": 0, "error_rate_pct": 0.0, "success_rate_pct": 100.0, "by_code": []}


def _percentiles(samples: list[float]) -> dict:
    """Nearest-rank p50/p95 on a pre-sorted list (same approach as get_latency_percentiles)."""
    if not samples:
        return {"p50": 0, "p95": 0}

    def _pct(p: float) -> int:
        idx = min(len(samples) - 1, max(0, round(p / 100 * len(samples)) - 1))
        return int(samples[idx])

    return {"p50": _pct(50), "p95": _pct(95)}


def get_stage_percentiles(period: str = "all") -> list[dict]:
    """Per-stage p50 + p95 latency (ms) from stage_timings — fine-grained latency view.
    Returns stages ordered by p95 descending."""
    where = f"WHERE created_at >= {_CUTOFFS[period]}" if period in _CUTOFFS else ""
    try:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT stage, ms FROM stage_timings {where} ORDER BY stage, ms"
            ).fetchall()
    except Exception as exc:
        logger.warning("get_stage_percentiles failed: %s", exc)
        return []
    by_stage: dict[str, list[float]] = {}
    for stage, ms in rows:
        by_stage.setdefault(stage, []).append(ms)
    out = []
    for stage, samples in by_stage.items():
        pct = _percentiles(samples)  # samples already sorted by the ORDER BY
        out.append({"stage": stage, "p50": pct["p50"], "p95": pct["p95"], "count": len(samples)})
    return sorted(out, key=lambda s: s["p95"], reverse=True)


def get_peak_throughput(period: str = "all") -> dict:
    """Busiest one-minute bucket of successful chat responses in the period (req/min)."""
    where = "WHERE status='ok'"
    if period in _CUTOFFS:
        where += f" AND created_at >= {_CUTOFFS[period]}"
    try:
        with _connect() as conn:
            row = conn.execute(
                f"SELECT strftime('%Y-%m-%d %H:%M', created_at) AS m, COUNT(*) AS c "
                f"FROM interactions {where} GROUP BY m ORDER BY c DESC LIMIT 1"
            ).fetchone()
        return {"peak_rpm": row[1] if row else 0, "at": row[0] if row else ""}
    except Exception as exc:
        logger.warning("get_peak_throughput failed: %s", exc)
        return {"peak_rpm": 0, "at": ""}


def get_token_cost_summary(period: str = "all") -> dict:
    """Token usage + estimated USD cost over successful responses, using the
    per-model price map. Models without a price (free tiers / unknown) cost 0."""
    from app.core.settings import MODEL_PRICES
    where = "WHERE status='ok'"
    if period in _CUTOFFS:
        where += f" AND created_at >= {_CUTOFFS[period]}"
    try:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT model, SUM(prompt_tokens), SUM(completion_tokens), COUNT(*) "
                f"FROM interactions {where} GROUP BY model"
            ).fetchall()
    except Exception as exc:
        logger.warning("get_token_cost_summary failed: %s", exc)
        return {"total_tokens": 0, "avg_prompt": 0, "avg_completion": 0, "est_cost_usd": 0.0}
    total_prompt = total_completion = total_count = 0
    est_cost = 0.0
    for model, p, c, n in rows:
        p, c, n = int(p or 0), int(c or 0), int(n or 0)
        total_prompt += p
        total_completion += c
        total_count += n
        price = MODEL_PRICES.get(model) or MODEL_PRICES.get(model.split(":")[-1])
        if price:
            est_cost += p / 1000 * price.get("in", 0) + c / 1000 * price.get("out", 0)
    return {
        "total_tokens": total_prompt + total_completion,
        "avg_prompt": round(total_prompt / total_count) if total_count else 0,
        "avg_completion": round(total_completion / total_count) if total_count else 0,
        "est_cost_usd": round(est_cost, 4),
    }


def get_retrieval_quality(period: str = "all") -> dict:
    """Average top retrieval score + grounded-context rate (share of answers whose best
    retrieved chunk cleared the grounding threshold) over successful responses."""
    where = "WHERE status='ok' AND top_score > 0"
    if period in _CUTOFFS:
        where += f" AND created_at >= {_CUTOFFS[period]}"
    try:
        with _connect() as conn:
            row = conn.execute(
                f"SELECT COUNT(*), AVG(top_score), "
                f"SUM(CASE WHEN top_score >= {GROUNDED_SCORE_THRESHOLD} THEN 1 ELSE 0 END) "
                f"FROM interactions {where}"
            ).fetchone()
        total, avg, grounded = row[0] or 0, row[1] or 0.0, row[2] or 0
        return {
            "samples": total,
            "avg_top_score": round(avg, 4),
            "grounded_pct": round(grounded / total * 100) if total else 0,
        }
    except Exception as exc:
        logger.warning("get_retrieval_quality failed: %s", exc)
        return {"samples": 0, "avg_top_score": 0.0, "grounded_pct": 0}


def get_recent_traces(n: int = 12) -> list[dict]:
    """Last `n` chat responses with their per-stage timing breakdown, for the live
    trace waterfall. PII-free by construction — selects no ip_hash, question, or geo."""
    try:
        with _connect() as conn:
            interactions = conn.execute(
                "SELECT id, model, latency_ms, status, created_at "
                "FROM interactions ORDER BY id DESC LIMIT ?",
                (int(n),),
            ).fetchall()
            if not interactions:
                return []
            ids = [r[0] for r in interactions]
            ph = ",".join("?" * len(ids))
            stage_rows = conn.execute(
                f"SELECT interaction_id, stage, ms FROM stage_timings "
                f"WHERE interaction_id IN ({ph}) ORDER BY id",
                ids,
            ).fetchall()
        stages_by_id: dict[int, list[dict]] = {}
        for iid, stage, ms in stage_rows:
            stages_by_id.setdefault(iid, []).append({"stage": stage, "ms": round(ms, 1)})
        return [
            {
                "model": r[1],
                "latency_ms": r[2],
                "status": r[3] or "ok",
                "created_at": r[4],
                "stages": stages_by_id.get(r[0], []),
            }
            for r in interactions
        ]
    except Exception as exc:
        logger.warning("get_recent_traces failed: %s", exc)
        return []
