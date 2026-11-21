# `src/sim/`

Pure simulation for Zone Control. This folder must contain no DOM, no React, and
no Canvas usage. It consumes `InputState`, advances `GameState` on a seeded,
deterministic fixed step, and emits gameplay events through `src/shared/events.ts`.

No `Date.now`, no `Math.random` — all randomness comes from a seeded RNG.
