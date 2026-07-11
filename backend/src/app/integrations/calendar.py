"""Google Calendar integration — real-time free/busy slot injection for Pumpkin."""
from __future__ import annotations

import logging
import time
from concurrent.futures import Future, ThreadPoolExecutor
from concurrent.futures import TimeoutError as _FutureTimeout
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

# Availability summary is expensive (Freebusy API + a Gemini phrasing call) but
# changes slowly, so cache the final sentence and bound the worst-case wait.
_SUMMARY_TTL_SECONDS = 300        # 5 minutes
_SUMMARY_TIMEOUT_SECONDS = 6.0    # cap a pathological hang; serve stale/empty instead
_summary_cache: tuple[float, str] | None = None
_summary_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="cal-avail")
_summary_inflight: Future | None = None

# Working hours (9 AM – 6 PM) in the configured calendar timezone
WORK_HOUR_START = 9
WORK_HOUR_END = 18
SLOT_MINUTES = 30


def _calendar_service():
    from googleapiclient.discovery import build
    from app.integrations.google_auth import get_credentials

    creds = get_credentials()
    if creds is None:
        raise RuntimeError("Google account not connected. Complete OAuth setup in admin panel.")
    return build("calendar", "v3", credentials=creds)


def get_free_slots(days_ahead: int = 7) -> list[dict]:
    """Return up to 5 free 30-min slots in working hours over the next N days.

    Uses the Freebusy API so only busy periods are transferred — no event content.
    """
    from app.core.settings import settings

    service = _calendar_service()
    tz_name = settings.calendar_tz
    calendar_id = settings.calendar_id

    try:
        import pytz
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = timezone.utc

    now = datetime.now(tz)
    # Round up to the next 30-min boundary
    minutes_over = now.minute % SLOT_MINUTES
    if minutes_over:
        now = now + timedelta(minutes=SLOT_MINUTES - minutes_over)
    now = now.replace(second=0, microsecond=0)

    time_min = now.isoformat()
    time_max = (now + timedelta(days=days_ahead)).isoformat()

    try:
        fb_result = service.freebusy().query(body={
            "timeMin": time_min,
            "timeMax": time_max,
            "items": [{"id": calendar_id}],
            "timeZone": tz_name,
        }).execute()
    except Exception as exc:
        logger.warning("freebusy query failed: %s", exc)
        return []

    busy_periods = fb_result.get("calendars", {}).get(calendar_id, {}).get("busy", [])
    busy_ranges = [
        (datetime.fromisoformat(b["start"]), datetime.fromisoformat(b["end"]))
        for b in busy_periods
    ]

    free_slots = []
    current = now
    end_window = now + timedelta(days=days_ahead)

    while current < end_window and len(free_slots) < 5:
        # Skip outside working hours
        local_hour = current.astimezone(tz).hour
        if local_hour < WORK_HOUR_START:
            current = current.replace(hour=WORK_HOUR_START, minute=0) + timedelta()
            continue
        if local_hour >= WORK_HOUR_END:
            # Jump to next day 9 AM
            next_day = (current + timedelta(days=1)).replace(hour=WORK_HOUR_START, minute=0)
            current = next_day
            continue
        # Skip weekends
        if current.weekday() >= 5:
            next_monday = current + timedelta(days=(7 - current.weekday()))
            current = next_monday.replace(hour=WORK_HOUR_START, minute=0)
            continue

        slot_end = current + timedelta(minutes=SLOT_MINUTES)
        # Check overlap with busy
        is_busy = any(
            not (slot_end <= bs or current >= be)
            for bs, be in busy_ranges
        )

        if not is_busy:
            local_start = current.astimezone(tz)
            local_end = slot_end.astimezone(tz)
            free_slots.append({
                "date": local_start.strftime("%A, %B %-d"),
                "start": local_start.strftime("%-I:%M %p"),
                "end": local_end.strftime("%-I:%M %p"),
                "tz": tz_name.split("/")[-1],
                "iso_start": current.isoformat(),
            })

        current = slot_end

    return free_slots


# Structured slots for the booking card change slowly too — cache them briefly so
# the "book a call" card is instant on repeat asks and resilient to a slow API.
_BOOKING_TTL_SECONDS = 180
_booking_cache: tuple[float, list[dict]] | None = None


def get_booking_slots() -> list[dict]:
    """Cached structured free slots (no LLM) for the booking card.

    Falls back to the last good slots (or empty) if the live Freebusy call fails,
    so the card always renders — the booking link works even with no slots.
    """
    global _booking_cache
    now = time.time()
    if _booking_cache and now - _booking_cache[0] < _BOOKING_TTL_SECONDS:
        return _booking_cache[1]
    try:
        slots = get_free_slots()
    except Exception as exc:  # noqa: BLE001
        logger.warning("booking slots fetch failed: %s", exc)
        slots = _booking_cache[1] if _booking_cache else []
    _booking_cache = (now, slots)
    return slots


def get_booking_card() -> dict:
    """Everything the 'book a call' UI card needs, in one structured payload.

    Slots come from the live calendar (cached); `booking_url` + `open` come from
    profile.json. Always returns a usable card — if the calendar isn't connected
    the slots list is empty but the Google booking link still lets visitors book.
    """
    import json

    from app.rag.ingest import DATA_DIR

    profile: dict = {}
    try:
        profile = json.loads((DATA_DIR / "profile.json").read_text())
    except Exception as exc:  # noqa: BLE001
        logger.debug("booking card profile read failed: %s", exc)

    availability = profile.get("availability") or {}
    slots: list[dict] = []
    try:
        slots = get_booking_slots()
    except Exception as exc:  # noqa: BLE001
        logger.debug("booking card slots skipped: %s", exc)

    return {
        "booking_url": profile.get("booking_url", ""),
        "open": bool(availability.get("open", True)),
        "slots": slots[:5],
    }


def _compute_availability_summary() -> str:
    """Freebusy lookup + LLM phrasing — the expensive part, run behind the cache."""
    slots = get_free_slots()
    if not slots:
        return ""

    from app.routers.ai import _generate
    slots_text = "\n".join(
        f"- {s['date']}: {s['start']} – {s['end']} {s['tz']}"
        for s in slots[:5]
    )
    prompt = (
        f"Write one concise sentence (max 30 words) summarizing these open calendar slots for Taruni:\n"
        f"{slots_text}\n\n"
        "Format: 'Taruni has openings [natural description]. You can book at [booking_url].' "
        "Use the placeholder [booking_url] literally — do not invent a URL."
    )
    return _generate("", prompt).strip()


def _store_summary(fut: Future) -> None:
    """Cache the computed summary when the background task finishes."""
    global _summary_cache
    try:
        _summary_cache = (time.time(), fut.result())
    except Exception as exc:  # noqa: BLE001
        logger.warning("availability compute failed: %s", exc)


def get_availability_summary() -> str:
    """Natural-language sentence about upcoming free slots, or "" on failure.

    Cached for 5 minutes (the slots barely change), and bounded by a 6s timeout.
    The expensive work (Freebusy API + Gemini phrasing) runs in a background
    worker whose result populates the cache, so a slow first call returns ""
    quickly and the next call within the window is instant — instead of blocking
    the chat for ~7s every time. Concurrent callers share one in-flight task.
    """
    global _summary_inflight
    now = time.time()
    if _summary_cache and now - _summary_cache[0] < _SUMMARY_TTL_SECONDS:
        return _summary_cache[1]

    fut = _summary_inflight
    if fut is None or fut.done():
        fut = _summary_executor.submit(_compute_availability_summary)
        fut.add_done_callback(_store_summary)
        _summary_inflight = fut

    try:
        return fut.result(timeout=_SUMMARY_TIMEOUT_SECONDS)
    except _FutureTimeout:
        logger.warning(
            "availability summary timed out (%.1fs); serving cached/empty, cache will self-warm",
            _SUMMARY_TIMEOUT_SECONDS,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("availability summary failed: %s", exc)
    return _summary_cache[1] if _summary_cache else ""
