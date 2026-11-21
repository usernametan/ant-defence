import type { MapData } from '../../shared/types';
import type { JungleTextureAtlas } from './textures';
import {
  drawBroadLeafPlant,
  drawFoliageAtlasCell,
  drawTreeRoots,
  drawTropicalFernCluster,
} from './vegetation';

export type JungleRuinKind =
  | 'pillar'
  | 'brokenWall'
  | 'templeSanctum'
  | 'archBastion'
  | 'borderCliff';

export type JungleStoneTint = 'mossGrey' | 'warmSandstone' | 'darkBasalt';

export interface JungleRuin {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
  bottomRow: number;
  isBorder: boolean;
  kind: JungleRuinKind;
  elevation: number;
  stoneTint: JungleStoneTint;
  hasArchway: boolean;
  hasCarvedGlyphs: boolean;
  hasVines: boolean;
  hasTopFerns: boolean;
  hasCollapsedCorner: boolean;
  hasRoots: boolean;
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

function splitRuinRect(rect: RawRect, seed: number, out: RawRect[]): void {
  if (rect.w <= 4 && rect.h <= 4) {
    out.push(rect);
    return;
  }

  const h = hash2(rect.col, rect.row, seed + rect.w * 19 + rect.h * 29);
  const splitHoriz = rect.w >= 5 && (rect.h < 5 || (rect.w >= rect.h && h < 0.65));

  if (splitHoriz) {
    const maxFirst = Math.min(4, rect.w - 2);
    const firstW = Math.max(2, 2 + Math.floor(h * (maxFirst - 1)));
    splitRuinRect(
      { col: rect.col, row: rect.row, w: firstW, h: rect.h, isBorder: rect.isBorder },
      seed + 13,
      out,
    );
    splitRuinRect(
      { col: rect.col + firstW, row: rect.row, w: rect.w - firstW, h: rect.h, isBorder: rect.isBorder },
      seed + 29,
      out,
    );
    return;
  }

  const maxFirstH = Math.min(4, rect.h - 2);
  const firstH = Math.max(2, 2 + Math.floor(h * (maxFirstH - 1)));
  splitRuinRect(
    { col: rect.col, row: rect.row, w: rect.w, h: firstH, isBorder: rect.isBorder },
    seed + 37,
    out,
  );
  splitRuinRect(
    { col: rect.col, row: rect.row + firstH, w: rect.w, h: rect.h - firstH, isBorder: rect.isBorder },
    seed + 53,
    out,
  );
}

function describeRuin(rect: RawRect, seed: number, index: number): JungleRuin {
  const rSeed = (seed + rect.col * 73856093 + rect.row * 19349663 + index * 83492791) >>> 0;
  const h1 = hash2(rect.col, rect.row, rSeed);
  const h2 = hash2(rect.col + 7, rect.row + 5, rSeed + 17);
  const h3 = hash2(rect.col + 13, rect.row + 9, rSeed + 41);

  let kind: JungleRuinKind;
  if (rect.isBorder) {
    kind = 'borderCliff';
  } else if (rect.w === 1 && rect.h === 1) {
    kind = 'pillar';
  } else if (rect.w === 1 || rect.h === 1) {
    kind = 'brokenWall';
  } else if (h1 > 0.45) {
    kind = 'templeSanctum';
  } else {
    kind = 'archBastion';
  }

  const elevation =
    kind === 'borderCliff'
      ? 20
      : kind === 'pillar'
        ? 22 + Math.floor(h1 * 5)
        : kind === 'brokenWall'
          ? 20 + Math.floor(h2 * 6)
          : kind === 'templeSanctum'
            ? 28 + Math.floor(h1 * 6)
            : 24 + Math.floor(h2 * 6);

  const tints: JungleStoneTint[] = ['mossGrey', 'warmSandstone', 'darkBasalt'];
  const stoneTint = tints[Math.floor(h2 * 13) % tints.length];

  return {
    id: `jr-${rect.col}-${rect.row}-${rect.w}x${rect.h}`,
    col: rect.col,
    row: rect.row,
    w: rect.w,
    h: rect.h,
    bottomRow: rect.row + rect.h - 1,
    isBorder: rect.isBorder,
    kind,
    elevation,
    stoneTint,
    hasArchway: !rect.isBorder && rect.w >= 3 && h2 > 0.32,
    hasCarvedGlyphs: !rect.isBorder && (rect.w >= 2 || kind === 'pillar') && h1 > 0.25,
    hasVines: !rect.isBorder && h3 > 0.2,
    hasTopFerns: !rect.isBorder && h2 > 0.28,
    hasCollapsedCorner: !rect.isBorder && (rect.w >= 2 || rect.h >= 2) && h1 > 0.44,
    hasRoots: !rect.isBorder && h3 > 0.36,
    seed: rSeed,
    canvas: null,
    drawX: 0,
    drawY: 0,
  };
}

/**
 * Decomposes all wall tiles in a Jungle Outpost map into varied, non-overlapping
 * ancient temple sanctums, ruined walls, weathered pillars, and border cliffs.
 */
export function decomposeJungleRuins(map: MapData): JungleRuin[] {
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

      splitRuinRect(
        { col: c, row: r, w: rw, h: rh, isBorder: false },
        map.seed,
        rects,
      );
    }
  }

  return rects.map((rect, idx) => describeRuin(rect, map.seed, idx));
}

function drawOrganicMossPatch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  const pts = 11;
  for (let i = 0; i <= pts; i += 1) {
    const a = (i / pts) * Math.PI * 2;
    const radScale = 0.65 + hash2(i, 3, seed) * 0.55;
    const px = cx + Math.cos(a) * rx * radScale;
    const py = cy + Math.sin(a) * ry * radScale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function bakeBrokenPillarCanvas(
  ctx: CanvasRenderingContext2D,
  ruin: JungleRuin,
  textures: JungleTextureAtlas,
  rx: number,
  ry: number,
  ts: number,
): void {
  const groundTopY = ry;
  const plinthH = 8;

  // 1. Stepped square stone plinth base resting on tile footprint
  ctx.fillStyle = '#4B4E40';
  ctx.fillRect(rx, groundTopY + ts - plinthH, ts, plinthH);
  ctx.fillStyle = '#6B6E5B';
  ctx.fillRect(rx, groundTopY, ts, ts - plinthH);
  ctx.strokeStyle = '#141911';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(rx, groundTopY, ts, ts);

  // Inner carved torus collar
  ctx.fillStyle = '#575A4B';
  ctx.fillRect(rx + 3, groundTopY + 3, ts - 6, ts - 8);
  ctx.strokeStyle = 'rgba(20, 24, 18, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(rx + 3, groundTopY + 3, ts - 6, ts - 8);

  // 2. Tall cylindrical fluted column shaft rising into roof plane
  const colW = ts - 10;
  const colX = rx + 5;
  const shaftBotY = groundTopY + ts * 0.72;
  const shaftTopY = ry + 4;

  const cylGrad = ctx.createLinearGradient(colX, 0, colX + colW, 0);
  cylGrad.addColorStop(0, '#8C8B74');
  cylGrad.addColorStop(0.35, '#767763');
  cylGrad.addColorStop(0.75, '#4F5243');
  cylGrad.addColorStop(1, '#31352A');

  ctx.fillStyle = cylGrad;
  ctx.beginPath();
  ctx.moveTo(colX, shaftTopY);
  ctx.lineTo(colX, shaftBotY);
  ctx.ellipse(rx + ts * 0.5, shaftBotY, colW * 0.5, 5.5, 0, Math.PI, 0, true);
  ctx.lineTo(colX + colW, shaftTopY);
  ctx.closePath();
  ctx.fill();

  const stonePat = textures.getPattern(ctx, 'wallRuinStone', 0.25);
  if (stonePat) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = stonePat;
    ctx.fill();
    ctx.restore();
  }

  // Vertical Classical Fluting Grooves
  ctx.strokeStyle = 'rgba(18, 22, 16, 0.48)';
  ctx.lineWidth = 1.1;
  for (let fx = colX + 4; fx < colX + colW - 3; fx += 4.5) {
    ctx.beginPath();
    ctx.moveTo(fx, shaftTopY + 5);
    ctx.lineTo(fx, shaftBotY + 2);
    ctx.stroke();
  }

  // Jagged fractured broken pillar top cross-section
  ctx.fillStyle = '#8F8E78';
  ctx.beginPath();
  ctx.moveTo(colX, shaftTopY + 2);
  ctx.lineTo(colX + colW * 0.28, shaftTopY - 3);
  ctx.lineTo(colX + colW * 0.62, shaftTopY + 1);
  ctx.lineTo(colX + colW, shaftTopY - 2);
  ctx.lineTo(colX + colW, shaftTopY + 6);
  ctx.ellipse(rx + ts * 0.5, shaftTopY + 5, colW * 0.5, 4.5, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#121811';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Cushion of moss over pillar top + trailing vine down flute
  drawOrganicMossPatch(ctx, colX + colW * 0.35, shaftTopY + 2, 7, 4, ruin.seed, '#3D7E3D');
  ctx.strokeStyle = '#2B6130';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(colX + colW * 0.3, shaftTopY + 4);
  ctx.quadraticCurveTo(colX + colW * 0.48, (shaftTopY + shaftBotY) * 0.5, colX + colW * 0.35, shaftBotY);
  ctx.stroke();

  if (ruin.hasTopFerns) {
    drawTropicalFernCluster(ctx, colX + colW * 0.6, shaftTopY + 2, 0.62, ruin.seed * 0.2, ruin.seed);
  }
}

function drawRuinFacade(
  ctx: CanvasRenderingContext2D,
  ruin: JungleRuin,
  textures: JungleTextureAtlas,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): void {
  const pat = textures.getPattern(ctx, 'wallRuinStone', 0.32);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();

  ctx.fillStyle = pat ?? '#57584A';
  ctx.fillRect(fx, fy, fw, fh);

  // Darken south facade relative to sunlit roof crest & apply architectural stone tint
  ctx.fillStyle =
    ruin.stoneTint === 'warmSandstone'
      ? 'rgba(98, 78, 48, 0.32)'
      : ruin.stoneTint === 'darkBasalt'
        ? 'rgba(18, 24, 22, 0.42)'
        : 'rgba(24, 32, 24, 0.32)';
  ctx.fillRect(fx, fy, fw, fh);

  // Monumental cut ashlar horizontal stone courses
  ctx.strokeStyle = 'rgba(12, 16, 12, 0.46)';
  ctx.lineWidth = 1.2;
  for (let by = fy + 7; by < fy + fh - 3; by += 7) {
    ctx.beginPath();
    ctx.moveTo(fx, by);
    ctx.lineTo(fx + fw, by);
    ctx.stroke();
  }

  // Projecting lower temple plinth base molding
  ctx.fillStyle = 'rgba(34, 38, 30, 0.52)';
  ctx.fillRect(fx, fy + fh - 5, fw, 5);
  ctx.fillStyle = 'rgba(195, 190, 160, 0.16)';
  ctx.fillRect(fx, fy + fh - 5, fw, 1.2);

  // Carved projecting cornice & ancient relief frieze along upper wall band
  if (ruin.hasCarvedGlyphs && fw >= 32) {
    ctx.fillStyle = 'rgba(28, 34, 26, 0.58)';
    ctx.fillRect(fx, fy + 2, fw, 6);
    ctx.fillStyle = 'rgba(176, 178, 148, 0.28)';
    for (let gx = fx + 6; gx < fx + fw - 8; gx += 12) {
      ctx.fillRect(gx, fy + 4, 6, 2);
    }
  }

  // Stepped stone buttress pilasters along wide temple structures
  if (!ruin.isBorder && fw >= 64) {
    for (const px of [fx + 3, fx + fw - 9]) {
      ctx.fillStyle = 'rgba(20, 24, 18, 0.36)';
      ctx.fillRect(px, fy, 6, fh);
      ctx.fillStyle = 'rgba(205, 200, 170, 0.15)';
      ctx.fillRect(px, fy, 1.5, fh);
    }
  }

  // Monumental dark stepped ancient temple archway entrance on wide facades
  if (ruin.hasArchway && fw >= 64 && fh >= 16) {
    const aw = 24;
    const ah = Math.min(fh - 3, 20);
    const ax = fx + Math.floor((fw - aw) * 0.5);
    const ay = fy + fh - ah;

    // Carved flanking lintel pilasters
    ctx.fillStyle = '#6A6C59';
    ctx.fillRect(ax - 6, ay - 2, aw + 12, ah + 2);
    ctx.fillStyle = '#7C7D67';
    ctx.fillRect(ax - 8, ay - 3, aw + 16, 4);
    ctx.strokeStyle = '#181D15';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ax - 8, ay - 3, aw + 16, 4);

    // Corbeled Mayan/Angkor-style stepped archway recess
    ctx.fillStyle = '#0A0F0B';
    ctx.beginPath();
    ctx.moveTo(ax, fy + fh);
    ctx.lineTo(ax, ay + 9);
    ctx.lineTo(ax + 4, ay + 9);
    ctx.lineTo(ax + 4, ay + 5);
    ctx.lineTo(ax + 8, ay + 5);
    ctx.lineTo(ax + 8, ay + 1);
    ctx.lineTo(ax + aw - 8, ay + 1);
    ctx.lineTo(ax + aw - 8, ay + 5);
    ctx.lineTo(ax + aw - 4, ay + 5);
    ctx.lineTo(ax + aw - 4, ay + 9);
    ctx.lineTo(ax + aw, ay + 9);
    ctx.lineTo(ax + aw, fy + fh);
    ctx.closePath();
    ctx.fill();
  }

  // Damp ground moss climbing base masonry
  const mossGrad = ctx.createLinearGradient(fx, fy + fh - 11, fx, fy + fh);
  mossGrad.addColorStop(0, 'rgba(38, 92, 42, 0)');
  mossGrad.addColorStop(1, 'rgba(40, 96, 44, 0.58)');
  ctx.fillStyle = mossGrad;
  ctx.fillRect(fx, fy + fh - 11, fw, 11);

  // Crisp roof-overhang shadow
  const topShadow = ctx.createLinearGradient(fx, fy, fx, fy + 8);
  topShadow.addColorStop(0, 'rgba(8, 12, 9, 0.68)');
  topShadow.addColorStop(1, 'rgba(8, 12, 9, 0)');
  ctx.fillStyle = topShadow;
  ctx.fillRect(fx, fy, fw, 8);

  // Hanging jungle vine curtains draping down stone facade
  if (ruin.hasVines && fw >= 24) {
    const vineCount = Math.max(2, Math.floor(fw / 22));
    for (let i = 0; i < vineCount; i += 1) {
      const vx = fx + 8 + hash2(i, ruin.col, ruin.seed) * Math.max(4, fw - 16);
      const vLen = 8 + hash2(i, ruin.row, ruin.seed + 9) * Math.max(6, fh - 8);
      ctx.strokeStyle = '#24592C';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(vx, fy);
      ctx.quadraticCurveTo(vx + 3, fy + vLen * 0.5, vx - 1, fy + vLen);
      ctx.stroke();
      ctx.fillStyle = '#4B9646';
      ctx.beginPath();
      ctx.ellipse(vx + 1.5, fy + vLen * 0.45, 2.8, 1.4, 0.6, 0, Math.PI * 2);
      ctx.ellipse(vx - 1.5, fy + vLen * 0.82, 2.4, 1.3, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Base contact shadow
  ctx.fillStyle = 'rgba(8, 10, 8, 0.48)';
  ctx.fillRect(fx, fy + fh - 3, fw, 3);
  ctx.restore();

  ctx.strokeStyle = '#111610';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
}

/**
 * Renders an ancient jungle temple ruin, broken fluted pillar, or bastion wall
 * into its cached 2.5D canvas with weathered stone courses, moss, roots, and ferns.
 */
export function bakeRuinCanvas(
  ruin: JungleRuin,
  textures: JungleTextureAtlas,
  tileSize: number,
): void {
  if (typeof document === 'undefined') return;
  const padX = 12;
  const padTop = 16;
  const padBottom = 6;
  const bw = ruin.w * tileSize;
  const fullBh = ruin.h * tileSize;
  const facadeH = Math.min(ruin.elevation, Math.max(10, Math.floor(fullBh * 0.32)));
  const bh = fullBh - facadeH;

  const canvas = ruin.canvas ?? document.createElement('canvas');
  canvas.width = bw + padX * 2;
  canvas.height = fullBh + padTop + padBottom;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rx = padX;
  const ry = padTop;

  if (ruin.kind === 'pillar') {
    bakeBrokenPillarCanvas(ctx, ruin, textures, rx, ry, tileSize);
    ruin.canvas = canvas;
    ruin.drawX = ruin.col * tileSize - padX;
    ruin.drawY = ruin.row * tileSize - padTop;
    return;
  }

  // 1. South-facing 2.5D monumental temple facade
  drawRuinFacade(ctx, ruin, textures, rx, ry + bh, bw, facadeH);

  // 2. Monumental ancient masonry parapet top
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, bw, bh);
  ctx.clip();

  const stonePat = textures.getPattern(ctx, 'wallRuinStone', 0.34);
  ctx.fillStyle = stonePat ?? '#585B4C';
  ctx.fillRect(rx, ry, bw, bh);

  if (ruin.isBorder) {
    // Deep forest shade & moss patina on perimeter jungle boundary cliffs
    ctx.fillStyle = 'rgba(14, 24, 15, 0.56)';
    ctx.fillRect(rx, ry, bw, bh);
  } else if (ruin.stoneTint === 'warmSandstone') {
    ctx.fillStyle = 'rgba(132, 108, 68, 0.22)';
    ctx.fillRect(rx, ry, bw, bh);
  } else if (ruin.stoneTint === 'darkBasalt') {
    ctx.fillStyle = 'rgba(18, 26, 22, 0.28)';
    ctx.fillRect(rx, ry, bw, bh);
  } else {
    ctx.fillStyle = 'rgba(54, 80, 50, 0.16)';
    ctx.fillRect(rx, ry, bw, bh);
  }

  // Monumental cut parapet slab outlines
  ctx.strokeStyle = 'rgba(14, 18, 12, 0.36)';
  ctx.lineWidth = 1.2;
  for (let sy = ry + 16; sy < ry + bh; sy += 16) {
    ctx.beginPath();
    ctx.moveTo(rx, sy);
    ctx.lineTo(rx + bw, sy);
    ctx.stroke();
  }

  // Stepped temple sanctuary roof terrace rim & chiseled inner courtyard ledge
  if (ruin.kind === 'templeSanctum' || ruin.kind === 'archBastion') {
    ctx.strokeStyle = 'rgba(220, 212, 174, 0.30)';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx + 4, ry + 4, bw - 8, bh - 8);
    ctx.strokeStyle = 'rgba(12, 16, 12, 0.54)';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(rx + 8, ry + 8, bw - 16, bh - 16);

    if (bw >= 64 && bh >= 64) {
      ctx.fillStyle = 'rgba(18, 24, 16, 0.32)';
      ctx.fillRect(rx + 14, ry + 14, bw - 28, bh - 28);
      ctx.strokeStyle = 'rgba(218, 210, 175, 0.24)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 14, ry + 14, bw - 28, bh - 28);
    }
  } else if (ruin.kind === 'brokenWall') {
    ctx.strokeStyle = 'rgba(16, 20, 14, 0.48)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 3, ry + 3, bw - 6, bh - 6);
  }

  // Stepped collapsed corner masonry revealing lower stone courses
  if (ruin.hasCollapsedCorner) {
    ctx.fillStyle = 'rgba(20, 24, 18, 0.56)';
    ctx.beginPath();
    ctx.moveTo(rx + bw - 18, ry);
    ctx.lineTo(rx + bw, ry);
    ctx.lineTo(rx + bw, ry + 16);
    ctx.lineTo(rx + bw - 8, ry + 16);
    ctx.lineTo(rx + bw - 8, ry + 8);
    ctx.lineTo(rx + bw - 18, ry + 8);
    ctx.closePath();
    ctx.fill();
  }

  // Irregular organic moss cushions creeping over stone ledges
  const mossCount = Math.max(2, Math.floor((ruin.w * ruin.h) * 0.75));
  for (let i = 0; i < mossCount; i += 1) {
    const mx = rx + 6 + hash2(i, ruin.col, ruin.seed + 71) * Math.max(6, bw - 12);
    const my = ry + 6 + hash2(ruin.row, i, ruin.seed + 83) * Math.max(6, bh - 12);
    const mr = 6 + hash2(i, i, ruin.seed + 97) * 8;
    drawOrganicMossPatch(
      ctx,
      mx,
      my,
      mr,
      mr * 0.72,
      ruin.seed + i * 31,
      i % 2 === 0 ? 'rgba(38, 92, 40, 0.65)' : 'rgba(60, 122, 52, 0.55)',
    );
  }

  // Creeping strangler-fig roots wrapping over parapet stone
  if (ruin.hasRoots && bw >= 32) {
    const drewAtlasRoot = drawFoliageAtlasCell(
      ctx,
      3,
      1,
      rx + bw * 0.35,
      ry + bh * 0.5,
      Math.min(bw, 48),
      ruin.seed * 0.13,
      textures,
    );
    if (!drewAtlasRoot) {
      drawTreeRoots(
        ctx,
        rx + 4,
        ry + bh * 0.42,
        0.24,
        Math.min(bw - 6, 46),
        ruin.seed + 109,
      );
    }
  }

  // Warm afternoon sunlit rim on interior ruins only (border cliffs remain forest-shaded)
  if (!ruin.isBorder) {
    ctx.fillStyle = 'rgba(255, 238, 186, 0.32)';
    ctx.fillRect(rx, ry, bw, 2.2);
    ctx.fillRect(rx, ry, 2.2, bh);
  }
  ctx.fillStyle = 'rgba(10, 14, 10, 0.42)';
  ctx.fillRect(rx, ry + bh - 2.2, bw, 2.2);
  ctx.fillRect(rx + bw - 2.2, ry, 2.2, bh);

  ctx.restore();

  ctx.strokeStyle = '#121811';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(rx, ry, bw, bh);

  // Overgrown rooftop ferns & broadleaf rosettes from foliage atlas overhanging parapet
  if (ruin.hasTopFerns) {
    const fx = rx + 8 + hash2(ruin.col, 1, ruin.seed + 151) * Math.max(4, bw - 16);
    const fy = ry + 8 + hash2(1, ruin.row, ruin.seed + 157) * Math.max(4, bh - 16);
    const drewAtlasFern = drawFoliageAtlasCell(
      ctx,
      2,
      1,
      fx,
      fy,
      28,
      ruin.seed * 0.17,
      textures,
    );
    if (!drewAtlasFern) {
      if (hash2(ruin.col, ruin.row, ruin.seed + 163) > 0.45) {
        drawTropicalFernCluster(ctx, fx, fy, 0.92, ruin.seed * 0.1, ruin.seed);
      } else {
        drawBroadLeafPlant(ctx, fx, fy, 0.92, ruin.seed);
      }
    }
  }

  ruin.canvas = canvas;
  ruin.drawX = ruin.col * tileSize - padX;
  ruin.drawY = ruin.row * tileSize - padTop;
}
