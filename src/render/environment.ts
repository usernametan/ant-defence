import type { GameState, MapData, MapTheme, Pickup } from '../shared/types';
import {
  PALETTE,
  getThemePalette,
  rarityColor,
  teamColor,
  teamGlowColor,
  type ThemePalette,
} from './palette';
import { FortressRenderer } from './fortress';
import { JungleRenderer } from './jungle';
import { SlumsideRenderer } from './slumside';
import { TempleRenderer } from './temple';

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

export type SlumRoofStyle = 'tin' | 'blueTarp' | 'concrete' | 'terracotta' | 'tealShanty';

export function slumRoofStyle(c: number, r: number, seed: number): SlumRoofStyle {
  const h = tileHash(Math.floor(c / 3), Math.floor(r / 3), seed + 31);
  if (h < 0.34) return 'tin';
  if (h < 0.56) return 'blueTarp';
  if (h < 0.78) return 'concrete';
  if (h < 0.9) return 'terracotta';
  return 'tealShanty';
}

export const SLUM_ROOF_PREVIEW_COLORS: Record<SlumRoofStyle, string> = {
  tin: '#7A7268',
  blueTarp: '#2563EB',
  concrete: '#9A9286',
  terracotta: '#B8532F',
  tealShanty: '#3E7A7C',
};

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
  private fortress = new FortressRenderer();
  private jungle = new JungleRenderer();
  private slumside = new SlumsideRenderer();
  private temple = new TempleRenderer();

  markDirtyTile(tileKeyStr: string, map: MapData): void {
    const theme = map.theme ?? 'fortress';
    if (theme === 'fortress') this.fortress.markDirtyTile(tileKeyStr, map.width);
    else if (theme === 'jungle') this.jungle.markDirtyTile(tileKeyStr, map.width);
    else if (theme === 'slumside') this.slumside.markDirtyTile(tileKeyStr, map.width);
    else if (theme === 'temple') this.temple.markDirtyTile(tileKeyStr, map.width);
  }

  getThemeCacheStats(theme: MapTheme) {
    if (theme === 'fortress') return this.fortress.getCacheStats();
    if (theme === 'jungle') return this.jungle.getCacheStats();
    if (theme === 'slumside') return this.slumside.getCacheStats();
    return this.temple.getCacheStats();
  }

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

        if (theme === 'fortress') {
          if ((r + c) % 2 === 1) {
            tctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
            tctx.fillRect(x + 4, y + 4, 2, 2);
            tctx.fillRect(x + 26, y + 4, 2, 2);
            tctx.fillRect(x + 4, y + 26, 2, 2);
            tctx.fillRect(x + 26, y + 26, 2, 2);
          }
        } else if (theme === 'temple') {
          // Subtle carved 2D glyph patterns on warm sandy-tan stone tiles
          if ((r + c) % 2 === 0) {
            tctx.strokeStyle = 'rgba(88, 72, 52, 0.36)';
            tctx.lineWidth = 1.2;
            tctx.strokeRect(x + 6, y + 6, 20, 20);
            tctx.strokeRect(x + 11, y + 11, 10, 10);
          } else if ((r * 3 + c) % 3 === 0) {
            tctx.strokeStyle = 'rgba(223, 199, 157, 0.22)';
            tctx.lineWidth = 1.2;
            tctx.beginPath();
            tctx.moveTo(x + 8, y + 16);
            tctx.lineTo(x + 24, y + 16);
            tctx.moveTo(x + 16, y + 8);
            tctx.lineTo(x + 16, y + 24);
            tctx.stroke();
          }
          } else if (theme === 'jungle') {
            // Subtle 2D grass tufts on dark olive-green square tiles
            if ((r + c * 2) % 2 === 0) {
              tctx.strokeStyle = '#368247';
              tctx.lineWidth = 1.4;
              tctx.beginPath();
              tctx.moveTo(x + 9, y + 22);
              tctx.lineTo(x + 7, y + 16);
              tctx.moveTo(x + 9, y + 22);
              tctx.lineTo(x + 12, y + 16);
              tctx.moveTo(x + 22, y + 12);
              tctx.lineTo(x + 20, y + 7);
              tctx.moveTo(x + 22, y + 12);
              tctx.lineTo(x + 25, y + 7);
              tctx.stroke();
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
    const key = `${map.seed}:${theme}:${map.width}x${map.height}:${map.tileSize}:w${map.wallRevision ?? 0}`;
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
    if (theme === 'fortress') {
      this.fortress.drawGround(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }

    if (theme === 'jungle') {
      this.jungle.drawGround(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }
    if (theme === 'slumside') {
      this.slumside.drawGround(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }
    if (theme === 'temple') {
      this.temple.drawGround(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }

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

    if (theme === 'fortress') {
      for (let r = minRow; r <= maxRow; r += 1) {
        const clampedR = Math.min(map.height - 1, Math.max(0, r));
        if (r >= 0 && r < map.height) {
          this.fortress.drawRow(ctx, map, r, minCol, maxCol, viewMinX, viewMaxX);
        }
        if (drawEntitiesInRow) {
          drawEntitiesInRow(clampedR, r * ts, (r + 1) * ts);
        }
      }
      this.fortress.drawOverheadLayer(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }

    if (theme === 'jungle') {
      for (let r = minRow; r <= maxRow; r += 1) {
        const clampedR = Math.min(map.height - 1, Math.max(0, r));
        if (r >= 0 && r < map.height) {
          this.jungle.drawRow(ctx, map, r, minCol, maxCol, viewMinX, viewMaxX);
        }
        if (drawEntitiesInRow) {
          drawEntitiesInRow(clampedR, r * ts, (r + 1) * ts);
        }
      }
      this.jungle.drawOverheadLayer(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }

    if (theme === 'slumside') {
      for (let r = minRow; r <= maxRow; r += 1) {
        const clampedR = Math.min(map.height - 1, Math.max(0, r));
        if (r >= 0 && r < map.height) {
          this.slumside.drawRow(ctx, map, r, minCol, maxCol, viewMinX, viewMaxX);
        }
        if (drawEntitiesInRow) {
          drawEntitiesInRow(clampedR, r * ts, (r + 1) * ts);
        }
      }
      this.slumside.drawOverheadLayer(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }

    if (theme === 'temple') {
      for (let r = minRow; r <= maxRow; r += 1) {
        const clampedR = Math.min(map.height - 1, Math.max(0, r));
        if (r >= 0 && r < map.height) {
          this.temple.drawRow(ctx, map, r, minCol, maxCol, viewMinX, viewMaxX);
        }
        if (drawEntitiesInRow) {
          drawEntitiesInRow(clampedR, r * ts, (r + 1) * ts);
        }
      }
      this.temple.drawOverheadLayer(ctx, map, time, viewMinX, viewMinY, viewMaxX, viewMaxY);
      return;
    }

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

  drawThemeAtmosphere(
    ctx: CanvasRenderingContext2D,
    theme: MapTheme,
    width: number,
    height: number,
    time: number,
    reducedMotion: boolean,
  ): void {
    if (theme === 'fortress') {
      this.fortress.drawAtmosphere(ctx, width, height, time, reducedMotion);
    } else if (theme === 'jungle') {
      this.jungle.drawAtmosphere(ctx, width, height, time, reducedMotion);
    } else if (theme === 'slumside') {
      this.slumside.drawAtmosphere(ctx, width, height, time, reducedMotion);
    } else if (theme === 'temple') {
      this.temple.drawAtmosphere(ctx, width, height, time, reducedMotion);
    }
  }

  private drawWallTile3Quarter(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    theme: MapTheme,
    tp: ThemePalette,
    c: number,
    r: number,
    _time: number,
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

    // Strict Flat 2D Top-Down Orthographic Block Wall (grid-aligned 1x1 block, 2-3px dark outline)
    ctx.fillStyle = (c + r) % 3 === 0 ? tp.wallTopAlt : tp.wallTop;
    ctx.fillRect(x, y, ts, ts);

    // Subtle 2D cel-shaded inner bevel
    ctx.fillStyle = tp.wallEdge;
    if (!nUp) ctx.fillRect(x + 2, y + 2, ts - 4, 3);
    if (!nLeft) ctx.fillRect(x + 2, y + 2, 3, ts - 4);
    ctx.fillStyle = tp.wallSide;
    if (!nDown) ctx.fillRect(x + 2, y + ts - 5, ts - 4, 3);
    if (!nRight) ctx.fillRect(x + ts - 5, y + 2, 3, ts - 4);

    if (theme === 'fortress') {
      // Sci-Fi Arena: metallic inner plate & yellow hazard stripes on exposed interior walls
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 5, y + 5, ts - 10, ts - 10);

      if (!isBorder && (!nDown || !nUp) && (c + r) % 2 === 0) {
        const stripeY = !nDown ? y + ts - 8 : y + 4;
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(x + 5, stripeY, ts - 10, 4);
        ctx.fillStyle = '#0F172A';
        for (let sx = x + 7; sx < x + ts - 8; sx += 6) {
          ctx.fillRect(sx, stripeY, 3, 4);
        }
      }
    } else if (theme === 'jungle') {
      // Jungle Outpost: mossy stone patches & small 2D vine leaves
      if ((c + r) % 2 === 0) {
        ctx.fillStyle = 'rgba(54, 130, 71, 0.42)';
        ctx.fillRect(x + 5, y + 5, 10, 8);
      }
      if (!isBorder && (!nDown || !nRight || !nLeft) && h < 0.65) {
        ctx.fillStyle = '#368247';
        ctx.strokeStyle = PALETTE.bg0;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x + 9, y + 9, 4, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 22, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(x + 8, y + 8, 2, 2);
      }
    } else if (theme === 'temple') {
      // Ancient Temple: flat warm sandstone block with subtle 2D cracks
      ctx.strokeStyle = 'rgba(88, 72, 52, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 5, y + 5, ts - 10, ts - 10);
      if (h < 0.55) {
        ctx.strokeStyle = '#3F3122';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 10);
        ctx.lineTo(x + 15, y + 15);
        ctx.lineTo(x + 22, y + 12);
        ctx.stroke();
      }
    }

    // Thick dark 2px-3px outer outline along exposed block edges
    ctx.fillStyle = PALETTE.bg0;
    if (!nUp) ctx.fillRect(x, y, ts, 2.4);
    if (!nDown) ctx.fillRect(x, y + ts - 2.4, ts, 2.4);
    if (!nLeft) ctx.fillRect(x, y, 2.4, ts);
    if (!nRight) ctx.fillRect(x + ts - 2.4, y, 2.4, ts);
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(x + 7, y + 12, 6, 4);
      ctx.fillRect(x + 19, y + 18, 5, 4);
      return;
    }

    // Strict Flat 2D Top-Down 1x1 Grid Square Crate (2-3px dark outline)
    ctx.fillStyle = tp.crateBody;
    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);

    // Inner cel-shaded bevel & cross-brace
    ctx.strokeStyle = tp.crateTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, ts - 10, ts - 10);

    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + ts - 6, y + ts - 6);
    ctx.moveTo(x + ts - 6, y + 6);
    ctx.lineTo(x + 6, y + ts - 6);
    ctx.stroke();

    if (theme === 'fortress') {
      // Sci-Fi Arena: yellow 1x1 crate with dark hazard center band
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(x + 10, y + 13, ts - 20, 6);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(x + 12, y + 15, ts - 24, 2);
    } else if (theme === 'temple') {
      // Ancient Temple: dark-brown reinforced 1x1 wooden crate with corner brackets
      ctx.fillStyle = '#D4A14B';
      ctx.fillRect(x + 3, y + 3, 4, 4);
      ctx.fillRect(x + ts - 7, y + 3, 4, 4);
      ctx.fillRect(x + 3, y + ts - 7, 4, 4);
      ctx.fillRect(x + ts - 7, y + ts - 7, 4, 4);
    }

    // Thick 2.4px dark outer outline
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);

    if (hp < 75) {
      ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : PALETTE.bg0;
      ctx.lineWidth = hp < 35 ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 7);
      ctx.lineTo(x + 16, y + 15);
      ctx.lineTo(x + 12, y + 23);
      ctx.stroke();
    }
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
    if (theme === 'fortress') {
      for (let r = minRow; r <= maxRow; r += 1) {
        for (let c = minCol; c <= maxCol; c += 1) {
          if (map.tiles[r][c] !== 'floor') continue;
          const x = c * ts;
          const y = r * ts;
          const h = tileHash(c, r, map.seed);

          if (r % 8 === 4 && c > 2 && c < map.width - 3) {
            ctx.fillStyle = 'rgba(11, 18, 34, 0.7)';
            ctx.fillRect(x, y + 13, ts, 6);
            ctx.fillStyle = 'rgba(34, 211, 238, 0.24)';
            ctx.fillRect(x, y + 15, ts, 2);
          } else if (c % 10 === 5 && r > 2 && r < map.height - 3) {
            ctx.fillStyle = 'rgba(11, 18, 34, 0.7)';
            ctx.fillRect(x + 13, y, 6, ts);
            ctx.fillStyle = 'rgba(79, 140, 255, 0.22)';
            ctx.fillRect(x + 15, y, 2, ts);
          }

          if (h < 0.08) {
            ctx.fillStyle = '#0B101D';
            ctx.fillRect(x + 6, y + 6, 20, 20);
            ctx.fillStyle = '#1E2C47';
            for (let vy = 8; vy <= 22; vy += 4) {
              ctx.fillRect(x + 8, y + vy, 16, 2);
            }
          } else if (h > 0.94) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
            ctx.fillRect(x + 8, y + 14, 16, 4);
          }
        }
      }
      return;
    }

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

  drawZonesAndBases(
    ctx: CanvasRenderingContext2D,
    state: Readonly<GameState>,
    baseFlash: { player: number; enemy: number },
  ): void {
    if (state.matchConfig.mode === 'rampage') return;
    const time = state.time;
    const theme: MapTheme = state.map.theme ?? 'fortress';
    const tp = getThemePalette(theme);
    const hellcellBreach =
      state.matchConfig.mode === 'hellcell' &&
      state.hellcell &&
      state.hellcell.phase !== 'NORMAL';

    const breachZoneId = state.hellcell?.emergenceZoneId ?? 'zone-2';

    for (const def of state.map.zones) {
      if (hellcellBreach && def.id === breachZoneId && (state.hellcell?.bossCount ?? 0) === 0) {
        // Zone B is deactivated during Hellcell breach: draw a pulsing red/dark breach perimeter
        ctx.save();
        ctx.translate(def.center.x, def.center.y);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(def.radius, 76), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
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

      if (theme === 'fortress') {
        // Recessed circular gunmetal energy containment pad beneath holographic capture rings
        ctx.fillStyle = 'rgba(4, 8, 18, 0.56)';
        ctx.beginPath();
        ctx.arc(0, 0, zoneR + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#172030';
        ctx.beginPath();
        ctx.arc(0, 0, zoneR + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Radial turbine & containment deck groove ticks
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1.4;
        for (let s = 0; s < 12; s += 1) {
          const sa = (s / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sa) * (zoneR - 18), Math.sin(sa) * (zoneR - 18));
          ctx.lineTo(Math.cos(sa) * (zoneR + 5), Math.sin(sa) * (zoneR + 5));
          ctx.stroke();
        }

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(0, 0, zoneR - 16, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === 'jungle' || theme === 'temple') {
        ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
        ctx.beginPath();
        ctx.arc(3, 5, zoneR + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme === 'temple' ? '#9C7B4C' : '#4A5445';
        ctx.beginPath();
        ctx.arc(0, 0, zoneR + 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme === 'temple' ? '#2A1B0A' : '#242B20';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        if (theme === 'temple') {
          // Lapis-blue & gold inlaid outer capture altar ring
          ctx.strokeStyle = 'rgba(29, 78, 216, 0.65)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, 0, zoneR + 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.52)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, zoneR - 9, 0, Math.PI * 2);
          ctx.stroke();
        } else if (theme === 'jungle') {
          ctx.strokeStyle = 'rgba(20, 26, 18, 0.55)';
          ctx.lineWidth = 1.4;
          for (let s = 0; s < 10; s += 1) {
            const sa = (s / 10) * Math.PI * 2 + 0.2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(sa) * (zoneR - 14), Math.sin(sa) * (zoneR - 14));
            ctx.lineTo(Math.cos(sa) * (zoneR + 6), Math.sin(sa) * (zoneR + 6));
            ctx.stroke();
          }
        }

        ctx.fillStyle = theme === 'temple' ? '#6D5333' : '#323C2F';
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
    ctx.strokeStyle = p.kind === 'shield' ? PALETTE.player : color;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.font = '800 9px Bahnschrift, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.kind === 'shield' ? PALETTE.playerGlow : color;
    ctx.fillText(
      p.kind === 'shield' ? '+50S' : p.weaponId.slice(0, 3).toUpperCase(),
      0,
      0.5,
    );

    ctx.restore();
  }
}
