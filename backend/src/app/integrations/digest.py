"""Weekly portfolio digest email — builds an HTML summary and sends via Gmail."""
from __future__ import annotations

import base64
import email.mime.text
import logging

logger = logging.getLogger(__name__)



def build_digest_html(stats: dict) -> str:
    """Build the HTML body for the weekly digest email."""
    conv = stats.get("conversations", {}).get("week", {})
    total = conv.get("total_responses", 0)
    unique = conv.get("unique_visitors", 0)
    sessions = conv.get("sessions", 0)

    feedback = stats.get("feedback", {}).get("week", {})
    satisfaction = feedback.get("satisfaction_pct", 0)

    top_qs = stats.get("top_questions", {}).get("week", [])[:5]
    lead_data = stats.get("lead_captures", {}).get("week", {})
    leads = lead_data.get("total", 0) if isinstance(lead_data, dict) else 0

    blog = stats.get("blog", {})
    top_blog = ""
    if isinstance(blog, dict) and blog.get("posts"):
        post = max(blog["posts"], key=lambda p: p.get("views", 0), default=None)
        if post:
            top_blog = f"{post.get('slug', '')} ({post.get('views', 0)} views)"

    from app.core.settings import settings
    admin_url = f"{settings.frontend_origin.split(',')[0].strip()}/admin"

    # AI commentary on the week
    ai_commentary = ""
    try:
        from app.routers.ai import _generate
        prompt = (
            f"Write exactly 2 sentences of friendly commentary for a portfolio owner about their week:\n"
            f"- Chat sessions: {sessions}\n"
            f"- Unique visitors: {unique}\n"
            f"- Total AI responses: {total}\n"
            f"- Satisfaction: {satisfaction}%\n"
            f"- Recruiter leads: {leads}\n"
            "Be encouraging and specific. No fluff."
        )
        ai_commentary = _generate("", prompt).strip()
    except Exception:
        pass

    qs_html = "".join(
        f"<li style='margin:4px 0;font-size:13px;color:#555'>{q['text'][:80]} <span style='color:#999'>({q['count']}×)</span></li>"
        for q in top_qs
    ) if top_qs else "<li style='color:#999;font-size:13px'>No questions this week</li>"

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pumpkin Weekly</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9f9f9;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:28px 32px;color:white">
    <div style="font-size:28px;margin-bottom:4px">🎃</div>
    <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">Pumpkin Weekly</h1>
    <p style="margin:6px 0 0;opacity:0.85;font-size:13px">Your portfolio at a glance</p>
  </div>

  <div style="padding:28px 32px">
    {"<p style='font-size:14px;color:#444;line-height:1.6;background:#f0fdf4;border-radius:8px;padding:14px 16px;margin-bottom:24px'>" + ai_commentary + "</p>" if ai_commentary else ""}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
      <div style="text-align:center;background:#f8fafc;border-radius:8px;padding:16px 8px">
        <div style="font-size:28px;font-weight:700;color:#16a34a">{total}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:.5px">AI Responses</div>
      </div>
      <div style="text-align:center;background:#f8fafc;border-radius:8px;padding:16px 8px">
        <div style="font-size:28px;font-weight:700;color:#2563eb">{unique}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:.5px">Unique Visitors</div>
      </div>
      <div style="text-align:center;background:#f8fafc;border-radius:8px;padding:16px 8px">
        <div style="font-size:28px;font-weight:700;color:#d97706">{leads}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:.5px">Recruiter Leads</div>
      </div>
    </div>

    {"<div style='margin-bottom:20px'><p style='font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px'>Top Blog Post</p><p style='font-size:13px;color:#444;margin:0'>📖 " + top_blog + "</p></div>" if top_blog else ""}

    <div style="margin-bottom:20px">
      <p style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px">Top Questions This Week</p>
      <ul style="margin:0;padding-left:18px">{qs_html}</ul>
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <span style="font-size:13px;color:#555">Satisfaction score: </span>
        <span style="font-size:13px;font-weight:600;color:#16a34a">{satisfaction}%</span>
      </div>
      <a href="{admin_url}" style="font-size:12px;color:#16a34a;text-decoration:none;font-weight:600;background:#dcfce7;padding:6px 12px;border-radius:6px">View Admin →</a>
    </div>
  </div>

  <div style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="font-size:11px;color:#bbb;margin:0">Pumpkin · <a href="{admin_url}" style="color:#bbb">jayaremala.com/admin</a></p>
  </div>
</div>
</body>
</html>"""


def send_digest(html: str) -> None:
    """Send the digest email to Taruni via Gmail."""
    from app.core.settings import settings
    from app.integrations.gmail import _gmail_service

    recipient = settings.gmail_digest_recipient
    if not recipient:
        raise ValueError("GMAIL_DIGEST_RECIPIENT not set in environment")

    service = _gmail_service()
    msg = email.mime.text.MIMEText(html, "html")
    msg["to"] = recipient
    msg["from"] = "me"
    msg["subject"] = "🎃 Pumpkin Weekly — your portfolio this week"

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()
    logger.info("Weekly digest sent to %s", recipient)


def should_send_digest(stats: dict) -> bool:
    """Only send if the week had meaningful activity."""
    sessions = stats.get("conversations", {}).get("week", {}).get("sessions", 0)
    return sessions >= 5
