"""Gmail integration — recruiter lead-capture emails and inbox signal parsing."""
from __future__ import annotations

import base64
import email.mime.text
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _gmail_service():
    from googleapiclient.discovery import build
    from app.integrations.google_auth import get_credentials

    creds = get_credentials()
    if creds is None:
        raise RuntimeError("Google account not connected. Complete OAuth setup in admin panel.")
    return build("gmail", "v1", credentials=creds)


# ── Feature 1: Lead Capture ───────────────────────────────────────────────────

_PERSONA_LABELS = {
    "recruiter": "Recruiter",
    "engineer":  "Engineer",
    "founder":   "Founder / Startup",
}


def send_visitor_intro(
    name: str,
    visitor_email: str,
    company: str,
    summary: str,
    recipient: str,
    persona: str | None = None,
    note: str = "",
) -> None:
    """Send Taruni a lead-capture intro email from her own Gmail account.
    Subject and body adapt based on the visitor's persona (or 'Visitor' if none).
    """
    service = _gmail_service()

    persona_label = _PERSONA_LABELS.get(persona or "", "Visitor")
    subject = f"Pumpkin intro: {name} @ {company} [{persona_label}]"

    context_line = {
        "recruiter": "A recruiter finished a conversation with Pumpkin and asked me to send you an intro.",
        "engineer":  "An engineer finished a conversation with Pumpkin and asked me to connect you two.",
        "founder":   "A founder finished a conversation with Pumpkin and asked me to send you an intro.",
    }.get(persona or "", "A visitor finished a conversation with Pumpkin and asked me to connect you.")

    body = (
        f"Hi Taruni,\n\n"
        f"{context_line}\n\n"
        f"Name: {name}\n"
        f"Email: {visitor_email}\n"
        f"Company / Org: {company}\n"
        f"Persona: {persona_label}\n"
        + (f"Their note: {note}\n" if note else "")
        + f"\nConversation summary:\n{summary}\n\n"
        f"— Pumpkin"
    )

    msg = email.mime.text.MIMEText(body)
    msg["to"] = recipient
    msg["from"] = "me"
    msg["subject"] = subject

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()
    logger.info("Lead-capture email sent to %s for %s %s @ %s", recipient, persona_label, name, company)


# ── Feature 3: Inbox Signal Parsing ──────────────────────────────────────────

_RECRUITER_QUERY = (
    "(from:recruiter OR from:recruiting OR from:hiring OR from:talent OR "
    "subject:opportunity OR subject:role OR subject:position OR subject:'job offer' OR "
    "subject:engineer OR subject:developer) newer_than:7d"
)


def fetch_recruiter_signals(days: int = 7) -> list[dict]:
    """Return a list of recruiter-signal email snippets from the past N days."""
    service = _gmail_service()
    query = _RECRUITER_QUERY if days == 7 else f"({_RECRUITER_QUERY.rsplit('newer_than', 1)[0]}) newer_than:{days}d"

    try:
        results = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=25,
        ).execute()
    except Exception as exc:
        logger.warning("fetch_recruiter_signals list failed: %s", exc)
        return []

    messages = results.get("messages", [])
    signals = []
    for msg_ref in messages[:20]:
        try:
            msg = service.users().messages().get(
                userId="me",
                id=msg_ref["id"],
                format="metadata",
                metadataHeaders=["From", "Subject", "Date"],
            ).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            signals.append({
                "sender": headers.get("From", ""),
                "subject": headers.get("Subject", ""),
                "snippet": msg.get("snippet", ""),
                "date": headers.get("Date", ""),
            })
        except Exception:
            continue

    return signals


def summarize_signals(signals: list[dict]) -> dict:
    """Use Gemini to extract structured insight from raw recruiter email snippets."""
    if not signals:
        return {
            "total_threads": 0,
            "companies": [],
            "role_types": [],
            "warm_leads": 0,
            "summary_text": "",
        }

    from app.routers.ai import _generate

    snippets_text = "\n".join(
        f"- From: {s['sender']} | Subject: {s['subject']} | Snippet: {s['snippet'][:150]}"
        for s in signals[:15]
    )

    prompt = (
        "Analyze these recruiter emails sent to a software engineer. Extract:\n"
        "1. Company names mentioned (list)\n"
        "2. Role types (e.g., 'ML Engineer', 'Backend Engineer', 'Staff Engineer')\n"
        "3. Number of warm leads (emails with personalized interest, not mass-blast)\n"
        "4. A 1-2 sentence summary of the inbound interest for the engineer's portfolio chatbot\n\n"
        "Return ONLY valid JSON: {\"companies\": [...], \"role_types\": [...], \"warm_leads\": N, \"summary_text\": \"...\"}\n\n"
        f"Emails:\n{snippets_text}"
    )

    try:
        raw = _generate("", prompt)
        import json, re
        # Extract JSON from response (Gemini sometimes wraps in ```json)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            data = {}
    except Exception as exc:
        logger.warning("summarize_signals Gemini call failed: %s", exc)
        data = {}

    return {
        "total_threads": len(signals),
        "companies": data.get("companies", [])[:10],
        "role_types": data.get("role_types", [])[:8],
        "warm_leads": data.get("warm_leads", 0),
        "summary_text": data.get("summary_text", ""),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
