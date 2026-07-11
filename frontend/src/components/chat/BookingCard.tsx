"use client";

export interface BookingSlot {
  date: string;   // "Tuesday, June 16"
  start: string;  // "2:00 PM"
  end: string;    // "2:30 PM"
  tz: string;     // "New_York"
}

export interface BookingCardData {
  booking_url: string;
  open: boolean;
  slots: BookingSlot[];
}

function tzLabel(tz: string): string {
  // "America/New_York" → "New York"; "New_York" → "New York"
  return tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
}

export default function BookingCard({ data }: { data: BookingCardData }) {
  const { booking_url, open, slots } = data;
  // Nothing to act on — don't render a dead card.
  if (!booking_url && (!slots || slots.length === 0)) return null;

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <span aria-hidden className="text-accent"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg></span>
        <div>
          <p className="text-[13px] font-semibold text-fg">Book a call with Taruni</p>
          <p className="text-[11px] text-fg-faint mt-0.5">
            {open ? "Open to chat" : "Limited availability"} ·{" "}
            {slots.length > 0
              ? "Pick a time below or open her calendar"
              : "Grab a time on her calendar"}
          </p>
        </div>
      </div>

      {slots.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {slots.map((s, i) => (
            <a
              key={`${s.date}-${s.start}-${i}`}
              href={booking_url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border border-border
                         bg-bg px-3 py-2 hover:border-accent/60 hover:bg-surface
                         transition-colors duration-150"
            >
              <span className="text-[12px] font-medium text-fg-muted group-hover:text-fg">
                {s.date}
              </span>
              <span className="text-[11px] tabular-nums text-fg-faint group-hover:text-accent">
                {s.start} – {s.end}{" "}
                <span className="text-fg-faint/70">{tzLabel(s.tz)}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      {booking_url && (
        <a
          href={booking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2
                     text-[12px] font-semibold text-accent-fg hover:bg-accent/90 transition-colors"
        >
          Book on Google Calendar
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </a>
      )}

      {slots.length === 0 && (
        <p className="mt-2 text-[10px] text-fg-faint text-center">
          Live times couldn&apos;t load — her calendar still has everything that&apos;s open.
        </p>
      )}
    </div>
  );
}
