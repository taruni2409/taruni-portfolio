from __future__ import annotations

import asyncio
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache

import chromadb
from chromadb import EmbeddingFunction, Documents, Embeddings
from fastembed import TextEmbedding

# rank_bm25 is optional — gracefully degrade to dense-only if not installed
try:
    from rank_bm25 import BM25Okapi as _BM25Okapi
    _BM25_AVAILABLE = True
except ImportError:
    _BM25Okapi = None  # type: ignore[assignment]
    _BM25_AVAILABLE = False

logger = logging.getLogger(__name__)

# ── ChromaDB state ─────────────────────────────────────────────────────────────
_client: chromadb.PersistentClient | None = None
_collection: chromadb.Collection | None = None
_executor = ThreadPoolExecutor(max_workers=4)

COLLECTION_NAME = "portfolio"
EMBED_MODEL = "BAAI/bge-base-en-v1.5"

# ── BM25 state (always in-memory, rebuilt from docs on every startup) ──────────
_bm25_index = None  # BM25Okapi | None
_bm25_corpus: list[str] = []
_bm25_ids: list[str] = []
_bm25_types: list[str] = []


# ── Embedding function ─────────────────────────────────────────────────────────

class _DirectSTEmbedding(EmbeddingFunction):
    """Wraps fastembed TextEmbedding (ONNX runtime) — no PyTorch dependency (~600MB RAM savings).
    Model: BAAI/bge-base-en-v1.5 (768-dim, 12-layer BERT, retrieval-optimised)."""

    def __init__(self, model_name: str) -> None:
        self._model = TextEmbedding(model_name)

    def __call__(self, input: Documents) -> Embeddings:
        return [v.tolist() for v in self._model.embed(list(input))]


# ── ChromaDB collection ────────────────────────────────────────────────────────

def _make_client() -> chromadb.PersistentClient:
    from app.core.settings import settings
    return chromadb.PersistentClient(path=settings.chroma_db_path)


def get_collection() -> chromadb.Collection:
    global _client, _collection
    if _collection is None:
        _client = _make_client()
        ef = _DirectSTEmbedding(EMBED_MODEL)
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def clear_query_cache() -> None:
    """Clear the LRU query cache after any upsert or delete."""
    _query_single_cached.cache_clear()


def reset_collection() -> None:
    """Delete and recreate the collection — used before a full re-ingest."""
    global _client, _collection
    client = _client or _make_client()
    try:
        client.delete_collection(COLLECTION_NAME)
        logger.info("Deleted existing ChromaDB collection '%s'", COLLECTION_NAME)
    except Exception:
        pass
    _collection = None
    _query_single_cached.cache_clear()


# ── BM25 index ─────────────────────────────────────────────────────────────────

def _tokenize_for_bm25(text: str) -> list[str]:
    """Consistent tokenizer for both index build and query time.
    Lowercases, strips punctuation, keeps numbers and proper nouns intact.
    """
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return [tok for tok in text.split() if len(tok) > 1]


def build_bm25_index(docs: list[tuple[str, str, str]]) -> None:
    """Build in-memory BM25 index from (id, text, type) triples.
    Called by ingest.py after every startup (BM25 is always in-memory, not persisted).
    """
    global _bm25_index, _bm25_corpus, _bm25_ids, _bm25_types
    if not _BM25_AVAILABLE:
        logger.warning("rank_bm25 not installed — BM25 retrieval disabled")
        return
    _bm25_ids = [d[0] for d in docs]
    _bm25_corpus = [d[1] for d in docs]
    _bm25_types = [d[2] for d in docs]
    _bm25_index = _BM25Okapi([_tokenize_for_bm25(t) for t in _bm25_corpus])
    logger.info("BM25 index built: %d documents", len(docs))


def bm25_query(text: str, n_results: int = 15) -> list[dict]:
    """Lexical retrieval — catches exact keyword matches dense search misses
    (specific numbers like '3000 RPS', exact company names, awards).
    """
    if _bm25_index is None:
        logger.warning("BM25 index not built — skipping lexical retrieval")
        return []
    tokens = _tokenize_for_bm25(text)
    if not tokens:
        return []
    scores = _bm25_index.get_scores(tokens)
    top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:n_results]
    result = []
    for idx in top_idx:
        if scores[idx] <= 0:
            break
        result.append({
            "text": _bm25_corpus[idx],
            "type": _bm25_types[idx],
            "id": _bm25_ids[idx],
            "score": float(scores[idx]),
        })
    return result


# ── Dense (ChromaDB) retrieval ─────────────────────────────────────────────────

def query(text: str, n_results: int = 8) -> list[dict]:
    """Single-query dense retrieval (used by warmup and _query_single_cached)."""
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return []
    safe_n = min(n_results, count)
    results = collection.query(query_texts=[text], n_results=safe_n)
    chunks = []
    seen_texts: set[str] = set()
    if results["documents"]:
        for doc, meta, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            key = doc[:120]
            if key in seen_texts:
                continue
            seen_texts.add(key)
            chunks.append({
                "text": doc,
                "type": meta.get("type", ""),
                "id": meta.get("id", ""),
                "score": round(1 - distance, 4),
            })
    return chunks


@lru_cache(maxsize=256)
def _query_single_cached(query_text: str, n_results: int) -> tuple:
    """LRU-cached single query — avoids re-embedding identical/repeated questions."""
    return tuple(query(query_text, n_results))


def query_batch(query_texts: list[str], n_per_query: int = 6) -> list[dict]:
    """Batched dense retrieval — ONE ChromaDB call for all query texts.
    ChromaDB calls _DirectSTEmbedding.__call__(query_texts) ONCE → single
    model.encode([q0,q1,q2,q3]) forward pass. ~160ms vs ~400ms serial.
    """
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return []
    safe_n = min(n_per_query, count)
    results = collection.query(query_texts=query_texts, n_results=safe_n)
    seen: dict[str, dict] = {}
    for docs, metas, dists in zip(
        results["documents"],
        results["metadatas"],
        results["distances"],
    ):
        for doc, meta, dist in zip(docs, metas, dists):
            cid = meta.get("id", "")
            score = round(1 - dist, 4)
            if cid not in seen or score > seen[cid]["score"]:
                seen[cid] = {
                    "text": doc,
                    "type": meta.get("type", ""),
                    "id": cid,
                    "score": score,
                }
    return sorted(seen.values(), key=lambda c: c["score"], reverse=True)


async def query_batch_async(query_texts: list[str], n_per_query: int = 6) -> list[dict]:
    """Async wrapper — runs batched encode + ChromaDB in thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, query_batch, query_texts, n_per_query)


# ── Hybrid merge ───────────────────────────────────────────────────────────────

def rrf_merge(
    dense_chunks: list[dict],
    bm25_chunks: list[dict],
    k: int = 60,
    top_n: int = 20,
) -> list[dict]:
    """Reciprocal Rank Fusion: score(doc) = Σ 1/(k + rank_i).
    k=60 from Cormack et al. 2009 (standard default).
    Dense metadata takes precedence over BM25 when both retrieve the same doc.
    """
    all_chunks: dict[str, dict] = {c["id"]: c for c in bm25_chunks}
    all_chunks.update({c["id"]: c for c in dense_chunks})

    rrf: dict[str, float] = {}
    for rank, c in enumerate(dense_chunks):
        rrf[c["id"]] = rrf.get(c["id"], 0.0) + 1.0 / (k + rank + 1)
    for rank, c in enumerate(bm25_chunks):
        rrf[c["id"]] = rrf.get(c["id"], 0.0) + 1.0 / (k + rank + 1)

    merged = sorted(rrf.items(), key=lambda x: x[1], reverse=True)[:top_n]
    return [{**all_chunks[cid], "rrf_score": round(score, 6)} for cid, score in merged]


# ── Reranker (RRF score ordering — cross-encoder removed to save RAM) ──────────

def rerank_cross_encoder(query_text: str, chunks: list[dict], top_n: int = 5) -> list[dict]:
    """Returns top_n chunks ordered by RRF/cosine score."""
    return sorted(chunks, key=lambda c: c.get("rrf_score", c.get("score", 0)), reverse=True)[:top_n]


async def rerank_cross_encoder_async(
    query_text: str, chunks: list[dict], top_n: int = 5
) -> list[dict]:
    return rerank_cross_encoder(query_text, chunks, top_n)


# ── Startup warmup ─────────────────────────────────────────────────────────────

def warmup() -> None:
    """Pre-load ONNX embedding model at startup so the first user request
    doesn't pay the model-load latency penalty."""
    try:
        logger.info("Pre-warming embedding model (ONNX)...")
        query("warmup", n_results=1)
        logger.info("Embedding model ready")
    except Exception as exc:
        logger.warning("Embedding warmup failed: %s", exc)


# ── Legacy helpers (kept for backward compat, not used in hot path) ───────────

def query_multi(texts: list[str], n_per_query: int = 6) -> list[dict]:
    seen: dict[str, dict] = {}
    for text in texts:
        for chunk in _query_single_cached(text, n_per_query):
            cid = chunk["id"]
            if cid not in seen or chunk["score"] > seen[cid]["score"]:
                seen[cid] = chunk
    return sorted(seen.values(), key=lambda c: c["score"], reverse=True)[:10]


async def query_multi_async(texts: list[str], n_per_query: int = 6) -> list[dict]:
    loop = asyncio.get_running_loop()
    tasks = [
        loop.run_in_executor(_executor, _query_single_cached, text, n_per_query)
        for text in texts
    ]
    results = await asyncio.gather(*tasks)
    seen: dict[str, dict] = {}
    for chunks in results:
        for chunk in chunks:
            cid = chunk["id"]
            if cid not in seen or chunk["score"] > seen[cid]["score"]:
                seen[cid] = chunk
    return sorted(seen.values(), key=lambda c: c["score"], reverse=True)[:10]
