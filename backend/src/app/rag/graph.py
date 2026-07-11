"""Lightweight static knowledge graph for the Pumpkin knowledge base.

Builds 3 relationship maps at startup from knowledge JSON files (no LLM, no graph library):
  project → skill category docs  (from projects.json tags[])
  experience → project docs       (temporal co-occurrence, hard-coded for the 5-6 known links)
  project → experience doc        (reverse of the above)

After retrieval, expand_context() follows 1-hop relationships to pull in related docs
that weren't in the strict top-5 but are contextually relevant.

Example: user asks "what did he build at NYU IT?" → multi-agent engine is retrieved
→ graph expansion also surfaces the Redis/Kubernetes skills docs from the merged pool.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parents[3] / "data" / "knowledge"

# ── Graph state ────────────────────────────────────────────────────────────────

# project doc_id → list of skill tag strings
_project_tags: dict[str, list[str]] = {}
# experience doc_id → list of skill strings (from tech field)
_experience_skills: dict[str, list[str]] = {}
# experience overview doc_id → list of project overview doc_ids
_experience_projects: dict[str, list[str]] = {}
# project overview doc_id → experience overview doc_id (reverse)
_project_experience: dict[str, str] = {}
# lowercase skill string → list of skill_category doc_ids that contain it
_skill_to_docs: dict[str, list[str]] = {}

# Hard-coded experience→project links based on role descriptions and project notes.
# exp_0 = NYU CAS (Jun 2025 - Present)              → GeneCart (proj_2)
# exp_1 = NYU IT Web Apps Lead (Sep 2024-May 2025)  → Multi-Agent (proj_3), portfolio (proj_0)
# exp_2 = NYU IT Intern (May 2024-Aug 2024)         → same research infra as exp_1 (proj_3)
_HARD_EXP_PROJ: dict[str, list[str]] = {
    "exp_0_overview": ["proj_2_overview"],
    "exp_1_overview": ["proj_3_overview", "proj_0_overview"],
    "exp_2_overview": ["proj_3_overview"],
}


def build_graph() -> None:
    """Build all relationship maps from knowledge JSON files.
    Called once in the FastAPI lifespan after run_ingest().
    All state is module-level; safe to call on restart.
    """
    global _project_tags, _experience_skills, _experience_projects
    global _project_experience, _skill_to_docs

    _project_tags.clear()
    _experience_skills.clear()
    _skill_to_docs.clear()

    # ── Skills: skill_string → skill_category_doc_id ──────────────────────────
    skills_path = DATA_DIR / "skills.json"
    if skills_path.exists():
        for group in json.loads(skills_path.read_text()):
            cat = group["category"]
            slug = cat.lower().replace(" ", "_").replace("&", "and")
            doc_id = f"skills_{slug}"
            for item in group["items"]:
                _skill_to_docs.setdefault(item.lower(), []).append(doc_id)
                # Also index common abbreviations/substrings for partial matching
                for word in item.lower().split():
                    if len(word) > 3:
                        _skill_to_docs.setdefault(word, []).append(doc_id)


    # ── Projects → skill tags ─────────────────────────────────────────────────
    proj_path = DATA_DIR / "projects.json"
    if proj_path.exists():
        for i, proj in enumerate(json.loads(proj_path.read_text())):
            for suffix in ("_overview", "_tech"):
                _project_tags[f"proj_{i}{suffix}"] = proj.get("tags", [])

    # ── Experience → skills (from tech field) ─────────────────────────────────
    exp_path = DATA_DIR / "experience.json"
    if exp_path.exists():
        for i, exp in enumerate(json.loads(exp_path.read_text())):
            tech = [t.strip() for t in exp.get("tech", "").split(",") if t.strip()]
            for j in range(len(exp.get("bullets", [])) + 1):
                doc_id = f"exp_{i}_overview" if j == 0 else f"exp_{i}_bullet_{j - 1}"
                _experience_skills[doc_id] = tech

    # ── Experience → projects (temporal co-occurrence) ────────────────────────
    _experience_projects = dict(_HARD_EXP_PROJ)
    _project_experience = {
        proj_id: exp_id
        for exp_id, proj_ids in _experience_projects.items()
        for proj_id in proj_ids
    }

    logger.info(
        "Knowledge graph built: %d project nodes, %d experience nodes, %d skill→doc entries",
        len(_project_tags), len(_experience_skills), len(_skill_to_docs),
    )


# ── Graph traversal ────────────────────────────────────────────────────────────

def _skill_docs_for_tags(tags: list[str]) -> list[str]:
    """Return deduplicated skill_category doc IDs that contain any of the given tags."""
    matched: set[str] = set()
    for tag in tags:
        for doc_id in _skill_to_docs.get(tag.lower(), []):
            matched.add(doc_id)
        # Also try each word of multi-word tags (e.g. "Llama 3.1 70B" → "llama")
        for word in tag.lower().split():
            if len(word) > 3:
                for doc_id in _skill_to_docs.get(word, []):
                    matched.add(doc_id)
    return list(matched)


def _exp_overview(doc_id: str) -> str | None:
    """Convert 'exp_1_bullet_2' → 'exp_1_overview'; passthrough if already overview."""
    m = re.match(r"(exp_\d+)(?:_overview|_bullet_\d+)$", doc_id)
    return f"{m.group(1)}_overview" if m else None


def expand_context(
    retrieved_ids: list[str],
    rrf_pool: list[dict],
    max_expansion: int = 2,
) -> list[dict]:
    """1-hop graph traversal to enrich retrieval context.

    Given the top-N retrieved doc IDs and the broader RRF-merged pool, follows
    relationship edges to find related docs not already retrieved:
    - Project doc → related skill category docs (surface the stack detail)
    - Experience doc → related project docs (surface what was built there)
    - Project doc → related experience doc (surface where it was built)

    Only returns docs already in rrf_pool — no extra ChromaDB calls, zero latency.
    Returns at most max_expansion docs, sorted by relationship priority.
    """
    if not _project_tags and not _experience_projects:
        # Graph not built yet — safe no-op
        return []

    pool_by_id: dict[str, dict] = {c["id"]: c for c in rrf_pool}
    retrieved_set = set(retrieved_ids)
    # candidate_id → priority score (higher = more relevant relationship)
    candidates: dict[str, float] = {}

    for doc_id in retrieved_ids:
        # 1. Project → skill category docs (find the stack detail docs)
        if doc_id in _project_tags:
            for skill_doc in _skill_docs_for_tags(_project_tags[doc_id]):
                if skill_doc not in retrieved_set and skill_doc in pool_by_id:
                    candidates[skill_doc] = candidates.get(skill_doc, 0) + 1.0

        # 2. Experience overview → project docs (find what was built there)
        if doc_id in _experience_projects:
            for proj_id in _experience_projects[doc_id]:
                if proj_id not in retrieved_set and proj_id in pool_by_id:
                    candidates[proj_id] = candidates.get(proj_id, 0) + 2.0

        # 3. Experience bullet → project docs via its overview (weaker signal)
        exp_ov = _exp_overview(doc_id)
        if exp_ov and exp_ov != doc_id and exp_ov in _experience_projects:
            for proj_id in _experience_projects[exp_ov]:
                if proj_id not in retrieved_set and proj_id in pool_by_id:
                    candidates[proj_id] = candidates.get(proj_id, 0) + 1.2

        # 4. Project → experience doc (find where this was built)
        if doc_id in _project_experience:
            exp_id = _project_experience[doc_id]
            if exp_id not in retrieved_set and exp_id in pool_by_id:
                candidates[exp_id] = candidates.get(exp_id, 0) + 1.5

    if not candidates:
        return []

    sorted_cands = sorted(candidates.items(), key=lambda x: x[1], reverse=True)
    result = [pool_by_id[cid] for cid, _ in sorted_cands[:max_expansion] if cid in pool_by_id]

    if result:
        logger.debug(
            "Graph expanded context +%d docs: %s",
            len(result), [c["id"] for c in result],
        )
    return result
