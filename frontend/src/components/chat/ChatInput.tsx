"use client";

import { useRef, useState, useEffect } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  prefill?: string;
  onPrefillConsumed?: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: new () => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: new () => any;
  }
}

export default function ChatInput({ onSend, disabled, prefill, onPrefillConsumed }: ChatInputProps) {
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening]     = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [hasContent, setHasContent]       = useState(false);

  useEffect(() => {
    setVoiceSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  useEffect(() => {
    if (!prefill || !textareaRef.current) return;
    textareaRef.current.value = prefill;
    resize();
    setHasContent(true);
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(prefill.length, prefill.length);
    onPrefillConsumed?.();
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function submit() {
    const value = textareaRef.current?.value.trim();
    if (!value || disabled) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setHasContent(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleInput() {
    resize();
    setHasContent((textareaRef.current?.value.trim().length ?? 0) > 0);
  }

  function toggleVoice() {
    if (isListening) { recognitionRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart  = () => setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      if (textareaRef.current) { textareaRef.current.value = t; resize(); setHasContent(t.trim().length > 0); }
    };
    rec.onend    = () => { setIsListening(false); textareaRef.current?.focus(); };
    rec.onerror  = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  }

  return (
    <div
      className={`
        flex items-center gap-2 rounded-full border bg-surface px-3 py-2
        transition-all duration-200 shadow-sm
        ${disabled ? "border-border opacity-60" : "border-border focus-within:[box-shadow:0_0_0_3px_var(--bg),0_0_0_5px_color-mix(in_srgb,var(--accent)_45%,transparent)]"}
      `}
    >
      {/* Voice button */}
      {voiceSupported && (
        <button
          type="button"
          onClick={toggleVoice}
          disabled={disabled}
          aria-label={isListening ? "Stop recording" : "Voice input"}
          className={`
            shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            transition-all duration-150 disabled:opacity-40
            ${isListening
              ? "bg-red-50 dark:bg-red-950/50 text-red-500"
              : "text-fg-faint hover:text-fg-subtle hover:bg-surface-raised"
            }
          `}
        >
          {isListening ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder={isListening ? "Listening…" : "Ask about experience, projects, skills…"}
        className="flex-1 resize-none bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none focus-visible:outline-none focus:ring-0 py-1.5 leading-5 chat-textarea"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        style={{ maxHeight: "140px" }}
      />

      {/* Send button */}
      <button
        onClick={submit}
        disabled={disabled || !hasContent}
        aria-label="Send"
        suppressHydrationWarning
        className={`
          shrink-0 w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-200
          ${hasContent && !disabled
            ? "bg-accent hover:bg-accent-hover text-accent-fg shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
            : "bg-surface-raised text-fg-faint cursor-not-allowed"
          }
        `}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
