export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  // navLinks and followUps are preserved via JSON round-trip at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navLinks?: any[];
  followUps?: string[];
}

// Session ID lives in localStorage (stable across tabs/sessions, used for analytics)
const SESSION_ID_KEY = "jsr_session_id";

// Messages and model live in sessionStorage (per-tab, clears when the tab closes)
const MESSAGES_KEY = "jsr_chat_messages";
const MODEL_KEY    = "jsr_chat_model";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export function saveMessages(messages: StoredMessage[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function loadMessages(): StoredMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as StoredMessage[]) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MESSAGES_KEY);
  sessionStorage.removeItem(MODEL_KEY);
}

export function saveModel(model: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MODEL_KEY, model);
}

export function loadModel(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(MODEL_KEY);
}

// Last user questions — localStorage so they survive across sessions
const LAST_QUESTIONS_KEY = "jsr_last_questions";

export function saveLastQuestions(questions: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_QUESTIONS_KEY, JSON.stringify(questions.slice(0, 3)));
}

export function loadLastQuestions(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_QUESTIONS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}
