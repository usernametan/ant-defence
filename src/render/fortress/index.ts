import type { MapData } from '../../shared/types';
import {
  bakeFortressStructureCanvas,
  decomposeFortressStructures,
  hash2,
  type FortressStructure,
} from './architecture';
import {
  bakeFortressGroundLayer,
  drawFortressAnimatedWater,
  drawFortressAtmosphere,
  drawFortressShadowsForRect,
} from './lighting';
import {
  drawSciFiAtlasCell,
  drawSciFiCapacitorCase,
  drawSciFiPropShadow,
  drawSciFiYellowTechCrate,
} from './props';
import { ChunkedGroundCache } from '../groundCache';
import { perfMonitor } from '../perf';
import { FortressTextureAtlas } from './textures';

export { decomposeFortressStructures } from './architecture';
export type { FortressStructure } from './architecture';

export class FortressRenderer {
  private readonly textures = new FortressTextureAtlas();
  private readonly chunkCache = new ChunkedGroundCache<FortressStructure>();
  private structures: FortressStructure[] = [];
  private byBottomRow = new Map<number, FortressStructure[]>();
  private groundCacheCanvas: HTMLCanvasElement | null = null;

  markDirtyTile(tileKeyStr: string, mapWidth: number): void {
    this.chunkCache.markDirtyTileKey(tileKeyStr, mapWidth);
  }

  getCacheStats() {
    return {
      fullRebuilds: this.chunkCache.fullRebuilds,
      chunkRebuilds: this.chunkCache.chunkRebuilds,
      structuresBaked: this.chunkCache.structuresBaked,
      structuresReused: this.chunkCache.structuresReused,
      pendingChunks: this.chunkCache.pendingChunkCount(),
    };
  }

  ensureCache(map: MapData): void {
    this.textures.ensureLoading();
    const ts = map.tileSize;
    this.chunkCache.sync(
      map,
      this.textures.getRevision(),
      () => {
        const rebuildStart = perfMonitor.enabled ? performance.now() : 0;
        const next = decomposeFortressStructures(map);
        this.byBottomRow.clear();
        for (const s of next) {
          bakeFortressStructureCanvas(s, this.textures, ts);
          const list = this.byBottomRow.get(s.bottomRow);
          if (list) list.push(s);
          else this.byBottomRow.set(s.bottomRow, [s]);
        }
        this.structures = next;

        const baseFloor = bakeFortressGroundLayer(
          map,
          this.structures,
          this.textures,
          this.chunkCache.baseFloorCanvas,
          true,
        );
        const ground = this.groundCacheCanvas ?? (typeof document !== 'undefined' ? document.createElement('canvas') : null);
        if (ground && baseFloor) {
          ground.width = baseFloor.width;
          ground.height = baseFloor.height;
          const gctx = ground.getContext('2d');
          if (gctx) {
            gctx.clearRect(0, 0, ground.width, ground.height);
            gctx.drawImage(baseFloor, 0, 0);
            drawFortressShadowsForRect(gctx, map, this.structures);
          }
        }
        this.groundCacheCanvas = ground;
        if (perfMonitor.enabled) {
          perfMonitor.recordSubsystem('ensureCache', performance.now() - rebuildStart, 'fortress');
        }
        return { baseFloor, ground };
      },
      () => {
        const next = decomposeFortressStructures(map);
        this.chunkCache.reconcileStructures(
          this.structures,
          next,
          (s) => bakeFortressStructureCanvas(s, this.textures, ts),
          this.byBottomRow,
        );
        this.structures = next;
      },
      (rect, groundCanvas, baseFloorCanvas, shadowScratch) => {
        if (!groundCanvas || !baseFloorCanvas) return;
        const gctx = groundCanvas.getContext('2d');
        if (!gctx) return;
        gctx.save();
        gctx.beginPath();
        gctx.rect(rect.x, rect.y, rect.w, rect.h);
        gctx.clip();
        gctx.drawImage(baseFloorCanvas, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
        drawFortressShadowsForRect(gctx, map, this.structures, rect, shadowScratch);
        gctx.restore();
      },
    );
  }

  drawGround(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    time: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): void {
    this.ensureCache(map);

    const ts = map.tileSize;
    const minCol = Math.max(0, Math.floor(minX / ts) - 1);
    const maxCol = Math.min(map.width - 1, Math.ceil(maxX / ts) + 1);
    const minRow = Math.max(0, Math.floor(minY / ts) - 1);
    const maxRow = Math.min(map.height - 1, Math.ceil(maxY / ts) + 1);

    if (this.groundCacheCanvas) {
      const sx = minCol * ts;
      const sy = minRow * ts;
      const sw = (maxCol - minCol + 1) * ts;
      const sh = (maxRow - minRow + 1) * ts;
      if (sw > 0 && sh > 0) {
        ctx.drawImage(this.groundCacheCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
      }
    }

    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const kind = map.tiles[r][c];
        const x = c * ts;
        const y = r * ts;
        if (kind === 'water') {
          drawFortressAnimatedWater(ctx, x, y, ts, time, c, r);
        } else if (kind === 'lowCover') {
          const hp = map.coverHp[`${c},${r}`] ?? 100;
          if (hp > 0) drawSciFiPropShadow(ctx, x, y, ts);
        }
      }
    }
  }

  drawRow(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    row: number,
    minCol: number,
    maxCol: number,
    minX: number,
    maxX: number,
  ): void {
    const ts = map.tileSize;

    // 1. Pre-baked 2.5D reactors, glass lab bays, superstructures & armored pillars ending on this row
    const rowStructures = this.byBottomRow.get(row);
    if (rowStructures) {
      for (const s of rowStructures) {
        if (!s.canvas) continue;
        if (s.drawX + s.canvas.width < minX - 16 || s.drawX > maxX + 16) continue;
        ctx.drawImage(s.canvas, s.drawX, s.drawY);
      }
    }

    // 2. High-visibility 2.5D yellow tech crates & research capacitor cover units
    if (row < 0 || row >= map.height) return;
    for (let c = minCol; c <= maxCol; c += 1) {
      if (map.tiles[row][c] !== 'lowCover') continue;
      const x = c * ts;
      const y = row * ts;
      const hp = map.coverHp[`${c},${row}`] ?? 100;
      const h = hash2(c, row, map.seed + 107);
      const seed = map.seed + c * 31 + row * 17;

      const cx = x + ts * 0.5;
      const cy = y + ts * 0.5;
      let nearZone = false;
      for (const z of map.zones) {
        if (Math.hypot(cx - z.center.x, cy - z.center.y) <= z.radius + 26) {
          nearZone = true;
          break;
        }
      }

      const wallAdj =
        map.tiles[row - 1]?.[c] === 'wall' ||
        map.tiles[row + 1]?.[c] === 'wall' ||
        map.tiles[row]?.[c - 1] === 'wall' ||
        map.tiles[row]?.[c + 1] === 'wall';

      if (wallAdj && !nearZone && h < 0.46) {
        drawSciFiCapacitorCase(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else {
        drawSciFiYellowTechCrate(ctx, x, y, ts, hp, nearZone, seed);
      }
    }
  }

  drawOverheadLayer(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    time: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): void {
    const ts = map.tileSize;
    const minCol = Math.max(0, Math.floor(minX / ts) - 2);
    const maxCol = Math.min(map.width - 1, Math.ceil(maxX / ts) + 2);
    const minRow = Math.max(0, Math.floor(minY / ts) - 2);
    const maxRow = Math.min(map.height - 1, Math.ceil(maxY / ts) + 2);

    // 1. Overhead glowing plasma/cable gantries bridging narrow 2-tile corridors
    for (let r = Math.max(1, minRow); r <= Math.min(map.height - 2, maxRow); r += 1) {
      const endC = Math.min(map.width - 4, maxCol);
      for (let c = minCol; c <= endC; c += 1) {
        if (
          map.tiles[r][c] === 'wall' &&
          map.tiles[r][c + 1] === 'floor' &&
          map.tiles[r][c + 2] === 'floor' &&
          map.tiles[r][c + 3] === 'wall' &&
          hash2(c, r, map.seed + 281) < 0.4
        ) {
          const x1 = (c + 1) * ts;
          const x2 = (c + 3) * ts;
          const y = r * ts + 14;
          const pulse = 0.55 + 0.25 * Math.sin(time * 3 + c + r);

          ctx.fillStyle = 'rgba(4, 8, 18, 0.28)';
          ctx.fillRect(x1, y + 14, x2 - x1, 6);

          ctx.fillStyle = '#334155';
          ctx.fillRect(x1, y - 3, x2 - x1, 7);
          ctx.strokeStyle = '#070B14';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x1, y - 3, x2 - x1, 7);

          ctx.fillStyle = `rgba(34, 211, 238, ${pulse.toFixed(2)})`;
          ctx.fillRect(x1 + 4, y - 0.5, x2 - x1 - 8, 2);
        }
      }
    }

    // 2. Perimeter bulkhead HVAC turbines, cryo manifolds & sensor pylons on border wall ring
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const isBorder = r === 0 || c === 0 || r === map.height - 1 || c === map.width - 1;
        if (!isBorder || map.tiles[r][c] !== 'wall') continue;

        const h = hash2(c, r, map.seed + 659);
        if (h > 0.22) continue;

        const cx = c * ts + 16;
        const cy = r * ts + 16;
        const cell = h < 0.08 ? { col: 0, row: 1 } : h < 0.16 ? { col: 2, row: 1 } : { col: 3, row: 1 };
        drawSciFiAtlasCell(ctx, cell.col, cell.row, cx, cy, 30, 30, 0, this.textures);
      }
    }
  }

  drawAtmosphere(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    reducedMotion: boolean,
  ): void {
    drawFortressAtmosphere(ctx, width, height, time, reducedMotion);
  }
}
