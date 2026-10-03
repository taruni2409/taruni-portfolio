// Lightweight build has no live tool-calling agent (that lives in the full RAG
// backend in the GitHub repo). Alias to the same grounded-answer stream so the
// UI's Agent-mode toggle still works — it just won't show visible tool steps.
export { POST } from "../stream/route";
export const runtime = "edge";
export const dynamic = "force-dynamic";
