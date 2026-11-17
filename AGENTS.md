# Agent Collaboration Rules — Zone Control

Two AI agents work in parallel on this repository (`OpenCode` = main agent,
`Antigravity` = side jobs). Follow these rules strictly.

The alchemy RPG has been discarded. This repository is now **Zone Control**, a
top-down arena shooter with a procedural map, destructible cover, three capture
zones, weapon pickups, and respawning AI.

## Ownership Boundaries

- **OpenCode owns:**
  - `src/sim/` — pure simulation
  - `src/app/` — game-loop glue, input capture, React ↔ sim bridge
- **Antigravity owns:**
  - `src/render/` — Canvas 2D drawing, camera, effects, lighting
  - `src/ui/` — React overlays and menus
  - `src/audio/` — synthesized Web Audio sound effects
- **`src/shared/` is READ-ONLY.** It holds the contract (`types.ts`, `events.ts`,
  `api.ts`). If a change is needed there, **stop and ask the user**. Do not edit
  it directly.

## Shared & Protected Files

- **Never edit `package.json` or config files** (`package-lock.json`,
  `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`).
  Ask the user first.
- Tracks communicate only through `src/shared/types.ts`, `src/shared/events.ts`,
  and `src/shared/api.ts`.

## Simulation Rules

- The sim must stay **pure and deterministic**: seeded RNG only. No `Date.now`,
  no `Math.random`, no DOM, no React, no Canvas inside `src/sim/`.
- Fixed-step timing is handled internally by `SimApi.step(dtSeconds)`.
- Render and UI code may only **read** `GameState` and **subscribe** to bus
  events. They must never mutate simulation state directly.
- `WEAPON_DEFS` in `src/shared/api.ts` is the single source of truth for weapon
  stats.

## Workflow & Code Standards

- Run `npm run typecheck` before every commit.
- Commit small and often on your own branch (`track-opencode` or
  `track-antigravity`). **Never commit directly to `main`.**
- **No `any`** in TypeScript.
- Keep the project's CI and tooling intact.
