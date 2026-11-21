import type { MapData } from '../../shared/types';
import {
  bakeBuildingCanvas,
  decomposeSlumBuildings,
  hash2,
  type SlumBuilding,
} from './architecture';
import {
  bakeSlumsideBaseFloorLayer,
  bakeSlumsideGroundLayer,
  drawSlumAnimatedWater,
  drawSlumsideAtmosphere,
  drawSlumsideShadowsForRect,
} from './lighting';
import {
  drawSlumAutoRickshaw,
  drawSlumBarrelCluster,
  drawSlumCrate,
  drawSlumHandcart,
  drawSlumMarketStall,
  drawSlumPalmTree,
  drawSlumPropShadow,
} from './props';
import { ChunkedGroundCache } from '../groundCache';
import { perfMonitor } from '../perf';
import { SlumsideTextureAtlas } from './textures';

export { decomposeSlumBuildings } from './architecture';
export type { SlumBuilding } from './architecture';

interface UtilityPole {
  col: number;
  row: number;
  x: number;
  y: number;
}

export class SlumsideRenderer {
  private readonly textures = new SlumsideTextureAtlas();
  private readonly chunkCache = new ChunkedGroundCache<SlumBuilding>();
  private buildings: SlumBuilding[] = [];
  private buildingsByBottomRow = new Map<number, SlumBuilding[]>();
  private poles: UtilityPole[] = [];
  private poleLinks: Array<[UtilityPole, UtilityPole]> = [];
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
        const next = decomposeSlumBuildings(map);
        this.buildingsByBottomRow.clear();
        for (const b of next) {
          bakeBuildingCanvas(b, this.textures, ts);
          const list = this.buildingsByBottomRow.get(b.bottomRow);
          if (list) list.push(b);
          else this.buildingsByBottomRow.set(b.bottomRow, [b]);
        }
        this.buildings = next;
        this.buildUtilityNetwork(map);

        const baseFloor = bakeSlumsideBaseFloorLayer(map, this.textures, this.chunkCache.baseFloorCanvas);
        const ground = bakeSlumsideGroundLayer(map, this.buildings, this.textures, this.groundCacheCanvas, baseFloor);
        this.groundCacheCanvas = ground;
        if (perfMonitor.enabled) {
          perfMonitor.recordSubsystem('ensureCache', performance.now() - rebuildStart, 'slumside');
        }
        return { baseFloor, ground };
      },
      () => {
        const next = decomposeSlumBuildings(map);
        this.chunkCache.reconcileStructures(
          this.buildings,
          next,
          (b) => bakeBuildingCanvas(b, this.textures, ts),
          this.buildingsByBottomRow,
        );
        this.buildings = next;
        this.buildUtilityNetwork(map);
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
        drawSlumsideShadowsForRect(gctx, map, this.buildings, rect, shadowScratch);
        gctx.restore();
      },
    );
  }

  private buildUtilityNetwork(map: MapData): void {
    const ts = map.tileSize;
    const poles: UtilityPole[] = [];
    for (const b of this.buildings) {
      if (b.isBorder || b.w < 2 || b.h < 2) continue;
      if (hash2(b.col, b.row, map.seed + 313) > 0.48) continue;
      const onRight = hash2(b.col + 3, b.row, map.seed + 317) > 0.5;
      const col = onRight ? b.col + b.w : b.col;
      const row = b.row + b.h;
      if (col <= 2 || col >= map.width - 3 || row <= 2 || row >= map.height - 3) continue;
      poles.push({ col, row, x: col * ts, y: row * ts });
    }

    const links: Array<[UtilityPole, UtilityPole]> = [];
    for (let i = 0; i < poles.length; i += 1) {
      let best: UtilityPole | null = null;
      let bestDist = 300;
      for (let j = i + 1; j < poles.length; j += 1) {
        const d = Math.hypot(poles[i].x - poles[j].x, poles[i].y - poles[j].y);
        if (d > 85 && d < bestDist) {
          bestDist = d;
          best = poles[j];
        }
      }
      if (best) links.push([poles[i], best]);
    }
    this.poles = poles;
    this.poleLinks = links;
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

    // Animated water highlights & contact shadows beneath intact lowCover
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const kind = map.tiles[r][c];
        const x = c * ts;
        const y = r * ts;
        if (kind === 'water') {
          drawSlumAnimatedWater(ctx, x, y, ts, time, c, r);
        } else if (kind === 'lowCover') {
          const hp = map.coverHp[`${c},${r}`] ?? 100;
          if (hp > 0) drawSlumPropShadow(ctx, x, y, ts);
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

    // 1. Draw pre-baked 2.5D buildings whose southern footprint ends on this row
    const rowBuildings = this.buildingsByBottomRow.get(row);
    if (rowBuildings) {
      for (const b of rowBuildings) {
        if (!b.canvas) continue;
        if (b.drawX + b.canvas.width < minX - 16 || b.drawX > maxX + 16) continue;
        ctx.drawImage(b.canvas, b.drawX, b.drawY);
      }
    }

    // 2. Draw destructible lowCover props on this row
    if (row < 0 || row >= map.height) return;
    const zoneB = map.zones[1];
    const zoneBTileX = zoneB ? Math.floor(zoneB.center.x / ts) : -100;
    const zoneBTileY = zoneB ? Math.floor(zoneB.center.y / ts) : -100;

    for (let c = minCol; c <= maxCol; c += 1) {
      if (map.tiles[row][c] !== 'lowCover') continue;
      const x = c * ts;
      const y = row * ts;
      const hp = map.coverHp[`${c},${row}`] ?? 100;
      const h = hash2(c, row, map.seed + 53);

      const hasAdjCover =
        map.tiles[row - 1]?.[c] === 'lowCover' ||
        map.tiles[row + 1]?.[c] === 'lowCover' ||
        map.tiles[row]?.[c - 1] === 'lowCover' ||
        map.tiles[row]?.[c + 1] === 'lowCover';

      const nearRickshawSpot = c === zoneBTileX - 4 && row === zoneBTileY + 2;
      const nearStallSpot = c === zoneBTileX + 4 && row === zoneBTileY + 2;

      if (nearRickshawSpot || (!hasAdjCover && h < 0.04)) {
        drawSlumAutoRickshaw(ctx, x, y, ts, hp);
        continue;
      }
      if (nearStallSpot || (!hasAdjCover && h >= 0.04 && h < 0.14)) {
        drawSlumMarketStall(ctx, x, y, ts, hp, map.seed + c + row);
        continue;
      }

      const cx = x + ts * 0.5;
      const cy = y + ts * 0.5;
      let nearZone = false;
      for (const z of map.zones) {
        if (Math.hypot(cx - z.center.x, cy - z.center.y) <= z.radius + 26) {
          nearZone = true;
          break;
        }
      }

      if (!nearZone && h > 0.66) {
        drawSlumBarrelCluster(ctx, x, y, ts, hp, map.seed + c + row);
      } else if (!nearZone && h > 0.5 && !hasAdjCover) {
        drawSlumHandcart(ctx, x, y, ts, hp, map.seed + c + row);
      } else {
        drawSlumCrate(ctx, x, y, ts, hp, nearZone, map.seed + c + row);
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
    const minCol = Math.max(0, Math.floor(minX / ts) - 1);
    const maxCol = Math.min(map.width - 1, Math.ceil(maxX / ts) + 1);
    const minRow = Math.max(1, Math.floor(minY / ts) - 1);
    const maxRow = Math.min(map.height - 2, Math.ceil(maxY / ts) + 1);

    // 1. Swaying overhead clotheslines spanning narrow 2-tile alley gaps
    const clothColors = ['#EF4444', '#3B82F6', '#FACC15', '#F8FAFC', '#10B981', '#FB923C'];
    for (let r = minRow; r <= maxRow; r += 1) {
      const endC = Math.min(map.width - 4, maxCol);
      for (let c = minCol; c <= endC; c += 1) {
        if (
          map.tiles[r][c] === 'wall' &&
          map.tiles[r][c + 1] === 'floor' &&
          map.tiles[r][c + 2] === 'floor' &&
          map.tiles[r][c + 3] === 'wall' &&
          hash2(c, r, map.seed + 77) < 0.3
        ) {
          const x1 = (c + 1) * ts;
          const x2 = (c + 3) * ts;
          const y = r * ts + 14;

          // Subtle ground shadow of clothesline
          ctx.strokeStyle = 'rgba(10, 9, 12, 0.18)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x1 + 8, y + 18);
          ctx.quadraticCurveTo((x1 + x2) * 0.5 + 8, y + 23, x2 + 8, y + 18);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(20, 18, 16, 0.78)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.quadraticCurveTo((x1 + x2) * 0.5, y + 5, x2, y);
          ctx.stroke();

          for (let g = 0; g < 5; g += 1) {
            const t = (g + 0.8) / 5.6;
            const gx = x1 + (x2 - x1) * t;
            const sway = Math.sin(time * 2.5 + c + g * 1.1) * 1.4;
            const sag = 4 * t * (1 - t) * 5;
            ctx.fillStyle = clothColors[(c + r + g) % clothColors.length];
            ctx.fillRect(gx - 2.5 + sway, y + sag, 5, 6.5);
          }
        }
      }
    }

    // 2. Sagging overhead electrical wires & utility poles
    ctx.save();
    for (const [a, b] of this.poleLinks) {
      const lx = Math.min(a.x, b.x);
      const rx = Math.max(a.x, b.x);
      const ty = Math.min(a.y, b.y);
      const by = Math.max(a.y, b.y);
      if (rx < minX - 24 || lx > maxX + 24 || by < minY - 24 || ty > maxY + 24) continue;

      const ay = a.y - 26;
      const byTop = b.y - 26;
      const midX = (a.x + b.x) * 0.5;
      const midY = (ay + byTop) * 0.5 + 14;

      for (const offset of [-3, 3]) {
        ctx.strokeStyle = 'rgba(12, 13, 16, 0.62)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x + offset, ay);
        ctx.quadraticCurveTo(midX + offset, midY, b.x + offset, byTop);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(a.x + offset, ay - 0.5);
        ctx.quadraticCurveTo(midX + offset, midY - 0.5, b.x + offset, byTop - 0.5);
        ctx.stroke();
      }
    }

    for (const pole of this.poles) {
      if (pole.x < minX - 24 || pole.x > maxX + 24 || pole.y < minY - 36 || pole.y > maxY + 24) {
        continue;
      }
      // Concrete pole shaft rising up from corner
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pole.x, pole.y);
      ctx.lineTo(pole.x, pole.y - 26);
      ctx.stroke();

      // Crossarm & ceramic insulators
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pole.x - 6, pole.y - 26);
      ctx.lineTo(pole.x + 6, pole.y - 26);
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(pole.x - 5, pole.y - 27.5, 2.5, 2.5);
      ctx.fillRect(pole.x + 2.5, pole.y - 27.5, 2.5, 2.5);
    }
    ctx.restore();

    // 3. Lush overhanging palm trees along outer perimeter edges
    for (let r = Math.max(0, minRow - 1); r <= Math.min(map.height - 1, maxRow + 1); r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const isBorder = r === 0 || c === 0 || r === map.height - 1 || c === map.width - 1;
        if (!isBorder || map.tiles[r][c] !== 'wall') continue;
        const h = hash2(c, r, map.seed + 503);
        if (h < 0.14) {
          drawSlumPalmTree(ctx, c * ts + 16, r * ts + 8, 17 + h * 40, c * 7 + r, true);
        }
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
    drawSlumsideAtmosphere(ctx, width, height, time, reducedMotion);
  }
}
