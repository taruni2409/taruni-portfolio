# Scroll-reactive hero wordmark

## Goal

Make the oversized hero name (`HeroName`) react to page scroll: keep a slow
idle leftward drift, but let scroll velocity boost and reverse it — scrolling
down pushes the name left faster, scrolling up glides it right. Smoothed so it
feels formal and continuous, never jumpy.

## Behavior

- Idle: gentle constant leftward drift (matches today's pace).
- Scroll down: adds leftward velocity (faster left).
- Scroll up: adds rightward velocity (reverses, glides right).
- On stop: scroll influence decays back to idle drift smoothly.
- Loop stays seamless via the two tiled `NameGroup`s, wrapping `translateX`
  modulo one group's width.

## Implementation

- Replace the CSS `marquee-left` animation on `.hero-name-track` with a JS
  `requestAnimationFrame` loop that owns the track transform.
- Per frame: read scroll delta → target scroll velocity; `lerp` current
  velocity toward `idleSpeed + scrollVelocity`; decay the scroll contribution.
  Apply `translate3d(x,0,0)`; wrap `x` modulo measured group width.
- Self-contained effect inside `HeroName`. No new dependencies (no GSAP/Lenis).
- `prefers-reduced-motion`: static position, no drift, no scroll reaction.
- Drop hover-pause (conflicts with global scroll reaction); keep the hover dot
  scale + breathe accent.

## Tunables

- `idleSpeed` — slow constant drift.
- `scrollFactor` — scroll velocity contribution (modest, for "formal").
- `decay` — how fast scroll boost fades to idle (~0.92/frame).
- `maxVelocity` — clamp so a fast flick never looks frantic.

## Out of scope

- No changes to other hero elements or sections.
- No new libraries.
