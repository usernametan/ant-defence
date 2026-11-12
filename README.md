# MONSTER FRONTIER

A top-down survival action game set on the edge of a transformed frontier.

This repository is in **Stage 2 — Player Movement and Controls**. The new game
shell, fixed-step simulation, camera, renderer, input router, and throttled UI
bridge are in place, along with a playable player prototype in the Greenreach
test arena. Combat, creatures, weapons, missions, and progression are planned
for later stages.

## Current status

- Stage 2 player prototype in a bounded 2048 × 1280 test arena.
- Frame-rate-independent 8-direction movement with acceleration and sliding
  collision against walls and world bounds.
- Sprint with stamina drain and recovery, plus a dodge burst with cooldown and
  brief invulnerability.
- Mouse-facing aim, deadzone camera follow, and capped look-ahead.
- Canvas 2D renderer with arena, obstacles, player, and aim reticle.
- Fixed 60 Hz simulation loop with catch-up limits.
- Seedable RNG, typed events, math, and ID utilities.
- React UI fed by throttled snapshots instead of per-frame state.
- Vitest coverage for movement, sprint, dodge, collision, input state, camera
  follow, loop stepping, RNG determinism, and snapshot throttling.
- The old Ant Defence source is retained for reference, but it is no longer
  imported by the active app.

See [MONSTER_FRONTIER_PLAN.md](MONSTER_FRONTIER_PLAN.md) for the full roadmap.

## Controls

| Key | Action |
| --- | --- |
| `WASD` / arrow keys | Move |
| `Shift` | Sprint while stamina remains |
| `Space` | Dodge / roll |
| `Mouse` | Face the aim reticle |
| `Enter` | Enter the test arena or resume |
| `Escape` | Pause or resume |
| `F3` | Toggle collision and diagnostic overlays |

## Development

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/`.

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

## Deploying to Vercel

Import the GitHub repository into Vercel and use the detected Vite settings:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Root directory: `.`
- Environment variables: none

Or deploy from the CLI:

```bash
npx vercel
npx vercel --prod
```

## Project structure

```text
src/
  app/            React game host and snapshot hook
  game/
    content/      Game identity and content metadata
    core/         Loop, RNG, math, IDs, events, shared types
    entities/     Player movement, stamina, dodge, and render state
    input/        Input routing, held-key state, and pointer state
    render/       Camera, Canvas 2D renderer, and player/debug drawing
    ui/           UI snapshots, store, and selectors
    world/        Collision response and the test arena
  components/     Retained Ant Defence UI, disconnected from the active app
  game/*          Retained Ant Defence engine modules
public/           Retained assets and social preview image
```

The active route starts at `src/main.tsx` → `src/App.tsx` →
`src/app/GameHost.tsx`.
