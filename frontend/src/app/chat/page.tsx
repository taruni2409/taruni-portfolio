import { Suspense } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import PumpkinBg from "@/components/chat/PumpkinBg";
import ChatCloseButton from "@/components/chat/ChatCloseButton";

export const metadata = {
  title: "Ask Pumpkin — Taruni's AI",
  description: "Ask Pumpkin anything about Taruni's work, projects, and experience. Powered by RAG + Gemini.",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return (
    <div className="relative flex flex-col h-[100dvh] bg-bg overflow-hidden">
      <PumpkinBg />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="relative z-[60] shrink-0 px-4 sm:px-8 pt-3.5 pb-2">
        <div className="mx-auto flex w-full max-w-2xl lg:max-w-3xl items-center justify-between">

          {/* Pumpkin identity — clear "who you're talking to" */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-lg shrink-0">
              🎃
            </div>
            <div>
              <p className="text-sm font-bold text-fg leading-none tracking-tight">Pumpkin</p>
              <p className="text-[10px] text-fg-faint leading-none mt-0.5">Taruni&apos;s AI · Ask me anything</p>
            </div>
          </div>

          {/* Close / back */}
          <ChatCloseButton />
        </div>
      </header>

      {/* ── Chat ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <Suspense>
          <ChatInterface />
        </Suspense>
      </div>
    </div>
  );
}
