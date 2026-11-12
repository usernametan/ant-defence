# MONSTER FRONTIER

A top-down survival action game set on the edge of a transformed frontier.

This repository is in **Stage 5 — World & Map Systems**. The combat prototype
now takes place in **Greenreach Wilds**, an authored 2048 × 1280 explorable
region with waystation roads, ruins, a stream crossing, forest pockets, rocky
ground, and creature-held terrain. Missions, nests, territory capture, bosses,
and campaign progression remain planned for later stages.

## Current status

- Stage 5 Greenreach Wilds map: 2048 × 1280 world, 32 px tiles, 64 × 40 terrain
  grid, eight surface types, and deterministic terrain decoration.
- Authored landmarks, roads, and props: Waystation Echo, Moss-Eaten Watchpost,
  Broken Ford, Sunken Meadow, Thornmaw Approach, and the Quiet Glade.
- Layered world props with solid collision defaults, scattered trees and bushes,
  boulders, ruin walls, crates, barrels, tents, carts, signs, logs, fences, and
  a walkable bridge across the stream.
- Map loading validates bounds, terrain size, unique ids, entry points, creature
  spawn points, target placement, and solid-prop overlaps.
- Crawlers chase directly and gain a small pack-speed bonus, Stalkers strafe for
  an opening, and Spitters hold range with telegraphed acid projectiles.
- Creatures acquire targets by detection range and line of sight, lose hidden or
  distant targets, avoid solid obstacles, and separate from nearby allies.
- The spawn director draws from authored Greenreach points, starts a controlled
  six-creature encounter, caps the field at eight, removes dead creatures,
  counts defeats, and refills over time.
- Player health, hit feedback, downed state, and automatic waystation respawn
  support creature damage; full survival/checkpoint systems remain later work.
- Frame-rate-independent 8-direction movement with acceleration and sliding
  collision against walls and world bounds.
- Sprint with stamina drain and recovery, plus a dodge burst with cooldown and
  brief invulnerability.
- Mouse-facing aim with camera-relative pointer conversion, hold-to-fire combat,
  deadzone camera follow, world-bound clamping, and capped look-ahead.
- Three fictional blasters: Basic Blaster, Rapid Blaster, and Heavy Blaster.
  Each has its own damage, fire rate, energy draw, spread, and projectile feel.
- Shared regenerating energy cell, per-weapon cooldowns, and `1`–`3` switching.
- Pooled projectiles with swept collision, wall impacts, pierce, expiry, active
  caps, and same-team filtering for self-damage prevention.
- Three hostile training dummies placed at authored Greenreach targets with
  health, hit flash, death, and timed respawn.
- Canvas 2D renderer with cached terrain, sorted props, tree canopies, player,
  aim reticle, projectiles, dummies, three creature silhouettes, health bars,
  attack telegraphs, hit effects, a Greenreach minimap, and combat diagnostics.
- F3 world diagnostics include map dimensions, tile grid, camera and player
  coordinates, nearby solids, nearby spawns, combat state, and world overlays.
- Lightweight synthesized Web Audio feedback for firing, target hits, enemy
  attacks, player damage, and creature deaths.
- Fixed 60 Hz simulation loop with catch-up limits.
- Seedable RNG, typed events, math, and ID utilities.
- React UI fed by throttled snapshots instead of per-frame state, with health,
  weapon, energy, cooldown, target, enemy, kill, and projectile readouts.
- Vitest coverage for map loading and validation, terrain sampling, world
  dimensions, prop layering, boundary clamping, player and creature-sized prop
  collision, authored spawn validity, map refills, movement, sprint, dodge,
  line of sight, swept projectile hits, damage/respawn, cooldowns, creature
  targeting/behaviors/death, spatial hashing, camera follow and aim offsets,
  input state, loop stepping, RNG determinism, and snapshot throttling.
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
| `Enter` | Enter Greenreach or resume |
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
    content/      Game identity, equipment, and the Greenreach map definition
    core/         Loop, RNG, math, IDs, events, shared types
    ai/           Creature brains and movement behaviors
    entities/     Player, damageable creatures, and training dummies
    input/        Input routing, held-key state, pointer, and fire state
    render/       Camera, Canvas 2D renderer, effects, and debug drawing
    systems/      Budgeted creature spawning and refills
    ui/           UI snapshots, store, and selectors
    world/        Map types/loading, collision, line of sight, and spatial hash
  components/     Retained Ant Defence UI, disconnected from the active app
  game/*          Retained Ant Defence engine modules
public/           Retained assets and social preview image
```

The active route starts at `src/main.tsx` → `src/App.tsx` →
`src/app/GameHost.tsx`.
