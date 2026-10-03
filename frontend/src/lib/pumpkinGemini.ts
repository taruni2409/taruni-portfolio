import { buildSystemPrompt } from "./pumpkinKnowledge";
import profile from "@/data/knowledge/profile.json";

// Long opaque URLs (Google Calendar appointment links, Drive share links) are
// unreliable for an LLM to transcribe verbatim in free-text generation — one
// mis-copied character silently breaks the link with no visible error. Rather
// than trust Gemini to reproduce them correctly, we detect intent ourselves
// and append the exact URL as a deterministic extra token after the model's
// reply (the system prompt tells Gemini not to write these out itself).
const CALENDAR_KEYWORDS = [
  "book", "schedule", "call", "meeting", "available", "availability",
  "slot", "free", "interview", "chat", "connect", "this week", "next week",
  "30 min", "30-min", "30 minute", "hop on", "catch up",
];
const RESUME_KEYWORDS = ["resume", "cv", "curriculum vitae"];

function detectIntentSuffix(message: string): string | null {
  const lower = message.toLowerCase();
  const wantsCalendar = CALENDAR_KEYWORDS.some((kw) => lower.includes(kw));
  const wantsResume = RESUME_KEYWORDS.some((kw) => lower.includes(kw));
  if (wantsCalendar && profile.booking_url) {
    return `\n\n👉 [Book a 30-minute call](${profile.booking_url})`;
  }
  if (wantsResume && profile.resume) {
    return `\n\n📄 [View résumé](${profile.resume})`;
  }
  return null;
}

// "gemini-flash-latest" is a Google-maintained alias that always points at the
// current stable flash model, so the primary pick doesn't go stale on its own —
// the fallback chain still matters for capacity errors and future deprecations.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// gemini-2.5-flash and gemini-2.5-flash-lite are no longer available to new API
// keys (404) — replaced with current models. Each has its own daily free-tier
// quota, so a longer chain means one exhausted model doesn't take the whole
// widget down; verified each of these has independent quota.
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.8-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const MODEL_CHAIN = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS];

// Gemini occasionally returns 503 slowly instead of failing fast (seen directly
// from the API: an 8s-plus wait before "currently experiencing high demand").
// Without a bound, a slow-but-not-yet-erroring model stalls the whole chain for
// 30s+ instead of failing over quickly. This caps time-to-first-token per model;
// once tokens start flowing the timeout is cleared so a genuinely slow-but-working
// stream isn't cut off mid-reply.
const FIRST_TOKEN_TIMEOUT_MS = 12_000;

export type PumpkinChatMessage = { role: "user" | "assistant"; content: string };

function buildContents(messages: PumpkinChatMessage[], message: string) {
  const history = messages.slice(-8).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  return [...history, { role: "user", parts: [{ text: message }] }];
}

function isCapacityError(status: number): boolean {
  // 404 included deliberately: Google periodically retires model ids (e.g.
  // gemini-2.0-flash), and that should fall through to the next model in the
  // chain rather than fail the whole request — same handling as the backend.
  return status === 429 || status === 503 || status === 500 || status === 502 || status === 404;
}

/** Streams tokens from Gemini's REST API, falling back through MODEL_CHAIN on
 * capacity errors (429/503/etc.) — same resilience pattern as the backend's
 * multi-model fallback, without the extra Groq/OpenRouter providers. */
export async function* streamPumpkinReply(
  messages: PumpkinChatMessage[],
  message: string,
): AsyncGenerator<{ token: string } | { done: true; model: string } | { error: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    yield { error: "not_configured" };
    return;
  }

  const systemPrompt = buildSystemPrompt();
  const contents = buildContents(messages, message);

  let lastErrorStatus: number | null = null;

  for (const model of MODEL_CHAIN) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FIRST_TOKEN_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      lastErrorStatus = 503;
      continue;
    }

    if (!res.ok || !res.body) {
      clearTimeout(timer);
      lastErrorStatus = res.status;
      if (isCapacityError(res.status)) continue;
      yield { error: "stream_error" };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let yieldedAny = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!yieldedAny) clearTimeout(timer); // first chunk arrived — stop racing this model
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof text === "string" && text.length > 0) {
              yieldedAny = true;
              yield { token: text };
            }
          } catch {
            // partial/malformed chunk — skip
          }
        }
      }
    } catch {
      // Aborted (timeout) or connection dropped mid-stream.
      if (yieldedAny) return; // already sent partial output — don't retry into a mixed reply
      lastErrorStatus = 503;
      continue;
    } finally {
      clearTimeout(timer);
    }

    if (yieldedAny) {
      const suffix = detectIntentSuffix(message);
      if (suffix) yield { token: suffix };
      yield { done: true, model: `gemini:${model}` };
      return;
    }
    // Nothing streamed (e.g. safety block, empty candidate, or timed out with no bytes) — try next model.
    lastErrorStatus = 503;
  }

  yield { error: lastErrorStatus && isCapacityError(lastErrorStatus) ? "quota_exhausted" : "stream_error" };
}
