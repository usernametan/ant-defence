import type { MapData } from '../../shared/types';
import {
  drawHazardChevronStrip,
  drawRecessedVentGrille,
  drawSciFiAtlasCell,
} from './props';
import type { FortressTextureAtlas } from './textures';

export type FortressStructureKind =
  | 'techPillar'
  | 'reactorTower'
  | 'glassLabBay'
  | 'acceleratorCradle'
  | 'commandSuperstructure'
  | 'perimeterWall';

export type SciFiAccentTone = 'cyan' | 'violet' | 'amber';

export interface FortressStructure {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
  bottomRow: number;
  isBorder: boolean;
  kind: FortressStructureKind;
  elevation: number;
  accentTone: SciFiAccentTone;
  hasHazardTrim: boolean;
  hasHvacVent: boolean;
  hasDoorHatch: boolean;
  hasRooftopPipe: boolean;
  seed: number;
  canvas: HTMLCanvasElement | null;
  drawX: number;
  drawY: number;
}

export function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface RawRect {
  col: number;
  row: number;
  w: number;
  h: number;
  isBorder: boolean;
}

function splitStructureRect(rect: RawRect, seed: number, out: RawRect[]): void {
  if (rect.w <= 4 && rect.h <= 4) {
    out.push(rect);
    return;
  }

  const h = hash2(rect.col, rect.row, seed + rect.w * 19 + rect.h * 29);
  const splitHoriz = rect.w >= 5 && (rect.h < 5 || (rect.w >= rect.h && h < 0.65));

  if (splitHoriz) {
    const maxFirst = Math.min(4, rect.w - 2);
    const firstW = Math.max(2, 2 + Math.floor(h * (maxFirst - 1)));
    splitStructureRect(
      { col: rect.col, row: rect.row, w: firstW, h: rect.h, isBorder: rect.isBorder },
      seed + 13,
      out,
    );
    splitStructureRect(
      { col: rect.col + firstW, row: rect.row, w: rect.w - firstW, h: rect.h, isBorder: rect.isBorder },
      seed + 29,
      out,
    );
    return;
  }

  const maxFirstH = Math.min(4, rect.h - 2);
  const firstH = Math.max(2, 2 + Math.floor(h * (maxFirstH - 1)));
  splitStructureRect(
    { col: rect.col, row: rect.row, w: rect.w, h: firstH, isBorder: rect.isBorder },
    seed + 37,
    out,
  );
  splitStructureRect(
    { col: rect.col, row: rect.row + firstH, w: rect.w, h: rect.h - firstH, isBorder: rect.isBorder },
    seed + 53,
    out,
  );
}

function describeStructure(
  rect: RawRect,
  mapWidth: number,
  mapHeight: number,
  seed: number,
  index: number,
): FortressStructure {
  const fSeed = (seed + rect.col * 73856093 + rect.row * 19349663 + index * 83492791) >>> 0;
  const h1 = hash2(rect.col, rect.row, fSeed);
  const h2 = hash2(rect.col + 7, rect.row + 5, fSeed + 17);
  const h3 = hash2(rect.col + 13, rect.row + 9, fSeed + 41);

  const cx = rect.col + rect.w * 0.5;
  const cy = rect.row + rect.h * 0.5;
  const inUpperHalf = cy < mapHeight * 0.45;
  const inLeftHalf = cx < mapWidth * 0.45;

  let kind: FortressStructureKind;
  if (rect.isBorder) {
    kind = 'perimeterWall';
  } else if (rect.w === 1 && rect.h === 1) {
    kind = 'techPillar';
  } else if (rect.w >= 2 && rect.h >= 2 && inLeftHalf && inUpperHalf) {
    kind = h1 > 0.35 ? 'reactorTower' : 'commandSuperstructure';
  } else if (rect.w >= 2 && rect.h >= 2 && inLeftHalf && !inUpperHalf) {
    kind = h1 > 0.3 ? 'glassLabBay' : 'commandSuperstructure';
  } else if (rect.w >= 2 && rect.h >= 2 && !inLeftHalf && !inUpperHalf) {
    kind = h1 > 0.35 ? 'acceleratorCradle' : 'commandSuperstructure';
  } else if (rect.w >= 2 && rect.h >= 2) {
    kind = h1 < 0.36 ? 'commandSuperstructure' : h1 < 0.7 ? 'glassLabBay' : 'reactorTower';
  } else if (rect.w >= 3 && h2 > 0.45) {
    kind = 'acceleratorCradle';
  } else {
    kind = 'commandSuperstructure';
  }

  const elevation =
    kind === 'perimeterWall'
      ? 22
      : kind === 'techPillar'
        ? 23 + Math.floor(h1 * 4)
        : kind === 'reactorTower' || kind === 'commandSuperstructure'
          ? 28 + Math.floor(h1 * 6)
          : 25 + Math.floor(h2 * 5);

  const accentTone: SciFiAccentTone = h3 > 0.72 ? 'violet' : h3 > 0.16 ? 'cyan' : 'amber';

  return {
    id: `sf-${rect.col}-${rect.row}-${rect.w}x${rect.h}`,
    col: rect.col,
    row: rect.row,
    w: rect.w,
    h: rect.h,
    bottomRow: rect.row + rect.h - 1,
    isBorder: rect.isBorder,
    kind,
    elevation,
    accentTone,
    hasHazardTrim: !rect.isBorder && (rect.w >= 2 || h2 > 0.48),
    hasHvacVent: !rect.isBorder && (rect.w >= 2 || kind === 'techPillar'),
    hasDoorHatch: !rect.isBorder && rect.w >= 3 && h1 > 0.4,
    hasRooftopPipe: !rect.isBorder && rect.w >= 2 && h3 > 0.38,
    seed: fSeed,
    canvas: null,
    drawX: 0,
    drawY: 0,
  };
}

/**
 * Decomposes all wall tiles in a Sci-Fi Arena map into non-overlapping modular
 * futuristic research reactors, glass lab bays, superstructures, and armored pillars.
 */
export function decomposeFortressStructures(map: MapData): FortressStructure[] {
  const rects: RawRect[] = [];
  const W = map.width;
  const H = map.height;

  for (let c = 0; c < W; c += 5) {
    const segW = Math.min(5, W - c);
    if (map.tiles[0][c] === 'wall') rects.push({ col: c, row: 0, w: segW, h: 1, isBorder: true });
    if (map.tiles[H - 1][c] === 'wall') {
      rects.push({ col: c, row: H - 1, w: segW, h: 1, isBorder: true });
    }
  }
  for (let r = 1; r < H - 1; r += 5) {
    const segH = Math.min(5, H - 1 - r);
    if (map.tiles[r][0] === 'wall') rects.push({ col: 0, row: r, w: 1, h: segH, isBorder: true });
    if (map.tiles[r][W - 1] === 'wall') {
      rects.push({ col: W - 1, row: r, w: 1, h: segH, isBorder: true });
    }
  }

  const visited: boolean[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => false),
  );

  for (let r = 1; r < H - 1; r += 1) {
    for (let c = 1; c < W - 1; c += 1) {
      if (visited[r][c] || map.tiles[r][c] !== 'wall') continue;

      let rw = 0;
      while (c + rw < W - 1 && map.tiles[r][c + rw] === 'wall' && !visited[r][c + rw]) {
        rw += 1;
      }

      let rh = 1;
      outer: while (r + rh < H - 1) {
        for (let dx = 0; dx < rw; dx += 1) {
          if (map.tiles[r + rh][c + dx] !== 'wall' || visited[r + rh][c + dx]) {
            break outer;
          }
        }
        rh += 1;
      }

      for (let dy = 0; dy < rh; dy += 1) {
        for (let dx = 0; dx < rw; dx += 1) {
          visited[r + dy][c + dx] = true;
        }
      }

      splitStructureRect({ col: c, row: r, w: rw, h: rh, isBorder: false }, map.seed, rects);
    }
  }

  return rects.map((rect, idx) => describeStructure(rect, W, H, map.seed, idx));
}

function accentColorHex(tone: SciFiAccentTone): string {
  if (tone === 'violet') return '#A855F7';
  if (tone === 'amber') return '#FACC15';
  return '#22D3EE';
}

function drawFortressFacade(
  ctx: CanvasRenderingContext2D,
  s: FortressStructure,
  textures: FortressTextureAtlas,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): void {
  const pat = textures.getPattern(ctx, 'wallArmoredHull', 0.34);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();

  ctx.fillStyle = pat ?? '#1E293B';
  ctx.fillRect(fx, fy, fw, fh);

  // Darken south vertical wall facade relative to lit roof armor
  ctx.fillStyle = 'rgba(7, 11, 20, 0.44)';
  ctx.fillRect(fx, fy, fw, fh);

  // Vertical titanium rib seams
  ctx.strokeStyle = 'rgba(7, 11, 20, 0.72)';
  ctx.lineWidth = 1.4;
  for (let bx = fx + 16; bx < fx + fw - 4; bx += 16) {
    ctx.beginPath();
    ctx.moveTo(bx, fy);
    ctx.lineTo(bx, fy + fh);
    ctx.stroke();
  }

  // Yellow & black hazard stripe bumper along lower south base
  if (s.hasHazardTrim && fh >= 16) {
    drawHazardChevronStrip(ctx, fx + 4, fy + fh - 6, fw - 8, 4);
  }

  // Recessed cooling louvers on facade
  if (s.hasHvacVent && fw >= 26 && fh >= 16) {
    drawRecessedVentGrille(ctx, fx + 5, fy + 6, Math.min(20, fw - 10), Math.min(8, fh - 12));
  }

  // Futuristic laboratory bulkhead airlock door on wide modules
  if (s.hasDoorHatch && fw >= 72 && fh >= 18) {
    const dw = 24;
    const dh = Math.min(fh - 3, 18);
    const dx = fx + Math.floor((fw - dw) * 0.5);
    const dy = fy + fh - dh;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = '#070B14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dx + dw * 0.5, dy);
    ctx.lineTo(dx + dw * 0.5, dy + dh);
    ctx.stroke();
    // Cyan doorway lock bar
    ctx.fillStyle = accentColorHex(s.accentTone);
    ctx.fillRect(dx + 4, dy + 3, dw - 8, 2);
  } else if (!s.isBorder && fw >= 32) {
    // Emissive status light bar on bulkhead wall
    ctx.fillStyle = accentColorHex(s.accentTone);
    ctx.fillRect(fx + fw - 11, fy + 6, 6, 2.5);
  }

  // Top roof-overhang shadow cast down onto facade
  const overhangGrad = ctx.createLinearGradient(fx, fy, fx, fy + 7);
  overhangGrad.addColorStop(0, 'rgba(3, 6, 14, 0.78)');
  overhangGrad.addColorStop(1, 'rgba(3, 6, 14, 0)');
  ctx.fillStyle = overhangGrad;
  ctx.fillRect(fx, fy, fw, 7);

  ctx.restore();

  ctx.strokeStyle = '#070B14';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
}

/**
 * Renders an entire Futuristic Research Facility module into its 2.5D offscreen canvas
 * with beveled titanium roofs, glowing reactor/cleanroom installations, HVAC turbines, and hazard trim.
 */
export function bakeFortressStructureCanvas(
  s: FortressStructure,
  textures: FortressTextureAtlas,
  tileSize: number,
): void {
  if (typeof document === 'undefined') return;
  const padX = 12;
  const padTop = 14;
  const padBottom = 5;
  const bw = s.w * tileSize;
  const fullBh = s.h * tileSize;
  const facadeH = Math.min(s.elevation, Math.max(10, Math.floor(fullBh * 0.32)));
  const bh = fullBh - facadeH;

  const canvas = s.canvas ?? document.createElement('canvas');
  canvas.width = bw + padX * 2;
  canvas.height = fullBh + padTop + padBottom;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rx = padX;
  const ry = padTop;

  // 1. South-facing 2.5D metallic facade
  drawFortressFacade(ctx, s, textures, rx, ry + bh, bw, facadeH);

  // 2. Rooftop architectural module
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, bw, bh);
  ctx.clip();

  const hullPat = textures.getPattern(ctx, 'wallArmoredHull', 0.34);
  ctx.fillStyle = hullPat ?? '#2B364B';
  ctx.fillRect(rx, ry, bw, bh);

  if (s.isBorder) {
    ctx.fillStyle = 'rgba(7, 11, 20, 0.48)';
    ctx.fillRect(rx, ry, bw, bh);
    // Subtle cyan/purple perimeter conduit indicator dots
    ctx.fillStyle = s.accentTone === 'violet' ? 'rgba(168, 85, 247, 0.65)' : 'rgba(34, 211, 238, 0.55)';
    for (let i = 16; i < Math.max(bw, bh); i += 64) {
      if (bw >= bh) ctx.fillRect(rx + i, ry + bh * 0.5 - 1.5, 6, 3);
      else ctx.fillRect(rx + bw * 0.5 - 1.5, ry + i, 3, 6);
    }
  } else if (s.kind === 'techPillar') {
    // Detailed 1x1 armored structural pylon cap with glowing center node & corner hazard ticks
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 4, ry + 4, bw - 8, bh - 8);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(rx + 8, ry + 8, bw - 16, bh - 16);
    ctx.fillStyle = accentColorHex(s.accentTone);
    ctx.fillRect(rx + 12, ry + 12, bw - 24, bh - 24);
  } else {
    // Recessed titanium roof deck rim
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 3, ry + 3, bw - 6, bh - 6);
    ctx.strokeStyle = 'rgba(7, 11, 20, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 6, ry + 6, bw - 12, bh - 12);

    // Embed flagship scifi_atlas research hardware when footprint is >= 2x2
    if (bw >= tileSize * 2 && bh >= tileSize * 2) {
      const mSize = Math.min(bw, bh) - 6;
      const cell =
        s.kind === 'reactorTower'
          ? { col: 0, row: 0 }
          : s.kind === 'glassLabBay'
            ? { col: 1, row: 0 }
            : s.kind === 'acceleratorCradle'
              ? { col: 2, row: 0 }
              : { col: 3, row: 0 };

      const drewAtlas = drawSciFiAtlasCell(
        ctx,
        cell.col,
        cell.row,
        rx + bw * 0.5,
        ry + bh * 0.5,
        s.kind === 'acceleratorCradle' ? bw - 6 : mSize,
        mSize,
        0,
        textures,
      );
      if (!drewAtlas) {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(rx + 10, ry + 10, bw - 20, bh - 20);
        ctx.fillStyle = '#22D3EE';
        ctx.fillRect(rx + bw * 0.5 - 8, ry + bh * 0.5 - 8, 16, 16);
      }

      // Flanking secondary machinery modules on wide 3x2 / 4x3 installations
      if (bw >= tileSize * 3) {
        drawSciFiAtlasCell(
          ctx,
          s.accentTone === 'violet' ? 3 : 2,
          1,
          rx + 22,
          ry + bh - 20,
          26,
          26,
          0,
          textures,
        );
      }
    } else {
      // Narrow 1xN or Nx1 industrial wall segment with rooftop HVAC louvers & pipe runs
      if (bw >= bh) {
        drawRecessedVentGrille(ctx, rx + 8, ry + 7, Math.min(28, bw - 16), bh - 14);
        if (bw >= 96) {
          drawSciFiAtlasCell(ctx, 1, 1, rx + bw - 22, ry + bh * 0.5, 22, 22, 0, textures);
        }
      } else {
        drawRecessedVentGrille(ctx, rx + 7, ry + 8, bw - 14, Math.min(28, bh - 16));
      }
    }

    // Yellow-black hazard corner tabs along rooftop edges matching concept art
    if (s.hasHazardTrim && bw >= 64) {
      drawHazardChevronStrip(ctx, rx + 6, ry + bh - 6, 22, 4);
      drawHazardChevronStrip(ctx, rx + bw - 28, ry + bh - 6, 22, 4);
    }

    // External rooftop coolant pipes
    if (s.hasRooftopPipe && bw >= 64) {
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx + 6, ry + 10);
      ctx.lineTo(rx + bw - 6, ry + 10);
      ctx.stroke();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Crisp metallic NW specular rim & SE dark bevel
  if (!s.isBorder) {
    ctx.fillStyle = 'rgba(203, 213, 225, 0.28)';
    ctx.fillRect(rx, ry, bw, 2);
    ctx.fillRect(rx, ry, 2, bh);
  }
  ctx.fillStyle = 'rgba(4, 8, 18, 0.55)';
  ctx.fillRect(rx, ry + bh - 2, bw, 2);
  ctx.fillRect(rx + bw - 2, ry, 2, bh);

  ctx.restore();

  ctx.strokeStyle = '#070B14';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(rx, ry, bw, bh);

  s.canvas = canvas;
  s.drawX = s.col * tileSize - padX;
  s.drawY = s.row * tileSize - padTop;
}
