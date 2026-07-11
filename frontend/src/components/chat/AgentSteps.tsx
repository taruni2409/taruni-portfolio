"use client";

import type { ReactNode } from "react";

export interface StepEvent {
  tool: string;
  status: "running" | "done";
  ms?: number;
}

const si = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const I = {
  search: <svg {...si}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  profile: <svg {...si}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  work: <svg {...si}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
  tools: <svg {...si}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.4-.6-.6-2.4z" /></svg>,
  skills: <svg {...si}><path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 2z" /></svg>,
  edu: <svg {...si}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v4c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-4" /></svg>,
  now: <svg {...si}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  pen: <svg {...si}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
  flask: <svg {...si}><path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /></svg>,
  file: <svg {...si}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></svg>,
  calendar: <svg {...si}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  gear: <svg {...si}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-1.1 2.7V9a1.6 1.6 0 0 0 1.5 1.5z" /></svg>,
};

const META: Record<string, { label: string; icon: ReactNode }> = {
  search_knowledge: { label: "Searching knowledge base", icon: I.search },
  get_profile:      { label: "Reading profile", icon: I.profile },
  get_experience:   { label: "Reading work history", icon: I.work },
  get_projects:     { label: "Reading projects", icon: I.tools },
  get_project:      { label: "Looking up a project", icon: I.tools },
  get_skills:       { label: "Reading skills", icon: I.skills },
  get_education:    { label: "Reading education", icon: I.edu },
  get_now:          { label: "Checking what he's up to now", icon: I.now },
  get_blog:         { label: "Browsing blog posts", icon: I.pen },
  get_lab:          { label: "Reading lab / system designs", icon: I.flask },
  get_resume:       { label: "Fetching resume", icon: I.file },
  check_availability: { label: "Checking availability", icon: I.calendar },
  get_booking_link:   { label: "Finding open times to meet", icon: I.calendar },
};

export default function AgentSteps({ steps }: { steps: StepEvent[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div className="my-2 flex flex-col gap-1">
      {steps.map((s, i) => {
        const m = META[s.tool] ?? { label: s.tool, icon: I.gear };
        const running = s.status === "running";
        return (
          <div
            key={`${s.tool}-${i}`}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] animate-[fadeUp_0.25s_ease_forwards]"
          >
            <span aria-hidden className="text-accent [&>svg]:h-3.5 [&>svg]:w-3.5">{m.icon}</span>
            <span className={running ? "text-fg-muted" : "text-fg-faint"}>{m.label}</span>
            {running ? (
              <span className="flex gap-0.5" aria-label="running">
                <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {s.ms != null && (
                  <span className="font-mono tabular-nums text-fg-faint">{Math.round(s.ms)}ms</span>
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
