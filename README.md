# itsjaya — AI Portfolio

Live at **[jayaremala.com](https://jayaremala.com)**

Personal AI-assisted portfolio for **Taruni Nallamothu**. Two entry points: a full-screen RAG-powered AI chatbot (Avocado) and a classic portfolio with experience, projects, education, blog, lab, and quotes. Content is editable via a token-gated admin panel — dynamic content (blog/lab/quotes) writes live to a DB, and file-based sections stage their edits and ship in a **single batched GitHub commit** (one push, one deploy).

Avocado is also **agentic**: an opt-in "Agent mode" lets the model pick tools per turn (and call them live), the same read-only tools are exposed over a **public MCP server** (`/mcp/`) so a recruiter can plug their own Claude/Cursor into Jaya's portfolio, and a **book-a-call** flow surfaces real Google Calendar openings + a one-click booking link inside the chat. The model layer fails over across providers — **Gemini → Groq → OpenRouter** — so the chatbot keeps answering after any single free tier is exhausted.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                 │
│                                                                             │
│  ┌────────────────────────┐        ┌────────────────────────────────────┐   │
│  │   Avocado Chatbot      │        │  Portfolio + Blog + Lab + Quotes   │   │
│  │   /  and  /chat        │        │  /portfolio  /blog  /experience    │   │
│  │                        │        │  /education  /projects  /lab       │   │
│  │  ChatInterface (SSE)   │        │  /quotes                           │   │
│  │  ChatMessage (md)      │        │  BlogEngagement  BlogGuideDrawer   │   │
│  │  Model badge + stats   │        │  QuotesFeed                        │   │
│  └───────────┬────────────┘        └─────────────┬──────────────────────┘   │
│              │                                   │                          │
│  ┌────────────────────────────────────────────┐  │                          │
│  │  /admin  (no-index, token-gated)           │  │                          │
│  │  Stats · Content editors · Bulk delete     │  │                          │
│  │  GitHub MDX sync · Immediate reingest      │  │                          │
│  └────────────────────────────────────────────┘  │                          │
└──────────────┼───────────────────────────────────┼──────────────────────────┘
               │ HTTPS / SSE                       │ HTTPS REST
               ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               api.jayaremala.com  (Nginx → Docker :8000)                    │
│                    AWS Lightsail 2GB  ·  Ubuntu 24.04                        │
│                    SlowAPI rate limiter (10 req/min on /ai/chat/stream)      │
│                                                                              │
│   POST /ai/chat/stream   ──►  RAG Pipeline  ──►  Gemini SSE stream           │
│   POST /ai/chat          ──►  RAG Pipeline  ──►  Gemini sync                 │
│   POST /ai/feedback      ──►  thumbs up/down + satisfaction metrics          │
│   POST /blog/{slug}/view ──►  SQLite — unique view per IP                   │
│   POST /blog/{slug}/clap ──►  SQLite — cumulative claps (max 50/user/post)  │
│   GET  /blog/{slug}/stats                                                    │
│   GET  /blog/stats/summary                                                   │
│   GET  /stats                 total_responses, unique_visitors               │
│   GET  /stats/overview        7d / 30d / 1y / all-time for all metrics      │
│   POST /stats/visit           record page visit + geo lookup                 │
│   POST /stats/experience-rating  1–5 star UX rating                         │
│   GET  /stats/admin           full breakdown (ADMIN_PASSWORD_HASH)                   │
│   GET  /content/blog          public blog post list                          │
│   GET  /content/blog/{slug}                                                  │
│   POST /content/blog · PUT · DELETE   (ADMIN_PASSWORD_HASH)                         │
│   GET  /content/lab · POST · PUT · DELETE   (ADMIN_PASSWORD_HASH)                   │
│   GET  /content/quotes · POST · PUT · DELETE   (ADMIN_PASSWORD_HASH)                │
│   POST /admin/reingest        start background re-embed (ADMIN_PASSWORD_HASH)        │
│   GET  /admin/reingest/status poll background reingest {running,result,error}│
│   GET  /health                api · analytics_db · content_db · rag         │
│                                                                              │
│  ┌──────────────────────────┐    ┌────────────────────────────────────────┐  │
│  │      RAG Store           │    │  SQLite  analytics.db                  │  │
│  │  ChromaDB (persistent)   │    │  /data/analytics.db (Lightsail SSD)   │  │
│  │  fastembed ONNX embed    │    │   ├─ interactions  (chat analytics)   │  │
│  │  bge-base-en-v1.5 (768d) │    │   ├─ site_visits  (page + geo)       │  │
│  │  HyDE parallel retrieval │    │   ├─ blog_views   (unique/IP/post)    │  │
│  │  BM25 (rank_bm25)        │    │   ├─ blog_claps   (≤50/user/post)    │  │
│  │  RRF merge + graph       │    │   ├─ feedback     (thumbs + hash)     │  │
│  └──────────────────────────┘    │   ├─ questions    (top-N tracking)   │  │
│                                  │   └─ experience_ratings (1–5 UX)     │  │
│  ┌────────────────────────────┐  └────────────────────────────────────────┘  │
│  │  SQLite  content.db        │                                              │
│  │  /data/content.db          │  Daily backup ──► S3 (7-day retain)         │
│  │   ├─ blog_posts            │                                              │
│  │   ├─ lab_entries           │                                              │
│  │   └─ quotes                │                                              │
│  │  Write → regen JSON        │                                              │
│  │        → run_ingest()      │                                              │
│  └────────────────────────────┘                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Knowledge Base  backend/data/knowledge/                               │  │
│  │  profile.json  experience.json  education.json  projects.json          │  │
│  │  skills.json   testimonials.json   gallery.json                        │  │
│  │  quotes.json   blog.json   lab.json                                    │  │
│  │  (quotes·blog·lab JSON auto-regenerated from content.db on write)      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
               │
               │ Google AI API
               ▼
┌───────────────────────────────────────┐
│  Gemini 2.5 Flash  (primary)          │
│  + fallback chain on 503 / 429        │
└───────────────────────────────────────┘
```

### Publish & hosting topology

How edits reach production — including the admin **stage → one commit** flow.

```
  /admin  (token-gated)
  ├─ Blog / Lab / Quotes  ───────────────►  content.db  ──►  served live via /content API
  │                                          (DB rows, client-fetched — no rebuild)
  │
  └─ File sections (Profile, Experience, Projects, Skills, Gallery, …)
       each "Save" STAGES the change  ─────►  "Publish all (N)" bar
                                                  │  GitHub Git Data API:
                                                  │  base tree → 1 new tree (all files)
                                                  ▼  → 1 commit → move main
                                        ┌────────────────────┐
       git push  ─────────────────────►│  GitHub repo  main │
                                        └─────────┬──────────┘
                                                  │  GitHub Actions (deploy.yml)
                              ┌───────────────────┴───────────────────┐
                              ▼                                       ▼
                 ┌──────────────────────┐              ┌──────────────────────────┐
                 │  GitHub Pages        │              │  Lightsail · Docker      │
                 │  jayaremala.com      │              │  api.jayaremala.com :8000│
                 │  portfolio + Avocado │              │  FastAPI                 │
                 │  (static  out/)      │              │  /ai /content /blog      │
                 │                      │              │  /stats /admin           │
                 └──────────────────────┘              └────────────┬─────────────┘
                                                                     │
                                         ┌───────────────────────────┴─────────────┐
                                         │  /data  (Lightsail SSD · daily S3 backup) │
                                         │  analytics.db · content.db · chroma_db/   │
                                         └───────────────────────────────────────────┘
```

---

## RAG Pipeline

Every `/ai/chat/stream` request runs a 6-stage hybrid retrieval pipeline before Gemini sees the message.

```
User message
     │
     ▼
┌────────────────────────────────────────────────┐
│  Stage 1 — QUERY EXPANSION                    │
│  Up to 4 targeted query variants:             │
│  • Verbatim user message                      │
│  • Name-anchored ("... Taruni Nallamothu")    │
│  • Topic keyword (project / skills / award /  │
│    experience / contact / education)          │
│  • Recent conversation context (follow-ups)   │
└────────────────────┬───────────────────────────┘
                     │ 4 queries
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│ Stage 2a     │ │ Stage 2b     │ │ Stage 2c LEXICAL          │
│ HyDE         │ │ DENSE        │ │ BM25 (rank_bm25 Okapi)    │
│ (Gao 2022)   │ │ ChromaDB     │ │ Sync — runs while async   │
│ Generate     │ │ bge-base     │ │ tasks are in flight        │
│ hypothetical │ │ -en-v1.5     │ │ Catches exact matches:    │
│ answer →     │ │ 768-dim ONNX │ │ "3000 RPS", "Qualcomm"   │
│ embed it     │ │ HNSW cosine  │ │ top-15 results            │
│ → top-8 hits │ │ top-6/query  │ │                           │
│ (4s timeout) │ │ (batched)    │ │                           │
└──────┬───────┘ └──────┬───────┘ └────────────┬─────────────┘
       └────────────────┴──────────────────────┘
                         ▼
┌────────────────────────────────────────────────┐
│  Stage 3 — RECIPROCAL RANK FUSION              │
│  score(doc) = Σ 1 / (60 + rank_i)             │
│  Merges dense + HyDE + lexical                 │
│  → up to 20 candidates                         │
└────────────────────┬───────────────────────────┘
                     ▼
┌────────────────────────────────────────────────┐
│  Stage 4 — TOP-5 BY RRF SCORE                  │
│  Returns top 5 chunks ordered by RRF score     │
│  (cross-encoder reranker scaffolded,           │
│   gated on 4GB RAM upgrade)                    │
└────────────────────┬───────────────────────────┘
                     ▼
┌────────────────────────────────────────────────┐
│  Stage 5 — KNOWLEDGE GRAPH EXPANSION           │
│  1-hop traversal from retrieved doc IDs:       │
│  • project doc  → skill category docs          │
│  • experience doc → project docs               │
│  • project doc  → experience doc               │
│  Up to +2 related docs from the RRF-20 pool    │
│  (no extra ChromaDB call — zero latency)       │
└────────────────────┬───────────────────────────┘
                     ▼
         Up to 7 chunks injected into Gemini
         system prompt as context
                     │
                     ▼
         SSE tokens streamed to client
```

### Knowledge document types

| Type | Source | Strategy |
|---|---|---|
| `profile` | profile.json | 6 docs: overview, bio, contact, focus/obsession, now block, availability |
| `experience` | experience.json | Overview + one doc per bullet per role |
| `education` | education.json | Overview + one doc per highlight per degree |
| `project` | projects.json | Overview + tech stack per project |
| `skills` | skills.json | One doc per category + one aggregated |
| `testimonial` | testimonials.json | One doc per recommendation |
| `quote` | quotes.json (auto-regenerated from content.db) | One doc per curated quote |
| `gallery` | gallery.json | One doc per milestone or achievement |
| `faq` | Dynamically built in `_build_faq_documents()` + `_build_system_faq_documents()` | Per-employer summaries, awards, education, resume, contact, blog/lab/quotes live counts, portfolio architecture — no hardcoded personal content |
| `blog` | blog.json (auto-regenerated from content.db) | One doc per post (title + description + 2k body chars) |
| `lab` | lab.json (auto-regenerated from content.db) | One doc per entry (title + description + 3k body chars) |

Total: **~124 atomic documents** across 11 types. All personal content is generated dynamically from the JSON files — adding a new job, project, blog post, or quote is reflected in the knowledge base automatically on the next ingest.

All documents store a fine-grained `entity_type` metadata field (`experience_overview`, `experience_bullet`, `project_tech`, `education_highlight`, `faq_company`, `quote`, `gallery`, etc.) enabling the graph expansion and future metadata-filtered queries.

### Incremental per-document ingest

On every startup, `run_ingest()` diffs the current document set against `.doc_hashes.json` (per-document SHA-256 hashes stored on the Lightsail SSD alongside ChromaDB). Only what changed is re-embedded:

| Change | Action |
|---|---|
| New document | `collection.upsert()` — embedded and added |
| Modified document | `collection.upsert()` — re-embedded in place |
| Removed document | `collection.delete()` — purged from ChromaDB |
| Unchanged document | Skipped — no embedding call, no I/O |

Before building the document list, `run_ingest()` calls `_sync_content_db()` — a lazy-import function that runs a two-step sync:

**Step 1 — pull new content into content.db**: `sync_blog_json_to_db()` and `sync_lab_json_to_db()` read the committed `blog.json` / `lab.json` (written by GH Actions from MDX files) and `INSERT OR IGNORE` any slugs not yet in `content.db`. This bridges the gap for MDX posts pushed via git after the initial seeding — they would otherwise be invisible to the knowledge base since `_seed_blog()` only runs on an empty table.

**Step 2 — regenerate JSON from content.db**: `regenerate_blog_json()`, `regenerate_lab_json()`, and `regenerate_quotes_json()` rewrite the JSON files from the now-complete content.db, so the subsequent hash diff always sees the full merged dataset.

After any write via the Content API, the same regeneration + `run_ingest()` cycle runs as a background task — only changed documents are re-embedded.

Adding one blog post embeds one document, not the entire corpus. A forced full re-embed via `POST /admin/reingest?force=true` (requires the admin password, hash-verified against `ADMIN_PASSWORD_HASH`) starts as a **background task** — the endpoint returns `{"status": "started"}` immediately and the client polls `GET /admin/reingest/status` (returns `{running, result, error}`) every 2 seconds until `running === false`. This avoids blocking the HTTP connection past the proxy timeout on the 2GB production server.

**Memory-safe batched embedding**: on a 2 GB / 2 CPU server, embedding all 124 documents in a single ONNX forward pass (BAAI/bge-base-en-v1.5 = ~440 MB of weights) spikes peak RAM to ~1.5 GB — enough to OOM-kill the process. `run_ingest()` now processes documents in batches of 16, calling `gc.collect()` and sleeping 50 ms between each batch to free intermediate tensors before the next forward pass. Total reingest time increases by ~5 seconds; peak RAM stays safely under 1 GB.

**Embedding model change detection**: If the stored `EMBED_MODEL` name in `.doc_hashes.json` differs from the current constant, `reset_collection()` wipes the ChromaDB collection and a full reingest runs automatically. No manual ChromaDB deletion needed when switching embedding models.

### Multi-provider model fallback chain

On 503 (UNAVAILABLE), 429 (RESOURCE_EXHAUSTED), or a deprecated-model 404, the backend retries
through a **cross-provider** chain automatically — Gemini first, then the OpenAI-compatible free
tiers (Groq, OpenRouter). Each provider is included only when its API key is set, so behaviour is
unchanged when keys are absent. Stacking free tiers behind Gemini keeps Avocado answering after
Gemini's daily quota is gone. The frontend shows which `provider:model` actually answered via a
green pill badge, and fallback can switch mid-stream (a `reset` event tells the client to discard
partial tokens from the failed model).

```
GEMINI_MODEL            primary        (default: gemini-2.0-flash)
GEMINI_FALLBACK_MODELS  gemini fallbacks (gemini-2.5-flash, gemini-2.0-flash-lite, gemini-flash-latest)
GROQ_MODELS             groq:…         (llama-3.3-70b-versatile, llama-3.1-8b-instant)   [if GROQ_API_KEY]
OPENROUTER_MODELS       openrouter:…   (deepseek-chat-v3, llama-3.3-70b-instruct)        [if OPENROUTER_API_KEY]
```

The chain is built once in `settings.model_chain` as ordered `provider:model` entries (bare Gemini
names auto-prefixed `gemini:`). Groq and OpenRouter both speak the OpenAI API, so a single client
type covers both in `_generate()` / `_stream_tokens()`.

---

## Agentic Mode, MCP & Tools

Beyond classic RAG chat, Avocado exposes a **single shared tool registry** through three independent
surfaces. The registry lives in `backend/src/app/agent/tools.py` (`TOOLS`) — each tool is a `name`,
`description`, a plain Python `handler`, and a JSON-Schema `parameters` block. **Handlers do pure
data / retrieval — no LLM calls** — so the tools are cheap and abuse-safe. Add a tool once and it
lights up everywhere.

| Surface | Entry point | Who reasons | Transport |
|---|---|---|---|
| **MCP server** | `mcp_server.py` → mounted at `/mcp/` | The *client's* model (Claude Desktop / Cursor) | MCP streamable-HTTP |
| **Agent mode** | `routers/ai.py` `POST /ai/chat/agentic` | Avocado's own model (Gemini/Groq/OpenRouter function-calling) | SSE |
| **REST playground** | `routers/tools.py` `GET /tools`, `POST /tools/{name}` | None — direct invocation | Plain JSON REST |

### The tools

`search_knowledge` (runs the same hybrid RAG pipeline), `get_profile`, `get_experience`,
`get_projects`, `get_project`, `get_skills`, `get_education`, `get_now`, `get_blog`,
`get_lab`, `get_resume`, `check_availability`, and `get_booking_link`. `get_blog` / `get_lab`
list posts/entries as metadata with no args, or return one in full when passed a `slug` — so
MCP clients can enumerate and drill into content, not just semantically search it.

### Agent mode (`/ai/chat/agentic`)

An opt-in toggle in the chat UI. The model picks tools per turn over up to 4 tool rounds, and the
backend streams visible `step` events (a chip per tool, running → done with timing) before the final
answer tokens. Gemini uses native function-calling; if it's exhausted or returns a `thought_signature`
error, the request falls over to the Groq/OpenRouter OpenAI-style tool-calling agents — same registry,
same visible steps.

### Public MCP server (`/mcp/`)

`build_mcp_app()` wraps every `TOOLS` entry into a `FastMCP` app and returns
`mcp.http_app(path="/", transport="http", stateless_http=True)`. **`stateless_http=True`** drops the
per-session handshake, so any public client can POST without negotiating an `Mcp-Session-Id` header
— required for a connect-from-anywhere endpoint and for running behind a load balancer with no session
affinity. It's mounted in `main.py` at `/mcp` wrapped in a **permissive CORS layer scoped to that
mount only** (the main API keeps its domain-locked CORS), so browser-based MCP clients aren't blocked.

- **Endpoint:** `https://api.jayaremala.com/mcp/` — note the **trailing slash** (`/mcp` 307-redirects).
- **Connect config** is generated live on the `/mcp` page (Claude Desktop + Cursor JSON snippets).
- Browsers can't speak the MCP transport, so the `/mcp` page's live playground calls the REST shim
  (`/tools`, `/tools/{name}`, rate-limited 30/min) instead — same handlers, same results.

### Book a call (smart handoff)

When a visitor expresses scheduling intent — keyword-detected in classic chat (`_is_calendar_query`)
or via the model calling `get_booking_link` in agent mode — Avocado surfaces a **booking card**:

```
Recruiter: "can we set up a call?"
        │
        ▼
get_booking_card()  →  Google Calendar Freebusy API (read-only OAuth)  →  real open 30-min slots
                       + booking_url + availability.open  (from profile.json)
        │
        ▼
SSE `booking_card` event  →  <BookingCard> renders open slots (clickable) + "Book on Google
                             Calendar" CTA → existing Google Appointment Schedule link.
                             Google handles the invite, Meet link, and reminders.
```

Slots are cached ~3 min (`get_booking_slots`) and the whole fetch is timeout-bounded so the card never
stalls the stream. It **degrades gracefully**: if the calendar isn't connected, the slots list is empty
but the booking-link CTA still works. The prompt is nudged to *invite* the visitor to pick a time
rather than pasting slots/links itself. No calendar-write scope is needed — read-only Freebusy plus a
static booking link keeps the public endpoint low-risk.

---

## Content API — CRUD without git

Blog posts, lab entries, and quotes are stored in `content.db` (SQLite on Lightsail SSD). The `/content/*` API exposes public GET endpoints and token-gated write endpoints.

After every write, a background task calls the appropriate `regenerate_*_json()` function and then `run_ingest()` so ChromaDB stays in sync with zero user-visible latency (only changed documents are re-embedded).

The database is seeded from existing JSON files on first startup — no manual migration needed.

**MDX GitHub sync from admin** — When a blog post or lab entry is created, updated, or deleted via the Content API admin editors, the corresponding `.mdx` file in the repo is also committed (or deleted) via the GitHub Contents API. This keeps the static frontend and MDX-rendered routes in sync with what the Content API serves, even when editing through the admin panel instead of a git commit.

**MDX content sync** — `content.db` is only seeded on first startup (empty table). Blog posts and lab entries written as MDX files and pushed via GH Actions go into `blog.json` / `lab.json` but were not reaching `content.db` after the initial seed. `sync_blog_json_to_db()` and `sync_lab_json_to_db()` (called from `_sync_content_db()` before every ingest) insert any new slugs found in the JSON files but missing from `content.db`, ensuring every MDX post is ingested on the next deploy or re-ingest button click.

**Batched GitHub publish (file-based sections)** — Profile, Experience, Education, Projects, Skills, Testimonials, Gallery, Hero stats, Availability and the Knowledge base are file-based JSON, not DB rows. Their admin editors don't commit on save — they **stage** the change into a shared store (`lib/githubStaging.tsx`). A sticky **"Publish all (N)"** bar then commits every staged file in a **single commit** via the GitHub **Git Data API** (resolve `main`'s base tree → build one new tree with all changed files → create one commit → move the ref), so editing many sections triggers **one** CI deploy instead of one per section. The PAT is entered once in any editor (kept in `localStorage`).

---

## Data Flow — Single Source of Truth

```
backend/data/knowledge/*.json   ← EDIT HERE ONLY (for profile, experience, etc.)
        │
        │  scripts/sync-knowledge.mjs
        │  (auto-runs via npm predev / prebuild)
        │
        ├──► frontend/src/data/knowledge/   (synced copies — do not edit directly)
        │    TypeScript files import from these with typed interfaces
        │
        └──► blog.json + lab.json are also regenerated from content.db
             after any content API write (background task → run_ingest())
```

### CI/CD pipeline on every push to main

```
git push origin main
        │
        ▼  GitHub Actions
        │
        ├── npm install
        ├── npm run build
        │     └── prebuild: sync-knowledge.mjs
        │           ├── parses all MDX frontmatter + body
        │           └── writes blog.json + lab.json
        │
        ├── commits synced files [skip ci]
        │     (prevents infinite workflow loop)
        │
        ├── uploads frontend/out/ → GitHub Pages (jayaremala.com)
        │
        └── SSH into AWS Lightsail (infra/scripts/deploy.sh)
              │
              ├── AUTO-RESTORE: if /data/analytics.db missing
              │     └── aws s3 cp latest_analytics.db /data/analytics.db
              ├── tag :latest as :previous (enables 1-command rollback)
              ├── docker build → itsjaya-backend:latest
              ├── docker run on port 8001 (staging container)
              ├── health check loop — up to 120s for ONNX warmup
              │     ├── PASS → stop old :8000, start new :8000, done
              │     └── FAIL → remove staging container, old stays live
              └── docker image prune -f (keep :previous)

Rollback anytime:  bash /home/ubuntu/itsjaya/infra/scripts/rollback.sh
```

---

## Analytics Architecture

All engagement data lives in `analytics.db`. Content lives in `content.db`. IPs are SHA-256 hashed — never stored raw. Daily backup to S3 with 7-day retention.

```
/data/analytics.db  (Lightsail SSD)
├── interactions
│   ├── ip_hash     TEXT       SHA-256 of visitor IP / x-visitor-id UUID
│   └── created_at  TIMESTAMP
│       → unique_visitors, total_responses
│       → time-filtered: 7d / 30d / 1y / all-time
│
├── site_visits
│   ├── ip_hash     TEXT
│   ├── page        TEXT       e.g. "/portfolio", "/blog/my-post"
│   ├── country     TEXT       resolved async via geo API
│   ├── city        TEXT
│   └── created_at  TIMESTAMP
│
├── blog_views
│   ├── slug        TEXT
│   ├── ip_hash     TEXT
│   └── created_at  TIMESTAMP
│   UNIQUE(slug, ip_hash)   ← one view per IP per post (idempotent)
│
├── blog_claps
│   ├── slug        TEXT
│   ├── ip_hash     TEXT
│   ├── count       INTEGER    cumulative, capped at 50 per user per post
│   └── updated_at  TIMESTAMP
│   UNIQUE(slug, ip_hash)
│
├── feedback
│   ├── message_hash  TEXT
│   ├── rating        INTEGER    +1 or -1
│   └── created_at    TIMESTAMP
│
├── questions
│   ├── text        TEXT
│   ├── count       INTEGER    incremented on each occurrence
│   └── updated_at  TIMESTAMP
│
└── experience_ratings
    ├── rating      INTEGER    1–5 UX star rating
    └── created_at  TIMESTAMP

/data/content.db  (Lightsail SSD)
├── blog_posts   (slug, title, date, published_at, description, tags, content, published)
├── lab_entries  (slug, title, status, description, started_at, tech, links, content)
└── quotes       (quote_id, text, author, source, category, favorite, featured, added_at)

Daily S3 backup → s3://itsjaya-backups-analytics/analytics_db/
  Keeps 7 days of timestamped snapshots + latest_analytics.db
  Restore: aws s3 cp s3://itsjaya-backups-analytics/analytics_db/latest_analytics.db /data/analytics.db
  Auto-restore on deploy if /data/analytics.db is missing
```

---

## Frontend Architecture

### Routing

| Route | Notes |
|---|---|
| `/` | Avocado — full-screen chatbot, no nav/footer |
| `/chat` | Same chatbot, accessible from portfolio nav |
| `/portfolio` | Hero with domain chips, featured projects, skills, testimonials, contact |
| `/experience` | Work history timeline |
| `/education` | Education cards |
| `/projects` | Project grid with source link pill tag buttons |
| `/blog` | Index sorted by `publishedAt` (immutable sort key) |
| `/blog/[slug]` | Post rendered in Source Serif 4 font |
| `/lab` | Living system design docs index |
| `/lab/[slug]` | Individual system design entry |
| `/quotes` | Curated quotes by category (Philosophy, Engineering, Science, etc.) |
| `/gallery` | Photo grid — milestones, events, and achievements |
| `/now` | What Jaya is currently building, learning, and reading |
| `/mcp` | Public MCP server explainer + live tool playground + Claude/Cursor connect configs |
| `/system` | Live observability — latency percentiles, RAG pipeline timing, model fallback |
| `/admin` | Stats dashboard · content editors · bulk delete · GitHub MDX sync · immediate reingest (no-index, token-gated) |

All portfolio routes share a layout via the `(portfolio)` route group — adds no URL segment.

### Static export + custom domain

Next.js outputs a fully static site (`output: "export"`) deployed to GitHub Pages at `jayaremala.com`. No `basePath` — the site lives at the domain root. Always use `<Link>` from `next/link` for internal navigation, never plain `<a>` tags.

### Blog engagement components

| Component | Responsibility |
|---|---|
| `BlogIndexStats` | Card grid with sort controls (Latest / Oldest / Popular), tag filter with horizontal scroll on mobile, and per-post stats. Fetches engagement summary from `/blog/stats/summary`. |
| `BlogCoverSVG` | Deterministic SVG cover art generated from slug — 4 pattern types (dot constellation, sine waves, geometric rings, circuit traces) selected by FNV-1a hash. All colours use CSS custom properties for light/dark mode. |
| `BlogEngagement` | Client component on each post page — records view on mount, clap button with 1.5s debounce batching, max 50 claps/user/post, float-up animation |
| `BlogGuideDrawer` | Floating button — MDX reference + live stats dashboard (`/stats/overview`) with 7d/30d/1y/all-time period table + per-post breakdown |

---

## Repository Layout

```
itsjaya/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    Avocado chatbot
│   │   │   ├── (portfolio)/layout.tsx      Nav + Footer + mobile FAB
│   │   │   ├── (portfolio)/page.tsx        Portfolio home
│   │   │   ├── (portfolio)/blog/page.tsx   Blog index
│   │   │   ├── (portfolio)/blog/[slug]/    Blog post
│   │   │   ├── (portfolio)/lab/page.tsx    Lab index
│   │   │   ├── (portfolio)/lab/[slug]/     Lab entry
│   │   │   ├── (portfolio)/quotes/page.tsx QuotesFeed
│   │   │   ├── (portfolio)/gallery/page.tsx Photo grid — milestones + achievements
│   │   │   ├── (portfolio)/now/page.tsx    Current status (building/learning/reading)
│   │   │   └── admin/                      Stats · content editors · bulk delete · GitHub MDX sync
│   │   ├── components/
│   │   │   ├── chat/                       ChatInterface, ChatMessage, ChatInput
│   │   │   ├── blog/                       BlogIndexStats (card grid + sort + SVG art),
│   │   │   │                               BlogCoverSVG (4-pattern FNV-1a),
│   │   │   │                               BlogEngagement, BlogGuideDrawer
│   │   │   ├── lab/                        LabMDXComponents (Status, Decision,
│   │   │   │                               Update, Stack, Metric, ArchBlock)
│   │   │   ├── admin/                      ContentBlogEditor, ContentLabEditor,
│   │   │   │                               ContentQuotesEditor — bulk-select multi-delete
│   │   │   │                               + GitHub MDX sync on every save/delete
│   │   │   │                               KnowledgeBaseEditor, AvailabilityEditor,
│   │   │   │                               KnowledgeDataView, ProfileEditor
│   │   │   │                               (all page descriptions editable; all editors
│   │   │   │                               trigger immediate Avocado reingest on save)
│   │   │   ├── GalleryGrid.tsx             Photo grid client component
│   │   │   └── QuotesClient.tsx            Quotes feed with category filter
│   │   ├── data/knowledge/                 Synced JSON copies (do not edit)
│   │   ├── data/*.ts                       Typed re-exports
│   │   ├── lib/blog.ts                     MDX loader, sorts by publishedAt
│   │   ├── lib/lab.ts                      Lab entry loader
│   │   ├── content/blog/*.mdx              Blog post source files
│   │   └── content/lab/*.mdx              Lab system design entries
│   ├── public/
│   │   ├── blog/                           Blog images
│   │   └── CNAME                           jayaremala.com (GitHub Pages domain)
│   └── next.config.ts                      output: export (no basePath)
│
├── backend/
│   ├── src/app/
│   │   ├── main.py                         FastAPI + lifespan + SlowAPI middleware + /mcp mount (CORS-wrapped)
│   │   ├── mcp_server.py                    Public MCP server — wraps TOOLS over streamable-HTTP (stateless)
│   │   ├── agent/tools.py                   Shared read-only tool registry (TOOLS) — MCP + agent + REST
│   │   ├── integrations/                    google_auth · calendar (Freebusy + booking card) · gmail · drive
│   │   ├── core/settings.py                Pydantic settings (content_db_path, model_chain: Gemini→Groq→OpenRouter)
│   │   ├── core/limiter.py                 SlowAPI Limiter (X-Forwarded-For aware)
│   │   ├── routers/admin.py                POST /admin/reingest (background task, token-gated)
│   │                                   GET  /admin/reingest/status (poll running/result/error)
│   │   ├── routers/ai.py                   /ai/* endpoints + HyDE + RAG + /ai/chat/agentic (tool-calling) + booking
│   │   ├── routers/tools.py                /tools · /tools/{name} — browser-friendly REST view of TOOLS
│   │   ├── routers/blog.py                 /blog/* engagement endpoints
│   │   ├── routers/content.py              /content/* CRUD (blog, lab, quotes)
│   │   ├── routers/stats.py                /stats · /stats/overview · /stats/admin
│   │   ├── rag/store.py                    ChromaDB + BM25 + RRF (fastembed ONNX, bge-base-en-v1.5 768-dim)
│   │   ├── rag/ingest.py                   Per-doc hash diff · auto-wipe on model change ·
│   │   │                                   _sync_content_db() (2-step: sync_*_json_to_db then
│   │   │                                   regenerate_*_json) · batched upsert (16 docs/batch,
│   │   │                                   gc.collect between) · _build_faq_documents() ·
│   │   │                                   _build_system_faq_documents() · ~124 docs / 11 types
│   │   ├── rag/graph.py                    Static knowledge graph — build_graph() + expand_context()
│   │   ├── db/analytics.py                 Chat + site analytics (period-aware, geo lookup)
│   │   ├── db/blog_stats.py                Blog views + claps (period-aware)
│   │   └── db/content.py                   Blog/lab/quotes CRUD + regenerate_blog_json()
│   │                                       regenerate_lab_json() · regenerate_quotes_json() ·
│   │                                       sync_blog_json_to_db() · sync_lab_json_to_db()
│   ├── data/knowledge/                     Single source of truth (edit here)
│   │   ├── profile.json  experience.json  education.json  projects.json
│   │   ├── skills.json   testimonials.json   gallery.json
│   │   └── quotes.json  blog.json  lab.json  (quotes·blog·lab auto-regenerated from content.db)
│   └── Dockerfile                          python:3.11-slim
│
├── infra/
│   ├── compose.yml                         Docker Compose (local dev)
│   ├── docker/                             Dockerfiles for local dev
│   └── scripts/
│       ├── deploy.sh                       Zero-downtime blue-green deploy
│       ├── rollback.sh                     1-command rollback to :previous image
│       └── backup.sh                       analytics.db → S3 (daily cron)
│
├── scripts/sync-knowledge.mjs              MDX → blog.json + lab.json + JSON → frontend sync
└── .github/workflows/deploy.yml           GH Actions: frontend + backend CI/CD
```

---

## Local Development

```bash
# 1. Environment
cp .env.example .env
# Fill in: GOOGLE_API_KEY, NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --app-dir src --reload
# → http://localhost:8000  (auto-ingests knowledge base on first start)

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev
# → Runs sync-knowledge.mjs first, then http://localhost:3000

# 4. Or with Docker Compose
docker compose -f infra/compose.yml up --build
```

```bash
# Sync backend JSON → frontend (after editing any knowledge/*.json)
node scripts/sync-knowledge.mjs

# Force full re-ingest of ChromaDB
cd backend/src && python -m app.rag.ingest

# Lint / test
cd frontend && npm run lint
cd backend  && ruff check src && pytest
```

---

## Environment Variables

### Frontend

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend URL (production: `https://api.jayaremala.com`) |
| `NEXT_PUBLIC_BLOG_FONT` | `Source_Serif_4` | Documents font choice (static import in layout.tsx) |

### Backend (set in `/home/ubuntu/itsjaya.env` on Lightsail)

| Variable | Default | Purpose |
|---|---|---|
| `GOOGLE_API_KEY` | — | Required — Google AI API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Primary model |
| `GEMINI_FALLBACK_MODELS` | `gemini-2.0-flash,...` | Comma-separated fallbacks on 503/429 |
| `ANALYTICS_DB_PATH` | `./chroma_db/analytics.db` | Set to `/data/analytics.db` on Lightsail |
| `CONTENT_DB_PATH` | `./chroma_db/content.db` | Set to `/data/content.db` on Lightsail |
| `CHROMA_DB_PATH` | `./chroma_db` | Set to `/data/chroma_db` on Lightsail |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allowed origins |
| `APP_ENV` | `dev` | Set to `production` on Lightsail |
| `ADMIN_PASSWORD_HASH` | `` | Scrypt hash of the admin password (write endpoints + admin stats); generate with `python scripts/hash_admin_password.py`; empty = disabled |
| `GROQ_API_KEY` | `` | Optional — appends Groq free-tier models to the fallback chain |
| `OPENROUTER_API_KEY` | `` | Optional — appends OpenRouter free-tier models to the fallback chain |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | `` | Google OAuth (Gmail/Calendar/Drive) — connected once via the admin panel |
| `CALENDAR_ID` / `CALENDAR_TZ` | `primary` / `America/New_York` | Calendar used for book-a-call Freebusy lookups |

---

## Deployment

| Layer | Platform | Trigger |
|---|---|---|
| Frontend | GitHub Pages → `jayaremala.com` | Push to `main` → GH Actions builds + deploys |
| Backend API | AWS Lightsail 2GB (`api.jayaremala.com`) | Push to `main` → SSH → zero-downtime deploy |
| Knowledge base | Lightsail SSD (`/data/chroma_db`) | Incremental ingest on startup — only changed docs re-embedded |
| Analytics DB | Lightsail SSD (`/data/analytics.db`) | Persists on disk, daily backup to S3 |
| Content DB | Lightsail SSD (`/data/content.db`) | Persists on disk; writes trigger background re-ingest |
| Analytics backup | S3 `itsjaya-backups-analytics` | Daily cron at 02:00 UTC, 7-day retention |

The only action required for any update — portfolio data, new blog post, or code change — is `git push`. For content edits, the admin panel triggers updates immediately via the content API.

### Best practices in production

| Practice | Implementation |
|---|---|
| Zero-downtime deploy | New container health-checked on :8001 before old :8000 is stopped |
| Automatic rollback | `bash infra/scripts/rollback.sh` → restarts `:previous` image |
| Data backup | Daily S3 backup; auto-restored from S3 if `/data/analytics.db` missing on deploy |
| Log rotation | Docker `json-file` driver, `max-size=10m`, `max-file=3` |
| HTTPS | Nginx + Let's Encrypt (Certbot auto-renews) |
| IP privacy | All IPs SHA-256 hashed before storage, never stored raw |
| Rate limiting | SlowAPI 10 req/min on `/ai/chat/stream` |
| Secrets | `.env` file on server only, never committed; GitHub secrets for CI/CD |

---

Built by [Taruni Nallamothu](https://www.linkedin.com/in/taruninallamothu24/) — MSc Data Science, University of Hertfordshire · Google & Microsoft Certified · formerly Tata Consultancy Services.

→ [GitHub](https://github.com/taruni2409) · [LinkedIn](https://www.linkedin.com/in/taruninallamothu24/)
