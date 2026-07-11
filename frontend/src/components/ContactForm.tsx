"use client";

import { useState, useEffect, useCallback } from "react";
import emailjs from "@emailjs/browser";
import Link from "next/link";
import { profile } from "@/data/profile";

type ToastType = "success" | "warning" | "error";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  body: string;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, onDismiss]);

  const styles: Record<ToastType, { wrapper: string; icon: string; iconPath: string }> = {
    success: {
      wrapper: "border-indigo-200 dark:border-indigo-800 bg-surface",
      icon: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950",
      iconPath: "M20 6L9 17l-5-5",
    },
    warning: {
      wrapper: "border-amber-200 dark:border-amber-800 bg-surface",
      icon: "text-amber-600 bg-amber-50 dark:bg-amber-950",
      iconPath: "M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    },
    error: {
      wrapper: "border-red-200 dark:border-red-800 bg-surface",
      icon: "text-red-500 bg-red-50 dark:bg-red-950",
      iconPath: "M18 6L6 18M6 6l12 12",
    },
  };

  const s = styles[toast.type];

  return (
    <div
      className={`flex items-start gap-3 rounded border px-4 py-3.5 shadow-lg transition-all duration-300 ${s.wrapper} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.icon}`}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={s.iconPath} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{toast.title}</p>
        <p className="text-xs text-fg-subtle mt-0.5">{toast.body}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        aria-label="Dismiss notification"
        className="ml-1 shrink-0 text-fg-faint hover:text-fg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextId, setNextId] = useState(0);

  const pushToast = useCallback((type: ToastType, title: string, body: string) => {
    setToasts((prev) => [...prev, { id: nextId, type, title, body }]);
    setNextId((n) => n + 1);
  }, [nextId]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (sessionStorage.getItem("contact_sent") === "1") {
      pushToast("warning", "Already sent!", "Your message has already been sent this session. I'll get back to you soon.");
      return;
    }

    setSending(true);
    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        { from_name: name, from_email: email, message },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      );
      sessionStorage.setItem("contact_sent", "1");
      pushToast("success", "Message sent!", "Thanks for reaching out — I'll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
      setSubmitted(true);
    } catch {
      pushToast("error", "Something went wrong", "Please try again or email me directly.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Toast portal */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>

      <section className="rounded border border-border bg-surface-raised p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-[3px] h-5 rounded-full bg-border-strong shrink-0" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-faint">Get in Touch</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" aria-hidden />
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h3 className="font-semibold text-fg">Message received!</h3>
            <p className="text-sm text-fg-subtle max-w-xs leading-relaxed">
              Thanks for reaching out — I&apos;ll get back to you soon. In the meantime, feel free to explore.
            </p>
            <div className="flex gap-4 mt-1">
              <Link href="/blog" className="text-xs text-accent hover:text-accent-hover transition-colors">Read the blog →</Link>
              <Link href="/projects" className="text-xs text-accent hover:text-accent-hover transition-colors">See projects →</Link>
            </div>
          </div>
        ) : (
          <>
        {profile.contact_description && (
          <p className="text-sm text-fg-subtle mb-6 max-w-md">{profile.contact_description}</p>
        )}

        {/* Book a call CTA */}
        <a
          href={profile.booking_url ?? "https://calendar.app.google/3sScGpHpeSpvPjpSA"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-sm px-5 py-3.5 mb-8 transition-all duration-200 group w-full sm:w-auto"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-raised text-fg-muted shrink-0 group-hover:bg-surface-sunken transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">Book a call</p>
            <p className="text-[11px] text-fg-faint">Schedule a 30-min intro on Google Calendar</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-fg-faint group-hover:text-fg-subtle transition-colors shrink-0">
            <path d="M7 17L17 7M17 7H7M17 7v10"/>
          </svg>
        </a>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-fg-subtle mb-1.5 block">Name</label>
              <div className="rounded border border-border bg-surface-raised px-4 py-3 focus-within:border-accent focus-within:bg-surface focus-within:shadow-sm transition-all">
                <input
                  required
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-base sm:text-sm text-fg placeholder:text-fg-faint focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-fg-subtle mb-1.5 block">Email</label>
              <div className="rounded border border-border bg-surface-raised px-4 py-3 focus-within:border-accent focus-within:bg-surface focus-within:shadow-sm transition-all">
                <input
                  required
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-base sm:text-sm text-fg placeholder:text-fg-faint focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-fg-subtle mb-1.5 block">Message</label>
            <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 focus-within:border-accent focus-within:bg-surface focus-within:shadow-sm transition-all">
              <textarea
                required
                rows={4}
                placeholder="What's on your mind?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-none bg-transparent text-base sm:text-sm text-fg placeholder:text-fg-faint focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="rounded bg-fg text-bg px-6 py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                </svg>
                Sending…
              </>
            ) : (
              "Send Message"
            )}
          </button>
        </form>

        <div className="border-t border-border-subtle pt-5 flex flex-wrap gap-3">
          <a
            href={`mailto:${profile.email}`}
            className="rounded border-2 border-fg bg-fg px-5 py-2 text-sm font-semibold text-bg hover:opacity-80 transition-opacity"
          >
            {profile.email}
          </a>
          {profile.linkedin && (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border-2 border-border px-5 py-2 text-sm font-semibold text-fg-muted hover:border-fg hover:text-fg transition-colors"
            >
              LinkedIn
            </a>
          )}
          {profile.github && (
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border-2 border-border px-5 py-2 text-sm font-semibold text-fg-muted hover:border-fg hover:text-fg transition-colors"
            >
              GitHub
            </a>
          )}
          <a
            href={profile.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-accent hover:border-accent/60 transition-all inline-flex items-center gap-1.5"
          >
            Download Resume
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
          </>
        )}
      </section>
    </>
  );
}
