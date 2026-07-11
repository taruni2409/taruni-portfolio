"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";

interface LeadCaptureCardProps {
  messages: { role: "user" | "assistant"; content: string }[];
  persona?: string | null;
}

export default function LeadCaptureCard({ messages, persona }: LeadCaptureCardProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  if (dismissed) return null;
  if (submitted) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 text-base">✓</span>
          <div>
            <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">Intro sent to Taruni</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">
              She typically responds within 24 hours at her email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !company.trim()) {
      setError("All fields are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/ai/lead-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiter_name: name.trim(),
          recruiter_email: email.trim(),
          company: company.trim(),
          note: note.trim(),
          messages,
          ...(persona ? { persona } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.email_sent) {
          setError("Your info was saved but the email couldn't be sent right now. Please email Taruni directly at taruninallamothu24@gmail.com.");
        } else {
          setSubmitted(true);
        }
      } else if (res.status === 429) {
        setError("Too many requests — please try again later.");
      } else {
        setError("Something went wrong. Please email Taruni directly.");
      }
    } catch {
      setError("Network error. Please email Taruni directly.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-4 animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-semibold text-fg">Connect with Taruni directly</p>
          <p className="text-[11px] text-fg-faint mt-0.5">
            {persona === "recruiter"
              ? "I'll send Taruni your intro with a summary of our conversation."
              : persona === "engineer"
              ? "I'll let Taruni know you'd like to connect — engineers talking to engineers."
              : persona === "founder"
              ? "I'll intro you to Taruni with context from our conversation."
              : "I'll send Taruni a note so she can follow up with you directly."}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-[13px] text-fg-faint hover:text-fg-muted transition-colors leading-none ml-2"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="col-span-2 sm:col-span-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-[12px] text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            required
            className="col-span-2 sm:col-span-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-[12px] text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
          />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[12px] text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything specific you'd like Taruni to know? (optional)"
          rows={2}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[12px] text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent resize-none"
        />

        {error && <p className="text-[11px] text-rose-500">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={sending}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-accent-fg hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {sending ? "Sending…" : "Send intro to Taruni"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[11px] text-fg-faint hover:text-fg-muted transition-colors"
          >
            Maybe later
          </button>
        </div>
      </form>
    </div>
  );
}
