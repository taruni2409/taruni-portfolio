"""Google OAuth2 token management — shared by gmail, calendar, and drive integrations.

Token stored at settings.google_oauth_token_path on the persistent volume.
One-time setup via /admin/google-auth/init → /admin/google-auth/callback.
Auto-refresh handled by google-auth library on each API call.
"""
from __future__ import annotations

import json
import logging
import urllib.error
from pathlib import Path

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


def _token_path() -> Path:
    from app.core.settings import settings
    return Path(settings.google_oauth_token_path)


def _client_id() -> str:
    from app.core.settings import settings
    return settings.google_oauth_client_id


def _client_secret() -> str:
    from app.core.settings import settings
    return settings.google_oauth_client_secret


def get_credentials():
    """Load and auto-refresh credentials from the token file.
    Returns None if token file doesn't exist or credentials are invalid.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        path = _token_path()
        if not path.exists():
            return None

        creds = Credentials.from_authorized_user_file(str(path), SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                _save_credentials(creds)
            else:
                return None
        return creds
    except Exception as exc:
        logger.warning("get_credentials failed: %s", exc)
        return None


def _save_credentials(creds) -> None:
    path = _token_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(creds.to_json())


def get_auth_url(redirect_uri: str) -> str:
    """Return the Google OAuth2 authorization URL for the consent screen.

    Built manually (no PKCE) so the code_verifier round-trip issue in
    google-auth-oauthlib doesn't cause an invalid_grant on token exchange.
    """
    import urllib.parse

    params = {
        "client_id": _client_id(),
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)


def exchange_code(code: str, redirect_uri: str) -> dict:
    """Exchange an OAuth2 authorization code for tokens and persist them.

    Uses a direct HTTPS POST (no PKCE) so it pairs correctly with the
    manually-built auth URL above.
    """
    import json as _json
    import urllib.parse
    import urllib.request
    from google.oauth2.credentials import Credentials

    body = urllib.parse.urlencode({
        "code": code,
        "client_id": _client_id(),
        "client_secret": _client_secret(),
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }).encode()

    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req) as resp:  # noqa: S310
            token_data: dict = _json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        err = _json.loads(exc.read())
        raise RuntimeError(f"Token exchange failed: {err.get('error_description', err)}") from exc

    creds = Credentials(
        token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=_client_id(),
        client_secret=_client_secret(),
        scopes=SCOPES,
    )
    _save_credentials(creds)
    return {
        "ok": True,
        "scopes": SCOPES,
        "has_refresh_token": bool(token_data.get("refresh_token")),
    }


def get_status() -> dict:
    """Return connection status for the admin panel."""
    path = _token_path()
    if not path.exists():
        return {"connected": False, "scopes": []}

    creds = get_credentials()
    if creds is None:
        return {"connected": False, "scopes": [], "error": "Token invalid or expired"}

    return {
        "connected": True,
        "scopes": list(creds.scopes or []),
        "has_gmail": any("gmail" in s for s in (creds.scopes or [])),
        "has_calendar": any("calendar" in s for s in (creds.scopes or [])),
        "has_drive": any("drive" in s for s in (creds.scopes or [])),
    }


def revoke() -> None:
    """Delete the stored token file."""
    path = _token_path()
    if path.exists():
        path.unlink()
        logger.info("Google OAuth token revoked")
