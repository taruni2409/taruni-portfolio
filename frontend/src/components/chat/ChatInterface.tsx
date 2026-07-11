"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { saveMessages, loadMessages, clearSession, saveModel, loadModel, saveLastQuestions, loadLastQuestions } from "@/lib/session";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import LoadingGame from "./LoadingGame";
import NavSuggestions, { detectNavLinks, sourcesToNavLinks, mergeNavLinks, NavLink } from "./NavSuggestions";
import RichCards from "./RichCards";
import LeadCaptureCard from "./LeadCaptureCard";
import AnswerTrace, { TraceStage } from "./AnswerTrace";
import AgentSteps, { StepEvent } from "./AgentSteps";
import BookingCard, { BookingCardData } from "./BookingCard";
import ChatLanding from "./ChatLanding";
import ChatToolbar from "./ChatToolbar";

export interface Message {
  role: "user" | "assistant";
  content: string;
  navLinks?: NavLink[];
  followUps?: string[];
  showLeadCapture?: boolean;
  trace?: TraceStage[];
  traceModel?: string;
  latencyMs?: number;
  steps?: StepEvent[];
  bookingCard?: BookingCardData;
}

function getGeminiResetInfo(): { time: string; countdown: string } {
  // Gemini free-tier daily quota resets at midnight Pacific Time.
  const now = new Date();
  const ptStr = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const ptNow = new Date(ptStr);
  const ptMidnight = new Date(ptNow);
  ptMidnight.setDate(ptMidnight.getDate() + 1);
  ptMidnight.setHours(0, 0, 0, 0);
  const resetAt = new Date(now.getTime() + (ptMidnight.getTime() - ptNow.getTime()));

  const time = resetAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const diffMs = resetAt.getTime() - now.getTime();
  const diffMins = Math.ceil(diffMs / 60000);
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  const countdown = h > 0
    ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim()
    : `${m}m`;

  return { time, countdown };
}


const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm Pumpkin, Taruni's AI assistant. Ask me anything about her background, work experience, projects, or skills.",
};

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const PROMPTS = [
  { category: "Availability",   label: "Open to new roles?",    full: "Is Taruni currently open to new job opportunities? Where is she based and what kind of roles interest her?" },
  { category: "Projects",       label: "Most impressive work",   full: "What is Taruni's most impressive project and what makes it technically stand out?" },
  { category: "ML Expertise",   label: "ML & data skills",       full: "Tell me about Taruni's machine learning and data engineering expertise — ETL pipelines, forecasting models, and anomaly detection." },
  { category: "Experience",     label: "TCS, Shell & freelance", full: "What did Taruni build at Tata Consultancy Services (embedded with Shell PLC) and in her freelance data engineering work? Walk me through her career timeline." },
  { category: "Certifications", label: "Google & Microsoft certified", full: "Tell me about Taruni's Google and Microsoft cloud certifications and other notable achievements." },
  { category: "About Pumpkin",  label: "How this AI works",      full: "How does this AI portfolio chatbot work? What powers Pumpkin behind the scenes?" },
];

// ── Audience personas ─────────────────────────────────────────────────────────
type PersonaId = "recruiter" | "engineer" | "founder";

const PERSONAS: { id: PersonaId; label: string; hint: string }[] = [
  { id: "recruiter", label: "Recruiter", hint: "Impact & availability" },
  { id: "engineer",  label: "Engineer",  hint: "Architecture & stack" },
  { id: "founder",   label: "Founder",   hint: "Shipping & ownership" },
];

type Prompt = { label: string; full: string };

const PROMPTS_BY_PERSONA: Record<PersonaId, Prompt[]> = {
  recruiter: [
    { label: "Open to new roles?",       full: "Is Taruni open to new opportunities? What roles and locations is she targeting?" },
    { label: "Biggest measurable impact", full: "What's the most impressive, measurable impact Taruni has delivered?" },
    { label: "How she works with teams",  full: "How does Taruni collaborate with engineering teams and stakeholders?" },
    { label: "Standout achievement",      full: "What is Taruni's standout career achievement and why does it matter?" },
  ],
  engineer: [
    { label: "How her ETL pipelines work", full: "Walk me through how Taruni's ETL pipelines and data validation frameworks work end to end." },
    { label: "Hardest technical problem",  full: "What's the hardest technical problem Taruni has solved, and how?" },
    { label: "Stack & design tradeoffs",   full: "What's Taruni's core tech stack and what design tradeoffs has she made?" },
    { label: "ML & anomaly detection",     full: "Tell me about Taruni's machine learning and anomaly detection work." },
  ],
  founder: [
    { label: "Can she build 0 → 1?",       full: "Can Taruni build a data platform from zero to one on her own? What has she shipped solo?" },
    { label: "How fast does she ship?",     full: "How quickly does Taruni ship, and how does she handle ambiguity?" },
    { label: "Full-stack data range",       full: "What's the full range of what Taruni can build across the data stack?" },
    { label: "Business impact",             full: "What business impact has Taruni's work driven?" },
  ],
};

const PERSONA_KEY = "pumpkin_persona";
const AGENT_MODE_KEY = "pumpkin_agent_mode";

function toolStepReduce(arr: StepEvent[], step: StepEvent): StepEvent[] {
  // Collapse the running→done pair for a tool into a single chip.
  if (step.status === "running") return [...arr, { tool: step.tool, status: "running" }];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].tool === step.tool && arr[i].status === "running") {
      const copy = [...arr];
      copy[i] = { tool: step.tool, status: "done", ms: step.ms };
      return copy;
    }
  }
  return [...arr, { tool: step.tool, status: "done", ms: step.ms }];
}

export default function ChatInterface() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  // Always-current ref so handleSend reads the right messages even from stale closures
  const messagesRef = useRef<Message[]>([WELCOME]);
  messagesRef.current = messages;
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "ready" | "warming">("checking");
  const [experienceRating, setExperienceRating] = useState<number | null>(null);
  const [ratingDismissed, setRatingDismissed] = useState(false);
  const [ratingHover, setRatingHover] = useState(0);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState<string | null>(null);
  const [dynamicFollowUps, setDynamicFollowUps] = useState<string[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const personaRef = useRef<PersonaId | null>(null);
  personaRef.current = persona;
  const [agentMode, setAgentMode] = useState(false);
  const agentModeRef = useRef(false);
  agentModeRef.current = agentMode;
  // Live tool-call steps for the in-flight agent response
  const [liveSteps, setLiveSteps] = useState<StepEvent[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/health`, { signal: controller.signal })
      .then((r) => { if (r.ok) setBackendStatus("ready"); else setBackendStatus("warming"); })
      .catch(() => setBackendStatus("warming"));
    // Pre-warm the embedder + retrieval path so the first real question is hot
    fetch(`${API_BASE_URL}/ai/warmup`, { signal: controller.signal }).catch(() => {});
    // Restore previously-chosen persona
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(PERSONA_KEY)) as PersonaId | null;
    if (saved && PROMPTS_BY_PERSONA[saved]) setPersona(saved);
    try { if (localStorage.getItem(AGENT_MODE_KEY) === "1") setAgentMode(true); } catch { /* storage blocked */ }
    return () => controller.abort();
  }, []);

  function choosePersona(id: PersonaId) {
    const next = persona === id ? null : id;
    setPersona(next);
    try {
      if (next) localStorage.setItem(PERSONA_KEY, next);
      else localStorage.removeItem(PERSONA_KEY);
    } catch { /* storage blocked */ }
  }

  const activePrompts: Prompt[] = persona ? PROMPTS_BY_PERSONA[persona] : PROMPTS;

  // Restore rating state from sessionStorage after hydration
  useEffect(() => {
    const saved = sessionStorage.getItem("pumpkin_experience_rating");
    if (saved) setExperienceRating(Number(saved));
    if (sessionStorage.getItem("pumpkin_rating_dismissed") === "1") setRatingDismissed(true);
  }, []);

  // Load persisted messages after hydration, then auto-send ?q= if present
  const autoSentRef = useRef(false);
  useEffect(() => {
    const saved = loadMessages();
    const hasHistory = saved && saved.length > 0;
    const restored: Message[] = hasHistory ? [WELCOME, ...saved] : [WELCOME];
    messagesRef.current = restored; // update ref immediately so handleSend reads it
    startTransition(() => setMessages(restored));

    // Restore last known model so the badge shows immediately after navigation
    const savedModel = loadModel();
    if (savedModel) setActiveModel(savedModel);

    // Show the "restored" pill if there was a real conversation to restore
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    if (hasHistory) {
      setSessionRestored(true);
      dismissTimer = setTimeout(() => setSessionRestored(false), 3000);
    }

    // Welcome back: show last question from a previous session (localStorage, not sessionStorage)
    let welcomeTimer: ReturnType<typeof setTimeout> | undefined;
    if (!hasHistory) {
      const prev = loadLastQuestions();
      if (prev && prev.length > 0) {
        setWelcomeBack(prev[0]);
        welcomeTimer = setTimeout(() => setWelcomeBack(null), 3000);
      }
    }

    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      handleSend(decodeURIComponent(q));
    }

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
      if (welcomeTimer) clearTimeout(welcomeTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [prefill, setPrefill] = useState("");
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitSecsLeft, setRateLimitSecsLeft] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  /* Track whether the user is near the bottom of the scroll area */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(dist < 120);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!rateLimitUntil) return;
    const tick = () => {
      const left = Math.ceil((rateLimitUntil - Date.now()) / 1000);
      if (left <= 0) { setRateLimitUntil(null); setRateLimitSecsLeft(0); }
      else setRateLimitSecsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rateLimitUntil]);

  /* Auto-scroll only when the user is already at the bottom — never yank
     them away from an earlier message they're reading */
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, atBottom]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  /* Book-a-call: reuse the existing chat path — a booking intent makes the
     backend emit a booking_card, which renders in-stream via <BookingCard>. */
  function handleBook() {
    handleSend("I'd like to book a 30-minute call with Taruni — what times work?");
  }

  async function handleSend(text: string, forceClassic = false) {
    const useAgent = agentModeRef.current && !forceClassic;
    const endpoint = useAgent ? "/ai/chat/agentic" : "/ai/chat/stream";
    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messagesRef.current, userMsg];
    setMessages(nextMessages);
    setStreaming(true);
    setStreamingContent("");
    setLiveSteps([]);
    abortRef.current = new AbortController();

    setPendingRetry(null);
    setDynamicFollowUps([]);
    setFollowUpsLoading(false);
    const agentSteps: StepEvent[] = [];
    try {
      const vid = getOrCreateVisitorId();
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(vid ? { "x-visitor-id": vid } : {}),
        },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m !== WELCOME)
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          message: text,
          ...(personaRef.current ? { persona: personaRef.current } : {}),
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setRateLimitSecsLeft(retryAfter);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `You've sent 10 messages this minute — that's the rate limit. The countdown below will show when you can ask again.` },
        ]);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let ragSources: string[] = [];
      let sseError: string | null = null;
      let leadCapturePrompt = false;
      let traceStages: TraceStage[] = [];
      let traceModel: string | undefined;
      let latencyMs: number | undefined;
      let bookingCard: BookingCardData | undefined;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.reset) { accumulated = ""; setStreamingContent(""); }
            if (data.step_reset) { agentSteps.length = 0; setLiveSteps([]); }
            if (data.step) {
              const step = data.step as StepEvent;
              agentSteps.splice(0, agentSteps.length, ...toolStepReduce(agentSteps, step));
              setLiveSteps([...agentSteps]);
            }
            if (data.token) { accumulated += data.token; setStreamingContent(accumulated); }
            if (data.booking_card) bookingCard = data.booking_card as BookingCardData;
            if (data.error) { sseError = data.error as string; break outer; }
            if (data.done) {
              if (data.model) { setActiveModel(data.model); saveModel(data.model as string); traceModel = data.model as string; }
              if (data.sources) ragSources = data.sources as string[];
              if (data.lead_capture_prompt) leadCapturePrompt = true;
              if (Array.isArray(data.trace)) traceStages = data.trace as TraceStage[];
              if (typeof data.latency_ms === "number") latencyMs = data.latency_ms;
              break outer;
            }
          } catch { /* partial chunk */ }
        }
      }

      if (sseError) {
        const { time, countdown } = getGeminiResetInfo();
        const isQuota = sseError === "quota_exhausted";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: isQuota
              ? "Pumpkin has exhausted all available Gemini AI models for today — the daily quota across the entire fallback chain has been reached.\n\n" +
                `**Quota resets at ${time}** (in ~${countdown}). After that, everything will be back to normal automatically.\n\n` +
                "In the meantime, feel free to reach Taruni directly at **taruninallamothu24@gmail.com**."
              : "Sorry, I ran into an issue generating a response. Please try again or reach Taruni directly at **taruninallamothu24@gmail.com**.",
          },
        ]);
        return;
      }

      setBackendStatus("ready");
      const navLinks = mergeNavLinks(
        sourcesToNavLinks(ragSources),
        detectNavLinks(text, accumulated),
      );
      const content = accumulated.trim() || "Sorry, I couldn't generate a response. Please try again or reach Taruni directly at taruninallamothu24@gmail.com.";
      const assistantMsg: Message = {
        role: "assistant",
        content,
        navLinks,
        followUps: [],
        showLeadCapture: leadCapturePrompt,
        trace: traceStages.length ? traceStages : undefined,
        traceModel,
        latencyMs,
        steps: agentSteps.length ? agentSteps : undefined,
        bookingCard,
      };
      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      saveMessages(finalMessages.filter((m) => m !== WELCOME));
      const userQuestions = finalMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .slice(-3);
      saveLastQuestions(userQuestions);

      // Async dynamic follow-ups — fire after message is committed
      setFollowUpsLoading(true);
      fetch(`${API_BASE_URL}/ai/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, response: content }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.followups?.length) setDynamicFollowUps(d.followups); })
        .catch(() => {})
        .finally(() => setFollowUpsLoading(false));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setPendingRetry(text);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            backendStatus === "warming"
              ? "Pumpkin is still warming up (usually takes ~30 seconds on first visit). Hit **Retry** below or try again in a moment."
              : "Sorry, something went wrong. Hit **Retry** or try again.",
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }

  function handleClear() {
    clearSession();
    setMessages([WELCOME]);
  }

  function handleRate(star: number) {
    setExperienceRating(star);
    sessionStorage.setItem("pumpkin_experience_rating", String(star));
    fetch(`${API_BASE_URL}/stats/experience-rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: star }),
    }).catch(() => {});
  }

  function handleRatingDismiss() {
    setRatingDismissed(true);
    sessionStorage.setItem("pumpkin_rating_dismissed", "1");
  }

  const isInitial = messages.length === 1 && !streaming;

  return (
    <div className="flex flex-col h-full">

      {/* ── Mode toggle — persistent at the top: Normal ⟷ Agent. Agent mode lets
           Pumpkin pick tools per question and shows its steps live; Normal is the
           fast RAG answer. Switching applies to the next message. ── */}
      <div className="shrink-0 px-3 sm:px-6 lg:px-10 pt-1.5 pb-0.5">
        <div className="mx-auto flex max-w-2xl lg:max-w-3xl justify-center">
          <div
            role="group"
            aria-label="Response mode"
            className="inline-flex items-center rounded-full border border-border bg-surface/80 backdrop-blur-sm p-0.5 text-[11px] font-medium shadow-sm"
          >
            <button
              onClick={() => {
                setAgentMode(false);
                try { localStorage.setItem(AGENT_MODE_KEY, "0"); } catch { /* storage blocked */ }
              }}
              aria-pressed={!agentMode}
              title="Normal — fast, grounded RAG answer"
              className={`rounded-full px-3 py-1 transition-colors ${
                !agentMode ? "bg-accent text-accent-fg" : "text-fg-faint hover:text-fg-muted"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => {
                setAgentMode(true);
                try { localStorage.setItem(AGENT_MODE_KEY, "1"); } catch { /* storage blocked */ }
              }}
              aria-pressed={agentMode}
              title="Agent — Pumpkin picks tools per question and shows its steps live"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                agentMode ? "bg-accent text-accent-fg" : "text-fg-faint hover:text-fg-muted"
              }`}
            >
              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px] mr-1"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>Agent
            </button>
          </div>
        </div>
      </div>

      {/* Intro is now the bento <ChatLanding>, rendered inside the scroll area below. */}

      {/* Warm-up banner */}
      {backendStatus === "warming" && (
        <div className="shrink-0 px-3 sm:px-10 pt-2">
          <div className="mx-auto max-w-2xl lg:max-w-3xl">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Pumpkin is waking up — first response may take ~30 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session restored indicator */}
      <div
        className={`shrink-0 px-3 sm:px-10 pt-2 transition-all duration-500 ${sessionRestored ? "opacity-100 max-h-12" : "opacity-0 max-h-0 overflow-hidden pointer-events-none"}`}
      >
        <div className="mx-auto max-w-2xl lg:max-w-3xl">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent shrink-0">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            <p className="text-[11px] text-fg-muted font-medium">
              Conversation restored — pick up where you left off.
            </p>
          </div>
        </div>
      </div>

      {/* Welcome back banner — shown on return visits (new session, but prior questions exist) */}
      {welcomeBack && (
        <div className="shrink-0 px-3 sm:px-10 pt-2">
          <div className="mx-auto max-w-2xl lg:max-w-3xl">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-violet-400 shrink-0">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium truncate">
                  Welcome back! Last time:{" "}
                  <span className="italic font-normal opacity-80 truncate">&ldquo;{welcomeBack}&rdquo;</span>
                </p>
              </div>
              <button
                onClick={() => setWelcomeBack(null)}
                aria-label="Dismiss"
                className="text-[12px] text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors shrink-0 leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate-limit countdown banner */}
      {rateLimitUntil && (
        <div className="shrink-0 px-3 sm:px-10 pt-2">
          <div className="mx-auto max-w-2xl lg:max-w-3xl">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <p className="text-[11px] text-rose-700 dark:text-rose-400 truncate">
                  Rate limit reached · You can ask again in
                </p>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-rose-700 dark:text-rose-300 shrink-0">
                {rateLimitSecsLeft}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ambient status strip — live feedback on streaming / warming state */}
      <div
        aria-hidden
        className={`shrink-0 h-0.5 w-full transition-all duration-700 ${
          streaming
            ? "opacity-80 bg-gradient-to-r from-accent via-accent/60 to-accent"
            : backendStatus === "warming"
            ? "opacity-50 bg-amber-400"
            : "opacity-0"
        }`}
      />

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} className="h-full overflow-y-auto px-3 sm:px-6 lg:px-10 py-3 sm:py-4">
        {isInitial ? (
          <ChatLanding
            personas={PERSONAS}
            persona={persona}
            onChoosePersona={(id) => choosePersona(id as PersonaId)}
            activePrompts={activePrompts}
            onPrompt={setPrefill}
            backendStatus={backendStatus}
            activeModel={activeModel}
            onBook={handleBook}
            greeting={getTimeGreeting()}
          />
        ) : (
        <div className="mx-auto max-w-2xl lg:max-w-3xl space-y-4 sm:space-y-5">
          {messages.map((m, i) => (
            <div key={i}>
              <ChatMessage message={m} />
              {/* Inline rich cards — projects mentioned in the reply */}
              {m.role === "assistant" && m.steps && m.steps.length > 0 && m !== WELCOME && (
                <div className="ml-10">
                  <AgentSteps steps={m.steps} />
                </div>
              )}
              {m.role === "assistant" && m !== WELCOME && (
                <div className="ml-10">
                  <RichCards content={m.content} />
                </div>
              )}
              {m.role === "assistant" && m.bookingCard && m !== WELCOME && (
                <div className="ml-10">
                  <BookingCard data={m.bookingCard} />
                </div>
              )}
              {m.role === "assistant" && m.navLinks && m.navLinks.length > 0 && m !== WELCOME && (
                <div className="ml-10">
                  <NavSuggestions links={m.navLinks} />
                </div>
              )}
              {/* Glass-box: how this answer was built (per-stage RAG waterfall) */}
              {m.role === "assistant" && m.trace && m.trace.length > 0 && m !== WELCOME && (
                <div className="ml-10">
                  <AnswerTrace trace={m.trace} model={m.traceModel} latencyMs={m.latencyMs} />
                </div>
              )}
              {m.role === "assistant" && m.showLeadCapture && !streaming && (
                <div className="ml-10">
                  <LeadCaptureCard
                    messages={messages
                      .filter((msg) => msg !== WELCOME)
                      .map((msg) => ({ role: msg.role, content: msg.content }))}
                    persona={persona}
                  />
                </div>
              )}
              {m.role === "assistant" && i === messages.length - 1 && !streaming &&
               (followUpsLoading || dynamicFollowUps.length > 0) && (
                <div className="ml-10 mt-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-fg-faint mb-2">
                    Ask next
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {followUpsLoading && dynamicFollowUps.length === 0 ? (
                      /* Shimmer skeleton while Gemini generates */
                      [45, 60, 52].map((w, idx) => (
                        <div
                          key={idx}
                          className="h-8 rounded-lg bg-surface-raised animate-pulse"
                          style={{ width: `${w}%` }}
                        />
                      ))
                    ) : (
                      dynamicFollowUps.map((q, idx) => (
                        <button
                          key={q}
                          onClick={() => setPrefill(q)}
                          style={{ animationDelay: `${idx * 60}ms` }}
                          className="w-full text-left rounded-lg border border-border bg-surface/70
                                     px-3 py-2 text-[11px] text-fg-muted
                                     hover:border-accent/50 hover:text-accent
                                     hover:bg-surface transition-all duration-150
                                     opacity-0 animate-[fadeUp_0.4s_ease_forwards]"
                        >
                          {q}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Retry button */}
          {pendingRetry && !streaming && (
            <div className="flex justify-center">
              <button
                onClick={() => handleSend(pendingRetry)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-fg-muted hover:text-fg hover:border-fg-muted transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                Retry
              </button>
            </div>
          )}

          {/* Live agent tool-call steps while the agent works */}
          {streaming && liveSteps.length > 0 && (
            <div className="ml-10">
              <AgentSteps steps={liveSteps} />
            </div>
          )}

          {streaming && !streamingContent && liveSteps.length === 0 && <LoadingGame />}

          {streaming && streamingContent && (
            <ChatMessage
              message={{ role: "assistant", content: streamingContent }}
              streaming
            />
          )}
          <div ref={bottomRef} />
        </div>
        )}
      </div>

        {/* Jump-to-latest — appears when scrolled up during/after a conversation */}
        {!atBottom && messages.length > 2 && (
          <button
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20
                       inline-flex items-center gap-1.5 rounded-full
                       border border-border bg-surface/95 backdrop-blur-sm
                       px-3 py-1.5 text-[11px] font-medium text-fg-muted
                       shadow-md hover:text-fg hover:border-fg-muted
                       transition-all duration-200 animate-fade-up"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            Latest
          </button>
        )}
      </div>

      {/* Bottom — input + footer */}
      <div className="shrink-0 px-3 sm:px-6 lg:px-10 pt-2 pb-3 sm:pb-5">
        <div className="mx-auto max-w-2xl lg:max-w-3xl space-y-2">

          {/* Compact tray — keeps promoted tiles reachable mid-conversation */}
          {!isInitial && (
            <ChatToolbar
              personas={PERSONAS}
              persona={persona}
              onChoosePersona={(id) => choosePersona(id as PersonaId)}
              onBook={handleBook}
              activeModel={activeModel}
            />
          )}

          <ChatInput
            onSend={handleSend}
            disabled={streaming || !!rateLimitUntil}
            prefill={prefill}
            onPrefillConsumed={() => setPrefill("")}
          />

          {/* Minimal meta row — model status · clear */}
          <div className="flex items-center justify-between px-1 min-h-[16px]">
            <span className="inline-flex items-center gap-1 text-[10px] text-fg-faint/60">
              {activeModel ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {activeModel}
                </>
              ) : (
                "Powered by Gemini"
              )}
            </span>
            <div className="flex items-center gap-2.5">
              {messages.length > 1 && (
                <button
                  onClick={handleClear}
                  className="text-[11px] text-fg-faint hover:text-fg-muted transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Experience rating — contextual, appears only after 2+ exchanges */}
          {messages.length >= 4 && experienceRating === null && !ratingDismissed && (
            <div className="flex items-center justify-center gap-1.5 animate-fade-up">
              <span className="text-[10px] text-fg-faint">Helpful? Rate Pumpkin</span>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    className={`text-sm leading-none transition-colors ${
                      star <= (ratingHover || 0) ? "text-amber-400" : "text-border hover:text-amber-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <button
                onClick={handleRatingDismiss}
                aria-label="Dismiss rating"
                className="text-[11px] text-fg-faint hover:text-fg-muted transition-colors leading-none ml-1"
              >
                ×
              </button>
            </div>
          )}
          {experienceRating !== null && (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-fg-faint">Thanks for rating!</span>
              <span className="text-xs leading-none">
                {[1,2,3,4,5].map((s) => (
                  <span key={s} className={s <= experienceRating ? "text-amber-400" : "text-border"}>★</span>
                ))}
              </span>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
