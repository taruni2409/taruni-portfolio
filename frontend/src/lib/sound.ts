let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx || _ctx.state === "closed") {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      _ctx = new Ctor();
    }
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

const STORAGE_KEY = "site_sound_enabled";
const SOUND_EVENT  = "soundchange";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1"; // on by default
}

export function setSoundEnabled(on: boolean): void {
  localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: on }));
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

export function onSoundChange(cb: (on: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(SOUND_EVENT, handler);
  return () => window.removeEventListener(SOUND_EVENT, handler);
}

export type SoundType = "nav" | "primary" | "ui";

// Each profile: starting freq, ending freq, duration (s), peak gain
const PROFILES: Record<SoundType, [number, number, number, number]> = {
  nav:     [880, 660, 0.055, 0.07],
  primary: [720, 540, 0.07,  0.08],
  ui:      [980, 800, 0.04,  0.055],
};

export function playClick(type: SoundType = "nav"): void {
  if (!isSoundEnabled()) return;
  const ac = getCtx();
  if (!ac) return;

  const now            = ac.currentTime;
  const [f1, f2, dur, vol] = PROFILES[type];

  const osc  = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(f1, now);
  osc.frequency.exponentialRampToValueAtTime(f2, now + dur);

  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(now);
  osc.stop(now + dur + 0.01);
}
