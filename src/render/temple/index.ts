import type { MapData } from '../../shared/types';
import {
  bakeTempleStructureCanvas,
  decomposeTempleStructures,
  hash2,
  type TempleStructure,
} from './architecture';
import {
  bakeTempleGroundLayer,
  drawTempleAnimatedWater,
  drawTempleAtmosphere,
} from './lighting';
import {
  drawBrokenEgyptianColumnCover,
  drawDatePalmTree,
  drawDesertScrub,
  drawEgyptianBrazier,
  drawEgyptianPotteryAndCrateCover,
  drawEgyptianStoneBarricade,
  drawPharaohStatueCover,
  drawSarcophagusCover,
  drawSphinxStatueCover,
  drawTemplePropShadow,
} from './props';
import { TempleTextureAtlas } from './textures';

export { decomposeTempleStructures } from './architecture';
export type { TempleStructure } from './architecture';

export class TempleRenderer {
  private readonly textures = new TempleTextureAtlas();
  private structures: TempleStructure[] = [];
  private byBottomRow = new Map<number, TempleStructure[]>();
  private groundCacheCanvas: HTMLCanvasElement | null = null;
  private cacheKey = '';

  private ensureCache(map: MapData): void {
    this.textures.ensureLoading();
    const key = `${map.seed}:${map.width}x${map.height}:${map.tileSize}:w${map.wallRevision ?? 0}:t${this.textures.getRevision()}`;
    if (this.cacheKey === key && this.groundCacheCanvas) return;

    const ts = map.tileSize;
    this.structures = decomposeTempleStructures(map);
    this.byBottomRow.clear();

    for (const s of this.structures) {
      bakeTempleStructureCanvas(s, this.textures, ts);
      const list = this.byBottomRow.get(s.bottomRow);
      if (list) list.push(s);
      else this.byBottomRow.set(s.bottomRow, [s]);
    }

    this.groundCacheCanvas = bakeTempleGroundLayer(
      map,
      this.structures,
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
          drawTempleAnimatedWater(ctx, x, y, ts, time, c, r);
        } else if (kind === 'lowCover') {
          const hp = map.coverHp[`${c},${r}`] ?? 100;
          if (hp > 0) drawTemplePropShadow(ctx, x, y, ts);
        }
      }
    }

    // Animated sacred temple braziers around Central Courtyard (Zone B) & outer sanctuaries
    const [, zB] = map.zones;
    if (zB) {
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
        const bx = zB.center.x + Math.cos(a) * 144;
        const by = zB.center.y + Math.sin(a) * 144;
        const tc = Math.floor(bx / ts);
        const tr = Math.floor(by / ts);
        if (
          bx >= minX - 40 &&
          bx <= maxX + 40 &&
          by >= minY - 40 &&
          by <= maxY + 40 &&
          map.tiles[tr]?.[tc] === 'floor'
        ) {
          drawEgyptianBrazier(ctx, bx, by, time, this.textures);
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

    // 1. Pre-baked 2.5D Egyptian pylons, hieroglyphic walls & papyrus columns ending on this row
    const rowStructures = this.byBottomRow.get(row);
    if (rowStructures) {
      for (const s of rowStructures) {
        if (!s.canvas) continue;
        if (s.drawX + s.canvas.width < minX - 16 || s.drawX > maxX + 16) continue;
        ctx.drawImage(s.canvas, s.drawX, s.drawY);
      }
    }

    // 2. Varied 2.5D Egyptian cover props on lowCover tiles
    if (row < 0 || row >= map.height) return;
    for (let c = minCol; c <= maxCol; c += 1) {
      if (map.tiles[row][c] !== 'lowCover') continue;
      const x = c * ts;
      const y = row * ts;
      const hp = map.coverHp[`${c},${row}`] ?? 100;
      const h = hash2(c, row, map.seed + 97);
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

      if (nearZone && h < 0.28) {
        drawPharaohStatueCover(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (nearZone && h < 0.48) {
        drawSphinxStatueCover(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (h < 0.2) {
        drawPharaohStatueCover(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (h < 0.36) {
        drawSphinxStatueCover(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (h < 0.54) {
        drawSarcophagusCover(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (h < 0.72) {
        drawBrokenEgyptianColumnCover(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else if (h < 0.88) {
        drawEgyptianStoneBarricade(ctx, x, y, ts, hp, nearZone, seed, this.textures);
      } else {
        drawEgyptianPotteryAndCrateCover(ctx, x, y, ts, hp, nearZone, seed);
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

    // 1. Overhead Blue-and-Gold Egyptian Festival Banners draped across narrow sandstone alleys
    for (let r = Math.max(1, minRow); r <= Math.min(map.height - 2, maxRow); r += 1) {
      const endC = Math.min(map.width - 4, maxCol);
      for (let c = minCol; c <= endC; c += 1) {
        if (
          map.tiles[r][c] === 'wall' &&
          map.tiles[r][c + 1] === 'floor' &&
          map.tiles[r][c + 2] === 'floor' &&
          map.tiles[r][c + 3] === 'wall' &&
          hash2(c, r, map.seed + 241) < 0.42
        ) {
          const x1 = (c + 1) * ts;
          const x2 = (c + 3) * ts;
          const y = r * ts + 14;
          const sway = Math.sin(time * 2.1 + c + r) * 1.6;

          ctx.strokeStyle = 'rgba(26, 16, 6, 0.25)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1 + 10, y + 18);
          ctx.lineTo(x2 + 10, y + 18);
          ctx.stroke();

          // Crossbar rope & suspended lapis-blue / gold pennants
          ctx.strokeStyle = '#B8893A';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.quadraticCurveTo((x1 + x2) * 0.5, y + 5 + sway * 0.5, x2, y);
          ctx.stroke();

          for (let i = 0; i < 4; i += 1) {
            const t = (i + 0.65) / 4.3;
            const px = x1 + (x2 - x1) * t;
            const py = y + 4 * t * (1 - t) * (5 + sway * 0.5);
            ctx.fillStyle = i % 2 === 0 ? '#1D4ED8' : '#D97706';
            ctx.beginPath();
            ctx.moveTo(px - 4.5, py);
            ctx.lineTo(px + 4.5, py);
            ctx.lineTo(px + sway * 0.4, py + 11);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    }

    // 2. Date Palm Trees & Desert Scrub framing enclosure perimeter & oasis corners
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const isBorder = r === 0 || c === 0 || r === map.height - 1 || c === map.width - 1;
        if (!isBorder || map.tiles[r][c] !== 'wall') continue;

        const h = hash2(c, r, map.seed + 719);
        const h2 = hash2(r, c, map.seed + 727);
        const outX = c === 0 ? -5 : c === map.width - 1 ? 5 : 0;
        const outY = r === 0 ? -5 : r === map.height - 1 ? 4 : 0;
        const cx = c * ts + 16 + outX + (h - 0.5) * 10;
        const cy = r * ts + 16 + outY + (h2 - 0.5) * 10;

        if (h < 0.24) {
          drawDatePalmTree(ctx, cx, cy, 28 + (h / 0.24) * 16, c * 11 + r * 7, true, this.textures);
        } else if (h > 0.72) {
          drawDesertScrub(ctx, cx, cy, 14 + (h - 0.72) * 18, c * 13 + r, this.textures);
        }
      }
    }

    // Flanking Date Palms standing atop oasis sanctuary corners (non-walkable wall corners near oasis)
    const oasisPalms: Array<[number, number]> = [
      [9, 5],
      [map.width - 10, 5],
      [9, map.height - 6],
      [map.width - 10, map.height - 6],
    ];
    for (const [pc, pr] of oasisPalms) {
      if (pc < minCol - 1 || pc > maxCol + 1 || pr < minRow - 1 || pr > maxRow + 1) continue;
      if (map.tiles[pr]?.[pc] === 'wall') {
        drawDatePalmTree(
          ctx,
          pc * ts + 16,
          pr * ts + 8,
          26,
          map.seed + pc * 17 + pr,
          true,
          this.textures,
        );
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
    drawTempleAtmosphere(ctx, width, height, time, reducedMotion);
  }
}
