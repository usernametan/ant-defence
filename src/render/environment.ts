import type { GameState, MapData, MapTheme, Pickup } from '../shared/types';
import {
  PALETTE,
  getThemePalette,
  rarityColor,
  teamColor,
  teamGlowColor,
  type ThemePalette,
} from './palette';

export const WALL_HEIGHT = 20;

export function formatZoneCode(zoneId: string): string {
  const lower = zoneId.toLowerCase();
  if (lower === 'zone-1' || lower === 'a') return 'A';
  if (lower === 'zone-2' || lower === 'b') return 'B';
  if (lower === 'zone-3' || lower === 'c') return 'C';
  return zoneId.replace(/^zone-/i, 'Z');
}

function tileHash(c: number, r: number, seed: number): number {
  let h = (c * 374761393 + r * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function nearAnyZone(map: MapData, cx: number, cy: number, pad = 20): boolean {
  for (const z of map.zones) {
    if (Math.hypot(cx - z.center.x, cy - z.center.y) < z.radius + pad) return true;
  }
  for (const b of map.bases) {
    if (Math.hypot(cx - b.center.x, cy - b.center.y) < b.radius + 16) return true;
  }
  return false;
}

export class EnvironmentRenderer {
  private floorPatterns = new Map<MapTheme, CanvasPattern>();
  private groundCacheCanvas: HTMLCanvasElement | null = null;
  private groundCacheKey = '';

  private ensureFloorPattern(
    ctx: CanvasRenderingContext2D,
    theme: MapTheme,
    tp: ThemePalette,
  ): CanvasPattern | null {
    const existing = this.floorPatterns.get(theme);
    if (existing) return existing;
    if (typeof document === 'undefined') return null;

    const tile = document.createElement('canvas');
    tile.width = 128;
    tile.height = 128;
    const tctx = tile.getContext('2d');
    if (!tctx) return null;

    tctx.fillStyle = tp.floorBase;
    tctx.fillRect(0, 0, 128, 128);

    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const x = c * 32;
        const y = r * 32;
        if ((r + c) % 2 === 0) {
          tctx.fillStyle = tp.floorAlt;
          tctx.fillRect(x, y, 32, 32);
        }

        tctx.fillStyle =
          theme === 'temple' ? 'rgba(255, 240, 200, 0.08)' : 'rgba(234, 242, 255, 0.025)';
        tctx.fillRect(x + 1, y + 1, 30, 1);
        tctx.fillRect(x + 1, y + 1, 1, 30);

        tctx.strokeStyle = tp.floorSeam;
        tctx.lineWidth = 1;
        tctx.strokeRect(x + 0.5, y + 0.5, 31, 31);

        if (theme === 'fortress' && (r + c) % 2 === 1) {
          tctx.fillStyle = 'rgba(159, 176, 207, 0.09)';
          tctx.fillRect(x + 4, y + 4, 2, 2);
          tctx.fillRect(x + 26, y + 26, 2, 2);
        } else if (theme === 'temple') {
          if ((r * 3 + c) % 4 === 0) {
            tctx.strokeStyle = 'rgba(72, 56, 36, 0.34)';
            tctx.beginPath();
            tctx.moveTo(x + 6, y + 14);
            tctx.lineTo(x + 15, y + 17);
            tctx.lineTo(x + 21, y + 24);
            tctx.stroke();
          }
          if ((r + c) % 3 === 0) {
            tctx.strokeStyle = 'rgba(223, 199, 157, 0.09)';
            tctx.strokeRect(x + 5, y + 5, 22, 22);
          }
        } else if (theme === 'jungle') {
          if ((r + c * 2) % 3 === 0) {
            tctx.fillStyle = 'rgba(54, 130, 71, 0.14)';
            tctx.fillRect(x + 3, y + 2, 9, 4);
            tctx.fillRect(x + 20, y + 24, 7, 5);
          }
        }
      }
    }

    tctx.fillStyle =
      theme === 'temple' ? 'rgba(65, 50, 32, 0.1)' : 'rgba(234, 242, 255, 0.03)';
    for (let i = 0; i < 48; i += 1) {
      tctx.fillRect((i * 23 + 7) % 128, (i * 37 + 11) % 128, 2, 1);
    }

    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) this.floorPatterns.set(theme, pattern);
    return pattern;
  }

  private ensureStaticGroundCache(map: MapData): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const theme: MapTheme = map.theme ?? 'fortress';
    const key = `${map.seed}:${theme}:${map.width}x${map.height}:${map.tileSize}`;
    if (this.groundCacheCanvas && this.groundCacheKey === key) {
      return this.groundCacheCanvas;
    }

    const worldW = map.width * map.tileSize;
    const worldH = map.height * map.tileSize;
    const canvas = this.groundCacheCanvas ?? document.createElement('canvas');
    canvas.width = worldW;
    canvas.height = worldH;
    const gctx = canvas.getContext('2d');
    if (!gctx) return null;

    const tp = getThemePalette(theme);
    const ts = map.tileSize;
    const pattern = this.ensureFloorPattern(gctx, theme, tp);
    gctx.fillStyle = pattern ?? tp.floorBase;
    gctx.fillRect(0, 0, worldW, worldH);

    this.drawFloorDetails(gctx, map, theme, 0, map.width - 1, 0, map.height - 1);

    // Static water basins, shoreline rims, jungle river bridges, and spawn pads
    for (let r = 0; r < map.height; r += 1) {
      for (let c = 0; c < map.width; c += 1) {
        const kind = map.tiles[r][c];
        const x = c * ts;
        const y = r * ts;

        if (kind === 'water') {
          gctx.fillStyle = tp.waterRim;
          gctx.fillRect(x, y, ts, ts);

          const padT = map.tiles[r - 1]?.[c] === 'water' ? 0 : 4;
          const padB = map.tiles[r + 1]?.[c] === 'water' ? 0 : 2;
          const padL = map.tiles[r]?.[c - 1] === 'water' ? 0 : 4;
          const padR = map.tiles[r]?.[c + 1] === 'water' ? 0 : 2;

          gctx.fillStyle = tp.waterDeep;
          gctx.fillRect(x + padL, y + padT, ts - padL - padR, ts - padT - padB);

          if (theme === 'jungle' && padT > 0 && tileHash(c, r, map.seed + 5) < 0.45) {
            gctx.fillStyle = '#5B6756';
            gctx.beginPath();
            gctx.arc(x + 10, y + 2, 2.5, 0, Math.PI * 2);
            gctx.arc(x + 21, y + 3, 2, 0, Math.PI * 2);
            gctx.fill();
          }
        } else if (kind === 'floor' && theme === 'jungle') {
          // Wooden plank bridges where corridors cross the jungle river
          const wUp = map.tiles[r - 1]?.[c] === 'water';
          const wDown = map.tiles[r + 1]?.[c] === 'water';
          const wLeft = map.tiles[r]?.[c - 1] === 'water';
          const wRight = map.tiles[r]?.[c + 1] === 'water';
          if ((wUp || wDown) && (wLeft || wRight || (wUp && wDown))) {
            this.drawWoodenBridge(gctx, x, y, ts, wLeft || wRight);
          } else if (wUp && wDown) {
            this.drawWoodenBridge(gctx, x, y, ts, false);
          } else if (wLeft && wRight) {
            this.drawWoodenBridge(gctx, x, y, ts, true);
          }
        } else if (kind === 'spawnPlayer' || kind === 'spawnEnemy') {
          gctx.fillStyle =
            kind === 'spawnPlayer'
              ? 'rgba(34, 211, 238, 0.14)'
              : 'rgba(255, 90, 60, 0.14)';
          gctx.fillRect(x, y, ts, ts);
          gctx.strokeStyle =
            kind === 'spawnPlayer'
              ? 'rgba(34, 211, 238, 0.28)'
              : 'rgba(255, 90, 60, 0.28)';
          gctx.lineWidth = 1;
          gctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
        }
      }
    }

    // Static cast drop shadows for walls
    gctx.fillStyle = 'rgba(7, 11, 20, 0.46)';
    for (let r = 0; r < map.height; r += 1) {
      for (let c = 0; c < map.width; c += 1) {
        if (map.tiles[r][c] === 'wall') {
          gctx.fillRect(c * ts + 8, r * ts + 6, ts, ts);
        }
      }
    }

    this.groundCacheCanvas = canvas;
    this.groundCacheKey = key;
    return canvas;
  }

  private drawWoodenBridge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    ts: number,
    horizontal: boolean,
  ): void {
    ctx.fillStyle = '#3C2714';
    ctx.fillRect(x, y, ts, ts);

    ctx.fillStyle = '#7C542B';
    ctx.strokeStyle = '#191008';
    ctx.lineWidth = 1;

    if (horizontal) {
      for (let px = 1; px < ts - 2; px += 6) {
        ctx.fillRect(x + px, y + 2, 5, ts - 4);
        ctx.strokeRect(x + px, y + 2, 5, ts - 4);
      }
      ctx.fillStyle = '#53371B';
      ctx.fillRect(x, y + 1, ts, 3);
      ctx.fillRect(x, y + ts - 4, ts, 3);
    } else {
      for (let py = 1; py < ts - 2; py += 6) {
        ctx.fillRect(x + 2, y + py, ts - 4, 5);
        ctx.strokeRect(x + 2, y + py, ts - 4, 5);
      }
      ctx.fillStyle = '#53371B';
      ctx.fillRect(x + 1, y, 3, ts);
      ctx.fillRect(x + ts - 4, y, 3, ts);
    }
  }

  /** Convenience helper drawing ground + 2.5D walls/cover without interleaved entities. */
  drawMap(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    time: number,
    viewMinX: number,
    viewMinY: number,
    viewMaxX: number,
    viewMaxY: number,
  ): void {
    this.drawGroundAndShadows(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
    this.drawDepthSortedStructures(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
  }

  /** Pass 1: Blit cached static ground + animated water shimmer + dynamic lowCover shadows. */
  drawGroundAndShadows(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    time: number,
    viewMinX: number,
    viewMinY: number,
    viewMaxX: number,
    viewMaxY: number,
  ): void {
    const theme: MapTheme = map.theme ?? 'fortress';
    const tp = getThemePalette(theme);
    const ts = map.tileSize;
    const minCol = Math.max(0, Math.floor(viewMinX / ts) - 1);
    const maxCol = Math.min(map.width - 1, Math.ceil(viewMaxX / ts) + 1);
    const minRow = Math.max(0, Math.floor(viewMinY / ts) - 1);
    const maxRow = Math.min(map.height - 1, Math.ceil(viewMaxY / ts) + 1);

    const cached = this.ensureStaticGroundCache(map);
    if (cached) {
      const sx = minCol * ts;
      const sy = minRow * ts;
      const sw = (maxCol - minCol + 1) * ts;
      const sh = (maxRow - minRow + 1) * ts;
      if (sw > 0 && sh > 0) {
        ctx.drawImage(cached, sx, sy, sw, sh, sx, sy, sw, sh);
      }
    } else {
      ctx.fillStyle = tp.floorBase;
      ctx.fillRect(
        minCol * ts,
        minRow * ts,
        (maxCol - minCol + 1) * ts,
        (maxRow - minRow + 1) * ts,
      );
    }

    // Dynamic animated water ripples + intact lowCover drop shadows
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const kind = map.tiles[r][c];
        const x = c * ts;
        const y = r * ts;

        if (kind === 'water') {
          const padT = map.tiles[r - 1]?.[c] === 'water' ? 0 : 4;
          const padB = map.tiles[r + 1]?.[c] === 'water' ? 0 : 2;
          const padL = map.tiles[r]?.[c - 1] === 'water' ? 0 : 4;
          const padR = map.tiles[r]?.[c + 1] === 'water' ? 0 : 2;
          const wave = Math.sin(time * 2.1 + c * 0.75 + r * 0.55);

          ctx.fillStyle = tp.waterMid;
          ctx.globalAlpha = 0.55;
          ctx.fillRect(
            x + padL + 1,
            y + padT + 1,
            Math.max(4, ts - padL - padR - 2),
            Math.max(4, ts - padT - padB - 2),
          );

          ctx.fillStyle = tp.waterShimmer;
          ctx.globalAlpha = 0.28 + (wave + 1) * 0.1;
          ctx.fillRect(x + 5, y + 8 + wave * 2.2, ts - 11, 2.4);
          ctx.fillRect(x + 9, y + 20 - wave * 2.2, ts - 15, 2);
          ctx.globalAlpha = 1;
        } else if (kind === 'lowCover') {
          const hp = map.coverHp[`${c},${r}`] ?? 100;
          if (hp > 0) {
            ctx.fillStyle = 'rgba(7, 11, 20, 0.44)';
            ctx.fillRect(x + 6, y + 8, ts - 4, ts - 4);
          }
        }
      }
    }
  }

  /** Pass 2: Y-sorted 2.5D 3/4 walls, destructible cover/chests/pots, trees, pillars & interleaved entities. */
  drawDepthSortedStructures(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    time: number,
    viewMinX: number,
    viewMinY: number,
    viewMaxX: number,
    viewMaxY: number,
    drawEntitiesInRow?: (row: number, rowTopY: number, rowBottomY: number) => void,
  ): void {
    const theme: MapTheme = map.theme ?? 'fortress';
    const tp = getThemePalette(theme);
    const ts = map.tileSize;
    const minCol = Math.max(0, Math.floor(viewMinX / ts) - 1);
    const maxCol = Math.min(map.width - 1, Math.ceil(viewMaxX / ts) + 1);
    const minRow = Math.max(0, Math.floor(viewMinY / ts) - 1);
    const maxRow = Math.min(map.height - 1, Math.ceil(viewMaxY / ts) + 2);

    for (let r = minRow; r <= maxRow; r += 1) {
      const clampedR = Math.min(map.height - 1, Math.max(0, r));
      if (r >= 0 && r < map.height) {
        for (let c = minCol; c <= maxCol; c += 1) {
          const kind = map.tiles[r][c];
          if (kind === 'wall') {
            this.drawWallTile3Quarter(ctx, map, theme, tp, c, r, time);
          } else if (kind === 'lowCover') {
            this.drawLowCover3Quarter(ctx, map, theme, tp, c, r);
          }
        }
      }

      if (drawEntitiesInRow) {
        drawEntitiesInRow(clampedR, r * ts, (r + 1) * ts);
      }
    }
  }

  private drawWallTile3Quarter(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    theme: MapTheme,
    tp: ThemePalette,
    c: number,
    r: number,
    time: number,
  ): void {
    const ts = map.tileSize;
    const x = c * ts;
    const y = r * ts;
    const nUp = map.tiles[r - 1]?.[c] === 'wall';
    const nDown = map.tiles[r + 1]?.[c] === 'wall';
    const nLeft = map.tiles[r]?.[c - 1] === 'wall';
    const nRight = map.tiles[r]?.[c + 1] === 'wall';
    const isBorder = r === 0 || c === 0 || r === map.height - 1 || c === map.width - 1;
    const h = tileHash(c, r, map.seed);

    // In Ancient Temple, isolated 1x1 interior walls render as tall fluted 3/4 temple pillars
    if (theme === 'temple' && !isBorder && !nUp && !nDown && !nLeft && !nRight) {
      this.drawTemplePillar(ctx, tp, x + ts * 0.5, y + ts - 2, h < 0.35);
      return;
    }

    const topY = y - WALL_HEIGHT;
    const frontY = y + ts - WALL_HEIGHT;

    if (!nDown) {
      ctx.fillStyle = tp.wallSide;
      ctx.fillRect(x, frontY, ts, WALL_HEIGHT);

      const midY = frontY + WALL_HEIGHT * 0.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(x + 1, frontY + 1, ts - 2, 2);
      ctx.fillRect(x + 1, midY + 1, ts - 2, 1.5);

      ctx.fillStyle = tp.floorSeam;
      ctx.fillRect(x, midY, ts, 1.5);
      ctx.fillRect(x + ts * 0.5, frontY, 1.5, WALL_HEIGHT * 0.5);
      ctx.fillRect(x + ts * 0.15, midY, 1.5, WALL_HEIGHT * 0.5);
      ctx.fillRect(x + ts * 0.85, midY, 1.5, WALL_HEIGHT * 0.5);

      ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
      ctx.fillRect(x, y + ts - 3.5, ts, 3.5);

      if (theme === 'temple') {
        ctx.fillStyle = 'rgba(223, 199, 157, 0.16)';
        ctx.fillRect(x + 3, frontY + 3, ts - 6, 2);
        if (h > 0.72) {
          ctx.strokeStyle = tp.bgVoid;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + 11, frontY + 2);
          ctx.lineTo(x + 15, frontY + 10);
          ctx.lineTo(x + 12, frontY + 17);
          ctx.stroke();
        }
      } else if (theme === 'fortress') {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
        if ((c + r) % 4 === 0) ctx.fillRect(x + 10, frontY + 7, 12, 2.5);
      }
    }

    const isBrokenTempleEnd =
      theme === 'temple' && !isBorder && ((!nLeft && !nUp) || (!nRight && !nUp)) && h < 0.55;

    ctx.fillStyle = (c + r) % 3 === 0 ? tp.wallTopAlt : tp.wallTop;
    if (isBrokenTempleEnd) {
      ctx.fillRect(x, topY + 6, ts, ts - 6);
      ctx.fillRect(x + (nLeft ? 0 : 8), topY, ts - 8, 8);
      ctx.fillStyle = tp.wallSide;
      ctx.fillRect(x + (nLeft ? ts - 8 : 2), topY + 2, 6, 6);
    } else {
      ctx.fillRect(x, topY, ts, ts);
    }

    ctx.strokeStyle =
      theme === 'temple' ? 'rgba(88, 72, 52, 0.48)' : 'rgba(15, 20, 32, 0.48)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, topY + 0.5, ts - 1, ts - 1);

    if (theme === 'temple' && !isBrokenTempleEnd && h < 0.45) {
      ctx.beginPath();
      ctx.moveTo(x + 6, topY + 12);
      ctx.lineTo(x + 16, topY + 18);
      ctx.lineTo(x + 24, topY + 14);
      ctx.stroke();
    }

    ctx.fillStyle = tp.wallEdge;
    if (!nUp && !isBrokenTempleEnd) ctx.fillRect(x, topY, ts, 2.5);
    if (!nLeft && !isBrokenTempleEnd) ctx.fillRect(x, topY, 2.5, ts);

    ctx.fillStyle = tp.bgVoid;
    if (!nUp) ctx.fillRect(x, topY - 1, ts, 1.5);
    if (!nLeft) ctx.fillRect(x - 1, topY, 1.5, nDown ? ts : ts + WALL_HEIGHT);
    if (!nRight) ctx.fillRect(x + ts - 1.5, topY, 1.5, nDown ? ts : ts + WALL_HEIGHT);
    if (!nDown) {
      ctx.fillRect(x, frontY - 1.5, ts, 1.8);
      ctx.fillRect(x, y + ts - 1, ts, 1.4);
    }

    if (theme === 'jungle') {
      this.drawJungleWallDetails(ctx, map, tp, c, r, x, y, topY, frontY, nDown, nLeft, nRight, isBorder, time);
    } else if (theme === 'temple') {
      this.drawTempleWallDetails(ctx, map, tp, c, r, x, y, topY, nUp, nDown, nLeft, nRight, isBorder);
    } else if (!isBorder) {
      const nearWater =
        map.tiles[r + 1]?.[c] === 'water' ||
        map.tiles[r - 1]?.[c] === 'water' ||
        map.tiles[r]?.[c + 1] === 'water' ||
        map.tiles[r]?.[c - 1] === 'water';
      if ((!nDown && !nLeft && (c + r) % 2 === 0) || (nearWater && (c * 7 + r * 3) % 3 === 0)) {
        this.drawFoliageCluster(ctx, tp, x + 5, y + ts - 2, 0.9);
      }
    }
  }

  private drawLowCover3Quarter(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    theme: MapTheme,
    tp: ThemePalette,
    c: number,
    r: number,
  ): void {
    const ts = map.tileSize;
    const x = c * ts;
    const y = r * ts;
    const hp = map.coverHp[`${c},${r}`] ?? 100;
    if (hp <= 0) {
      // Subtle shattered debris marks when cover is destroyed
      ctx.fillStyle = 'rgba(24, 18, 12, 0.35)';
      ctx.fillRect(x + 7, y + 12, 6, 4);
      ctx.fillRect(x + 19, y + 18, 5, 4);
      return;
    }

    if (theme === 'temple') {
      const variant = (c + r * 2) % 3;
      if (variant === 0) {
        // Destructible 3/4 Brass-Bound Treasure Chest on sandstone base
        ctx.fillStyle = tp.wallSide;
        ctx.fillRect(x + 3, y + ts - 8, ts - 6, 6);
        this.drawTempleChest(ctx, x + ts * 0.5, y + ts - 6);
      } else if (variant === 1) {
        // Destructible 3/4 Terracotta Urn/Pot cluster on stone plinth
        ctx.fillStyle = tp.wallTopAlt;
        ctx.strokeStyle = tp.bgVoid;
        ctx.lineWidth = 1.2;
        ctx.fillRect(x + 4, y + ts - 12, ts - 8, 9);
        ctx.strokeRect(x + 4, y + ts - 12, ts - 8, 9);
        this.drawTemplePots(ctx, x + 13, y + ts - 8, true);
      } else {
        this.drawBarricadeCover(ctx, map, tp, x, y, c, r, ts);
      }
    } else {
      const isCrate = (c + r) % 2 === 0;
      if (isCrate) {
        ctx.fillStyle = '#5F3F16';
        ctx.fillRect(x + 3, y + ts - 11, ts - 6, 9);
        ctx.strokeStyle = tp.bgVoid;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x + 3, y + ts - 11, ts - 6, 9);

        ctx.fillStyle = tp.crateBody;
        ctx.fillRect(x + 3, y - 3, ts - 6, ts - 8);
        ctx.fillStyle = '#BA8539';
        ctx.fillRect(x + 4, y - 2, ts - 8, 4);
        ctx.strokeStyle = tp.crateTrim;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y - 2, ts - 8, ts - 10);

        ctx.beginPath();
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + ts - 6, y + ts - 14);
        ctx.moveTo(x + ts - 6, y);
        ctx.lineTo(x + 6, y + ts - 14);
        ctx.stroke();

        ctx.strokeStyle = tp.bgVoid;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x + 3, y - 3, ts - 6, ts - 8);

        ctx.fillStyle = '#F3D282';
        ctx.fillRect(x + 5, y - 1, 2, 2);
        ctx.fillRect(x + ts - 7, y - 1, 2, 2);
      } else {
        this.drawBarricadeCover(ctx, map, tp, x, y, c, r, ts);
      }
    }

    if (hp < 75) {
      ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : tp.bgVoid;
      ctx.lineWidth = hp < 35 ? 2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 5);
      ctx.lineTo(x + 16, y + 13);
      ctx.lineTo(x + 12, y + 21);
      if (hp < 40) {
        ctx.moveTo(x + 16, y + 13);
        ctx.lineTo(x + 24, y + 17);
      }
      ctx.stroke();
    }
  }

  private drawBarricadeCover(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    tp: ThemePalette,
    x: number,
    y: number,
    c: number,
    r: number,
    ts: number,
  ): void {
    const leftCover = map.tiles[r]?.[c - 1] === 'lowCover';
    const rightCover = map.tiles[r]?.[c + 1] === 'lowCover';
    const padL = leftCover ? 0 : 2;
    const padR = rightCover ? 0 : 2;
    const w = ts - padL - padR;

    ctx.fillStyle = tp.wallSide;
    ctx.fillRect(x + padL, y + ts - 12, w, 9);
    ctx.fillStyle = tp.bgVoid;
    ctx.fillRect(x + padL, y + ts - 4, w, 1.5);

    ctx.fillStyle = tp.barricadeBody;
    ctx.fillRect(x + padL, y, w, ts - 12);
    ctx.fillStyle = tp.barricadeHighlight;
    ctx.fillRect(x + padL + 1, y + 1, w - 2, 3);

    ctx.strokeStyle = tp.bgVoid;
    ctx.lineWidth = 1.3;
    ctx.strokeRect(x + padL + 0.5, y + 0.5, w - 1, ts - 4);
  }

  private drawFloorDetails(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    theme: MapTheme,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number,
  ): void {
    const ts = map.tileSize;
    if (theme === 'fortress') return;

    if (theme === 'temple') {
      const rugSpots: Array<{ c: number; r: number; w: number; h: number }> = [
        { c: 12, r: 26, w: 4, h: 5 },
        { c: map.width - 16, r: 9, w: 4, h: 5 },
        { c: 28, r: 6, w: 4, h: 3 },
        { c: 28, r: map.height - 9, w: 4, h: 3 },
      ];
      for (const rug of rugSpots) {
        if (
          rug.c + rug.w < minCol ||
          rug.c > maxCol ||
          rug.r + rug.h < minRow ||
          rug.r > maxRow
        ) {
          continue;
        }
        let clear = true;
        for (let rr = rug.r; rr < rug.r + rug.h && clear; rr += 1) {
          for (let cc = rug.c; cc < rug.c + rug.w; cc += 1) {
            if (map.tiles[rr]?.[cc] !== 'floor') {
              clear = false;
              break;
            }
          }
        }
        if (!clear) continue;
        this.drawTempleRug(ctx, rug.c * ts + 4, rug.r * ts + 4, rug.w * ts - 8, rug.h * ts - 8);
      }
    }

    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'floor') continue;
        const h = tileHash(c, r, map.seed);
        const x = c * ts;
        const y = r * ts;

        if (theme === 'jungle') {
          if (h < 0.18) {
            ctx.fillStyle = 'rgba(46, 98, 52, 0.36)';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 16, 13, 10, h * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(72, 138, 68, 0.28)';
            ctx.beginPath();
            ctx.ellipse(x + 14, y + 14, 7, 5, h * 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (h > 0.86) {
            ctx.fillStyle = 'rgba(182, 123, 52, 0.6)';
            ctx.fillRect(x + 8, y + 11, 4, 2);
            ctx.fillRect(x + 21, y + 20, 3, 2);
            ctx.fillStyle = 'rgba(130, 175, 76, 0.5)';
            ctx.fillRect(x + 15, y + 7, 3, 2);
          }

          const logH = tileHash(c, r, map.seed + 91);
          if (
            logH < 0.026 &&
            c > 5 &&
            c < map.width - 6 &&
            r > 3 &&
            r < map.height - 4 &&
            !nearAnyZone(map, x + 16, y + 16, 18) &&
            map.tiles[r]?.[c + 1] === 'floor'
          ) {
            this.drawFallenJungleLog(ctx, x + 16, y + 18, (logH * 100) % 1);
          }
        } else if (theme === 'temple') {
          if (h < 0.24) {
            ctx.fillStyle = 'rgba(212, 185, 134, 0.36)';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 18, 17, 10, (h - 0.1) * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(235, 212, 165, 0.24)';
            ctx.fillRect(x + 6, y + 15, 16, 1.5);
          } else if (h > 0.9) {
            ctx.fillStyle = 'rgba(88, 72, 52, 0.48)';
            ctx.fillRect(x + 10, y + 20, 5, 3);
            ctx.fillStyle = 'rgba(209, 182, 132, 0.48)';
            ctx.fillRect(x + 10, y + 19, 5, 1.5);
          }

          const wallNear =
            map.tiles[r - 1]?.[c] === 'wall' ||
            map.tiles[r + 1]?.[c] === 'wall' ||
            map.tiles[r]?.[c - 1] === 'wall' ||
            map.tiles[r]?.[c + 1] === 'wall';
          if (wallNear && h > 0.68 && h < 0.84) {
            ctx.fillStyle = '#584834';
            ctx.fillRect(x + 7, y + 12, 6, 4);
            ctx.fillRect(x + 18, y + 21, 5, 4);
            ctx.fillStyle = '#BCA178';
            ctx.fillRect(x + 7, y + 10, 6, 3);
            ctx.fillRect(x + 18, y + 19, 5, 3);
          }
        }
      }
    }
  }

  private drawFallenJungleLog(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    variant: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((variant - 0.5) * 0.7);

    ctx.fillStyle = 'rgba(7, 11, 20, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-18, -3, 38, 12, 5);
    ctx.fill();

    ctx.fillStyle = '#5A3E24';
    ctx.strokeStyle = '#11160F';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-19, -6, 36, 11, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#755333';
    ctx.fillRect(-15, -4, 28, 3);
    ctx.fillStyle = '#3C2816';
    ctx.fillRect(-10, -1, 14, 1.5);
    ctx.fillRect(-2, 2, 11, 1.5);

    ctx.fillStyle = '#B88D56';
    ctx.beginPath();
    ctx.ellipse(16, -0.5, 3.2, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#825B32';
    ctx.beginPath();
    ctx.arc(16, -0.5, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#347C42';
    ctx.beginPath();
    ctx.ellipse(-7, -5, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(5, -4.5, 4.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTempleRug(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(24, 16, 10, 0.32)';
    ctx.fillRect(x + 3, y + 3, w, h);

    ctx.fillStyle = '#6B2424';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#DFC79D';
    for (let fx = x + 4; fx < x + w - 4; fx += 6) {
      ctx.fillRect(fx, y - 3, 2, 3);
      ctx.fillRect(fx, y + h, 2, 3);
    }

    ctx.strokeStyle = '#D4A14B';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    ctx.fillStyle = '#24354F';
    ctx.fillRect(x + 12, y + 12, w - 24, h - 24);

    ctx.strokeStyle = '#E6C278';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 16, y + 16, w - 32, h - 32);

    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = '#A84232';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16);
    ctx.lineTo(cx + 14, cy);
    ctx.lineTo(cx, cy + 16);
    ctx.lineTo(cx - 14, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#E6C278';
    ctx.stroke();
    ctx.restore();
  }

  private drawJungleWallDetails(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    tp: ThemePalette,
    c: number,
    r: number,
    x: number,
    y: number,
    topY: number,
    frontY: number,
    nDown: boolean,
    nLeft: boolean,
    nRight: boolean,
    isBorder: boolean,
    time: number,
  ): void {
    const ts = map.tileSize;
    const h = tileHash(c, r, map.seed);

    if (h < 0.62 || isBorder) {
      ctx.strokeStyle = '#266C38';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x + 3, topY + 6);
      ctx.quadraticCurveTo(x + 16, topY + 18, x + ts - 3, topY + 10);
      ctx.stroke();

      ctx.fillStyle = '#3E9A54';
      ctx.beginPath();
      ctx.arc(x + 10, topY + 11, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 22, topY + 13, 2.2, 0, Math.PI * 2);
      ctx.fill();

      if (!nDown) {
        ctx.strokeStyle = '#2E8344';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8, frontY - 2);
        ctx.quadraticCurveTo(x + 11, frontY + 8, x + 7, y + ts - 3);
        ctx.moveTo(x + 23, frontY - 2);
        ctx.quadraticCurveTo(x + 20, frontY + 9, x + 24, y + ts - 5);
        ctx.stroke();

        ctx.fillStyle = '#48AC5D';
        ctx.beginPath();
        ctx.arc(x + 7, y + ts - 4, 2.2, 0, Math.PI * 2);
        ctx.arc(x + 24, y + ts - 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (isBorder) {
      if ((c + r) % 2 === 0 || h < 0.55) {
        this.drawJungleTree(ctx, tp, x + ts * 0.5, y + ts * 0.35, 1.15, h < 0.48, time + c * 0.4);
      }
    } else {
      if (!nDown && !nLeft && h < 0.34) {
        this.drawJungleTree(ctx, tp, x + ts * 0.45, topY + 12, 0.92, h < 0.17, time + r * 0.5);
      } else {
        if (!nDown && !nLeft && h < 0.72) {
          this.drawFoliageCluster(ctx, tp, x + 5, y + ts - 2, 1.05);
        }
        if (!nDown && !nRight && h > 0.32) {
          this.drawFoliageCluster(ctx, tp, x + ts - 6, y + ts - 2, 1.0);
        }
      }
    }
  }

  private drawJungleTree(
    ctx: CanvasRenderingContext2D,
    tp: ThemePalette,
    x: number,
    baseY: number,
    scale: number,
    isPalm: boolean,
    swayPhase: number,
  ): void {
    const sway = Math.sin(swayPhase * 1.4) * 1.6;
    ctx.save();
    ctx.translate(x, baseY);

    ctx.fillStyle = '#472E1B';
    ctx.strokeStyle = '#0D130E';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4.5 * scale, 4);
    ctx.lineTo(-3 * scale + sway * 0.3, -18 * scale);
    ctx.lineTo(3 * scale + sway * 0.3, -18 * scale);
    ctx.lineTo(4.5 * scale, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const crownY = -19 * scale;
    ctx.translate(sway, crownY);

    if (isPalm) {
      const fronds = 7;
      for (let i = 0; i < fronds; i += 1) {
        const a = (i / fronds) * Math.PI * 2 + 0.3;
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = i % 2 === 0 ? tp.foliageDark : tp.foliageBright;
        ctx.strokeStyle = '#0B130D';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(11 * scale, -7 * scale, 21 * scale, 1 * scale);
        ctx.quadraticCurveTo(11 * scale, 6 * scale, 0, 0);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#5BB96D';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(17 * scale, 0.5);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#6B4828';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#0B140E';
      ctx.beginPath();
      ctx.arc(0, 1, 16 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = tp.foliageDark;
      ctx.beginPath();
      ctx.arc(-5 * scale, 2 * scale, 11 * scale, 0, Math.PI * 2);
      ctx.arc(6 * scale, 1 * scale, 10.5 * scale, 0, Math.PI * 2);
      ctx.arc(0, -5 * scale, 11 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = tp.foliageBright;
      ctx.beginPath();
      ctx.arc(-4 * scale, -3 * scale, 7.5 * scale, 0, Math.PI * 2);
      ctx.arc(5 * scale, -4 * scale, 6.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#58B665';
      ctx.beginPath();
      ctx.arc(-1 * scale, -7 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawTempleWallDetails(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    tp: ThemePalette,
    c: number,
    r: number,
    x: number,
    y: number,
    topY: number,
    nUp: boolean,
    nDown: boolean,
    nLeft: boolean,
    nRight: boolean,
    isBorder: boolean,
  ): void {
    const ts = map.tileSize;
    const h = tileHash(c, r, map.seed);

    const isWallEnd = !nUp && !nDown && (!nLeft || !nRight);
    if (isWallEnd || (!isBorder && !nDown && (!nLeft || !nRight) && h < 0.45)) {
      ctx.strokeStyle = tp.wallEdge;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x + 5, topY + 5, ts - 10, ts - 10);
      ctx.fillStyle = 'rgba(223, 199, 157, 0.25)';
      ctx.fillRect(x + 10, topY + 10, ts - 20, ts - 20);
    }

    if (isBorder && (c === 15 || c === 44) && (r === 0 || r === map.height - 1)) {
      this.drawTempleStatue(ctx, tp, x + ts * 0.5, y + ts - 2);
      return;
    }

    if (!isBorder && !nDown && map.tiles[r + 1]?.[c] === 'floor') {
      if (h > 0.87) {
        this.drawTemplePots(ctx, x + 12, y + ts + 3, h > 0.93);
      } else if (h < 0.09) {
        this.drawTempleChest(ctx, x + 16, y + ts + 3);
      }
    }
  }

  private drawTemplePillar(
    ctx: CanvasRenderingContext2D,
    tp: ThemePalette,
    cx: number,
    baseY: number,
    broken: boolean,
  ): void {
    ctx.save();
    ctx.translate(cx, baseY);

    ctx.fillStyle = 'rgba(7, 11, 20, 0.45)';
    ctx.beginPath();
    ctx.ellipse(4, 2, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tp.wallSide;
    ctx.strokeStyle = tp.bgVoid;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-11, -7, 22, 9);
    ctx.strokeRect(-11, -7, 22, 9);
    ctx.fillStyle = tp.wallTopAlt;
    ctx.fillRect(-11, -11, 22, 5);
    ctx.strokeRect(-11, -11, 22, 5);

    const shaftH = broken ? 14 : 26;
    ctx.fillStyle = tp.wallTop;
    ctx.fillRect(-7.5, -10 - shaftH, 15, shaftH);
    ctx.strokeRect(-7.5, -10 - shaftH, 15, shaftH);

    ctx.fillStyle = tp.wallSide;
    ctx.fillRect(-4, -9 - shaftH, 1.5, shaftH - 2);
    ctx.fillRect(0, -9 - shaftH, 1.5, shaftH - 2);
    ctx.fillRect(3.5, -9 - shaftH, 1.5, shaftH - 2);

    if (broken) {
      ctx.fillStyle = tp.wallEdge;
      ctx.beginPath();
      ctx.moveTo(-7.5, -10 - shaftH);
      ctx.lineTo(-2, -14 - shaftH);
      ctx.lineTo(3, -11 - shaftH);
      ctx.lineTo(7.5, -13 - shaftH);
      ctx.lineTo(7.5, -10 - shaftH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const capY = -10 - shaftH;
      ctx.fillStyle = tp.wallSide;
      ctx.fillRect(-11, capY - 6, 22, 6);
      ctx.strokeRect(-11, capY - 6, 22, 6);
      ctx.fillStyle = tp.wallEdge;
      ctx.fillRect(-11, capY - 12, 22, 6);
      ctx.strokeRect(-11, capY - 12, 22, 6);
    }

    ctx.restore();
  }

  private drawTemplePots(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    pair: boolean,
  ): void {
    const drawSinglePot = (ox: number, oy: number, r: number) => {
      ctx.fillStyle = 'rgba(7, 11, 20, 0.4)';
      ctx.beginPath();
      ctx.ellipse(ox + 2, oy + 2, r + 1, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#9C4B24';
      ctx.strokeStyle = '#1C130C';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(ox, oy - r * 0.5, r, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#C96F3D';
      ctx.beginPath();
      ctx.ellipse(ox - r * 0.25, oy - r * 0.7, r * 0.4, r * 0.55, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#DFC79D';
      ctx.fillRect(ox - r * 0.45, oy - r * 1.55, r * 0.9, 2.5);
      ctx.strokeRect(ox - r * 0.45, oy - r * 1.55, r * 0.9, 2.5);
    };

    drawSinglePot(cx - 2, baseY, 5.2);
    if (pair) {
      drawSinglePot(cx + 7, baseY + 2, 4);
    }
  }

  private drawTempleChest(ctx: CanvasRenderingContext2D, cx: number, baseY: number): void {
    ctx.save();
    ctx.translate(cx, baseY);

    ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
    ctx.fillRect(-9, -2, 21, 7);

    ctx.fillStyle = '#5D3B18';
    ctx.strokeStyle = '#181009';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-9, -8, 18, 10);
    ctx.strokeRect(-9, -8, 18, 10);

    ctx.fillStyle = '#855625';
    ctx.fillRect(-9, -13, 18, 6);
    ctx.strokeRect(-9, -13, 18, 6);

    ctx.fillStyle = '#E2B45A';
    ctx.fillRect(-6, -13, 2.5, 15);
    ctx.fillRect(3.5, -13, 2.5, 15);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(-1.5, -9, 3, 4);

    ctx.restore();
  }

  private drawTempleStatue(
    ctx: CanvasRenderingContext2D,
    tp: ThemePalette,
    cx: number,
    baseY: number,
  ): void {
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.fillStyle = tp.wallSide;
    ctx.strokeStyle = tp.bgVoid;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-11, -12, 22, 12);
    ctx.strokeRect(-11, -12, 22, 12);

    ctx.fillStyle = tp.wallTop;
    ctx.fillRect(-7, -26, 14, 15);
    ctx.strokeRect(-7, -26, 14, 15);
    ctx.fillStyle = tp.wallEdge;
    ctx.beginPath();
    ctx.arc(0, -29, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawFoliageCluster(
    ctx: CanvasRenderingContext2D,
    tp: ThemePalette,
    x: number,
    y: number,
    scale = 1,
  ): void {
    ctx.fillStyle = tp.bgVoid;
    ctx.beginPath();
    ctx.arc(x, y + 1, 7.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tp.foliageDark;
    ctx.beginPath();
    ctx.arc(x - 2 * scale, y, 6 * scale, 0, Math.PI * 2);
    ctx.arc(x + 3 * scale, y - 1 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tp.foliageBright;
    ctx.beginPath();
    ctx.arc(x - 1 * scale, y - 2 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.arc(x + 2.5 * scale, y - 2.5 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  drawZonesAndBases(
    ctx: CanvasRenderingContext2D,
    state: Readonly<GameState>,
    baseFlash: { player: number; enemy: number },
  ): void {
    const time = state.time;
    const theme: MapTheme = state.map.theme ?? 'fortress';
    const tp = getThemePalette(theme);

    for (const def of state.map.zones) {
      const zState = state.zones.find((z) => z.id === def.id);
      const owner = zState?.owner ?? 'neutral';
      const contested = zState?.contested ?? false;
      const progress = zState?.progress ?? 0;

      const neutralRing = theme === 'fortress' ? PALETTE.gold : PALETTE.player;
      const ringColor =
        contested ? PALETTE.gold : owner === 'neutral' ? neutralRing : teamColor(owner);
      const glow =
        contested ? PALETTE.gold : owner === 'neutral' ? PALETTE.playerGlow : teamGlowColor(owner);

      ctx.save();
      ctx.translate(def.center.x, def.center.y);

      const zoneR = Math.min(def.radius, 76);

      if (theme === 'jungle' || theme === 'temple') {
        ctx.fillStyle = 'rgba(7, 11, 20, 0.38)';
        ctx.beginPath();
        ctx.arc(2, 4, zoneR + 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme === 'temple' ? '#8E7756' : '#354035';
        ctx.beginPath();
        ctx.arc(0, 0, zoneR + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = tp.wallEdge;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = theme === 'temple' ? '#6D5A3F' : '#252E25';
        ctx.beginPath();
        ctx.arc(0, 0, zoneR - 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.strokeStyle = ringColor;
      ctx.globalAlpha = contested ? 0.52 : 0.28;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, def.radius);
      grad.addColorStop(0, `${ringColor}40`);
      grad.addColorStop(0.55, `${ringColor}1A`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(time * (theme === 'fortress' ? 0.45 : 0.25));
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = contested ? 0.65 + 0.35 * Math.sin(time * 8) : 0.92;
      ctx.beginPath();
      ctx.arc(0, 0, zoneR, 0, Math.PI * 2);
      ctx.stroke();

      const teeth = theme === 'temple' ? 12 : 8;
      ctx.fillStyle = glow;
      for (let i = 0; i < teeth; i += 1) {
        const a = (i / teeth) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.fillRect(zoneR - 2, -4, theme === 'temple' ? 5 : 8, 8);
        ctx.restore();
      }
      ctx.restore();

      ctx.save();
      ctx.rotate(-time * 0.32);
      ctx.strokeStyle = glow;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.8;
      ctx.setLineDash(theme === 'fortress' ? [12, 8] : [6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, zoneR - 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (theme === 'jungle') {
        for (let v = 0; v < 5; v += 1) {
          const va = (v / 5) * Math.PI * 2 + 0.4;
          ctx.save();
          ctx.rotate(va);
          ctx.strokeStyle = '#2B7A41';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, zoneR + 2, -0.25, 0.32);
          ctx.stroke();
          ctx.fillStyle = tp.foliageBright;
          ctx.beginPath();
          ctx.arc(zoneR + 3, -6, 4.5, 0, Math.PI * 2);
          ctx.arc(zoneR + 1, 9, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      const absProg = Math.min(1, Math.abs(progress));
      if (absProg > 0.02) {
        ctx.strokeStyle = progress >= 0 ? PALETTE.playerGlow : PALETTE.enemyGlow;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          zoneR - 6,
          -Math.PI / 2,
          -Math.PI / 2 + absProg * Math.PI * 2,
        );
        ctx.stroke();
      }

      const label = formatZoneCode(def.id);
      ctx.font = '900 28px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillText(label, 1.5, 2.5);
      ctx.fillStyle = PALETTE.textHi;
      ctx.fillText(label, 0, 1);

      ctx.restore();
    }

    for (const base of state.map.bases) {
      const hp = state.baseHp[base.team];
      const maxHp = Math.max(1, base.coreHp);
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      const color = teamColor(base.team);
      const glow = teamGlowColor(base.team);
      const flash = baseFlash[base.team];

      ctx.save();
      ctx.translate(base.center.x, base.center.y);

      ctx.fillStyle = tp.bgVoid;
      ctx.strokeStyle = tp.wallEdge;
      ctx.lineWidth = 3;
      ctx.fillRect(-48, -48, 96, 96);
      ctx.strokeRect(-48, -48, 96, 96);

      ctx.fillStyle = `${color}28`;
      ctx.fillRect(-42, -42, 84, 84);

      ctx.save();
      ctx.rotate(time * 0.8);
      ctx.strokeStyle = flash > 0 ? PALETTE.textHi : color;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const pulse = 1 + 0.08 * Math.sin(time * 5);
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * pulse);
      coreGrad.addColorStop(0, PALETTE.textHi);
      coreGrad.addColorStop(0.5, glow);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawPickups(ctx: CanvasRenderingContext2D, pickups: Pickup[], time: number): void {
    for (const p of pickups) {
      this.drawSinglePickup(ctx, p, time);
    }
  }

  drawSinglePickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number): void {
    const color = rarityColor(p.rarity);
    const bob = Math.sin(time * 3.5 + p.pos.x * 0.05) * 3.5;

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y + bob);

    if (p.rarity === 'epic') {
      ctx.save();
      ctx.rotate(time * 1.4);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = color;
      ctx.fillRect(-3, -28, 6, 56);
      ctx.fillRect(-28, -3, 56, 6);
      ctx.restore();
    }

    const pulse = 1 + 0.12 * Math.sin(time * 4.5 + p.pos.y);

    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * pulse);
    halo.addColorStop(0, `${color}55`);
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = PALETTE.bg1;
    ctx.beginPath();
    ctx.roundRect(-12, -8, 24, 16, 3);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.font = '800 9px Bahnschrift, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(p.weaponId.slice(0, 3).toUpperCase(), 0, 0.5);

    ctx.restore();
  }
}
