# Agent Rules — Zone Control

A single AI agent (`Antigravity`) owns the entire repository — both backend/simulation and frontend/presentation — with full access to all folders in this project.

**Zone Control** is a top-down arena shooter with a procedural map, destructible cover, capture
zones, weapon pickups, and respawning AI.

## Ownership

- **Antigravity owns all application modules:**
  - `src/shared/` — domain contract (`types.ts`, `events.ts`, `api.ts`)
  - `src/sim/` — pure simulation
  - `src/app/` — game-loop glue, input capture, React ↔ sim bridge
  - `src/render/` — Canvas 2D drawing, camera, effects, lighting
  - `src/ui/` — React overlays and menus
  - `src/audio/` — synthesized Web Audio sound effects

## Protected Config Files

- **Avoid editing `package.json` or config files** (`package-lock.json`,
  `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`)
  unless explicitly asked.
- Modules communicate through `src/shared/types.ts`, `src/shared/events.ts`,
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
- **No `any`** in TypeScript.
- Keep the project's CI and tooling intact.
