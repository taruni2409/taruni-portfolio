"""Google Drive integration — resume sync and Google Docs draft import."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


def _drive_service():
    from googleapiclient.discovery import build
    from app.integrations.google_auth import get_credentials

    creds = get_credentials()
    if creds is None:
        raise RuntimeError("Google account not connected. Complete OAuth setup in admin panel.")
    return build("drive", "v3", credentials=creds)


def _data_dir() -> Path:
    from app.rag.ingest import DATA_DIR
    return DATA_DIR


# ── Resume sync ───────────────────────────────────────────────────────────────

_RESUME_FOLDER = "resume_public_share"


def _get_folder_id(service, folder_name: str) -> str | None:
    """Return the Drive folder ID for the given folder name, or None if not found."""
    results = service.files().list(
        q=f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields="files(id,name)",
        pageSize=1,
    ).execute()
    folders = results.get("files", [])
    return folders[0]["id"] if folders else None


def get_resume_metadata() -> dict | None:
    """Find the most recently modified PDF inside the 'resume_public_share' Drive folder."""
    service = _drive_service()
    try:
        folder_id = _get_folder_id(service, _RESUME_FOLDER)
        if not folder_id:
            raise RuntimeError(f"Google Drive folder '{_RESUME_FOLDER}' not found. Create it and upload your resume PDF there.")

        results = service.files().list(
            q=f"'{folder_id}' in parents and mimeType='application/pdf' and trashed=false",
            orderBy="modifiedTime desc",
            pageSize=5,
            fields="files(id,name,modifiedTime,webViewLink,size)",
        ).execute()
        files = results.get("files", [])
        if not files:
            raise RuntimeError(f"No PDF found in the '{_RESUME_FOLDER}' folder. Upload your resume PDF there and try again.")
        f = files[0]
        return {
            "id": f["id"],
            "name": f["name"],
            "modified_time": f.get("modifiedTime", ""),
            "web_view_link": f.get("webViewLink", ""),
            "size_bytes": int(f.get("size", 0)),
        }
    except RuntimeError:
        raise
    except Exception as exc:
        logger.warning("get_resume_metadata failed: %s", exc)
        return None


def extract_resume_text(file_id: str) -> str:
    """Download PDF bytes and use Gemini to extract structured resume text."""
    service = _drive_service()
    try:
        import io
        from googleapiclient.http import MediaIoBaseDownload

        request = service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

        pdf_bytes = buffer.getvalue()
    except Exception as exc:
        logger.warning("PDF download failed: %s", exc)
        return ""

    try:
        import google.genai as genai
        from google.genai.types import Part
        from app.core.settings import settings

        client = genai.Client(api_key=settings.google_api_key)
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=[
                Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                "Extract the full text content of this resume. Preserve structure (sections, bullet points). "
                "Output plain text only — no markdown, no commentary.",
            ],
        )
        return (response.text or "").strip()
    except Exception as exc:
        logger.warning("Gemini PDF extraction failed: %s", exc)
        return ""


def sync_resume() -> dict:
    """Fetch resume metadata + text, write drive_resume.json, trigger ingest."""
    try:
        meta = get_resume_metadata()
    except RuntimeError as exc:
        return {"ok": False, "error": str(exc)}
    if meta is None:
        return {"ok": False, "error": "No resume PDF found in Google Drive"}

    text = extract_resume_text(meta["id"])
    if not text:
        return {"ok": False, "error": "Could not extract text from PDF"}

    import json
    payload = {
        **meta,
        "text": text,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "word_count": len(text.split()),
    }
    out_path = _data_dir() / "drive_resume.json"
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    logger.info("drive_resume.json written: %d words", payload["word_count"])
    return {"ok": True, "word_count": payload["word_count"], "name": meta["name"], "modified_time": meta["modified_time"]}


def get_resume_status() -> dict:
    """Read cached drive_resume.json if it exists."""
    path = _data_dir() / "drive_resume.json"
    if not path.exists():
        return {"synced": False}
    try:
        import json
        data = json.loads(path.read_text())
        return {
            "synced": True,
            "name": data.get("name", ""),
            "word_count": data.get("word_count", 0),
            "modified_time": data.get("modified_time", ""),
            "synced_at": data.get("synced_at", ""),
            "web_view_link": data.get("web_view_link", ""),
        }
    except Exception:
        return {"synced": False, "error": "Could not read drive_resume.json"}


# ── Blog draft import from Google Docs ────────────────────────────────────────

_DRAFT_FOLDER_NAME = "Portfolio Drafts"


def list_draft_docs() -> list[dict]:
    """List Google Docs in the 'Portfolio Drafts' folder."""
    service = _drive_service()
    try:
        # First find the folder
        folders = service.files().list(
            q=f"name='{_DRAFT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="files(id,name)",
            pageSize=1,
        ).execute().get("files", [])

        if not folders:
            # No dedicated folder — just list recent Docs
            docs = service.files().list(
                q="mimeType='application/vnd.google-apps.document' and trashed=false",
                orderBy="modifiedTime desc",
                pageSize=10,
                fields="files(id,name,modifiedTime)",
            ).execute().get("files", [])
        else:
            folder_id = folders[0]["id"]
            docs = service.files().list(
                q=f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false",
                orderBy="modifiedTime desc",
                pageSize=20,
                fields="files(id,name,modifiedTime)",
            ).execute().get("files", [])

        return [
            {"id": d["id"], "name": d["name"], "modified_time": d.get("modifiedTime", "")}
            for d in docs
        ]
    except Exception as exc:
        logger.warning("list_draft_docs failed: %s", exc)
        return []


def export_doc_as_text(doc_id: str) -> str:
    """Export a Google Doc as plain text."""
    service = _drive_service()
    try:
        import io
        content = service.files().export_media(
            fileId=doc_id,
            mimeType="text/plain",
        ).execute()
        return content.decode("utf-8") if isinstance(content, bytes) else content
    except Exception as exc:
        logger.warning("export_doc_as_text failed: %s", exc)
        return ""
