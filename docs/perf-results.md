# Performance Optimization Results (Zone Control)

All phases of the **Zone Control – Performance Master Plan** (Phases 0, 2, 1, 3, 4, 5, 6, 7, and Final Pass) are implemented locally.

## 1. Before / After Performance Budgets

| Measure | Budget Target | Before (Phase 0) | After (Final Pass) | Verification Basis |
| :--- | :--- | :--- | :--- | :--- |
| `sim.step` average (`20v20` benchmark, 2,000 ticks) | `<= 3.0 ms` | `1.015 ms/step` (`2029.4 ms`) | **`0.595 ms/step`** (`1190.2 ms`) | Measured (`vitest run src/app/benchmark.test.ts`) |
| `sim.step` average (`4v4` Hellcell, 1,800 ticks) | `<= 3.0 ms` | `0.137 – 0.185 ms` | **`0.039 – 0.050 ms`** (-70% to -76%) | Measured (`measure_baseline.cjs`) |
| `sim.step` worst single tick (`4v4` Hellcell) | Minimize spikes | `2.104 – 4.725 ms` | **`0.865 – 1.507 ms`** | Measured (`measure_baseline.cjs`) |
| A* searches per tick | `<= 3` | `max 7` (`0.79 – 1.06 avg` in Hellcell) | **`max 3`** (`0.55 – 0.83 avg` in Hellcell) | Measured (`MAX_ASTAR_PER_TICK = 3` in `src/sim/ai/index.ts`) |
| Full ground-cache rebuilds during a boss fight | `0` | `60 – 138` full rebuild triggers in `30s` | **`0`** extra full rebuilds (`1` initial only) | Verified across all 4 themes (`src/render/render.test.ts`) |
| HUD React commits per second | `<= 15 / s` | `15 Hz` snapshot + `20 Hz` `viewTransform` + per-`mousemove` `aimScreenPos` + `16.7 Hz` empty interval allocations | **`<= 10 / s`** snapshot cadence (Cursor moved via DOM ref, `viewTransform` ref-based, idle interval short-circuited, leaves `React.memo`) | Code & unit verified (`useGameState.tsx`, `GameApp.tsx`, `Crosshair.tsx`, `HUD.tsx`) |
| Minimap static terrain rebuilds | On wall/theme change only | `2,400` tile draws on every HUD state update | **`1` rebuild** per `(seed, theme, wallRevision)` + `drawImage` blit | Verified (`MinimapTerrainCache` in `src/ui/ui.test.ts`) |
| Average frame / p99 / max frame / `renderer.draw` avg (`?perf=1`) | `<= 16.7 ms` / `<= 25 ms` / `<= 50 ms` / `<= 6 ms` | Heavy mid-fight freezes from full rebuilds, `ctx.filter` bloom, `Shadow/LOS`, and per-frame allocations | Requires live Chromium session with `?perf=1` (`chromium`/`playwright` not installed in CLI sandbox) | Pending live browser `?perf=1` check |

## 2. Headless `4v4` Before / After Comparison (`1,800` ticks, seed `4242`)

| Mode | Theme | `avgStep` (Before -> After) | `maxStep` (Before -> After) | `avg A* / tick` (Before -> After) | `max A* / tick` (Before -> After) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `zoneControl` | `fortress` | `0.196 ms -> 0.109 ms` | `6.624 ms -> 2.565 ms` | `0.23 -> 0.21` | `7 -> 3` |
| `zoneControl` | `jungle` | `0.133 ms -> 0.048 ms` | `3.572 ms -> 0.566 ms` | `0.23 -> 0.20` | `7 -> 3` |
| `zoneControl` | `temple` | `0.121 ms -> 0.064 ms` | `1.365 ms -> 0.674 ms` | `0.23 -> 0.19` | `7 -> 3` |
| `zoneControl` | `slumside` | `0.080 ms -> 0.045 ms` | `1.173 ms -> 0.560 ms` | `0.23 -> 0.21` | `7 -> 3` |
| `hellcell` | `fortress` | `0.185 ms -> 0.045 ms` | `4.725 ms -> 1.507 ms` | `0.93 -> 0.62` | `6 -> 3` |
| `hellcell` | `jungle` | `0.148 ms -> 0.045 ms` | `2.104 ms -> 1.307 ms` | `0.79 -> 0.71` | `7 -> 3` |
| `hellcell` | `temple` | `0.171 ms -> 0.050 ms` | `2.899 ms -> 0.865 ms` | `0.94 -> 0.83` | `7 -> 3` |
| `hellcell` | `slumside` | `0.137 ms -> 0.039 ms` | `2.957 ms -> 0.911 ms` | `1.06 -> 0.55` | `7 -> 3` |

## 3. Summary of Changes by Phase

- **Phase 0 (`src/render/perf.ts`, `src/ui/hud/PerfOverlay.tsx`, `src/shared/events.ts`, `src/sim/ai/pathfinding.ts`, `src/app/GameController.ts`, `src/app/GameApp.tsx`):** Added `?perf=1` live overlay (`window.__ZONE_PERF__`), rolling 2s frame stats, p99/worst tracking, draw/cache/visibility/bloom timers, and A* tick counters.
- **Phase 2 (`src/sim/world.ts`, `src/sim/index.ts`, `src/sim/ai/index.ts`, `src/sim/ai/pathfinding.ts`, `src/sim/internal.ts`, `src/sim/hellcell/index.ts`):** Batched `world.mapVersion` flushes every 10 ticks, staggered version-triggered bot repaths via `world.rng`, capped A* calls at `MAX_ASTAR_PER_TICK = 3`, and replaced allocation-heavy A* `Set`/`Map` structures with generation-stamped `Float64Array`/`Int32Array` scratch + numeric key cache.
- **Phase 1 (`src/render/groundCache.ts`, `src/render/environment.ts`, `src/render/{fortress,jungle,slumside,temple}/{index,lighting}.ts`, `src/render/Renderer.ts`):** Replaced full-map canvas rebuilds on `wallRevision` with `ChunkedGroundCache` (`8x8`-tile dirty chunks with 38px shadow/AO margin, max 2 chunks/frame), structure diffing (`reconcileStructures`) so intact buildings are reused without re-baking, and amortized multi-frame restore after boss defeat.
- **Phase 3 (`src/render/interpolation.ts`, `src/app/GameController.ts`, `src/app/GameApp.tsx`, `src/render/Renderer.ts`):** Enabled tick-to-tick pose & angle interpolation using real fixed-timestep `alpha` (`64px` teleport/respawn snap), shared interpolated `focusPose` across camera/aim/lighting, and real frame `dt` for visual timers/effects.
- **Phase 4 (`src/render/autoQuality.ts`, `src/render/Renderer.ts`, `src/render/groundCache.ts`, `src/render/jungle/lighting.ts`, `src/ui/settingsStore.ts`, `src/ui/screens/SettingsModal.tsx`):** Replaced `ctx.filter = blur(...)` bloom and shadow blurs with 1/8-res bilinear bloom (every 2nd frame on high) and multi-tap shadow fills, capped `dpr` per quality tier (`high=2, med=1.5, low=1`), and added hysteresis-guarded `'auto'` quality tier.
- **Phase 5 (`src/render/visibility.ts`, `src/render/Renderer.ts`):** Upgraded `hasLineOfSight` to exact integer grid DDA, added `VisibilityPolygonCache` (`Float32Array` + coarse wall-segment buckets, recomputes on `>6px` move or `wallRevision` change), staggered bot LOS checks (~100 ms per unit), and cached `shadowMaskGrad` & `vignetteGrads`.
- **Phase 6 (`src/app/useGameState.tsx`, `src/app/GameApp.tsx`, `src/ui/hud/{HUD,Crosshair,Minimap,OperatorCard,WeaponCard,ObjectivesCard,ActionBar,KillFeed}.tsx`):** Reduced HUD snapshots to 10 Hz without cloning `projectiles` or `map.coverHp`, removed 20 Hz `viewTransform` & `mousemove` React state updates in favor of ref/subscriber DOM transforms, fixed idle 60 ms interval array churn, memoized HUD panels, and added `MinimapTerrainCache`.
- **Phase 7 (`src/render/effects.ts`, `src/render/Renderer.ts`, `src/render/hellcell.ts`, `src/sim/hellcell/index.ts`):** Replaced `EffectsSystem` `.filter`/`.shift` churn and per-scorch radial gradients with in-place compaction, O(1) eviction, cached scorch/glow sprites, zero-allocation row/entity/boss pools in `Renderer.draw`, viewport culling for Hellcell hazards/projectiles/effects, and `WeakMap<HellcellState, Set<number>>` O(1) lookup in `crushObstaclesInRadius`.
- **Final Pass:** Removed temporary dev console warning logs from `src/render/perf.ts` while retaining `?perf=1` telemetry; verified all checks and recorded results.

## 4. Section 14 Final Checklist

- [x] `npm run typecheck`, `npm test`, `npm run build` all pass (`19` test files, `118` tests, `0` TS errors).
- [x] Benchmark under 3 ms per step (`0.595 ms/step` standalone `20v20`; `0.831 ms/step` under parallel suite load).
- [x] Same seed gives the same result twice (`simulation integration > produces identical state for identical seeds and inputs over 1000 ticks` passes).
- [x] Hellcell on all four themes: no ghost walls, walls restored after the boss, zero mid-fight full rebuilds (`render.test.ts` + `hellcell.test.ts` pass).
- [ ] Tested live in browser at `60 Hz` and `120/144 Hz` (`?perf=1`) — **manual verification in browser needed** (no Chromium/Playwright binary in sandbox; `Renderer` interpolation & quality tests verified in unit suite).
- [ ] Tested live in browser with Chrome DevTools CPU `4x` slowdown — **manual verification in browser needed** (`AutoQualityController` downshift `>20ms for 2s`, upshift `<12ms for 10s`, and `10s` cooldown verified in `src/render/autoQuality.test.ts`).
- [x] Before/after table filled in above.
- [x] No config files were edited (`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`) and no `any` types exist in `src/`.
