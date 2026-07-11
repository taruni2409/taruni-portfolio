"""Lightweight per-request stage instrumentation.

A `Trace` collects `{stage, ms}` entries as the RAG / agent pipeline runs, so the
end-to-end timing breakdown can be (a) streamed to the client as a glass-box
"how this answer was built" waterfall and (b) persisted for the /system dashboard.

Zero dependencies, uses `time.perf_counter` (same clock as routers/ai.py). The
`span()` context manager brackets a block — sync or `await`-containing — and is
exception-safe (records the elapsed time even if the block raises).
"""
from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Iterator


class Trace:
    def __init__(self) -> None:
        self.stages: list[dict] = []
        self._t0 = time.perf_counter()

    @contextmanager
    def span(self, name: str) -> Iterator[None]:
        start = time.perf_counter()
        try:
            yield
        finally:
            self.add(name, (time.perf_counter() - start) * 1000)

    def add(self, name: str, ms: float) -> None:
        """Record a stage by name with an explicit duration in milliseconds."""
        self.stages.append({"stage": name, "ms": round(ms, 1)})

    def total_ms(self) -> float:
        return round((time.perf_counter() - self._t0) * 1000, 1)

    def as_list(self) -> list[dict]:
        """Stages in execution order, suitable for JSON serialization."""
        return list(self.stages)
