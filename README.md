# Zone Control

A deterministic, top-down arena shooter built with React, TypeScript, Vite and
Canvas 2D. Fight respawning AI across a procedurally generated map with
destructible cover, three capture zones, weapon pickups and two team bases.
Score points by holding zones or destroying the enemy core before the timer
runs out.

The simulation is pure and deterministic (seeded RNG only, fixed 60 Hz steps).
The renderer, UI and audio layers read game state and subscribe to a typed event
bus; they never mutate simulation state.

## How to run

```bash
npm ci
npm run dev
```

Then open <http://localhost:3000/>. `npm start` is an alias for `npm run dev`.

- `?showcase=1` opens the presentation showcase (stub simulation). It is a dev
  preview only; the normal route runs the real simulation.
- `npm run build` produces a production bundle in `dist/`.
- `npm run preview` serves the production build on port 4173.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Aim |
| Left mouse button | Fire |
| `R` | Reload |
| `E` | Pick up / swap a nearby weapon |
| `Q` (or `Shift` / `Space`) | Tactical dash |
| `G` | Throw grenade (2 per life) |
| `Esc` (or `P`) | Pause / resume |
| `Enter` | Play again after a match ends |

> **Gamepad:** menu navigation only (in-game movement and aiming require keyboard and mouse).

## Gameplay

- **Zones A/B/C:** stand inside a zone to capture it; contested zones pause
  progress. Held zones generate score over time.
- **Cover:** walls block movement and bullets; low cover absorbs fire and is
  destroyed when its HP runs out.
- **Pickups:** defeated enemies can drop weapons and supply crates spawn on a
  timer. Rarity is common / rare / epic.
- **Bases:** each team has a core that takes damage when enemies occupy the
  base uncontested. Lose the core or the score race and the match ends.
- **Hellcell Mode (PvPvE):** capturing Zones A & C triggers a temporary
  ceasefire and unleashes a wall-crushing Boss from Zone B. Dealing majority
  damage scores bonus points and refuels HP and ammo.
- **Rampage Mode (FFA):** free-for-all combat where every bot fights for the
  highest kill count.

## Project structure

```
src/
  shared/     Shared contract: types.ts, events.ts, api.ts
  sim/        Pure deterministic simulation: RNG, map, physics, combat,
              units, zones, AI/pathfinding, fixed-step match flow
  app/        Game-loop glue: GameController, input capture, React bridge,
              GameApp integration shell, headless benchmark
  render/     Canvas 2D renderer, camera, lighting, effects, visibility
  ui/         HUD, menus/screens, design system, settings, ?showcase=1 dev preview
  audio/      Synthesized Web Audio engine with stereo pan and voice pool
```

Modules communicate through `src/shared/`. `WEAPON_DEFS` in
`src/shared/api.ts` is the single source of truth for weapon stats. See
`AGENTS.md` for repository ownership and rules.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Tests cover the simulation modules, determinism, event flow, controller input,
renderer, audio, UI and the headless 2000-tick benchmark (3 ms/step budget).
