from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
from typing import Iterator, Literal

import google.genai as genai
from google.genai import types
from fastapi import APIRouter, HTTPException
from app.core.limiter import limiter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from fastapi import Request

from app.core.settings import settings
from app.db import analytics
from app.obs.trace import Trace
from app.rag import graph as rag_graph
from app.rag import store as rag_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])

_genai_client: genai.Client | None = None

SYSTEM_PROMPT = """You are Pumpkin, an AI assistant representing Taruni Nallamothu.
Your job is to help recruiters and visitors learn about Taruni's professional background.

ABOUT TARUNI (core facts — always use these even if context is empty):
Taruni Nallamothu is an AI/ML Engineer & Data Engineer based in London, UK, with close to three years
of experience building Generative AI, RAG, agentic AI, and data engineering systems.
Key highlights:
- Google Certified: Associate Cloud Engineer | Microsoft Certified: Azure Data Scientist Associate
- At Hansvonlehwalt: builds RAG pipelines, agentic multi-agent AI workflows, and conversational AI using Azure OpenAI and Azure AI Foundry
- At Tata Consultancy Services: engineered data and ML pipelines on Azure Databricks processing 500GB+ of enterprise data daily across 1M+ validated records
- Built NovaBank, an AI customer support intelligence platform (retail-banking case study): fine-tuned a DistilBERT intent classifier to 90.59% F1 and an XGBoost SLA-breach predictor to 77.98% recall, with a Gemini-powered RAG pipeline over ChromaDB
- M.Sc. Data Science, University of Hertfordshire (GPA 3.91/4.0)
- Contact: taruninallamothu24@gmail.com | +44 7741031780 | linkedin.com/in/taruninallamothu24 | github.com/taruni2409
- Pumpkin uses BAAI/bge-base-en-v1.5 (768-dim ONNX) for dense retrieval + BM25 + RRF + knowledge graph expansion

RESPONSE RULES:
- ALWAYS answer questions about Taruni's background, experience, projects, education, and skills
- Use the retrieved context below for precise details; fall back to the ABOUT section above if context is sparse
- Refer to Taruni in third person ("She", "Taruni") — you represent her, you are not her
- Cite exact numbers and metrics whenever available
- For greetings ("hi", "hello", "hey", "howdy", "good morning", etc.) respond warmly, introduce yourself as Pumpkin and offer 2–3 things the visitor can ask about Taruni (experience, projects, skills)
- For broad intro questions ("who is Taruni", "tell me about her"), lead with the Google/Microsoft certifications + Generative AI/RAG work at Hansvonlehwalt + data engineering at TCS
- Keep responses concise: 2–3 sentences for simple questions, structured paragraphs for detailed ones
- For questions completely unrelated to Taruni's professional life, say: "That's outside what I know about Taruni — feel free to reach her directly at taruninallamothu24@gmail.com"
- Do not fabricate specific facts (numbers, dates, company names) not present in context or the ABOUT section
- Never return an empty response — always say something helpful

PORTFOLIO SECTION LINKS (use these when relevant — the UI will render them as clickable pills):
- Full work history → /experience
- All projects → /projects
- Education details → /education
- Skills overview → /portfolio
- Blog posts → /blog  (individual post → /blog/[slug])
- Lab / system design docs → /lab  (individual entry → /lab/[slug])
- Curated quotes collection → /quotes
- Photo gallery (milestones, events, achievements) → /gallery
- What Taruni is currently doing, building, reading → /now
- Resume → available via the Resume link in navigation"""


def _get_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        if not settings.google_api_key:
            raise HTTPException(status_code=503, detail="GOOGLE_API_KEY is not configured")
        _genai_client = genai.Client(api_key=settings.google_api_key)
    return _genai_client


# ── Multi-provider generation (Gemini + OpenAI-compatible free tiers) ─────────
# Chain entries are "provider:model" (bare names default to gemini). Groq and
# OpenRouter speak the OpenAI API, so one client type covers both; stacking their
# free tiers behind Gemini keeps the chatbot answering after Gemini's daily quota.

_openai_clients: dict[str, object] = {}

_OPENAI_PROVIDERS = {
    "groq":       ("https://api.groq.com/openai/v1", "groq_api_key"),
    "openrouter": ("https://openrouter.ai/api/v1",   "openrouter_api_key"),
}


def _split(entry: str) -> tuple[str, str]:
    """'provider:model' → (provider, model); a bare name defaults to gemini."""
    if ":" in entry:
        provider, _, model = entry.partition(":")
        return provider, model
    return "gemini", entry


def _openai_client(provider: str):
    client = _openai_clients.get(provider)
    if client is None:
        import openai
        base_url, key_attr = _OPENAI_PROVIDERS[provider]
        api_key = getattr(settings, key_attr, "")
        if not api_key:
            raise HTTPException(status_code=503, detail=f"{provider} API key is not configured")
        client = openai.OpenAI(base_url=base_url, api_key=api_key)
        _openai_clients[provider] = client
    return client


def _gemini_models() -> list[str]:
    """Bare Gemini model names from the chain — for Gemini-only paths (agent mode)."""
    out: list[str] = []
    for entry in settings.model_chain:
        provider, model = _split(entry)
        if provider == "gemini":
            out.append(model)
    return out


_GREETINGS = frozenset({
    "hi", "hello", "hey", "howdy", "sup", "yo", "hiya", "greetings",
    "good morning", "good afternoon", "good evening", "morning", "afternoon", "evening",
})

_HYDE_PROMPT = (
    "Write 2-3 sentences of factual biography text about Taruni Nallamothu that directly answers this question. "
    "Third person, specific details and numbers only. Be concise.\n"
    "Question: {question}"
)


# Strong category signals — these retrieve well via the name-anchored + topic
# query variants already, so HyDE's extra LLM round-trip adds latency without
# improving precision. Skip it for them; reserve HyDE for genuinely vague queries.
_HYDE_SKIP_KEYWORDS = (
    "experience", "work", "job", "role", "company", "tcs", "shell", "hertfordshire", "intern",
    "project", "built", "build", "ecocast", "leafcare", "certif", "google", "microsoft",
    "skill", "stack", "tech", "language", "framework", "python", "sql", "azure", "gcp",
    "education", "degree", "university", "gpa", "master",
    "contact", "email", "reach", "hire", "linkedin", "resume", "cv",
    "award", "win", "achiev", "available", "open to", "location", "based", "who is",
    "quote", "saying", "wisdom", "gallery", "photo", "milestone",
    "now", "currently", "right now", "these days",
)

_hyde_cache: dict[str, "str | None"] = {}
_HYDE_CACHE_MAX = 256


def _should_use_hyde(stripped: str) -> bool:
    if len(stripped) < 15 or stripped in _GREETINGS:
        return False
    if any(kw in stripped for kw in _HYDE_SKIP_KEYWORDS):
        return False
    return True


async def _hyde_query(user_message: str) -> str | None:
    """HyDE — Hypothetical Document Embeddings (Gao et al. 2022).
    Generates a short hypothetical answer and embeds *that* for vector search.
    Only runs for genuinely vague queries (no strong category signal); results
    are cached by normalized query and the call is hard-timeout bounded.
    """
    stripped = user_message.lower().strip()
    if not _should_use_hyde(stripped):
        return None
    if stripped in _hyde_cache:
        return _hyde_cache[stripped]

    prompt = _HYDE_PROMPT.format(question=user_message)
    try:
        loop = asyncio.get_running_loop()
        doc = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: _generate("", prompt)),
            timeout=2.5,
        )
        result = doc.strip() or None
    except Exception as exc:
        logger.debug("HyDE generation skipped: %s", exc)
        result = None

    if len(_hyde_cache) >= _HYDE_CACHE_MAX:
        _hyde_cache.clear()
    _hyde_cache[stripped] = result
    return result


def _build_rag_queries(req: ChatRequest) -> list[str]:
    """Generate up to 4 targeted query angles: verbatim, name-anchored, topic keyword, follow-up context."""
    queries = [req.message]

    # Name-anchored variant improves person-specific retrieval
    queries.append(f"{req.message} Taruni Nallamothu")

    # Single topic-specific keyword variant (mutually exclusive, first match wins)
    stripped = req.message.lower().strip()
    if stripped in {"hi", "hello", "hey", "howdy", "sup", "yo", "hiya", "greetings", "good morning",
                    "good afternoon", "good evening", "morning", "afternoon", "evening"} or \
            (len(stripped) < 20 and any(kw in stripped for kw in ["hi ", "hello ", "hey ", "howdy"])):
        queries.append("who is Taruni Nallamothu background profile achievements summary")
    elif any(kw in stripped for kw in ["who is", "who are", "background", "about taruni", "tell me about",
                                       "introduce", "overview", "summary", "yourself", "what does she do",
                                       "what is she", "what kind"]):
        queries.append("who is Taruni Nallamothu background profile achievements summary")
    elif any(kw in stripped for kw in ["experience", "work", "job", "role", "company", "tcs", "shell"]):
        queries.append("work experience roles companies Tata Consultancy Services Shell Hansvonlehwalt")
    elif any(kw in stripped for kw in ["project", "built", "created", "developed", "ecocast", "leafcare"]):
        queries.append("projects built Intelligent Medical Text Analyser EcoCast Traffic Flow Prediction LeafCare")
    elif any(kw in stripped for kw in ["skill", "tech", "stack", "language", "know"]):
        queries.append("technical skills programming languages frameworks")
    elif any(kw in stripped for kw in ["educat", "degree", "study", "university", "hertfordshire", "school", "master"]):
        queries.append("education degree University of Hertfordshire V.R Siddhartha Engineering College")
    elif any(kw in stripped for kw in ["award", "win", "certif", "achiev", "special", "stand out", "impress"]):
        queries.append("Google Microsoft certification cloud engineer data scientist achievement strengths")
    elif any(kw in stripped for kw in ["contact", "email", "reach", "hire", "linkedin", "resume", "cv"]):
        queries.append("contact email LinkedIn GitHub resume CV download")
    elif any(kw in stripped for kw in ["quote", "saying", "wisdom", "words", "philosophy", "live by"]):
        queries.append("quotes curated collection favorite Taruni books reading wisdom")
    elif any(kw in stripped for kw in ["gallery", "photo", "milestone", "achievement photo", "event"]):
        queries.append("gallery milestones events achievements photos Taruni")
    elif any(kw in stripped for kw in ["now", "currently", "right now", "these days", "up to", "reading now", "building now"]):
        queries.append("Taruni currently building learning reading now page")

    # Add recent conversation context for follow-up questions (only if slot remains)
    if len(queries) < 4:
        recent = [m.content for m in req.messages[-4:] if m.role == "user"][-1:]
        if recent:
            combined = recent[0] + " " + req.message
            if combined.strip() != req.message.strip():
                queries.append(combined)

    return queries[:4]


_STOP_WORDS = {"what", "tell", "about", "your", "have", "does", "that", "with", "from", "this",
               "taruni", "her", "the", "and", "for", "you", "can", "more", "some", "any"}


def _rerank_chunks(chunks: list[dict], user_message: str) -> list[dict]:
    """Boost chunks that contain keywords from the user message as a tie-breaker."""
    keywords = {w.lower() for w in user_message.split() if len(w) > 3 and w.lower() not in _STOP_WORDS}
    if not keywords:
        return chunks
    for chunk in chunks:
        text_lower = chunk["text"].lower()
        overlap = sum(1 for kw in keywords if kw in text_lower)
        chunk["_rank"] = chunk["score"] + overlap * 0.05
    return sorted(chunks, key=lambda c: c.get("_rank", c["score"]), reverse=True)


def _build_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a clean, structured context block.
    Returns empty string when nothing is retrieved — the system prompt's ABOUT
    section already has core facts so the model can still answer.
    """
    if not chunks or all(c.get("rrf_score", c.get("score", 0)) < 0.005 for c in chunks):
        return ""

    # Group by type for cleaner context
    by_type: dict[str, list[str]] = {}
    for c in chunks:
        t = c["type"]
        by_type.setdefault(t, []).append(c["text"])

    sections = []
    type_labels = {
        "profile":    "Profile",
        "experience": "Work Experience",
        "education":  "Education",
        "project":    "Projects",
        "skills":     "Skills",
        "faq":        "Key Facts",
        "blog":       "Blog Posts",
        "lab":        "Lab / System Design",
    }
    for t in ["faq", "profile", "experience", "project", "education", "skills", "blog", "lab"]:
        if t in by_type:
            label = type_labels.get(t, t.title())
            content = "\n".join(f"• {text}" for text in by_type[t])
            sections.append(f"[{label}]\n{content}")

    return "\n\n".join(sections)


_CALENDAR_KEYWORDS = frozenset({
    "book", "schedule", "call", "meeting", "available", "availability",
    "slot", "free", "interview", "chat", "connect", "this week", "next week",
    "30 min", "30-min", "30 minute", "hop on", "catch up",
})


def _is_calendar_query(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in _CALENDAR_KEYWORDS)


def _build_chat_prompt(req: ChatRequest, context: str, extra_blocks: dict[str, str] | None = None) -> str:
    history_text = ""
    for m in req.messages[-4:]:
        prefix = "User" if m.role == "user" else "Pumpkin"
        history_text += f"{prefix}: {m.content}\n"

    context_block = (
        f"--- RETRIEVED CONTEXT ---\n{context}\n--- END CONTEXT ---\n\n"
        if context else ""
    )

    persona_block = ""
    if req.persona and req.persona in _PERSONA_GUIDANCE:
        persona_block = f"AUDIENCE TAILORING: {_PERSONA_GUIDANCE[req.persona]}\n\n"

    extra_text = ""
    if extra_blocks:
        for label, content in extra_blocks.items():
            if content:
                extra_text += f"[{label}]\n{content}\n\n"

    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"{persona_block}"
        f"{context_block}"
        f"{extra_text}"
        f"Conversation history:\n{history_text}"
        f"User: {req.message}\nPumpkin:"
    )


def _is_capacity_error(exc: Exception) -> bool:
    # OpenAI-compatible providers (Groq / OpenRouter) raise typed rate/5xx errors.
    try:
        import openai
        if isinstance(exc, openai.RateLimitError):
            return True
        if isinstance(exc, openai.APIStatusError) and getattr(exc, "status_code", None) in (429, 500, 502, 503):
            return True
    except Exception:
        pass
    msg = str(exc)
    return (
        "503" in msg or "429" in msg
        or "UNAVAILABLE" in msg or "RESOURCE_EXHAUSTED" in msg
        or "exhausted" in msg.lower()
        # 404 means this model name is deprecated/removed — skip to next, not a code bug
        or ("404" in msg and "NOT_FOUND" in msg)
    )


def _generate(system: str, prompt: str) -> str:
    chain = settings.model_chain
    last_exc: Exception | None = None
    for entry in chain:
        provider, model = _split(entry)
        try:
            if provider == "gemini":
                contents = f"{system}\n\n{prompt}" if system else prompt
                response = _get_client().models.generate_content(model=model, contents=contents)
                text = response.text or ""
            else:
                messages = ([{"role": "system", "content": system}] if system else [])
                messages.append({"role": "user", "content": prompt})
                resp = _openai_client(provider).chat.completions.create(model=model, messages=messages)
                text = resp.choices[0].message.content or ""
            if entry != chain[0]:
                logger.info("Generated via fallback: %s", entry)
            return text
        except Exception as exc:
            if _is_capacity_error(exc):
                logger.warning("%s unavailable (%s), trying next...", entry, exc)
                last_exc = exc
            else:
                raise
    raise last_exc or RuntimeError("All models exhausted")


_RESET_SENTINEL = object()  # yielded to signal "discard partial output, retrying next model"


def _stream_tokens(full_prompt: str, used_model: list[str], usage: dict | None = None) -> Iterator:
    """Yields str tokens, or _RESET_SENTINEL when switching models mid-stream.
    Dispatches per chain entry: Gemini via google-genai, Groq/OpenRouter via the
    OpenAI-compatible streaming API. Appends the served `provider:model` to used_model.
    When `usage` is provided, populates it with prompt/completion token counts from the
    serving provider (best-effort — left at 0 when a provider omits usage)."""
    chain = settings.model_chain
    last_exc: Exception | None = None
    for entry in chain:
        provider, model = _split(entry)
        yielded_any = False
        try:
            if provider == "gemini":
                for chunk in _get_client().models.generate_content_stream(model=model, contents=full_prompt):
                    if chunk.text:
                        yield chunk.text
                        yielded_any = True
                    meta = getattr(chunk, "usage_metadata", None)
                    if usage is not None and meta:
                        usage["prompt_tokens"] = getattr(meta, "prompt_token_count", 0) or 0
                        usage["completion_tokens"] = getattr(meta, "candidates_token_count", 0) or 0
            else:
                stream = _openai_client(provider).chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": full_prompt}],
                    stream=True,
                    stream_options={"include_usage": True},
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta.content if chunk.choices else None
                    if delta:
                        yield delta
                        yielded_any = True
                    u = getattr(chunk, "usage", None)
                    if usage is not None and u:
                        usage["prompt_tokens"] = getattr(u, "prompt_tokens", 0) or 0
                        usage["completion_tokens"] = getattr(u, "completion_tokens", 0) or 0
            used_model.append(entry)
            if entry != chain[0]:
                logger.info("Streamed via fallback: %s", entry)
            return
        except Exception as exc:
            if _is_capacity_error(exc):
                logger.warning("%s capacity error (%s), trying next...", entry, exc)
                if yielded_any:
                    # Partial tokens already sent — tell the frontend to discard them
                    yield _RESET_SENTINEL
                last_exc = exc
            else:
                raise
    raise last_exc or RuntimeError("All models exhausted")


# ── Models ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = []
    message: str
    persona: str | None = None


_PERSONA_GUIDANCE = {
    "recruiter": (
        "The visitor is a RECRUITER or hiring manager. Lead with impact, outcomes, and fit: "
        "availability, target roles, standout achievements (Google/Microsoft cloud certifications, "
        "90.59% F1 intent classifier and 77.98% recall SLA-breach predictor on NovaBank, "
        "500GB+ daily ETL at TCS), and how Taruni works with teams. Keep it crisp and "
        "results-focused, quantify wherever possible, and proactively surface availability and how to reach her."
    ),
    "engineer": (
        "The visitor is a SOFTWARE ENGINEER. Lead with technical depth: architecture, the stack, "
        "design tradeoffs, and how systems were actually built (RAG pipelines with Gemini and ChromaDB, "
        "agentic multi-agent workflows on Azure OpenAI, Azure Databricks pipeline design, "
        "DistilBERT fine-tuning and SHAP explainability). "
        "Use precise technical language and concrete implementation details."
    ),
    "founder": (
        "The visitor is a FOUNDER or startup leader. Lead with ownership, shipping speed, and "
        "end-to-end capability: what Taruni can build solo and how fast, breadth across the data "
        "stack, and the business impact of her work. Emphasize turning ambiguity into shipped product."
    ),
}


class ChatResponse(BaseModel):
    reply: str
    sources: list[str]


# ── /ai/chat (non-streaming fallback) ────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def ai_chat(req: ChatRequest) -> ChatResponse:
    queries = _build_rag_queries(req)
    dense = rag_store.query_batch(queries, n_per_query=6)
    bm25 = rag_store.bm25_query(req.message, n_results=15)
    merged = rag_store.rrf_merge(dense, bm25, k=60, top_n=20)
    top_chunks = rag_store.rerank_cross_encoder(req.message, merged, top_n=4)
    graph_extras = rag_graph.expand_context(
        retrieved_ids=[c["id"] for c in top_chunks],
        rrf_pool=merged,
        max_expansion=1,
    )
    if graph_extras:
        top_chunks = top_chunks + graph_extras
    context = _build_context(top_chunks)
    sources = [f"{c['type']}:{c['id']}" for c in top_chunks]
    prompt = _build_chat_prompt(req, context)
    reply = _generate("", prompt)
    return ChatResponse(reply=reply.strip(), sources=sources)


# ── /ai/chat/stream (SSE streaming) ──────────────────────────────────────────

@router.post("/chat/stream")
@limiter.limit("10/minute")
async def ai_chat_stream(req: ChatRequest, request: Request) -> StreamingResponse:
    trace = Trace()  # glass-box: per-stage timing for the "how this answer was built" waterfall
    queries = _build_rag_queries(req)
    try:
        # 1. HyDE generation + original dense retrieval run in parallel.
        #    HyDE generates a hypothetical answer; embedding it yields higher cosine
        #    similarity to real KB chunks than the raw question (Gao et al. 2022).
        with trace.span("retrieve"):
            hyde_task = asyncio.create_task(_hyde_query(req.message))
            dense_task = asyncio.create_task(rag_store.query_batch_async(queries, n_per_query=6))
            # 2. BM25 is sync and fast (~2ms) — run while async tasks are in flight
            bm25 = rag_store.bm25_query(req.message, n_results=15)
            hyde_doc, dense_result = await asyncio.gather(hyde_task, dense_task, return_exceptions=True)
            if isinstance(dense_result, BaseException):
                raise dense_result
            dense: list[dict] = list(dense_result)
            # 3. If HyDE produced a doc, embed it and prepend results so RRF rewards
            #    chunks retrieved by both signals (accumulated score = double rank bonus).
            if isinstance(hyde_doc, str) and hyde_doc:
                try:
                    hyde_chunks = await rag_store.query_batch_async([hyde_doc], n_per_query=8)
                    dense = hyde_chunks + dense
                    logger.debug("HyDE retrieved %d additional chunks", len(hyde_chunks))
                except Exception as exc:
                    logger.debug("HyDE embedding step failed (non-fatal): %s", exc)
        # 4. Hybrid merge via Reciprocal Rank Fusion
        with trace.span("rrf"):
            merged = rag_store.rrf_merge(dense, bm25, k=60, top_n=20)
        # 5. Cross-encoder rerank → top 4 (fewer context tokens = faster first token)
        with trace.span("rerank"):
            top_chunks = await rag_store.rerank_cross_encoder_async(req.message, merged, top_n=4)
        # 6. Graph expansion — pull in 1 related doc from the merged pool
        with trace.span("graph"):
            graph_extras = rag_graph.expand_context(
                retrieved_ids=[c["id"] for c in top_chunks],
                rrf_pool=merged,
                max_expansion=1,
            )
            if graph_extras:
                top_chunks = top_chunks + graph_extras
    except Exception as exc:
        logger.warning("Hybrid RAG pipeline failed, falling back to simple retrieval: %s", exc)
        top_chunks = await rag_store.query_multi_async(queries)
    context = _build_context(top_chunks)
    sources = [f"{c['type']}:{c['id']}" for c in top_chunks]
    # Best retrieval score for this query — drives the /system retrieval-quality metric.
    top_score = max((c.get("rrf_score", c.get("score", 0)) for c in top_chunks), default=0.0)

    # Gather live context blocks in parallel (calendar + inbox signals)
    extra_blocks: dict[str, str] = {}
    booking_card: dict = {}  # structured "book a call" card surfaced to the UI
    live_tasks = []

    if _is_calendar_query(req.message):
        async def _fetch_calendar():
            try:
                from app.integrations.calendar import get_availability_summary
                loop = asyncio.get_running_loop()
                summary = await asyncio.wait_for(
                    loop.run_in_executor(None, get_availability_summary),
                    timeout=2.5,
                )
                if summary:
                    extra_blocks["Availability"] = summary
            except Exception as exc:
                logger.debug("Calendar availability fetch skipped: %s", exc)
        live_tasks.append(_fetch_calendar())

        async def _fetch_booking():
            try:
                from app.integrations.calendar import get_booking_card
                loop = asyncio.get_running_loop()
                card = await asyncio.wait_for(
                    loop.run_in_executor(None, get_booking_card),
                    timeout=3.5,
                )
                if card:
                    booking_card.update(card)
            except Exception as exc:
                logger.debug("Booking card fetch skipped: %s", exc)
        live_tasks.append(_fetch_booking())

    if req.persona == "recruiter":
        async def _fetch_signals():
            try:
                import json
                from app.rag.ingest import DATA_DIR
                signals_path = DATA_DIR / "inbox_signals.json"
                if signals_path.exists():
                    import time as _time
                    age_days = (_time.time() - signals_path.stat().st_mtime) / 86400
                    if age_days < 7:
                        data = json.loads(signals_path.read_text())
                        summary = data.get("summary_text", "")
                        if summary:
                            extra_blocks["Market Signals"] = summary
            except Exception as exc:
                logger.debug("Inbox signals injection skipped: %s", exc)
        live_tasks.append(_fetch_signals())

    if live_tasks:
        await asyncio.gather(*live_tasks, return_exceptions=True)

    # When a booking card is shown, tell the model not to duplicate it in prose —
    # warmly invite the visitor to pick a time below instead of listing slots/links.
    if booking_card:
        extra_blocks["Booking"] = (
            "The visitor wants to schedule a call. A booking card with Taruni's open times "
            "and a Google booking button is displayed right below your reply. Warmly invite "
            "them to pick a time below — do NOT list the slots or paste a link yourself."
        )

    # Inject Drive resume context for resume-intent queries
    _RESUME_KEYWORDS = {"resume", "cv", "curriculum", "download resume", "latest resume"}
    if any(kw in req.message.lower() for kw in _RESUME_KEYWORDS):
        try:
            import json as _json
            from app.rag.ingest import DATA_DIR as _DATA_DIR
            resume_path = _DATA_DIR / "drive_resume.json"
            if resume_path.exists():
                rdata = _json.loads(resume_path.read_text())
                modified = rdata.get("modified_time", "")[:10]
                link = rdata.get("web_view_link", "")
                if link:
                    extra_blocks["Resume"] = f"Taruni's latest resume (updated {modified}): {link}"
        except Exception:
            pass

    full_prompt = _build_chat_prompt(req, context, extra_blocks if extra_blocks else None)

    # Determine if lead-capture prompt should be shown after response
    user_turn_count = sum(1 for m in req.messages if m.role == "user") + 1
    show_lead_capture = user_turn_count >= 3

    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip", "").strip()
        or (request.client.host if request.client else "unknown")
    )
    # Prefer the stable per-device UUID so unique chat users counts devices, not IPs.
    identifier = request.headers.get("x-visitor-id", "").strip() or ip
    analytics.record_question(req.message)

    def event_stream():
        used_model: list[str] = []
        usage: dict = {}
        try:
            llm_start = time.perf_counter()
            first_token_seen = False
            for item in _stream_tokens(full_prompt, used_model, usage):
                if item is _RESET_SENTINEL:
                    yield f"data: {json.dumps({'reset': True})}\n\n"
                else:
                    if not first_token_seen:
                        # Time-to-first-token: a key latency signal — the moment the
                        # visitor sees the answer start, not when it finishes.
                        trace.add("ttft", (time.perf_counter() - llm_start) * 1000)
                        first_token_seen = True
                    yield f"data: {json.dumps({'token': item})}\n\n"
            trace.add("llm", (time.perf_counter() - llm_start) * 1000)
            model_used = used_model[0] if used_model else settings.gemini_model
            latency_ms = int(trace.total_ms())
            row_id = analytics.record(
                identifier, model_used, latency_ms,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                top_score=top_score,
            )
            stages = trace.as_list()
            done_payload: dict = {
                "done": True, "sources": sources, "model": model_used,
                "trace": stages, "latency_ms": latency_ms,
            }
            if show_lead_capture:
                done_payload["lead_capture_prompt"] = True
            if booking_card:
                done_payload["booking_card"] = booking_card
            yield f"data: {json.dumps(done_payload)}\n\n"
            # Persist the stage breakdown + geo off the hot path
            threading.Thread(
                target=analytics.record_stage_timings,
                args=(row_id, stages),
                daemon=True,
            ).start()
            if row_id:
                threading.Thread(
                    target=analytics.geo_update_sync,
                    args=("interactions", row_id, ip),
                    daemon=True,
                ).start()
        except Exception as exc:
            logger.error("Streaming error: %s", exc)
            error_code = "quota_exhausted" if _is_capacity_error(exc) else "stream_error"
            model_attempted = used_model[0] if used_model else settings.gemini_model
            analytics.record_error(identifier, model_attempted, error_code, int(trace.total_ms()))
            yield f"data: {json.dumps({'error': error_code})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── /ai/chat/agentic (visible tool-calling agent) ────────────────────────────

AGENT_SYSTEM_PROMPT = SYSTEM_PROMPT + (
    "\n\nYOU HAVE TOOLS. You are an agent — decide which tools to call to answer.\n"
    "- Use `search_knowledge` for any open-ended question about Taruni's background.\n"
    "- Use the `get_*` tools (get_experience, get_projects, get_project, get_skills, "
    "get_education, get_now, get_resume, get_profile, get_blog, get_lab) for specific "
    "structured facts. For blog/lab: call get_blog/get_lab with no args to list, then "
    "pass a `slug` to read one in full.\n"
    "- Use `check_availability` for 'is he available / open to work' questions.\n"
    "- Use `get_booking_link` when the visitor wants to book / schedule / set up a call, "
    "meeting, or interview. A booking card with open times + a booking button is shown "
    "below your reply automatically — so warmly invite them to pick a time instead of "
    "listing slots or pasting the link yourself.\n"
    "Call tools before answering; ground every claim in their results. Once you have "
    "enough, give a concise final answer. Do not mention the tools by name to the user."
)

_GEMINI_TYPE = {
    "string": "STRING", "integer": "INTEGER", "number": "NUMBER",
    "boolean": "BOOLEAN", "object": "OBJECT", "array": "ARRAY",
}

_gemini_tools_cache: list | None = None


def _json_schema_to_gemini(js: dict):
    props = {
        k: types.Schema(
            type=getattr(types.Type, _GEMINI_TYPE.get(v.get("type", "string"), "STRING")),
            description=v.get("description"),
        )
        for k, v in (js.get("properties") or {}).items()
    }
    return types.Schema(
        type=types.Type.OBJECT,
        properties=props or None,
        required=(js.get("required") or None),
    )


def _gemini_tools() -> list:
    """Build (once) the Gemini Tool declaration list from the shared registry."""
    global _gemini_tools_cache
    if _gemini_tools_cache is None:
        from app.agent.tools import TOOLS
        decls = [
            types.FunctionDeclaration(
                name=t.name, description=t.description,
                parameters=_json_schema_to_gemini(t.parameters),
            )
            for t in TOOLS
        ]
        _gemini_tools_cache = [types.Tool(function_declarations=decls)]
    return _gemini_tools_cache


_openai_tools_cache: list | None = None


def _openai_tools() -> list:
    """Same registry in OpenAI tool-calling shape (for Groq / OpenRouter agent mode)."""
    global _openai_tools_cache
    if _openai_tools_cache is None:
        from app.agent.tools import TOOLS
        _openai_tools_cache = [
            {"type": "function", "function": {
                "name": t.name, "description": t.description, "parameters": t.parameters,
            }}
            for t in TOOLS
        ]
    return _openai_tools_cache


def _is_thinking_model(model: str) -> bool:
    """Gemini 2.5 / flash-latest / pro are thinking models. Manual (non-automatic)
    function-calling with thinking on requires round-tripping a `thought_signature`
    on every function call; we disable thinking instead (plenty for tool selection)
    so those signatures are never produced or required. 2.0 / lite models are not
    thinking models and must NOT receive a thinking_config."""
    m = model.lower()
    return ("2.5" in m) or ("flash-latest" in m) or ("pro" in m) or ("gemini-3" in m)


def _agent_config(model: str, with_tools: bool):
    kwargs: dict = {"system_instruction": AGENT_SYSTEM_PROMPT}
    if with_tools:
        kwargs["tools"] = _gemini_tools()
        kwargs["automatic_function_calling"] = types.AutomaticFunctionCallingConfig(disable=True)
    if _is_thinking_model(model):
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    return types.GenerateContentConfig(**kwargs)


def _is_deterministic_skip(exc: Exception) -> bool:
    """Errors that will recur identically for this model every round, so the model
    should be blocked for the rest of the request instead of retried each round:
    a missing thought_signature (the model demands signatures we can't supply in a
    manual tool loop) or a non-existent model id (404)."""
    msg = str(exc).lower()
    return (
        "thought_signature" in msg
        or ("404" in msg and "not_found" in msg)
        or "is not found for api version" in msg
    )


_MAX_TOOL_ROUNDS = 4


@router.post("/chat/agentic")
@limiter.limit("8/minute")
async def ai_chat_agentic(req: ChatRequest, request: Request) -> StreamingResponse:
    """Gemini function-calling agent over the shared tool registry. Streams visible
    `step` events as each tool runs, then the final answer tokens, then a `done`
    payload with the per-stage trace. The classic /chat/stream stays the default;
    this is opt-in 'Agent mode'."""
    from app.agent.tools import TOOLS_BY_NAME

    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip", "").strip()
        or (request.client.host if request.client else "unknown")
    )
    identifier = request.headers.get("x-visitor-id", "").strip() or ip
    analytics.record_question(req.message)

    # Shared per-request state used by both provider agents.
    trace = Trace()
    sources: list[str] = []
    booking_card: dict = {}  # populated when the agent calls get_booking_link

    def _emit_tool(name: str, args: dict):
        """Run one tool, streaming its running/done step events; return the result.
        Shared by the Gemini and OpenAI agents (the visible 'steps' are identical)."""
        yield f"data: {json.dumps({'step': {'tool': name, 'status': 'running'}})}\n\n"
        t0 = time.perf_counter()
        tool = TOOLS_BY_NAME.get(name)
        try:
            result = tool.run(**args) if tool else {"error": f"unknown tool {name}"}
        except Exception as exc:
            result = {"error": str(exc)}
        ms = (time.perf_counter() - t0) * 1000
        trace.add(f"tool:{name}", ms)
        if name == "search_knowledge" and isinstance(result, list):
            sources.extend(f"{c.get('type')}:{c.get('id')}" for c in result if isinstance(c, dict))
        if name == "get_booking_link" and isinstance(result, dict):
            booking_card.clear()
            booking_card.update(result)
            yield f"data: {json.dumps({'booking_card': result})}\n\n"
        yield f"data: {json.dumps({'step': {'tool': name, 'status': 'done', 'ms': round(ms, 1)}})}\n\n"
        return result

    # ── Gemini agent (native function-calling) ──────────────────────────────
    contents: list = []
    for m in req.messages[-8:]:
        role = "user" if m.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=m.content)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=req.message)]))

    # Pin to the model that served the previous round; block models that fail
    # deterministically (404 / thought_signature) for the rest of the request.
    preferred: list[str | None] = [None]
    blocked: set[str] = set()

    def _ordered_chain() -> list[str]:
        chain = _gemini_models()
        ordered = ([preferred[0]] + [m for m in chain if m != preferred[0]]) if preferred[0] else list(chain)
        return [m for m in ordered if m not in blocked]

    def _should_fall_through(model: str, exc: Exception) -> bool:
        if _is_deterministic_skip(exc):
            logger.warning("Agentic: blocking %s for this request (%s)", model, str(exc)[:120])
            blocked.add(model)
            return True
        if _is_capacity_error(exc):
            logger.warning("Agentic: %s unavailable (%s); trying next", model, str(exc)[:80])
            return True
        return False

    def _gemini_generate(used: list[str]):
        last_exc: Exception | None = None
        for model in _ordered_chain():
            try:
                resp = _get_client().models.generate_content(
                    model=model, contents=contents, config=_agent_config(model, with_tools=True)
                )
                used.append(model)
                preferred[0] = model
                return resp
            except Exception as exc:
                last_exc = exc
                if _should_fall_through(model, exc):
                    continue
                raise
        raise last_exc or RuntimeError("All models exhausted")

    def _gemini_agent():
        for _ in range(_MAX_TOOL_ROUNDS):
            used: list[str] = []
            resp = _gemini_generate(used)
            cand = resp.candidates[0] if resp.candidates else None
            parts = cand.content.parts if (cand and cand.content and cand.content.parts) else []
            fcs = [p.function_call for p in parts if getattr(p, "function_call", None)]
            if not fcs:
                break
            contents.append(cand.content)
            tool_parts = []
            for fc in fcs:
                result = yield from _emit_tool(fc.name, dict(fc.args or {}))
                tool_parts.append(types.Part.from_function_response(name=fc.name, response={"result": result}))
            contents.append(types.Content(role="tool", parts=tool_parts))
        # Final answer — tools off forces a text response; stream it.
        llm_start = time.perf_counter()
        streamed = False
        last_exc: Exception | None = None
        final_model = preferred[0] or settings.gemini_model
        for model in _ordered_chain():
            try:
                for chunk in _get_client().models.generate_content_stream(
                    model=model, contents=contents, config=_agent_config(model, with_tools=False)
                ):
                    if chunk.text:
                        streamed = True
                        yield f"data: {json.dumps({'token': chunk.text})}\n\n"
                final_model = model
                preferred[0] = model
                break
            except Exception as exc:
                last_exc = exc
                if _should_fall_through(model, exc):
                    if streamed:
                        yield f"data: {json.dumps({'reset': True})}\n\n"
                        streamed = False
                    continue
                raise
        if not streamed and last_exc:
            raise last_exc
        trace.add("llm", (time.perf_counter() - llm_start) * 1000)
        return f"gemini:{final_model}"

    # ── OpenAI-compatible agent (Groq / OpenRouter) ─────────────────────────
    def _openai_agent(provider: str, model: str):
        oclient = _openai_client(provider)
        messages: list = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]
        for m in req.messages[-8:]:
            messages.append({"role": "user" if m.role == "user" else "assistant", "content": m.content})
        messages.append({"role": "user", "content": req.message})
        for _ in range(_MAX_TOOL_ROUNDS):
            resp = oclient.chat.completions.create(
                model=model, messages=messages, tools=_openai_tools(), tool_choice="auto"
            )
            msg = resp.choices[0].message
            tcs = msg.tool_calls or []
            if not tcs:
                break
            messages.append({
                "role": "assistant",
                "content": msg.content or None,
                "tool_calls": [
                    {"id": tc.id, "type": "function",
                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in tcs
                ],
            })
            for tc in tcs:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except Exception:
                    args = {}
                result = yield from _emit_tool(tc.function.name, args)
                messages.append({
                    "role": "tool", "tool_call_id": tc.id,
                    "content": json.dumps(result, default=str)[:8000],
                })
        # Final answer — stream it.
        llm_start = time.perf_counter()
        stream = oclient.chat.completions.create(model=model, messages=messages, stream=True)
        for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield f"data: {json.dumps({'token': delta})}\n\n"
        trace.add("llm", (time.perf_counter() - llm_start) * 1000)
        return f"{provider}:{model}"

    def event_stream():
        model_used: str | None = None
        gemini_exc: Exception | None = None
        try:
            # 1) Gemini agent first (native function-calling), if configured. ANY
            #    failure — quota, thought_signature, all-models-exhausted — falls over
            #    to the OpenAI providers rather than erroring out. (step_reset clears
            #    any tool chips emitted by a partial attempt before the next one.)
            if settings.google_api_key and _gemini_models():
                yield f"data: {json.dumps({'step_reset': True})}\n\n"
                try:
                    model_used = yield from _gemini_agent()
                except Exception as exc:
                    gemini_exc = exc
                    logger.warning("Gemini agent failed (%s); falling to OpenAI providers", str(exc)[:120])
            # 2) Fall over to Groq / OpenRouter agents (OpenAI tool-calling).
            if model_used is None:
                last_exc: Exception | None = gemini_exc
                for entry in settings.model_chain:
                    provider, model = _split(entry)
                    if provider == "gemini":
                        continue
                    yield f"data: {json.dumps({'step_reset': True})}\n\n"
                    try:
                        model_used = yield from _openai_agent(provider, model)
                        break
                    except Exception as exc:
                        last_exc = exc
                        logger.warning("Agentic: %s:%s failed (%s); trying next", provider, model, str(exc)[:90])
                        continue
                if model_used is None:
                    raise last_exc or RuntimeError("No agent-capable model configured")

            # ── Done + analytics (once, whichever provider answered) ──
            latency_ms = int(trace.total_ms())
            row_id = analytics.record(identifier, model_used, latency_ms)
            stages = trace.as_list()
            done_payload = {
                "done": True, "agent": True,
                "sources": list(dict.fromkeys(sources)),
                "model": model_used, "trace": stages, "latency_ms": latency_ms,
            }
            if booking_card:
                done_payload["booking_card"] = booking_card
            yield f"data: {json.dumps(done_payload)}\n\n"
            threading.Thread(target=analytics.record_stage_timings, args=(row_id, stages), daemon=True).start()
            if row_id:
                threading.Thread(target=analytics.geo_update_sync, args=("interactions", row_id, ip), daemon=True).start()
        except Exception as exc:
            logger.error("Agentic streaming error: %s", exc)
            code = "quota_exhausted" if _is_capacity_error(exc) else "stream_error"
            yield f"data: {json.dumps({'error': code})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── /ai/warmup ────────────────────────────────────────────────────────────────

@router.get("/warmup")
async def ai_warmup() -> dict:
    """Pre-warm the ONNX embedder + retrieval path so the first real query is hot.
    Called by the chat page on mount to eliminate the cold-start cliff."""
    try:
        await rag_store.query_batch_async(["warmup"], n_per_query=1)
    except Exception as exc:
        logger.debug("warmup skipped: %s", exc)
    return {"status": "warm"}


# ── /ai/feedback ──────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    message_hash: str
    rating: int  # 1 = thumbs up, -1 = thumbs down


@router.post("/feedback")
def ai_feedback(req: FeedbackRequest) -> dict:
    if req.rating not in (1, -1):
        raise HTTPException(status_code=422, detail="rating must be 1 or -1")
    analytics.record_feedback(req.message_hash, req.rating)
    return {"ok": True}


# ── /ai/summarize ─────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    text: str


@router.post("/summarize")
def ai_summarize(req: SummarizeRequest) -> dict:
    reply = _generate(
        "You are a concise writing assistant. Summarize clearly and briefly.",
        f"Summarize:\n{req.text}",
    )
    return {"result": reply.strip()}


# ── /ai/draft ─────────────────────────────────────────────────────────────────

class DraftRequest(BaseModel):
    prompt: str


@router.post("/draft")
def ai_draft(req: DraftRequest) -> dict:
    reply = _generate("You are a writing assistant. Write clear, engaging prose.", req.prompt)
    return {"result": reply.strip()}


# ── /ai/rewrite ───────────────────────────────────────────────────────────────

class RewriteRequest(BaseModel):
    text: str
    instruction: str = "Improve clarity and conciseness"


@router.post("/rewrite")
def ai_rewrite(req: RewriteRequest) -> dict:
    reply = _generate(
        "You are an expert editor. Rewrite the text according to the instruction.",
        f"Instruction: {req.instruction}\n\nText:\n{req.text}",
    )
    return {"result": reply.strip()}


# ── /ai/lead-capture ──────────────────────────────────────────────────────────

class LeadCaptureRequest(BaseModel):
    recruiter_name: str
    recruiter_email: str
    company: str
    note: str = ""
    messages: list[ChatMessage] = []
    persona: str | None = None


@router.post("/lead-capture")
@limiter.limit("2/hour")
def ai_lead_capture(req: LeadCaptureRequest, request: Request) -> dict:
    """Receive a recruiter intro form, send Taruni an email, record in analytics."""
    from app.db import analytics as _analytics

    # Build a short conversation summary for the email body
    history = "\n".join(
        f"{'Recruiter' if m.role == 'user' else 'Pumpkin'}: {m.content[:200]}"
        for m in req.messages[-8:]
    ) or "(no conversation history)"

    try:
        summary = _generate(
            "You are a concise assistant. Summarize in 2-3 sentences.",
            f"Summarize this recruiter conversation with Taruni's AI:\n\n{history}",
        ).strip()
    except Exception:
        summary = history[:500]

    try:
        from app.core.settings import settings as _settings
        from app.integrations.gmail import send_visitor_intro
        send_visitor_intro(
            name=req.recruiter_name.strip(),
            visitor_email=req.recruiter_email.strip(),
            company=req.company.strip(),
            note=req.note.strip(),
            summary=summary,
            recipient=_settings.gmail_digest_recipient,
            persona=req.persona,
        )
        email_sent = True
    except Exception as exc:
        logger.warning("Lead capture email failed (non-fatal): %s", exc)
        email_sent = False

    _analytics.record_lead_capture(req.recruiter_email, req.company)
    return {"ok": True, "email_sent": email_sent}


# ── /ai/followups ──────────────────────────────────────────────────────────────

class FollowUpsRequest(BaseModel):
    message: str
    response: str


class FollowUpsResponse(BaseModel):
    followups: list[str]


@router.post("/followups", response_model=FollowUpsResponse)
def ai_followups(req: FollowUpsRequest) -> FollowUpsResponse:
    """Generate 2-3 dynamic follow-up questions from the last exchange."""
    prompt = (
        "A recruiter is chatting with an AI assistant about a data engineer named Taruni.\n\n"
        f"Recruiter asked: {req.message}\n\n"
        f"AI answered: {req.response[:700]}\n\n"
        "Generate exactly 2-3 short follow-up questions the recruiter would naturally ask next.\n"
        "Rules:\n"
        "- Reference specific things mentioned in the answer (technologies, companies, projects, metrics)\n"
        "- Each question must be under 12 words\n"
        "- Output only the questions, one per line, no numbering, bullets, or prefixes\n"
        "- Make them feel like natural curiosity, not generic questions"
    )
    try:
        text = _generate("", prompt)
        followups = [
            q.strip().lstrip("•-–—0123456789.) ").strip()
            for q in text.strip().splitlines()
            if q.strip() and len(q.strip()) > 8
        ][:3]
        return FollowUpsResponse(followups=followups)
    except Exception:
        return FollowUpsResponse(followups=[])
