"use client";

import { useEffect, useState } from "react";
import { isSoundEnabled, toggleSound, onSoundChange, playClick } from "@/lib/sound";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
    return onSoundChange(setEnabled);
  }, []);

  function handle() {
    const next = toggleSound();
    if (next) playClick("ui"); // confirm sound is on with a single click
  }

  return (
    <button
      onClick={handle}
      title={enabled ? "Mute sounds" : "Enable sounds"}
      aria-label={enabled ? "Mute sounds" : "Enable sounds"}
      className="inline-flex items-center justify-center w-11 h-11 md:w-8 md:h-8 rounded text-fg-faint hover:text-fg-subtle hover:bg-surface-raised transition-colors"
    >
      {enabled ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      )}
    </button>
  );
}
