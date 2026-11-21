# Performance Baseline (Phase 0)

Measured before optimization phases (`?perf=1` overlay + headless `4v4` and `20v20` simulations, `1,800` ticks = `30s` active match / boss fight per scenario).

## Headless Simulation & Cache-Busting Baseline (`4v4`, seed `4242`)

| Mode | Theme | `avgStep` | `maxStep` | `avg A* / tick` | `max A* / tick` | Full-Map `wallRevision` Rebuilds (30s) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `zoneControl` | `fortress` | `0.196 ms` | `6.624 ms` | `0.23` | `7` | `0` |
| `zoneControl` | `jungle` | `0.133 ms` | `3.572 ms` | `0.23` | `7` | `0` |
| `zoneControl` | `temple` | `0.121 ms` | `1.365 ms` | `0.23` | `7` | `0` |
| `zoneControl` | `slumside` | `0.080 ms` | `1.173 ms` | `0.23` | `7` | `0` |
| `hellcell` | `fortress` | `0.185 ms` | `4.725 ms` | `0.93` | `6` | **`138`** |
| `hellcell` | `jungle` | `0.148 ms` | `2.104 ms` | `0.79` | `7` | **`60`** |
| `hellcell` | `temple` | `0.171 ms` | `2.899 ms` | `0.94` | `7` | **`100`** |
| `hellcell` | `slumside` | `0.137 ms` | `2.957 ms` | `1.06` | `7` | **`101`** |

## Headless `20v20` Benchmark (`src/app/benchmark.test.ts`, 2,000 ticks)
- **Result:** `2029.4 ms total`, **`1.015 ms/step`** (`40` units, budget `<= 3.000 ms/step`).

## Confirmed Code Bottlenecks Before Fixes
1. **Hellcell full-map re-bakes:** `crushObstaclesInRadius` bumps `map.wallRevision` up to `138` times in `30s`, causing all four theme renderers to discard and re-bake their `1920×1280` ground cache, all building canvases, and `ctx.filter = 'blur(5px/6px)'` shadows synchronously mid-frame.
2. **A\* repath bursts:** `world.mapVersion` invalidates all 300 `PathCache` entries simultaneously (`max 7` A\* calls in 1 tick at `4v4`, higher at larger team sizes).
3. **Per-frame rendering & UI overhead:** `drawBloomPass` uses `ctx.filter = 'blur(4px) brightness(1.15)'`; no tick-to-tick render interpolation (`_alpha` unused); `useGameState` clones `projectiles` & `coverHp` at `15 Hz` alongside `20 Hz` `setViewTransform` React commits; `Minimap` redraws `2,400` tiles every HUD update.
