# MONSTER FRONTIER

A top-down survival action game set on the edge of a transformed frontier.

This repository is in **Stage 3 — Combat Prototype**. The player prototype is
now armed with three fictional energy blasters, pooled projectiles, hit effects,
synthesized combat audio, and respawning training dummies in the Greenreach test
arena. Creatures, missions, and progression are planned for later stages.

## Current status

- Stage 3 combat prototype in a bounded 2048 × 1280 test arena.
- Frame-rate-independent 8-direction movement with acceleration and sliding
  collision against walls and world bounds.
- Sprint with stamina drain and recovery, plus a dodge burst with cooldown and
  brief invulnerability.
- Mouse-facing aim, hold-to-fire combat, deadzone camera follow, and capped
  look-ahead.
- Three fictional blasters: Basic Blaster, Rapid Blaster, and Heavy Blaster.
  Each has its own damage, fire rate, energy draw, spread, and projectile feel.
- Shared regenerating energy cell, per-weapon cooldowns, and `1`–`3` switching.
- Pooled projectiles with swept collision, wall impacts, pierce, expiry, active
  caps, and same-team filtering for self-damage prevention.
- Three hostile training dummies with health, hit flash, death, and timed
  respawn.
- Canvas 2D renderer with arena, obstacles, player, aim reticle, projectiles,
  dummies, hit effects, and combat diagnostics.
- Lightweight synthesized Web Audio feedback for firing and target hits.
- Fixed 60 Hz simulation loop with catch-up limits.
- Seedable RNG, typed events, math, and ID utilities.
- React UI fed by throttled snapshots instead of per-frame state, with weapon,
  energy, cooldown, target, and projectile readouts.
- Vitest coverage for movement, sprint, dodge, collision, swept projectile hits,
  expiry, pierce, pooling caps, damage/respawn, cooldowns, energy, spread bounds,
  input state, camera follow, loop stepping, RNG determinism, and snapshot
  throttling.
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
| `Left mouse` | Hold to fire the current blaster |
| `1` / `2` / `3` | Select Basic / Rapid / Heavy Blaster |
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
    audio/        Lightweight synthesized combat sound effects
    combat/       Weapons, firing rules, projectile simulation, and damage
    content/      Game identity, equipment definitions, and metadata
    core/         Loop, RNG, math, IDs, events, shared types
    entities/     Player movement plus damageable training dummies
    input/        Input routing, held-key state, pointer, and fire state
    render/       Camera, Canvas 2D renderer, effects, and debug drawing
    ui/           UI snapshots, store, and selectors
    world/        Collision response and the test arena
  components/     Retained Ant Defence UI, disconnected from the active app
  game/*          Retained Ant Defence engine modules
public/           Retained assets and social preview image
```

The active route starts at `src/main.tsx` → `src/App.tsx` →
`src/app/GameHost.tsx`.
