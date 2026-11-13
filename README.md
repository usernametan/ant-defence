# MONSTER FRONTIER

A top-down survival action game set on the edge of a transformed frontier.

This repository is in **Stage 8 — Missions & Objectives**. The combat prototype
takes place in **Greenreach Wilds**, an authored 2048 × 1280 explorable region
with waystation roads, ruins, a stream crossing, forest pockets, rocky ground,
and creature-held terrain. Players now manage health and armor, recover from
field caches, tune a small loadout of blasters and modules, take the Reclaim the
Greenreach field order, track its objectives, restore the watchpost relay, and
redeploy at Waystation Echo after death. Nests, territory capture, bosses,
checkpoints, and campaign progression remain planned for later stages.

## Current status

- Stage 8 mission layer: data-driven mission and objective definitions, a
  validated runtime state machine, prerequisite gating, progress tracking,
  optional objectives, markers, rewards, failure state, and one-time completion.
- “Reclaim the Greenreach”: eliminate creatures, reach the Moss-Eaten
  Watchpost, restore its field relay with `E`, and optionally recover supplies
  or clear the watchpost perimeter.
- Mission tracker HUD with per-objective progress, world and minimap markers,
  proximity interaction prompts, menu briefing, and a victory screen with a
  rewarded new-expedition or return-to-menu flow.
- The Greenreach map now includes a validated relay interactable and POI entry
  triggers. Mission progress and interaction state reset with each expedition;
  persistence is planned for Stage 11.
- Stage 7 loadout layer: data-driven weapon definitions and three equipment
  lines with capped, non-stacking effects.
- Reinforced Plating improves maximum armor and absorption, Mobility Module
  improves movement and dodge, and Energy Regulator improves the shared energy
  cell.
- Compact six-slot inventory: collect, store, equip, and unequip weapons and
  modules. Duplicate weapons convert to energy; duplicate modules convert to
  armor salvage.
- Five authored Greenreach item spawns: two weapon upgrades and three field
  modules, collected once per run with HUD and audio feedback.
- Inventory screen on `I`, with equipped modules, owned weapons, supplies, and
  stored-gear actions. It freezes simulation while open and survives death and
  respawn.
- Stage 6 survival layer: clamped health and armor pools, armor-first damage
  mitigation, overflow damage into health, and full resource restoration on
  respawn.
- Twelve authored recovery caches across Greenreach: six health dressings and
  six armor plates, each with its own respawn timer.
- Recovery caches are consumed only when they restore a missing resource, which
  prevents wasted pickups at full health or armor.
- Damage, healing, armor recovery, death, and respawn produce HUD notices,
  impact effects, synthesized audio, hit flashes, low-health screen feedback,
  and a temporary post-respawn shield.
- Death enters a readable signal-loss overlay with a countdown, then returns the
  player to Waystation Echo with health and armor restored.
- Stage 5 Greenreach Wilds map: 2048 × 1280 world, 32 px tiles, 64 × 40 terrain
  grid, eight surface types, and deterministic terrain decoration.
- Authored landmarks, roads, and props: Waystation Echo, Moss-Eaten Watchpost,
  Broken Ford, Sunken Meadow, Thornmaw Approach, and the Quiet Glade.
- Layered world props with solid collision defaults, scattered trees and bushes,
  boulders, ruin walls, crates, barrels, tents, carts, signs, logs, fences, and
  a walkable bridge across the stream.
- Map loading validates bounds, terrain size, unique ids, entry points, creature
  spawn points, target placement, recovery-cache, item, and interactable
  placement, known item ids, and solid-prop overlaps.
- Crawlers chase directly and gain a small pack-speed bonus, Stalkers strafe for
  an opening, and Spitters hold range with telegraphed acid projectiles.
- Creatures acquire targets by detection range and line of sight, lose hidden or
  distant targets, avoid solid obstacles, and separate from nearby allies.
- The spawn director draws from authored Greenreach points, starts a controlled
  six-creature encounter, caps the field at eight, removes dead creatures,
  counts defeats, and refills over time.
- Player health, armor mitigation, hit feedback, downed state, automatic
  waystation respawn, and respawn protection support creature damage.
- Frame-rate-independent 8-direction movement with acceleration and sliding
  collision against walls and world bounds.
- Sprint with stamina drain and recovery, plus a dodge burst with cooldown and
  brief invulnerability.
- Mouse-facing aim with camera-relative pointer conversion, hold-to-fire combat,
  deadzone camera follow, world-bound clamping, and capped look-ahead.
- Three fictional blasters: Basic Blaster, Rapid Blaster, and Heavy Blaster.
  Each has its own damage, range, fire rate, energy draw, spread, and projectile
  feel.
- Shared regenerating energy cell, per-weapon cooldowns, and `1`–`3` switching.
- Pooled projectiles with swept collision, wall impacts, pierce, expiry, active
  caps, and same-team filtering for self-damage prevention.
- Three hostile training dummies placed at authored Greenreach targets with
  health, hit flash, death, and timed respawn.
- Canvas 2D renderer with cached terrain, sorted props, tree canopies, player,
  aim reticle, projectiles, dummies, three creature silhouettes, health bars,
  attack telegraphs, hit effects, world items, a Greenreach minimap, and combat
  diagnostics.
- F3 world diagnostics include map dimensions, tile grid, camera and player
  coordinates, health and armor, recovery-cache placement and counts, loadout
  state, respawn state, nearby solids, nearby spawns, combat state, and world
  overlays.
- Mission markers are drawn in the world and minimap, while relays and other
  interactables render as world objects with activation state.
- Lightweight synthesized Web Audio feedback for firing, switching weapons,
  denied actions, target hits, enemy attacks, player damage, recovery and item
  pickups, equipment changes, and creature deaths.
- Fixed 60 Hz simulation loop with catch-up limits.
- Seedable RNG, typed events, math, and ID utilities.
- React UI fed by throttled snapshots instead of per-frame state, with health,
  armor, survival notices, death countdown, weapon, energy, cooldown, pickup,
  loadout, target, enemy, kill, and projectile readouts.
- Vitest coverage for map loading and validation, terrain sampling, world
  dimensions, prop/pickup/item/interactable layering and placement, boundary
  clamping, player and creature-sized prop collision, authored spawn validity,
  map refills, movement, sprint, dodge, armor mitigation, equipment modifiers,
  healing caps, pickup collection/respawn, one-shot item collection, inventory
  equip/unequip/duplicate/capacity rules, respawn protection, mission objective
  transitions, event counting, optional progress, prerequisite gating, failure
  rules, completion-once behavior, trigger entry and interaction state, line of
  sight, swept projectile hits, weapon range and failure feedback,
  damage/respawn, cooldowns, creature targeting/behaviors/death, spatial
  hashing, camera follow and aim offsets, input state, loop stepping, RNG
  determinism, and snapshot throttling.
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
| `E` | Activate a nearby field interactable |
| `I` | Open or close inventory |
| `Enter` | Enter Greenreach, resume, or restart after victory |
| `Escape` | Close inventory, pause, or resume |
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
    content/      Game identity, weapons, equipment, pickups, missions, map
    core/         Loop, RNG, math, IDs, events, shared types
    ai/           Creature brains and movement behaviors
    entities/     Player, damageable creatures, and training dummies
    input/        Input routing, held-key state, pointer, and fire state
    render/       Camera, Canvas 2D renderer, effects, and debug drawing
    systems/      Spawning, pickups, inventory, and mission state
    ui/           UI snapshots, store, and selectors
    world/        Map types/loading, collision, triggers, line of sight, hash
  components/     Retained Ant Defence UI, disconnected from the active app
  game/*          Retained Ant Defence engine modules
public/           Retained assets and social preview image
```

The active route starts at `src/main.tsx` → `src/App.tsx` →
`src/app/GameHost.tsx`.
