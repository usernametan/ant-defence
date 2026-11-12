# MONSTER FRONTIER — Development Blueprint

**Status: Approved plan.** No game features have been implemented, no source files or dependencies were modified, and nothing has been committed.

**Legend:** `[C]` confirmed by code inspection · `[R]` recommendation · `[A]` assumption requiring confirmation.

---

## 1. Executive summary

Ant Defence is a compact, polished typing-defence prototype: Vite + React 18 + TypeScript + Canvas 2D, about 11.9k source lines, with a single 2,516-line `GameEngine` that owns the entire lane-based typing simulation. It has excellent reusable foundations in rendering, particles, synthesized audio, reduced-motion handling, persistence validation, HUD styling, and CI — but almost none of its **gameplay** architecture survives a transition to a top-down action-adventure.

Monster Frontier should therefore be a **staged transformation, not a rewrite**:

1. Keep the Vite/React/TypeScript/Canvas 2D foundation and build a new modular simulation core beside the old engine.
2. Reuse visual FX, audio synthesis, settings, persistence patterns, UI conventions, and CI.
3. Replace the typing/lane/ant systems with a fixed-timestep, camera-driven, collision-based world, player, combat, creature AI, missions, territories, bosses, and versioned saves.
4. Ship a **10–15 minute vertical slice first**: one wilderness map, three creatures, three energy weapons, a nest, one boss, one mission, HUD, audio, victory/restart.
5. Expand to the full five-region campaign only after the slice proves the loop and performance.

`[C]` The current project typechecks cleanly, Git is clean on `main` at commit `f43b3d7`, Node 24 is installed locally, and CI runs typecheck + build on Node 22. There are no tests and no lint script.

---

## 2. Final game vision

**Monster Frontier** is a polished 2D top-down action-adventure about reclaiming a frontier overrun by mutated creatures.

- **Player fantasy:** a field ranger who explores lost places, rescues survivors, clears nests, and turns dangerous territory into safe outposts.
- **Combat:** mouse-aimed fictional energy equipment, dodge/sprint, armour, status effects, abilities, and deliberate encounter design — no real-world weapon specifications.
- **Structure:** five regions, each with a distinct biome, creature ecology, hazards, missions, hidden areas, a monster nest, and a regional boss.
- **Progression:** direct mission/exploration rewards, equipment upgrades, character upgrades, safe-zone facilities. No typing stats, no WPM, no grind loops.
- **Presentation:** readable silhouettes, painterly top-down environments, strong telegraphs, consistent UI, adaptive synthesized/looped audio, accessibility-first settings.
- **Release scope:** single-player campaign only. Architecture leaves room for survival/challenge/New Game Plus later, but not multiplayer.

**Region arc:**

| # | Region | Identity | Boss |
|---|---|---|---|
| 1 | Abandoned City | Overgrown city outskirts, tutorial wilderness, survivor waystation | Thornmaw (first boss) |
| 2 | Mutated Jungle | Dense bioluminescent canopy, ambush ecology | Bloom Matriarch |
| 3 | Frozen Wasteland | Wind, ice hazards, buried research convoy | Rimebound Colossus |
| 4 | Underground Laboratory | Dark corridors, containment failures, lore | The Warden Protocol |
| 5 | Monster Homeland | Alien frontier, source of the outbreak | The Progenitor |

The first playable environment is the **Greenreach Wilds**, a wilderness sub-area of Region 1, per the requested forest-first approach.

---

## 3. Current repository audit

### 3.1 Facts confirmed by inspection

| Area | Finding |
|---|---|
| Stack | Vite 6, React 18.3, TypeScript 5.6, Canvas 2D, no runtime libraries beyond React |
| Entry | `index.html` → `src/main.tsx` → `App.tsx`; one `GameEngine` instance |
| Source size | ~11,913 lines total; `src/game` ~7,552; `styles.css` 2,767; components 1,491 |
| Architecture | Single monolithic `GameEngine` owns phase, state, input, spawning, combat, persistence, HUD snapshot |
| Loop | `requestAnimationFrame`, `dt` clamped to 0.05s; no fixed timestep; no interpolation |
| Rendering | Fixed 1600×900 logical canvas, DPR capped at 2, CSS scales 16:9; no camera or world transform |
| Player | Fixed position at `x=330`; only aim angle and recoil animate |
| Enemies | Lane-based ants marching left; word labels; no pathfinding, steering, or world collision |
| Input | Global `keydown`; typing selects words; pointer only unlocks audio |
| State bridge | `GameEngine` builds a large `HudSnapshot` ~11 times/second → React `setState` |
| Persistence | `localStorage`, manual runtime validation, no schema version field or migrations; keys prefixed `ant-defense:*` |
| Audio | WebAudio synthesized SFX only; master gain + compressor; mute persisted; no music/ambience buses |
| Accessibility | Reduced motion persisted + OS preference, pause on blur/hidden, mute, scenery quality toggle |
| UI | React HUD and overlays; strong container-query styling; WPM graph and typing-specific content |
| Assets | Procedural vector art plus three photo backgrounds and three ground textures |
| Tests | None. No Vitest/Jest/Playwright configured |
| CI | `.github/workflows/ci.yml`: `npm ci`, typecheck, build on Node 22 |
| Git | Branch `main`, up to date with `origin/main`, working tree clean, 8 commits |
| Baseline | `npm run typecheck` passes. Build was not run in Plan Mode because it writes `dist/` |

### 3.2 Key architectural findings

- `[C]` The rendering/effects/audio code is genuinely reusable; the **simulation** is not.
- `[C]` There is no map, camera, collision, navigation, inventory, mission, territory, or save-slot system.
- `[C]` All gameplay is hardwired around typing words, lanes, a defence line, and ant types.
- `[C]` UI is driven by a broad snapshot rather than selectors; this will become expensive with a richer game.
- `[C]` Photo assets contain real-camera EXIF metadata; licensing is unverified and a release risk.
- `[C]` No automated test infrastructure exists, so confidence currently depends on typecheck/build/manual play.
- `[A]` The project is intended to become the actual Monster Frontier repository rather than a parallel demo.

### 3.3 Git and safety

The working tree is clean, so there is no uncommitted work at risk today. Still, the migration must use a dedicated branch and preserve history. No commits or pushes will happen without explicit permission.

---

## 4. Existing systems worth reusing

| System | Why it is worth keeping |
|---|---|
| Vite/TS/React foundation | Suitable, fast, no engine migration cost |
| Canvas renderer bootstrap | DPR handling, sizing, CSS framing are proven |
| `effects.ts` | Particles, floating text, glow, reticles, dust, vignette, blast and spark primitives |
| `tactical.ts` | Mortar telegraphs, lightning arcs, drone rendering, overdrive tints — directly adaptable to abilities |
| `audio.ts` | WebAudio synthesis, compressor, stereo panning, mute persistence, clean method API |
| `settings.ts` | Reduced-motion detection/persistence, OS preference handling |
| `progress.ts` validation style | Defensive parsing and storage-failure tolerance are good patterns |
| `difficulty.ts` | Clean preset model to extend with assists |
| `leaderboard.ts` validation | Useful for optional challenge modes later |
| `achievements.ts` | Good model for optional medals/challenge goals |
| HUD/overlay styling | Container-query layout, panel language, readability, consistent typography |
| Reduced-motion CSS | Global animation suppression pattern |
| CI | Correct baseline; extend with tests |
| `Player` drawing techniques | Vector silhouette, recoil, muzzle flash, night cone, shadow — adaptable to top-down |
| Debug handle | `window.__antGame` pattern is useful; rename and gate it |
| Snapshot bridge concept | Correct idea; replace payload and frequency |

---

## 5. Existing systems to replace

### 5.1 Migration table

| Existing system | Current purpose | Disposition | Reason | New destination |
|---|---|---|---|---|
| `engine.ts` (2,516 lines) | Entire game loop and simulation | **Replace** | Type/lane/word architecture incompatible with action-adventure | Split into `game/core`, `systems`, `entities`, `world` |
| Typing input (`typeCharacter`, target words) | Attack and targeting | **Remove** | Core old mechanic | Mouse aim + fire input |
| `words.ts`, word packs | Enemy labels, typing pools | **Remove/archive** | No textual combat | Removed from product |
| WPM/accuracy/combo typing stats | Scoring | **Remove** | Not applicable | Missions, exploration, combat rating maybe |
| Ant enemies / Queen | Enemy behaviour | **Replace** | Ant-specific identity and lane logic | Creature archetypes + AI |
| Wave spawner / lanes / defence line | Endless wave defence | **Replace** | Wrong game shape | Encounter director + spawn zones |
| `Ant`, `AcidGlob`, `Bullet` models | Combat data | **Replace** | Target-locked, word-driven | World-space projectiles, hits, abilities |
| `player.ts` | Fixed aim/recoil render | **Adapt** | Drawing techniques useful; no movement/collision | `entities/Player` + `render/drawPlayer` |
| `ants.ts` | Ant movement/render | **Adapt render only** | Vector creature craft reusable; logic not | `render/drawCreature`, AI modules |
| `config.ts` | All constants | **Split** | Mixes content, tuning, viewport | `content/*`, `core/constants` |
| `types.ts` | Shared old models | **Replace** | Wrong domain model | New typed models per system |
| `effects.ts` | VFX | **Reuse/adapt** | Visual language and particles useful | `render/effects` |
| `tactical.ts` | Ability VFX | **Reuse/adapt** | Mortar/lightning/telegraph primitives fit | `render/abilities` |
| `scenery.ts` | Photo/procedural backdrop | **Adapt cautiously** | Technique useful; photo licensing unclear | `world/tiles`, `render/background` |
| `public/scenery/*.jpg` | Backgrounds/textures | **Conditional** | EXIF suggests real photography, license unknown | Replace or verify licence |
| `audio.ts` | Synthesized SFX | **Adapt** | Strong base; needs buses/music/ambience | `audio/AudioEngine`, buses |
| `settings.ts` | Motion/scenery/word settings | **Adapt** | Keep motion; drop word packs | `settings` + new audio/quality settings |
| `difficulty.ts` | Presets | **Adapt** | Keep model; extend to combat assists | `content/difficulty` |
| `progress.ts` | Best score/WPM records | **Replace** | Needs campaign save | `systems/SaveManager` |
| `leaderboard.ts` | Score board | **Defer/reuse later** | Not campaign-critical | Challenge modes only |
| `achievements.ts` | Typing medals | **Adapt later** | Useful for optional achievements | `content/achievements` |
| `modes.ts` / mutators | Typing game modes | **Retire from campaign** | Wrong mode model | Optional challenge modes later |
| `Hud.tsx`, `Overlays.tsx` | UI | **Replace content, reuse patterns** | Old labels/models | New HUD, menus, inventory, map |
| `WpmGraph.tsx` | Typing graph | **Remove** | Irrelevant | Removed |
| `Icons.tsx` | Vector UI icons | **Adapt** | Several icons reusable | `components/icons` |
| `styles.css` | Full visual system | **Adapt/rewrite selectors** | Excellent techniques, old branding | New tokens and UI styles |
| `HudSnapshot` bridge | UI updates | **Replace with selectors** | Payload too broad for new game | `ui/UiSnapshot` + store |
| Debug global | Dev inspection | **Adapt** | Useful | `window.__monsterFrontier` |
| CI | Typecheck/build | **Reuse + extend tests** | Solid baseline | Updated workflow |
| Tests | None | **Create** | Required for systems | Vitest suites |

### 5.2 Explicitly removing old game concepts

Typing attacks, word selection, WPM, accuracy, ant enemies, ant hills/nests, Queen logic, wave terminology, defence-line breaches, typed target labels, word packs, zen/boss-rush/blackout typing modes, and all Ant Defence branding. They will be removed only in dedicated migration commits after the new foundation runs.

---

## 6. Recommended technical architecture

### 6.1 Core decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| Engine | Keep React + Vite + TS + Canvas 2D; no Phaser/Pixi initially | Existing foundation; Canvas 2D is sufficient for a few hundred entities with culling/pools. Revisit only if profiling fails targets |
| Simulation | Fixed timestep **60 Hz** with accumulator, max 5 catch-up steps, render interpolation | Stable physics/AI; smooth on high-refresh displays |
| State | `World` owns frame state; systems mutate it; a separate `PersistentState` owns campaign progress | Clear ownership, testable, one source of truth |
| UI bridge | Small read-only `UiSnapshot` via an external store and `useSyncExternalStore`, emitted at 10–15 Hz or on change | Prevents React rerenders per frame |
| Communication | Typed `EventBus` for gameplay facts (`creature:killed`, `objective:progress`, `territory:liberated`) | Missions, progression, audio, UI subscribe without coupling |
| Data | TypeScript content modules with typed definitions; add runtime validators at load boundaries | Type safety, fast iteration, no new content pipeline |
| Collision | Circle-vs-tile AABB, swept projectile segments, spatial hash for entity broad-phase | Simple, fast, testable |
| Navigation | Steering + obstacle avoidance first; flow field or A* only for complex interiors | Avoid premature complexity |
| Persistence | Versioned JSON in `localStorage`, validated with explicit migrations and a backup key | Required by campaign scope |
| Testing | Vitest for unit/integration; optional Playwright later | Cheap, fast, aligns with existing scripts |

`[R]` Do **not** introduce a full ECS. Use a small `Entity` base plus specialised `Creature`, `Player`, `Projectile`, and `Boss` classes. Systems operate on typed collections. This keeps the code approachable for a 2D indie scope.

### 6.2 Runtime layers

```text
React app shell
  Menu / HUD / Inventory / Map / Settings overlays
        │ read-only UiSnapshot
        ▼
GameHost (owns one Game instance)
        │
        ▼
Game
  ├─ Loop (fixed step + render interpolation)
  ├─ InputRouter ──► Player intent
  ├─ World (entities, map, camera, spatial hash)
  ├─ Systems
  │    ├─ CombatSystem / ProjectileSystem
  │    ├─ AISystem / SpawnDirector
  │    ├─ MissionSystem / TerritorySystem
  │    ├─ PickupSystem / InventorySystem
  │    ├─ ProgressionSystem / SaveManager
  │    └─ AudioDirector
  ├─ EventBus
  └─ Renderer (camera transform, layers, culling, VFX)
```

### 6.3 Game loop contract

1. Read input once per RAF; store intents.
2. Accumulate elapsed time; step simulation at `1/60`.
3. Each step: input intent → player movement → AI → physics/collision → combat → pickups/interactions → mission/territory events → cleanup.
4. Render once per RAF with interpolation between previous/current transforms.
5. Emit UI snapshot at a throttled interval or immediately on significant phase changes.
6. Pause simulation on `Escape`, window blur, or hidden tab; do not accumulate catch-up while paused.

### 6.4 Important data models

```ts
// World-space transform
interface Transform { x: number; y: number; radius: number }

interface WeaponDef {
  id: string;
  name: string;
  category: 'emitter' | 'repeater' | 'precision' | 'burst' | 'orb' | 'elemental' | 'gadget';
  damage: number;
  cooldown: number;
  energyCost: number;
  projectile: { speed: number; life: number; radius: number; pierce: number; spread: number };
  upgrades: WeaponUpgradeDef[];
}

interface CreatureDef {
  id: string;
  archetype: 'crawler' | 'stalker' | 'brute' | 'flyer' | 'spitter' | 'mutant' | 'guardian' | 'elite';
  maxHealth: number;
  speed: number;
  radius: number;
  attack: AttackDef;
  brain: string;
  lootTable: LootEntry[];
  tags: string[];
}

interface MissionDef {
  id: string;
  regionId: string;
  title: string;
  description: string;
  objectives: Array<{
    id: string;
    type: 'kill' | 'reach' | 'interact' | 'collect' | 'destroy' | 'rescue' | 'defend' | 'boss';
    targetId?: string;
    count?: number;
  }>;
  rewards: RewardDef[];
  failure?: FailureDef;
}

interface SaveV1 {
  version: 1;
  createdAt: number;
  updatedAt: number;
  checkpoint: { regionId: string; x: number; y: number; safeZoneId?: string };
  player: { health: number; maxHealth: number; armour: number; energy: number; upgrades: Record<string, number> };
  inventory: { equipment: string[]; consumables: Record<string, number>; materials: Record<string, number> };
  missions: Record<string, { status: 'locked' | 'active' | 'complete' | 'failed'; objectives: Record<string, number> }>;
  territories: Record<string, 'unknown' | 'discovered' | 'cleared' | 'liberated'>;
  regions: Record<string, { unlocked: boolean; explored: number }>;
  story: { documents: string[]; flags: Record<string, boolean> };
}
```

### 6.5 Rendering

- World camera viewport: **960×540 world units**, scaled to the 16:9 canvas, with tile size **32**.
- First map: ~64×40 tiles (2,048×1,280 world units), giving meaningful exploration beyond one screen.
- Pre-render static ground/terrain to an offscreen canvas per map.
- Render layers: ground → ground decals → shadows → entities sorted by `y` → canopy/props above → effects → screen-space UI/VFX.
- Cull by camera bounds + margin.
- Camera applies translate/zoom; screen shake and reduced-motion handled at render only.
- Mouse → world coordinates through the inverse camera transform.

---

## 7. Proposed project folder structure

```text
src/
  app/
    GameHost.tsx              # Owns the Game instance and lifecycle
    useGameSnapshot.ts         # useSyncExternalStore bridge
    phaseRouting.ts
  components/
    hud/
      Hud.tsx
      HealthPanel.tsx
      EquipmentPanel.tsx
      MissionTracker.tsx
      Minimap.tsx
      BossBar.tsx
      InteractionPrompt.tsx
    menus/
      MainMenu.tsx
      PauseMenu.tsx
      SettingsMenu.tsx
      InventoryScreen.tsx
      MapScreen.tsx
      MissionsScreen.tsx
      UpgradeScreen.tsx
      GameOverScreen.tsx
      VictoryScreen.tsx
    common/
      icons.tsx
      Button.tsx
      Panel.tsx
  game/
    core/
      Game.ts
      Loop.ts
      EventBus.ts
      math.ts
      rng.ts
      ids.ts
      types.ts
    input/
      InputRouter.ts
      bindings.ts
    render/
      Renderer.ts
      Camera.ts
      drawPlayer.ts
      drawCreature.ts
      drawBoss.ts
      drawProjectiles.ts
      drawPickups.ts
      drawWorld.ts
      effects.ts              # Adapted from current effects.ts
      abilities.ts            # Adapted from tactical.ts
    world/
      World.ts
      MapDef.ts
      MapLoader.ts
      Collision.ts
      TileRenderer.ts
      Interactables.ts
      Triggers.ts
      SpatialHash.ts
    entities/
      Entity.ts
      Player.ts
      Creature.ts
      Boss.ts
      Projectile.ts
      Pickup.ts
    ai/
      Brain.ts
      behaviors.ts
      BossPhases.ts
    combat/
      WeaponDef.ts
      CombatSystem.ts
      ProjectileSystem.ts
      Damage.ts
      StatusEffects.ts
    systems/
      SpawnDirector.ts
      MissionSystem.ts
      TerritorySystem.ts
      InventorySystem.ts
      ProgressionSystem.ts
      CheckpointSystem.ts
      SaveManager.ts
      AudioDirector.ts
    audio/
      AudioEngine.ts          # Adapted from current audio.ts
      Music.ts
      Ambience.ts
    ui/
      UiSnapshot.ts
      selectors.ts
    content/
      creatures.ts
      equipment.ts
      abilities.ts
      pickups.ts
      missions.ts
      territories.ts
      bosses.ts
      upgrades.ts
      story.ts
      regions/
        city.ts
        jungle.ts
        frozen.ts
        laboratory.ts
        homeland.ts
      maps/
        greenreach.ts
        ...
  persistence/
    schema.ts
    migrations.ts
    storage.ts
  styles/
    tokens.css
    base.css
    hud.css
    menus.css
  assets/
    sprites/  tiles/  ui/  audio/  fonts/
  test/
    fixtures/
    helpers/
MONSTER_FRONTIER_PLAN.md      # after approval
```

`src/game/legacy/` is **not** recommended; old code should remain in place only temporarily, then be removed in a clean commit. Git history preserves it.

---

## 8. Core gameplay design

Core loop:

1. **Explore** the region; reveal map, discover points of interest.
2. **Engage** controlled creature encounters using movement, aim, equipment, dodge, and abilities.
3. **Collect** salvage, bio-cores, health/energy, documents, keys.
4. **Complete objectives**: clear nests, rescue survivors, recover supplies, investigate, defend.
5. **Liberate territory**: destroy the infestation source, defeat its guardian, establish a safe zone.
6. **Upgrade** at the safe zone and choose the next mission.
7. **Advance** the campaign, unlock the next region, and confront its boss.

Pillars:

- **Readable danger:** telegraphs before attacks, consistent silhouettes, distinct creature audio.
- **Fair pressure:** limited encounter budgets, deliberate spawn zones, recovery opportunities.
- **Meaningful space:** cover, chokepoints, hazards, hidden paths, verticality represented in 2D layers.
- **No grind:** rewards from missions/exploration, not repeated farming.

---

## 9. Player and camera design

### Player

- Eight-direction movement with acceleration/deceleration and a small input deadzone.
- Base movement ~220 world units/s; sprint ~1.35× with a stamina/cooldown resource.
- Dodge: quick directional burst, brief invulnerability, cooldown; respects collision.
- Aim independent of facing using mouse world position; facing follows movement, weapon follows aim.
- Health (100 base) + armour/shield (absorbs a portion, regenerates only at stations/consumables).
- Damage feedback: brief invulnerability window, hit flash, directional indicator, camera shake (unless reduced motion), low-health vignette/audio.
- Status effects: burning, slowed, shocked, poisoned; visible icons and timers.
- Upgrades: max health, armour, movement speed, energy capacity, recovery rate, ability cooldown.
- Defeat: fade, game-over panel, respawn at last checkpoint with retained mission progress and configurable penalty (default: none beyond checkpoint reset).
- Interaction: `E` near doors, containers, survivors, terminals, checkpoints; prompts appear contextually.

### Camera

- Smooth follow with exponential damping and a deadzone.
- Small capped look-ahead toward the mouse (e.g. max 90 world units) to reveal aiming space.
- Clamp to map bounds; no camera movement past world edges.
- Shake applied as a render offset, disabled or reduced by accessibility settings.
- Optional slight zoom-out during boss encounters; avoid dynamic zoom during normal combat.
- Camera interpolation between fixed simulation steps.

### Collision

- Player and ground creatures are circles vs tile AABBs and prop AABBs.
- Slide response: resolve X then Y independently to avoid sticking.
- Projectiles use swept segment tests; stop at walls and valid targets.
- Flyers use a separate collision layer that ignores ground obstacles but respects world bounds and tall structures.
- Enemy separation uses light steering, not hard physics, to avoid jitter.
- Interaction and trigger zones are separate non-blocking volumes.

---

## 10. Combat and equipment design

### Combat principles

- Responsive, arcade, fictional. No realistic ballistics, calibres, or real-world weapon names.
- Every shot has clear muzzle VFX, travel trail, impact VFX, hit flash, sound, and damage feedback.
- Enemy attacks use wind-up telegraphs (colour/shape/audio) before damage.
- Cooldowns and energy create decisions; equipment switching is quick and readable.

### Equipment categories

| Category | Role | Example name | Behaviour |
|---|---|---|---|
| Basic emitter | Reliable starter | **Aether Emitter** | Single energy bolt, medium damage, low cost |
| Rapid projector | Close pressure | **Pulse Repeater** | Fast, low-damage bolts, spread, heat/energy drain |
| Charged precision | High skill | **Focus Lance** | Charge shot, pierce, high damage, slow |
| Short-range burst | Crowd control | **Shard Burst** | Cone of shards, strong knockback, short range |
| Explosive orb | Area damage | **Bloom Orb** | Lobbed orb, delayed AoE, destroys nest nodes |
| Elemental | Utility/damage | **Cryo Coil / Ember Coil** | Slow or burn status, lower raw damage |
| Defensive gadget | Survival | **Bulwark Field** | Temporary shield/dome or area slow |

### Combat systems

- `WeaponInstance` = definition + upgrade level + current energy/heat.
- Fire strategies: single, spread, charged, burst, lobbed, beam; selected by data, not `if` chains in the player.
- Damage pipeline: base → upgrade multipliers → critical → armour mitigation → status application.
- Abilities: one equipped ability with cooldown (e.g. shockwave, decoy, time-slow field), upgraded independently.
- Area effects: radial query through spatial hash, line-of-sight check for walls.
- Projectiles pooled and capped; effects pooled.
- Equipment pickups add to inventory; duplicates convert to materials.
- Pickup types: health, energy, armour shards, temporary boosts, upgrade materials, mission items, documents.
- Pickup rules: auto-collect health/energy/materials on proximity or interaction; mission items require interaction; UI toast on acquisition; persisted in inventory.

`[R]` Keep energy as the primary resource (regenerating) plus consumable charges for defensive gadgets. Avoid adding ammunition micromanagement in the first release.

---

## 11. Creature and AI design

### Archetypes

| Archetype | Appearance | Behaviour | Movement | HP | Attack | Special | Difficulty | Spawn | Reward |
|---|---|---|---|---|---|---|---|---|---|
| Crawler | Low, many-legged, pale mottled carapace | Swarms, direct chase | Ground, moderate | Low | Melee bite | Slight pack speed boost | Easy | Common, groups | Salvage, small bio-core |
| Stalker | Lean, dark, bright eye streak | Flanks, circles, commits to dash | Fast ground, erratic | Medium | Lunging slash | Brief evasive dash | Medium | Ambush points | Salvage, agility material |
| Brute | Bulky, asymmetric growths | Slow advance, charges | Heavy ground | High | Slam shockwave | Stagger/armour break windows | Medium-high | Open arenas, nest guards | High salvage, armour material |
| Flyer | Winged, translucent membranes | Harasses from above, dives | Air, ignores ground clutter | Low-medium | Dive strike / projectile | Repositioning bursts | Medium | Cliffs, canopy | Energy material |
| Spitter | Bloated sacs, long throat | Maintains range, area denial | Slow ground, retreats | Medium | Arcing energy glob | Leaves hazard puddle | Medium | Elevated/defended spots | Bio-core, elemental material |
| Mutant | Unstable silhouette, glowing seams | Unpredictable, status effects | Variable | Medium-high | Melee burst / aura | Regeneration or short teleport | High | Corrupted zones | Rare materials |
| Guardian | Armoured, anchored | Protects nest/objective | Slow patrol or stationary | High | Sweeping beam / shockwave | Area denial, shield phases | High | Nest cores | Nest key, major upgrade |
| Elite | Larger, distinct colour aura | Adaptive version of base | Base archetype | Very high | Enhanced pattern | Aura buffs nearby creatures | High | Regional encounters | Rare loot, mission item |
| Boss | Unique, oversized, dedicated arena | Phase-based | Bespoke | Very high | Multiple patterns | Phase transitions, summons | Boss | Arena trigger | Campaign reward |

### Reusable AI architecture

- `Brain` interface: `update(creature, world, dt, intent)`.
- Shared states: **idle → patrol → alert → chase → strafe → attack wind-up → attack → recover → stagger → retreat → dead**.
- Perception: distance, field of view, line-of-sight raycast, hearing radius from combat events.
- Steering: seek, flee, strafe, orbit, separation, obstacle avoidance.
- Attack scheduler: range, cooldown, telegraph duration, movement lock.
- Archetype parameter sets; special behaviours composed as small functions, not duplicated state machines.
- Group coordination: limited by encounter director, no global omniscience; nearby allies can alert each other.
- Bosses do not use the normal brain; they use scripted phases and attack patterns.

### Spawning and difficulty

- Spawn zones and encounter definitions are authored in map data, not random global emitters.
- Encounter budget per zone: max alive, composition, reinforcement rules, respawn cooldown.
- Difficulty inputs: region tier, mission override, player upgrades, encounter type, optional difficulty preset.
- No endless ambient spawning in liberated territory; optional light ambient patrols only for atmosphere and never infinite.
- Boss arenas lock entry, clear adds, and open on victory.

---

## 12. World and map design

### World structure

Each region has:

- A distinct tileset and lighting mood.
- A main traversal route, optional hidden paths, and at least one shortcut.
- Authored encounters and spawn zones.
- Environmental hazards (ice, spores, darkness, unstable floors).
- A main nest, a safe zone, mission locations, collectibles, and a boss arena.
- A region entry/exit and world-map transition.

### Map solution

`[R]` Hand-authored **tile-grid + object-list** maps in TypeScript, with optional JSON support later. This is simpler and more maintainable than adopting Tiled at this stage, and avoids a new dependency/tooling pipeline.

```ts
interface MapDef {
  id: string;
  width: number;
  height: number;
  tileSize: 32;
  ground: number[];          // tileset indices
  decals: number[];
  collision: boolean[];      // solid grid
  props: PropDef[];
  spawnZones: SpawnZoneDef[];
  interactables: InteractableDef[];
  triggers: TriggerDef[];
  pointsOfInterest: PointOfInterestDef[];
  entryPoints: Record<string, { x: number; y: number }>;
}
```

- Static ground is pre-rendered once.
- Props are sorted with entities by `y`.
- Collision grid + prop AABBs.
- Map validation at load: dimensions, indices, required entry points, object bounds.
- World boundaries = map bounds; camera clamped.
- Exploration tracking: reveal cells around player and on POI discovery; save explored percentage per region.
- Minimap: simplified ground/collision, fog-of-war, icons for objectives, safe zones, nests, checkpoints.
- Location transitions: gates/doors trigger a fade and load the destination map; world map screen shows unlocked regions and mission markers.

### Environmental interaction

Doors and gates (keys/objectives), supply containers, checkpoints, terminals with documents, survivor locations, research equipment, hidden passages (destructible or discoverable), mission objects (nest nodes, beacons, valves), safe-zone facilities.

### First map recommendation

**Greenreach Wilds**: 64×40 tiles, 2,048×1,280 world units, tile size 32. Contains:

- A small survivor waystation (safe zone shell).
- Open meadow, dense brush chokepoints, a shallow stream hazard, a rocky nest approach.
- 3 creature types (Crawler, Stalker, Spitter) plus elite variant hook.
- One nest with 3 destroyable nodes, a guardian mini-encounter, and the Thornmaw boss arena.
- 2 supply caches, 1 document, 1 hidden passage, 1 checkpoint.

---

## 13. Mission and territory design

### Mission system

Mission state machine: `locked → available → active → complete` or `failed`.

Objective types (data-driven):

- `reach` location
- `kill` count/tag
- `destroy` specific objects
- `interact` with object
- `collect` item count
- `rescue` survivor
- `defend` zone for time/against waves
- `boss` defeat target

Every mission defines title, description, objectives, completion conditions, rewards, optional failure conditions, markers, and UI text. `MissionSystem` listens to `EventBus` facts and increments objective progress. Rewards are granted once and persisted. Mission markers update the HUD and map.

### Territory system

Each territory is an occupied location with:

1. **Discovery** trigger and map reveal.
2. **Required objectives** (clear encounters, destroy nest nodes, rescue/secure).
3. **Infestation source** interaction/destruction.
4. **Optional/final guardian** encounter.
5. **Liberation** event and reward.
6. **Visible change**: hostile spawns stop, survivors/friendly NPCs appear, safe zone facilities activate, new missions unlock, visuals change (corruption cleared, lights on, banners).
7. **Persistent state** saved.

Territory states: `unknown`, `discovered`, `cleared`, `liberated`.

The first nest should be small and legible: approach → clear three guard groups → destroy three Bloom Nodes → defeat the Thornmaw guardian → return to waystation to secure it.

---

## 14. Boss architecture

`BossDef` contains:

- Identity, arena map/trigger, music cue, phase list, unique attacks, telegraphs, summons, vulnerability windows, rewards, victory sequence.
- Boss state: phase index, attack scheduler, cooldown, enrage timer, arena bounds, adds budget.
- Phases transition at HP thresholds and/or objective events; each phase changes movement, attack selection, and visual state.
- Dedicated HUD boss bar with phase pips and telegraphed attack name.
- Arena locks on entry, prevents escape until victory/defeat, and clears adds between phases.
- Clear visual warnings: ground decals, wind-up colour, audio cue, silhouette change.
- Victory: brief slow-motion/zoom, boss collapse VFX, rewards, mission/territory completion, safe-zone unlock, save point.
- Boss is not a scaled normal creature: unique renderer, unique pattern script, unique audio.

**First boss: The Thornmaw**

- A massive, rooted jungle guardian with a plated front and exposed glowing seams.
- Arena: circular clearing with four destructible root anchors.
- Phase 1: slow slam and sweeping root lines; anchor armour.
- Phase 2 (66%): destroys one anchor escape route, adds spore hazards and a charge.
- Phase 3 (33%): exposed core, faster patterns, summoned Crawlers capped by arena budget.
- Attack patterns are telegraphed by ground shapes and sound; dodging is the core defence.
- Rewards: territory liberation, a weapon upgrade material, and a new region mission.

---

## 15. Campaign and story design

### Story delivery

- Short mission briefings and radio lines (2–4 lines) at safe zones or region entry.
- Optional documents/recordings discovered in the world, readable in a journal.
- Environmental storytelling: evacuation notices, research logs, broken barricades, contaminated sites.
- No long dialogue interruptions during combat; conversations pause only in safe areas or via optional interaction.
- Cutscenes are lightweight: camera pans, fades, text cards, radio audio, and in-world events.

### Arc

- **Beginning:** the ranger reaches Waystation Echo near the Greenreach Wilds. Basic controls and first creatures. Establish the safe zone.
- **Early:** creatures are spreading from organised nests. Clear Greenreach, find evidence of deliberate mutation, unlock the city.
- **Middle:** explore the city, jungle, and frozen wasteland; discover abandoned laboratories and the "Project Verdant" research programme.
- **Late:** the Underground Laboratory reveals the containment failure and the existence of the Progenitor. The Monster Homeland is unlocked.
- **Ending:** confront the Progenitor at the source. Contain or destroy the Bloom; survivors begin to rebuild. Leave a post-credits hook for future content.

Working names: **Project Verdant**, **The Bloom**, **The Progenitor**, **Waystation Echo**, **Thornmaw**. These are placeholders for approval and can be renamed.

---

## 16. Progression and save design

### Character progression

Small, meaningful upgrade tree purchased at safe zones with salvage/materials:

- Max health
- Armour capacity
- Movement speed
- Energy capacity
- Energy recovery
- Ability cooldown

No generic XP bar. Missions and exploration grant direct resources. Optional respec at a station for a modest cost.

### Equipment progression

Each equipment line has 3–5 levels:

- Output strength
- Energy efficiency/capacity
- Recovery speed
- Special effect upgrade at max level
- Unlock requirement (mission, nest, or region)

### Safe zones and outposts

Facilities unlocked progressively:

- Medical station (heal/restore armour, respawn checkpoint)
- Equipment station (loadout, upgrades)
- Resource storage (inventory/materials)
- Mission board (available missions, fast travel later)
- Character upgrade station
- Survivor interactions (story, side missions, rewards)

### Save system

- Single campaign slot for v1; architecture supports multiple slots later.
- Keys: `monster-frontier:save:v1`, `monster-frontier:settings:v1`, `monster-frontier:backup:v1`.
- Autosave on checkpoint, mission completion, territory liberation, region transition, safe-zone upgrade.
- Save payload validated field-by-field; unknown fields ignored; missing fields defaulted.
- Corrupt save: preserve raw backup, show a clear recovery dialog, offer new game; never crash at startup.
- Migration: `version` field + ordered migration functions. Keep migrations for at least two prior versions.
- Do not store secrets or personal data. Local only.
- Settings stored separately from campaign progress.

---

## 17. UI and audio design

### Visual direction

- **Painterly frontier sci-fi**: deep teal/charcoal environments, desaturated greens, amber/cyan energy accents, warm safe-zone light.
- Strong silhouettes; creature colour coding by role/telegraph.
- Clear hierarchy: player > threats > interactables > ambient detail.
- Consistent shape language for UI panels, thin gold/cyan lines, condensed display type, monospaced numbers.
- Preserve the current project’s strong readability and container-query scaling, but replace ant/typing branding.

### Screens

- **Main menu:** New Game, Continue, Settings, Credits, (later Challenge Modes).
- **HUD:** health, armour/shield, equipped equipment + energy, ability cooldown, mission objectives, interaction prompt, minimap, boss bar, damage direction, status effects.
- **Pause:** Resume, Settings, Controls, Save & Quit.
- **Inventory/Equipment:** equipment slots, upgrades, materials, documents; readable stat deltas.
- **Map:** region map, discovered areas, objectives, safe zones, nests, fast-travel points later.
- **Missions:** active/completed, objectives, rewards.
- **Upgrade screen:** safe-zone stations only; clear costs and effects.
- **Game over / Victory:** summary, rewards, respawn/continue/new game.
- **Settings:** audio, display, accessibility, controls, difficulty/assists.

HUD placement: objectives top-left, minimap top-right, health/armour bottom-left, equipment/energy bottom-center, ability bottom-right, interaction prompt near the player or lower center. Keep the center clear during combat.

### Audio plan

- Adapt the existing synth engine into buses: master, music, SFX, ambience.
- Music states: menu, exploration, combat, nest, boss, safe zone, victory; crossfade, no hard cuts.
- Ambience per region: wind, insects, drips, machinery, distant creatures.
- SFX: movement, dodge, equipment fire, charge, impact, creature attacks, pickups, mission notifications, UI, checkpoints.
- Spatial panning based on camera/world position; volume attenuation by distance.
- Separate sliders for master/music/SFX/ambience; persist settings.
- Audio unlock on first user gesture; pause/suspend when hidden.

---

## 18. Accessibility and performance

### Accessibility

Preserve and extend:

- Reduced motion: disable/reduce shake, flash intensity, parallax, particles; keep essential attack telegraphs.
- Screen-shake slider (off/low/normal) independent of reduced motion.
- Fullscreen toggle.
- Master/music/SFX/ambience volumes.
- Difficulty presets plus assists: incoming damage, enemy speed, aim assist, longer telegraphs, extra i-frames.
- Readable text scale and high-contrast UI option.
- Remappable keyboard controls (at minimum movement/aim-equivalent/fire/interact/equipment/ability/pause).
- Pause on blur/hidden; pause menu always available.
- No color-only telegraphs: pair color with shape and sound.
- Keyboard-navigable menus with visible focus states.
- Quality presets: low/medium/high (DPR cap, particle density, shadows, background detail).

### Performance targets

- 60 FPS at 1920×1080 on a mid-range integrated GPU at medium quality.
- Sustain 120 active creatures + 80 projectiles at 60 FPS.
- Simulation budget ≤ 6 ms/frame; render budget ≤ 8 ms/frame at target spec.
- Initial load ≤ 3 s on broadband; region transition ≤ 1 s with fade.
- Stable memory under 250 MB during a 30-minute session.
- No per-frame React renders; no unbounded arrays; object pools for projectiles/particles.
- Fixed-step loop prevents spiral-of-death; cap catch-up steps.
- Cull entities and effects off-camera; pre-render static map layers.
- Spatial hash rebuilt per frame or incrementally; avoid O(n²) queries.
- Audio nodes are short-lived and disconnected; cap simultaneous one-shots.

---

## 19. Migration strategy

### Guiding rules

1. Branch from the current clean `main` (e.g. `feat/monster-frontier`) when approved.
2. Keep the build green at every milestone.
3. Build the new shell beside the old engine; switch the app entry only when the new foundation renders.
4. Remove old gameplay in a dedicated, reviewable commit after the new vertical slice runs.
5. Preserve reusable modules by adapting them into new folders; do not duplicate their logic long-term.
6. Never delete uncommitted work; today the tree is clean, and future work must be checked before staging.
7. No commit/push without explicit permission.

### Staged migration

| Phase | Action | Build state |
|---|---|---|
| A | Add new core/render/input modules; keep old game importable | Green |
| B | Switch `App.tsx` to new `GameHost`; old engine files remain unused | Green |
| C | Add player/combat/world/creatures | Green |
| D | Add survival, inventory, missions, nest, boss | Green |
| E | Add save/progression; reach vertical slice | Green |
| F | Remove typing/ant engine files, word packs, WPM UI, old branding in a dedicated commit | Green |
| G | Expand regions/content | Green |

### Branding and repo migration

- Update `package.json` name, `index.html` title/meta, README, credits.
- Keep Git history; do not squash the transformation into an opaque rewrite.
- Tag the last Ant Defence commit before the brand switch (only with approval).
- Optionally preserve Ant Defence as a separate archive/tag, not a shipped route, unless requested.

---

## 20. Complete milestone roadmap

### Milestone table

| Stage | Goal | Complexity | Depends on | Primary verification |
|---|---|---|---|---|
| 0 | Repository audit and migration plan | Low | — | Typecheck baseline; clean tree confirmed |
| 1 | New game foundation and shell | Medium | 0 | New host runs; typecheck/build |
| 2 | Player movement, camera, collision | Medium | 1 | 8-direction movement + camera tests |
| 3 | Combat and projectiles | Medium | 2 | Hit tests, cooldown/energy tests |
| 4 | Creature entity + AI foundation | High | 3 | AI state and spatial-hash tests |
| 5 | First wilderness map | Medium | 2, 4 | Map validation + collision + navigation |
| 6 | Survival systems | Medium | 3, 5 | Damage/death/checkpoint tests |
| 7 | Equipment and inventory | Medium | 3, 6 | Inventory rules + UI flow |
| 8 | Mission system | Medium | 5, 6 | Objective state machine tests |
| 9 | First monster nest / territory | Medium-high | 7, 8 | Liberation persistence test |
| 10 | First boss | High | 6, 9 | Phase transition + victory tests |
| 11 | Progression and save | Medium-high | 7–10 | Save/load/migration/corruption tests |
| 12 | Campaign expansion (4 remaining regions) | High | 11 | Per-region content + full-campaign run |
| 13 | Story, safe zones, survivors | Medium | 11 | Story flag + dialogue tests |
| 14 | UI, audio, animation polish | Medium | 11, 13 | Accessibility + audio settings checks |
| 15 | QA, balance, performance | High | 12–14 | Full regression + performance targets |
| 16 | Release preparation | Low-medium | 15 | Production build, browser matrix, credits |

### Per-stage detail

#### Stage 0 — Repository audit

- **Status:** complete (this document).
- **Files:** none changed.
- **Acceptance:** stack, risks, reusable systems, and migration path documented; clean Git confirmed.
- **Risk:** assumptions about final scope/art direction.

#### Stage 1 — Game foundation

- **Goal:** new modular core, app shell, camera/renderer skeleton, UI snapshot bridge, branding metadata.
- **Create:** `src/app/GameHost.tsx`, `src/app/useGameSnapshot.ts`, `src/game/core/{Game,Loop,EventBus,math,rng,ids,types}.ts`, `src/game/render/{Renderer,Camera}.ts`, `src/game/input/{InputRouter,bindings}.ts`, `src/game/ui/{UiSnapshot,selectors}.ts`, `src/game/content/index.ts`.
- **Change:** `App.tsx`, `main.tsx`, `index.html`, `package.json`, `README.md`, `styles.css` tokens.
- **Order:** core math/RNG → loop → renderer/camera → input → snapshot store → host → app switch → branding.
- **Tests:** loop stepping, RNG determinism, camera clamping, snapshot throttling.
- **Acceptance:** dev server shows new shell; fixed-step loop runs; no old game imports in the active tree; typecheck/build/CI pass.
- **Risk:** accidentally breaking the existing game before the switch; mitigate with branch and isolated commits.

#### Stage 2 — Player prototype

- **Goal:** eight-direction movement, sprint/dodge, mouse aiming, camera follow, collision with a test arena.
- **Create:** `src/game/entities/Player.ts`, `src/game/world/Collision.ts`, `src/game/world/TestArena.ts`, `src/game/render/drawPlayer.ts`, `src/game/render/drawDebug.ts`.
- **Change:** `Game.ts`, `Renderer.ts`, `Camera.ts`, `InputRouter.ts`.
- **Tests:** circle-vs-AABB, slide response, camera bounds, dodge cooldown.
- **Acceptance:** player traverses arena at 60 FPS, cannot pass walls, aim follows mouse, camera stays in bounds.
- **Risk:** collision feel; tune acceleration/friction early.

#### Stage 3 — Combat prototype

- **Goal:** fictional energy projectile combat, aiming, cooldown/energy, hit feedback, target dummies.
- **Create:** `src/game/combat/{WeaponDef,CombatSystem,ProjectileSystem,Damage}.ts`, `src/game/render/drawProjectiles.ts`, `src/game/content/equipment.ts`, `src/game/render/effects.ts` (adapted).
- **Change:** `Player.ts`, `Game.ts`, `InputRouter.ts`, `Renderer.ts`, `EventBus.ts`.
- **Tests:** projectile travel/expiry, swept hit, pierce, spread bounds, energy/cooldown.
- **Acceptance:** firing feels responsive; dummies take damage/die; VFX and audio fire; no leaks after 5 minutes.
- **Risk:** projectile collision edge cases; keep tests around segment-vs-circle.

#### Stage 4 — Creature foundation

- **Goal:** reusable creature entity, AI states, spatial hash, spawn director, three archetypes.
- **Create:** `src/game/entities/Creature.ts`, `src/game/world/SpatialHash.ts`, `src/game/ai/{Brain,behaviors}.ts`, `src/game/content/creatures.ts`, `src/game/systems/SpawnDirector.ts`, `src/game/render/drawCreature.ts`.
- **Change:** `Game.ts`, `CombatSystem.ts`, `Renderer.ts`.
- **Tests:** state transitions, target acquisition/LOS, separation, encounter budget, death rewards.
- **Acceptance:** Crawler, Stalker, Spitter behave distinctly; controlled encounters; performance holds with ~40 entities.
- **Risk:** AI overcomplexity; keep brains parameterized and small.

#### Stage 5 — First environment

- **Goal:** authored Greenreach Wilds map, tile rendering, props, collision, minimap, exploration tracking.
- **Create:** `src/game/world/{MapDef,MapLoader,TileRenderer}.ts`, `src/game/content/maps/greenreach.ts`, `src/game/render/{drawWorld,Minimap}.ts`, `src/game/content/regions/city.ts`.
- **Change:** `Renderer.ts`, `Camera.ts`, `Game.ts`, `SpawnDirector.ts`.
- **Tests:** map validation, collision consistency, camera clamps, POI discovery.
- **Acceptance:** seamless walkable map; no collision gaps; 60 FPS; minimap matches world.
- **Risk:** content authoring time; build a small map editor/debug overlay early.

#### Stage 6 — Survival systems

- **Goal:** health, armour, damage, status effects, pickups, checkpoints, game-over/restart.
- **Create:** `src/game/systems/{HealthSystem,PickupSystem,CheckpointSystem}.ts`, `src/game/content/pickups.ts`, `src/game/render/drawPickups.ts`, `src/components/menus/GameOverScreen.tsx`.
- **Change:** `Player.ts`, `Creature.ts`, `CombatSystem.ts`, `Game.ts`, HUD.
- **Tests:** damage mitigation, invulnerability, pickup collection, checkpoint respawn.
- **Acceptance:** player can die and respawn at checkpoint; health/armour HUD accurate; feedback clear.
- **Risk:** balance; expose tuning constants and debug defeat.

#### Stage 7 — Equipment and inventory

- **Goal:** multiple equipment types, switching, pickups, inventory rules, UI, upgrade hooks.
- **Create:** `src/game/systems/InventorySystem.ts`, `src/game/content/upgrades.ts`, `src/components/menus/InventoryScreen.tsx`, equipment HUD panel.
- **Change:** `CombatSystem.ts`, `Player.ts`, `InputRouter.ts`, `UiSnapshot.ts`.
- **Tests:** equip/unequip, duplicate conversion, persistence hooks, energy rules.
- **Acceptance:** at least three distinct weapons usable; inventory readable; selection persists.
- **Risk:** scope creep; cap v1 at three equipment lines plus one ability.

#### Stage 8 — Mission system

- **Goal:** data-driven objectives, tracking, rewards, mission UI.
- **Create:** `src/game/systems/MissionSystem.ts`, `src/game/content/missions.ts`, `src/game/world/Triggers.ts`, `src/components/hud/MissionTracker.tsx`, `src/components/menus/MissionsScreen.tsx`.
- **Change:** `Game.ts`, `EventBus.ts`, `Renderer.ts`, `UiSnapshot.ts`.
- **Tests:** objective transitions, event counting, completion once, failure rules.
- **Acceptance:** first mission activates, tracks, completes, grants reward, updates UI.
- **Risk:** hardcoded objective logic; enforce data-driven design in review.

#### Stage 9 — First monster nest

- **Goal:** occupied location, destructible source nodes, guardian, liberation, safe-zone unlock.
- **Create:** `src/game/systems/TerritorySystem.ts`, `src/game/content/territories.ts`, `src/game/world/{Nest,SafeZone}.ts`, `src/game/render/drawNest.ts`.
- **Change:** `SpawnDirector.ts`, `MissionSystem.ts`, `Renderer.ts`, `UiSnapshot.ts`.
- **Tests:** node destruction, territory state transitions, spawn suppression, reward once.
- **Acceptance:** nest can be cleared; creatures stop spawning; safe zone activates; state survives reload (after Stage 11).
- **Risk:** sequence of objectives; use explicit state machine tests.

#### Stage 10 — First boss

- **Goal:** Thornmaw encounter, arena, phases, telegraphs, boss HUD, victory.
- **Create:** `src/game/entities/Boss.ts`, `src/game/ai/BossPhases.ts`, `src/game/content/bosses.ts`, `src/game/render/drawBoss.ts`, `src/components/hud/BossBar.tsx`, `src/game/systems/CutsceneDirector.ts`.
- **Change:** `Game.ts`, `Renderer.ts`, `MissionSystem.ts`, `UiSnapshot.ts`, audio.
- **Tests:** phase thresholds, attack scheduler, arena lock, victory once.
- **Acceptance:** boss feels distinct; all phases reachable; victory sequence and rewards work; no soft-lock.
- **Risk:** boss scripting/telegraph clarity; prototype arena first, then art.

#### Stage 11 — Progression and saving

- **Goal:** versioned save/load, checkpoints, character/equipment upgrades, safe-zone stations.
- **Create:** `src/persistence/{schema,migrations,storage}.ts`, `src/game/systems/{SaveManager,ProgressionSystem}.ts`, `src/components/menus/UpgradeScreen.tsx`.
- **Change:** all persistent systems, `GameHost.tsx`, `MainMenu`, settings.
- **Tests:** round-trip save, validation, corrupt fallback, migration, upgrade costs/effects, autosave triggers.
- **Acceptance:** reload restores checkpoint, missions, territories, inventory, upgrades, settings; corrupt save does not crash.
- **Risk:** schema drift; version and migration discipline from day one.

#### Stage 12 — Campaign expansion

- **Goal:** complete five-region content arc.
- **Create:** `content/regions/{city,jungle,frozen,laboratory,homeland}.ts`, `content/maps/*`, region creature/boss/mission files; extend tilesets and music.
- **Change:** region selection, world map, spawn tables, mission/territory content, save schema if needed (with migration).
- **Tests:** per-region map validation, boss phases, mission completion, full-campaign smoke.
- **Acceptance:** all regions playable start to finish; no progression blockers.
- **Complexity:** high in aggregate; deliver **one region per sub-milestone**.
- **Risk:** content volume; freeze mechanics before mass content production.

#### Stage 13 — Story and world content

- **Goal:** briefings, documents, survivors, environmental storytelling, safe-zone life.
- **Create:** `src/game/systems/{DialogueSystem,StorySystem}.ts`, `src/game/content/story.ts`, `src/components/menus/JournalScreen.tsx`, story overlay.
- **Change:** safe zones, missions, UI, save flags.
- **Tests:** flag persistence, document unlock, dialogue sequence, no combat interruption.
- **Acceptance:** story is discoverable and optional; no long forced interruptions.
- **Risk:** writing/voice scope; text-first with optional synthesized radio.

#### Stage 14 — UI and audio polish

- **Goal:** final menus/HUD, music/ambience, animation polish, accessibility settings.
- **Create/Change:** `src/game/audio/{Music,Ambience}.ts`, `SettingsMenu.tsx`, HUD components, `styles/*`, animation helpers.
- **Tests:** settings persistence, volume bus behavior, reduced motion, focus/keyboard navigation.
- **Acceptance:** consistent visual/audio identity; settings work; no HUD obstruction.
- **Risk:** late polish churn; establish tokens and components earlier.

#### Stage 15 — Quality assurance

- **Goal:** bug fixing, balance, performance, regression.
- **Change:** targeted fixes, tests, tuning data.
- **Tests:** full automated suite, browser matrix, long-session, save corruption, all missions/bosses.
- **Acceptance:** no blockers; 60 FPS targets; no console errors; full campaign completes.
- **Risk:** insufficient time; prioritize blockers and progression faults.

#### Stage 16 — Release preparation

- **Goal:** production build, compatibility, credits, licensing, documentation.
- **Files:** `README.md`, `package.json`, `index.html`, `.github/workflows/ci.yml`, credits/licence register, final build config.
- **Acceptance:** `npm ci`, `typecheck`, `test`, `build`, `preview` all pass; browser matrix verified; assets licensed; credits complete.
- **Risk:** asset licences discovered late; maintain a register from Stage 1.

---

## 21. First playable demo specification

### Content

- One ranger character.
- One wilderness map (Greenreach Wilds).
- Smooth eight-direction movement, sprint/dodge, mouse aim, camera follow.
- Three creatures: Crawler, Stalker, Spitter.
- Three equipment lines: Aether Emitter, Pulse Repeater, Focus Lance (charge).
- Health, armour, damage feedback, pickups, checkpoint, game over/restart.
- One small nest with three destroyable nodes.
- One boss: Thornmaw.
- One mission: “Reclaim the Greenreach” (clear nest, defeat guardian, secure waystation).
- HUD: health/armour, equipment/energy, ability, objectives, minimap, interaction prompts.
- Basic audio: SFX, one exploration loop, one boss cue.
- Victory screen and restart/new game flow.

### Completion verification

The demo is complete only when all of these pass:

1. `npm run typecheck` and `npm run build` succeed.
2. Automated tests for movement/collision, projectile hits, AI states, mission completion, and save round-trip pass.
3. A clean `npm ci && npm run dev` session launches with no console errors.
4. New Game → movement → three weapon types → pickups → nest nodes → boss → victory is completable in 10–15 minutes.
5. All three creature types visibly behave differently.
6. Boss reaches all intended phases and cannot soft-lock the arena.
7. Reloading after checkpoint/mission completion restores progress.
8. Game over and restart work from both death and boss defeat paths.
9. 60 FPS at 1920×1080 on the target machine with the demo’s maximum encounter active.
10. Reduced-motion mode removes shake/flash-heavy effects without hiding attack telegraphs.
11. Keyboard-only menu navigation and pause/resume work.
12. A 20-minute session shows stable memory and no entity/projectile leaks.

---

## 22. Testing and acceptance criteria

### Test pyramid

- **Static:** `tsc --noEmit` on every milestone; extend CI.
- **Unit:** math, RNG, collision, damage, cooldowns, inventory, mission objectives, save validation/migrations.
- **Integration/headless simulation:** instantiate the game with fake input and step frames; verify mission completion, boss phases, territory liberation, save/load.
- **Content validation:** every map, creature, mission, and boss definition is checked at load/build time.
- **Manual browser:** Chrome, Firefox, Edge, Safari; 1280×720, 1920×1080, ultrawide.
- **Performance:** profiling runs with entity/projectile caps, long-session memory, region transitions.
- **Regression:** scripted smoke checklist before each milestone completion.

### Test infrastructure recommendation

`[R]` Add **Vitest** as a dev dependency and a `test` script; optionally add coverage. This is a small, low-risk dependency with high value. Playwright can be added later only if browser automation becomes necessary; request approval before adding either.

### Milestone acceptance rule

A milestone is complete only when:

- Typecheck and build pass.
- New tests pass and existing tests still pass.
- The game remains playable and the active route is not broken.
- Acceptance criteria in the roadmap are met.
- No feature is described as complete if it is still a placeholder.

### Baseline failures

- Current baseline: **no known typecheck failures** (`npm run typecheck` passed).
- No tests exist, so there is no pre-existing test failure baseline.
- Build was not run during planning to avoid writing `dist/`; it will be the first verification in Stage 1.

---

## 23. Technical risks and mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope explosion (five regions) | High | High | Vertical slice gate; one region at a time; content budgets |
| Monolith refactor regressions | Medium | High | New shell beside old engine; small milestones; branch + tests |
| Art/asset licensing | High | High | Asset register; replace unlicensed photos; use original/CC0/commissioned work |
| Canvas 2D performance with many entities | Medium | Medium | Culling, pools, spatial hash, pre-render, profiling; Pixi only if targets fail |
| AI becomes complex/unpredictable | Medium | Medium | Parameterized brains; few archetypes first; debug views |
| Boss soft-lock/state bugs | Medium | High | Explicit phase state machine; integration tests; arena failsafe |
| Save corruption/schema drift | Medium | High | Versioning, validation, backup, migrations from first save |
| React UI drift/jank | Medium | Medium | Selectors + throttled snapshots; no per-frame React state |
| Balance/feel issues | High | Medium | Tuning data, debug tools, playtest early |
| Content authoring bottleneck | High | High | Simple map format + debug editor overlay; reuse tiles/props |
| Browser/input focus issues | Medium | Medium | Pointer lock not required; blur pause; input tests |
| Story delivery interrupting gameplay | Low | Medium | Text-first, optional journals, safe-zone conversations |
| CI lacking tests | High | Medium | Add Vitest early; gate merges on test suite |

---

## 24. Dependencies and asset requirements

### Dependencies

Keep:

- `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, React types.

Recommend adding:

- `vitest` (dev only) and optionally `@vitest/coverage-v8`.

Avoid unless justified:

- Game engines (Phaser/Pixi), state libraries, ECS libraries, UI kits, physics engines.
- Any runtime dependency that duplicates existing Canvas/WebAudio work.

### Assets

- **Creatures/player:** original sprite sheets or high-quality vector/Canvas art; consistent top-down perspective and silhouettes.
- **Tiles/props:** original or licensed tileset with collision metadata; no unlicensed photo textures.
- **UI:** original icons and panels; fonts already referenced (Barlow Condensed, IBM Plex Mono, Marcellus) are Google Fonts, but network-loaded. Self-host or use a licensed/system fallback for offline builds.
- **Audio:** original/synthesized SFX now, original or licensed music/ambience loops; keep a licence register with source, licence, author, and allowed usage.
- **Documents:** store licence text in `CREDITS.md` and keep the register updated per asset.
- **Photo backgrounds:** verify licence or replace before release. Current EXIF indicates real photography; treat as **not safe to ship** until proven otherwise.

---

## 25. Recommended implementation order

1. **Stage 0** — finalise decisions and approvals.
2. **Stage 1** — new core, shell, camera/renderer, UI bridge, branding.
3. **Stage 2** — player movement, camera, collision.
4. **Stage 3** — combat, projectiles, feedback.
5. **Stage 5** — first map/collision foundation (can run in parallel with early creature work).
6. **Stage 4** — creature AI and encounter director.
7. **Stage 6** — survival, pickups, checkpoints.
8. **Stage 7** — equipment and inventory.
9. **Stage 8** — missions.
10. **Stage 9** — nest and territory.
11. **Stage 10** — first boss.
12. **Stage 11** — progression and save.
13. **Vertical-slice QA gate** — verify Section 21 criteria before expanding.
14. **Stage 13** — story/safe-zone systems before mass content.
15. **Stage 12** — regions one at a time (city → jungle → frozen → laboratory → homeland).
16. **Stage 14** — UI/audio/animation polish.
17. **Stage 15** — full QA, balance, performance.
18. **Stage 16** — release preparation.

The key change from the requested order is moving **map collision (Stage 5)** before full creature AI, and treating **story systems (Stage 13)** before region expansion so content can include narrative hooks from the start. The vertical slice is the hard gate before Stage 12.

---

## 26. Decisions requiring your approval

1. **Repository strategy:** transform in place on a new branch (`feat/monster-frontier`) and remove Ant Defence from the shipped app after the new shell is stable, or preserve Ant Defence as a separate legacy route/tag? Recommendation: branch + tag, no shipped legacy route.
2. **Art pipeline:** original vector/Canvas art, hand-authored sprite sheets, or a mix with AI-assisted/commissioned assets? Recommendation: vector/Canvas for the vertical slice, sprite pipeline for production.
3. **Asset licensing:** replace the current photo scenery assets with original/CC0 art, or do you have licences for them? Recommendation: replace.
4. **Campaign scope:** commit to all five regions now, or approve the vertical slice first and reassess region count after the gate? Recommendation: slice first, then confirm.
5. **Testing dependencies:** approve adding Vitest (and optionally Playwright later) as dev dependencies? Recommendation: yes for Vitest now.
6. **Save model:** single autosave slot for v1, or three manual slots? Recommendation: single slot + autosave for v1.
7. **Controls:** confirm WASD movement, mouse aim, left-click fire, `Space` dodge, `E` interact, `1–3` equipment, `Q` ability, `Tab` map, `Esc` pause. Recommendation: yes, with remapping.
8. **Branding and names:** approve working names “Monster Frontier”, “Project Verdant”, “The Bloom”, “The Progenitor”, “Greenreach Wilds”, “Thornmaw”, or provide final names?
9. **Target performance baseline:** is 60 FPS at 1920×1080 on integrated graphics the correct minimum, or should the target be higher/lower?
10. **Plan file:** this document is now saved as `MONSTER_FRONTIER_PLAN.md` in the repository root.

No implementation has started. Answer the decisions above before source code work begins.
