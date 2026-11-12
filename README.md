# MONSTER FRONTIER

A top-down survival action game set on the edge of a transformed frontier.

This repository is in **Stage 1 — Project Foundation**. The new game shell,
fixed-step simulation, camera, renderer, input router, and throttled UI bridge
are in place. Player movement, combat, creatures, missions, and progression are
planned for later stages.

## Current status

- New Monster Frontier app shell and foundation preview.
- Canvas 2D renderer with a bounded world camera.
- Fixed 60 Hz simulation loop with catch-up limits.
- Seedable RNG, typed events, math, and ID utilities.
- React UI fed by throttled snapshots instead of per-frame state.
- Vitest coverage for loop stepping, RNG determinism, camera clamping, and
  snapshot throttling.
- The old Ant Defence source is retained for reference, but it is no longer
  imported by the active app.

See [MONSTER_FRONTIER_PLAN.md](MONSTER_FRONTIER_PLAN.md) for the full roadmap.

## Controls

| Key | Action |
| --- | --- |
| `Enter` / `Space` | Enter the foundation preview or resume |
| `Escape` | Pause or resume |
| `F3` | Toggle camera and world diagnostics |

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
    input/        Input routing and future control bindings
    render/       Camera and Canvas 2D renderer
    ui/           UI snapshots, store, and selectors
  components/     Retained Ant Defence UI, disconnected from the active app
  game/*          Retained Ant Defence engine modules
public/           Retained assets and social preview image
```

The active route starts at `src/main.tsx` → `src/App.tsx` →
`src/app/GameHost.tsx`.
