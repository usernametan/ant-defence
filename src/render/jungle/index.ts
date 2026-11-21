import type { MapData } from '../../shared/types';
import {
  bakeJungleGroundLayer,
  drawJungleAnimatedWater,
  drawJungleAtmosphere,
} from './lighting';
import {
  bakeRuinCanvas,
  decomposeJungleRuins,
  hash2,
  type JungleRuin,
} from './ruins';
import { JungleTextureAtlas } from './textures';
import {
  drawAncientTempleStatue,
  drawCollapsedPillarDrum,
  drawJungleCanopyTree,
  drawJunglePropShadow,
  drawJungleSupplyCrate,
  drawMossyStoneBarricade,
  drawOvergrownUrnCluster,
  drawTropicalBush,
} from './vegetation';

export { decomposeJungleRuins } from './ruins';
export type { JungleRuin } from './ruins';

export class JungleRenderer {
  private readonly textures = new JungleTextureAtlas();
  private ruins: JungleRuin[] = [];
  private ruinsByBottomRow = new Map<number, JungleRuin[]>();
  private groundCacheCanvas: HTMLCanvasElement | null = null;
  private cacheKey = '';

  private ensureCache(map: MapData): void {
    this.textures.ensureLoading();
    const key = `${map.seed}:${map.width}x${map.height}:${map.tileSize}:w${map.wallRevision ?? 0}:t${this.textures.getRevision()}`;
    if (this.cacheKey === key && this.groundCacheCanvas) return;

    const ts = map.tileSize;
    this.ruins = decomposeJungleRuins(map);
    this.ruinsByBottomRow.clear();

    for (const ruin of this.ruins) {
      bakeRuinCanvas(ruin, this.textures, ts);
      const list = this.ruinsByBottomRow.get(ruin.bottomRow);
      if (list) list.push(ruin);
      else this.ruinsByBottomRow.set(ruin.bottomRow, [ruin]);
    }

    this.groundCacheCanvas = bakeJungleGroundLayer(
      map,
      this.ruins,
      this.textures,
      this.groundCacheCanvas,
    );
    this.cacheKey = key;
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
          drawJungleAnimatedWater(ctx, x, y, ts, time, c, r);
        } else if (kind === 'lowCover') {
          const hp = map.coverHp[`${c},${r}`] ?? 100;
          if (hp > 0) drawJunglePropShadow(ctx, x, y, ts);
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

    // 1. Pre-baked 2.5D ancient temple sanctums, ruined walls, and fluted pillars ending on this row
    const rowRuins = this.ruinsByBottomRow.get(row);
    if (rowRuins) {
      for (const ruin of rowRuins) {
        if (!ruin.canvas) continue;
        if (ruin.drawX + ruin.canvas.width < minX - 16 || ruin.drawX > maxX + 16) continue;
        ctx.drawImage(ruin.canvas, ruin.drawX, ruin.drawY);
      }
    }

    // 2. Varied 2.5D temple statues, collapsed pillar drums, stone walls, urns & expedition crates
    if (row < 0 || row >= map.height) return;
    for (let c = minCol; c <= maxCol; c += 1) {
      if (map.tiles[row][c] !== 'lowCover') continue;
      const x = c * ts;
      const y = row * ts;
      const hp = map.coverHp[`${c},${row}`] ?? 100;
      const h = hash2(c, row, map.seed + 83);
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

      if (nearZone && h < 0.24) {
        drawAncientTempleStatue(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (!nearZone && wallAdj && h < 0.2) {
        drawOvergrownUrnCluster(ctx, x, y, ts, hp, seed, this.textures);
      } else if (h < 0.26) {
        drawAncientTempleStatue(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (h < 0.48) {
        drawCollapsedPillarDrum(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (h < 0.74) {
        drawMossyStoneBarricade(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else {
        drawJungleSupplyCrate(ctx, x, y, ts, hp, nearZone, seed, this.textures);
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

    // 1. Swaying overhead hanging jungle vine garlands across narrow 2-tile temple passages
    for (let r = Math.max(1, minRow); r <= Math.min(map.height - 2, maxRow); r += 1) {
      const endC = Math.min(map.width - 4, maxCol);
      for (let c = minCol; c <= endC; c += 1) {
        if (
          map.tiles[r][c] === 'wall' &&
          map.tiles[r][c + 1] === 'floor' &&
          map.tiles[r][c + 2] === 'floor' &&
          map.tiles[r][c + 3] === 'wall' &&
          hash2(c, r, map.seed + 193) < 0.36
        ) {
          const x1 = (c + 1) * ts;
          const x2 = (c + 3) * ts;
          const y = r * ts + 14;
          const sway = Math.sin(time * 1.8 + c + r) * 1.5;

          ctx.strokeStyle = 'rgba(8, 14, 10, 0.2)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1 + 8, y + 18);
          ctx.quadraticCurveTo((x1 + x2) * 0.5 + 8, y + 24 + sway, x2 + 8, y + 18);
          ctx.stroke();

          ctx.strokeStyle = '#255B2D';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.quadraticCurveTo((x1 + x2) * 0.5, y + 6 + sway, x2, y);
          ctx.stroke();

          for (let l = 0; l < 5; l += 1) {
            const t = (l + 0.7) / 5.4;
            const lx = x1 + (x2 - x1) * t;
            const sag = 4 * t * (1 - t) * (6 + sway);
            ctx.fillStyle = l % 2 === 0 ? '#3E8242' : '#589E4A';
            ctx.beginPath();
            ctx.ellipse(lx, y + sag + 2, 2.5, 4, (l - 2) * 0.25, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 2. Dense enveloping multi-species tropical rainforest canopy & perimeter undergrowth
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const isBorder = r === 0 || c === 0 || r === map.height - 1 || c === map.width - 1;
        if (!isBorder || map.tiles[r][c] !== 'wall') continue;

        const h = hash2(c, r, map.seed + 607);
        const h2 = hash2(r, c, map.seed + 613);
        const outX = c === 0 ? -6 : c === map.width - 1 ? 6 : 0;
        const outY = r === 0 ? -6 : r === map.height - 1 ? 4 : 0;
        const cx = c * ts + 16 + outX + (h - 0.5) * 14;
        const cy = r * ts + 16 + outY + (h2 - 0.5) * 14;

        if (h < 0.46) {
          drawJungleCanopyTree(
            ctx,
            cx,
            cy,
            30 + (h / 0.46) * 24,
            c * 11 + r * 7,
            true,
            this.textures,
          );
        } else {
          drawTropicalBush(
            ctx,
            cx,
            cy,
            18 + ((h - 0.46) / 0.54) * 14,
            c * 13 + r,
            this.textures,
          );
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
    drawJungleAtmosphere(ctx, width, height, time, reducedMotion);
  }
}
