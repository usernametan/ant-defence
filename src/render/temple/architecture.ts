import type { MapData } from '../../shared/types';
import { drawCarvedFloorAnkh, drawEgyptianAtlasCell } from './props';
import type { TempleTextureAtlas } from './textures';

export type TempleStructureKind =
  | 'colonnadePillar'
  | 'templePylon'
  | 'sanctuaryWall'
  | 'obeliskBastion'
  | 'borderWall';

export type EgyptianSandstoneTint = 'warmGold' | 'roseOchre' | 'agedLimestone';

export interface TempleStructure {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
  bottomRow: number;
  isBorder: boolean;
  kind: TempleStructureKind;
  elevation: number;
  stoneTint: EgyptianSandstoneTint;
  hasTempleEntrance: boolean;
  hasHieroglyphs: boolean;
  hasBanners: boolean;
  isBrokenColumn: boolean;
  hasSandDrift: boolean;
  hasCollapsedCorner: boolean;
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
  if (rect.w <= 5 && rect.h <= 5) {
    out.push(rect);
    return;
  }

  const h = hash2(rect.col, rect.row, seed + rect.w * 19 + rect.h * 29);
  const splitHoriz = rect.w >= 6 && (rect.h < 6 || (rect.w >= rect.h && h < 0.65));

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

function describeStructure(rect: RawRect, seed: number, index: number): TempleStructure {
  const sSeed = (seed + rect.col * 73856093 + rect.row * 19349663 + index * 83492791) >>> 0;
  const h1 = hash2(rect.col, rect.row, sSeed);
  const h2 = hash2(rect.col + 7, rect.row + 5, sSeed + 17);
  const h3 = hash2(rect.col + 13, rect.row + 9, sSeed + 41);

  let kind: TempleStructureKind;
  if (rect.isBorder) {
    kind = 'borderWall';
  } else if (rect.w === 1 && rect.h === 1) {
    kind = 'colonnadePillar';
  } else if (rect.w >= 3) {
    kind = 'templePylon';
  } else if (h1 > 0.48) {
    kind = 'sanctuaryWall';
  } else {
    kind = 'obeliskBastion';
  }

  const elevation =
    kind === 'borderWall'
      ? 22
      : kind === 'colonnadePillar'
        ? (h1 > 0.28 ? 30 : 21)
        : kind === 'templePylon'
          ? 32 + Math.floor(h1 * 5)
          : kind === 'obeliskBastion'
            ? 28 + Math.floor(h2 * 4)
            : 25 + Math.floor(h2 * 5);

  const tints: EgyptianSandstoneTint[] = ['warmGold', 'roseOchre', 'agedLimestone'];
  const stoneTint = tints[Math.floor(h2 * 13) % tints.length];

  return {
    id: `et-${rect.col}-${rect.row}-${rect.w}x${rect.h}`,
    col: rect.col,
    row: rect.row,
    w: rect.w,
    h: rect.h,
    bottomRow: rect.row + rect.h - 1,
    isBorder: rect.isBorder,
    kind,
    elevation,
    stoneTint,
    hasTempleEntrance: !rect.isBorder && rect.w >= 3 && h2 > 0.22,
    hasHieroglyphs: !rect.isBorder && (rect.w >= 2 || kind === 'colonnadePillar'),
    hasBanners: !rect.isBorder && rect.w >= 2 && h3 > 0.25,
    isBrokenColumn: kind === 'colonnadePillar' && h1 <= 0.28,
    hasSandDrift: !rect.isBorder && h3 > 0.35,
    hasCollapsedCorner: !rect.isBorder && (rect.w >= 2 || rect.h >= 2) && h1 > 0.52,
    seed: sSeed,
    canvas: null,
    drawX: 0,
    drawY: 0,
  };
}

/**
 * Partitions all Ancient Temple map wall tiles into colonnade lotus columns,
 * hieroglyphic temple pylons, sanctuary walls, obelisk bastions, and border enclosures.
 */
export function decomposeTempleStructures(map: MapData): TempleStructure[] {
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

  return rects.map((rect, idx) => describeStructure(rect, map.seed, idx));
}

function drawWingedSolarDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
): void {
  ctx.save();
  // Outstretched golden wings
  ctx.fillStyle = '#D99E32';
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.5, cy);
  ctx.lineTo(cx, cy - 3);
  ctx.lineTo(cx + width * 0.5, cy);
  ctx.lineTo(cx, cy + 2.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Central crimson/gold sun orb
  ctx.fillStyle = '#B91C1C';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawHieroglyphPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(72, 48, 22, 0.42)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(235, 206, 145, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Abstract sunken-relief cartouche symbols, Ankhs, scarabs & Eye bars
  ctx.fillStyle = 'rgba(38, 24, 10, 0.58)';
  for (let gx = x + 4; gx < x + w - 5; gx += 7) {
    const g = hash2(Math.round(gx), Math.round(y), seed);
    if (g < 0.35) {
      ctx.fillRect(gx, y + 2, 3.5, 1.5);
      ctx.fillRect(gx + 1, y + 2, 1.5, h - 4);
    } else if (g < 0.7) {
      ctx.strokeStyle = 'rgba(38, 24, 10, 0.58)';
      ctx.strokeRect(gx, y + 2, 3.5, h - 4);
    } else {
      ctx.beginPath();
      ctx.arc(gx + 2, y + h * 0.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function bakeEgyptianColumnCanvas(
  ctx: CanvasRenderingContext2D,
  s: TempleStructure,
  textures: TempleTextureAtlas,
  rx: number,
  ry: number,
  ts: number,
): void {
  const baseY = ry + s.elevation;
  const stonePat = textures.getPattern(ctx, 'wallEgyptianSandstone', 0.25);

  // 1. Stepped sandstone column plinth filling the 32x32 tile footprint cleanly
  ctx.fillStyle = stonePat ?? '#B28B52';
  ctx.fillRect(rx, baseY, ts, ts);
  ctx.fillStyle = 'rgba(26, 16, 7, 0.24)';
  ctx.fillRect(rx, baseY + ts - 6, ts, 6);
  ctx.strokeStyle = '#241709';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(rx, baseY, ts, ts);

  // Inner chamfered plinth rim
  ctx.strokeStyle = 'rgba(255, 232, 175, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rx + 2.5, baseY + 2.5, ts - 5, ts - 7);

  // 2. Massive cylindrical decorated column shaft rising into roof plane
  const colW = ts - 8;
  const colX = rx + 4;
  const shaftBotY = baseY + ts * 0.55;
  const shaftTopY = ry + 6;

  const cylGrad = ctx.createLinearGradient(colX, 0, colX + colW, 0);
  cylGrad.addColorStop(0, '#DFBE82');
  cylGrad.addColorStop(0.32, '#C8A062');
  cylGrad.addColorStop(0.75, '#926E3C');
  cylGrad.addColorStop(1, '#583E1E');

  ctx.fillStyle = cylGrad;
  ctx.beginPath();
  ctx.moveTo(colX, shaftTopY);
  ctx.lineTo(colX, shaftBotY);
  ctx.ellipse(rx + ts * 0.5, shaftBotY, colW * 0.5, 5, 0, Math.PI, 0, true);
  ctx.lineTo(colX + colW, shaftTopY);
  ctx.closePath();
  ctx.fill();

  if (stonePat) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = stonePat;
    ctx.fill();
    ctx.restore();
  }

  // Painted royal Egyptian column collar rings (lapis, turquoise, gold)
  const collarY = shaftBotY - 12;
  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(colX, collarY, colW, 3);
  ctx.fillStyle = '#0D9488';
  ctx.fillRect(colX, collarY - 3, colW, 2.5);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(colX, collarY - 5, colW, 2);

  // Subtle carved vertical shaft hieroglyphs
  drawHieroglyphPanel(ctx, colX + 4, shaftTopY + 10, colW - 8, 8, s.seed);

  ctx.strokeStyle = '#241709';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. Flared painted Lotus/Papyrus capital OR broken shattered drum top
  if (s.isBrokenColumn) {
    ctx.fillStyle = '#C9A265';
    ctx.beginPath();
    ctx.moveTo(colX, shaftTopY + 2);
    ctx.lineTo(colX + colW * 0.32, shaftTopY - 3);
    ctx.lineTo(colX + colW * 0.65, shaftTopY + 2);
    ctx.lineTo(colX + colW, shaftTopY - 1);
    ctx.lineTo(colX + colW, shaftTopY + 6);
    ctx.ellipse(rx + ts * 0.5, shaftTopY + 5, colW * 0.5, 4.5, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#241709';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    const capY = ry + 6;
    ctx.fillStyle = 'rgba(22, 14, 6, 0.32)';
    ctx.beginPath();
    ctx.roundRect(rx - 1, capY + 2, ts + 2, ts - 2, 4);
    ctx.fill();

    const drewAtlas = drawEgyptianAtlasCell(
      ctx,
      3,
      0,
      rx + ts * 0.5,
      capY + ts * 0.42,
      ts + 4,
      ts + 4,
      0,
      textures,
    );
    if (!drewAtlas) {
      ctx.fillStyle = '#CFA96D';
      ctx.fillRect(rx + 2, capY, ts - 4, ts - 4);
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 3;
      ctx.strokeRect(rx + 5, capY + 3, ts - 10, ts - 10);
      ctx.fillStyle = '#EAB308';
      ctx.fillRect(rx + 12, capY + 10, ts - 24, ts - 24);
    }
  }
}

function drawTempleFacade(
  ctx: CanvasRenderingContext2D,
  s: TempleStructure,
  textures: TempleTextureAtlas,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): void {
  const pat = textures.getPattern(ctx, 'wallEgyptianSandstone', 0.34);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();

  ctx.fillStyle = pat ?? '#A9814B';
  ctx.fillRect(fx, fy, fw, fh);

  // Shade south-facing facade gently beneath afternoon sun
  ctx.fillStyle =
    s.stoneTint === 'roseOchre'
      ? 'rgba(116, 62, 34, 0.24)'
      : s.stoneTint === 'agedLimestone'
        ? 'rgba(56, 46, 32, 0.24)'
        : 'rgba(66, 44, 18, 0.22)';
  ctx.fillRect(fx, fy, fw, fh);

  // Monumental cut sandstone courses
  ctx.strokeStyle = 'rgba(32, 20, 8, 0.44)';
  ctx.lineWidth = 1.2;
  for (let by = fy + 8; by < fy + fh - 3; by += 8) {
    ctx.beginPath();
    ctx.moveTo(fx, by);
    ctx.lineTo(fx + fw, by);
    ctx.stroke();
  }

  // Painted Egyptian cavetto cornice & torus stripe molding below upper roof overhang
  if (!s.isBorder) {
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(fx, fy + 2, fw, 5);
    ctx.fillStyle = '#D97706';
    for (let sx = fx + 2; sx < fx + fw - 4; sx += 8) {
      ctx.fillRect(sx, fy + 2, 4, 5);
    }
    ctx.fillStyle = '#E5C484';
    ctx.fillRect(fx, fy + 7, fw, 2);
  }

  // Hieroglyphic carved wall panels across interior structures
  if (s.hasHieroglyphs && fw >= 44 && fh >= 18) {
    drawHieroglyphPanel(ctx, fx + 8, fy + 11, fw - 16, Math.min(8, fh - 14), s.seed);
  }

  // Grand Decorated Ancient Egyptian Temple Entrance (wing-disc lintel + dark portal + lapis banners)
  if (s.hasTempleEntrance && fw >= 84 && fh >= 20) {
    const pw = 28;
    const ph = Math.min(fh - 4, 22);
    const px = fx + Math.floor((fw - pw) * 0.5);
    const py = fy + fh - ph;

    // Projecting pylon jambs & cavetto lintel
    ctx.fillStyle = '#C9A265';
    ctx.fillRect(px - 6, py - 3, pw + 12, ph + 3);
    ctx.fillStyle = '#DFBC7E';
    ctx.fillRect(px - 8, py - 4, pw + 16, 6);
    ctx.strokeStyle = '#2A1B0B';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px - 8, py - 4, pw + 16, 6);

    drawWingedSolarDisc(ctx, px + pw * 0.5, py - 1, 22);

    // Dark recessed sanctuary doorway
    ctx.fillStyle = '#120C06';
    ctx.fillRect(px + 2, py + 3, pw - 4, ph - 3);

    // Flanking blue-and-gold ceremonial temple banners on pylons
    if (s.hasBanners) {
      for (const bx of [px - 16, px + pw + 10]) {
        ctx.fillStyle = '#1D4ED8';
        ctx.fillRect(bx, fy + 9, 6, fh - 11);
        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, fy + 9, 6, fh - 11);
        ctx.fillStyle = '#EAB308';
        ctx.fillRect(bx + 2, fy + 13, 2, 4);
      }
    }
  } else if (s.hasBanners && !s.isBorder && fw >= 48 && fh >= 18) {
    for (const bx of [fx + 6, fx + fw - 12]) {
      ctx.fillStyle = '#1D4ED8';
      ctx.fillRect(bx, fy + 9, 5, fh - 11);
      ctx.fillStyle = '#EAB308';
      ctx.fillRect(bx + 1.5, fy + 11, 2, 3);
    }
  }

  // Drifted desert sand piled gently along bottom wall skirt
  if (s.hasSandDrift && !s.isBorder) {
    const sandGrad = ctx.createLinearGradient(fx, fy + fh - 7, fx, fy + fh);
    sandGrad.addColorStop(0, 'rgba(214, 178, 114, 0)');
    sandGrad.addColorStop(1, 'rgba(214, 178, 114, 0.45)');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(fx, fy + fh - 7, fw, 7);
  }

  // Overhang roof cast shadow
  const topShadow = ctx.createLinearGradient(fx, fy, fx, fy + 7);
  topShadow.addColorStop(0, 'rgba(22, 13, 5, 0.65)');
  topShadow.addColorStop(1, 'rgba(22, 13, 5, 0)');
  ctx.fillStyle = topShadow;
  ctx.fillRect(fx, fy, fw, 7);

  ctx.restore();

  ctx.strokeStyle = '#241709';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
}

/**
 * Bakes each Ancient Egyptian temple structure (lotus/papyrus column, decorated pylon,
 * carved sanctuary wall, or enclosure rampart) into its cached 2.5D offscreen canvas.
 */
export function bakeTempleStructureCanvas(
  s: TempleStructure,
  textures: TempleTextureAtlas,
  tileSize: number,
): void {
  if (typeof document === 'undefined') return;
  const padX = 12;
  const padTop = s.elevation + 18;
  const padBottom = 6;
  const bw = s.w * tileSize;
  const bh = s.h * tileSize;

  const canvas = s.canvas ?? document.createElement('canvas');
  canvas.width = bw + padX * 2;
  canvas.height = bh + padTop + padBottom;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rx = padX;
  const ry = padTop - s.elevation;

  if (s.kind === 'colonnadePillar') {
    bakeEgyptianColumnCanvas(ctx, s, textures, rx, ry, tileSize);
    s.canvas = canvas;
    s.drawX = s.col * tileSize - padX;
    s.drawY = s.row * tileSize - padTop;
    return;
  }

  // 1. South-facing 2.5D sandstone pylon / sanctuary facade
  drawTempleFacade(ctx, s, textures, rx, ry + bh, bw, s.elevation);

  // 2. Carved sunlit temple parapet roof top
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, bw, bh);
  ctx.clip();

  const stonePat = textures.getPattern(ctx, 'wallEgyptianSandstone', 0.36);
  ctx.fillStyle = stonePat ?? '#BA9256';
  ctx.fillRect(rx, ry, bw, bh);

  if (s.isBorder) {
    ctx.fillStyle = 'rgba(42, 28, 14, 0.36)';
    ctx.fillRect(rx, ry, bw, bh);
  } else if (s.stoneTint === 'roseOchre') {
    ctx.fillStyle = 'rgba(164, 96, 56, 0.16)';
    ctx.fillRect(rx, ry, bw, bh);
  } else if (s.stoneTint === 'warmGold') {
    ctx.fillStyle = 'rgba(224, 178, 86, 0.12)';
    ctx.fillRect(rx, ry, bw, bh);
  }

  // Stepped sandstone parapet & lapis-and-gold roof inlay borders
  if (!s.isBorder) {
    ctx.strokeStyle = 'rgba(255, 232, 176, 0.30)';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx + 4, ry + 4, bw - 8, bh - 8);
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(rx + 7, ry + 7, bw - 14, bh - 14);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 9, ry + 9, bw - 18, bh - 18);

    // Carved sunken golden Ankh roof emblem on broad sanctuary Bastions/Pylons
    if (bw >= 64 && bh >= 48) {
      drawCarvedFloorAnkh(ctx, rx + bw * 0.5, ry + bh * 0.5, 16, 0);
    }

    // Golden corner obelisk finial caps on Pylons
    if (s.kind === 'templePylon' && bw >= 64) {
      for (const cx of [rx + 9, rx + bw - 9]) {
        const cy = ry + bh - 9;
        ctx.fillStyle = '#D99B26';
        ctx.fillRect(cx - 4, cy - 4, 8, 8);
        ctx.strokeStyle = '#33200B';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 4, cy - 4, 8, 8);
      }
    }

    // Drifted desert sand pocket on weathered rooftop corner
    if (s.hasSandDrift) {
      const sg = ctx.createRadialGradient(rx + 6, ry + 6, 2, rx + 8, ry + 8, Math.min(bw, 36));
      sg.addColorStop(0, 'rgba(222, 186, 120, 0.68)');
      sg.addColorStop(1, 'rgba(222, 186, 120, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(rx, ry, Math.min(bw, 36), Math.min(bh, 28));
    }

    // Chipped stepped broken corner masonry on weathered structures
    if (s.hasCollapsedCorner) {
      ctx.fillStyle = 'rgba(42, 28, 12, 0.52)';
      ctx.beginPath();
      ctx.moveTo(rx + bw - 18, ry);
      ctx.lineTo(rx + bw, ry);
      ctx.lineTo(rx + bw, ry + 14);
      ctx.lineTo(rx + bw - 8, ry + 14);
      ctx.lineTo(rx + bw - 8, ry + 7);
      ctx.lineTo(rx + bw - 18, ry + 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Sunlit NW desert highlight & SE shadow bevel
  if (!s.isBorder) {
    ctx.fillStyle = 'rgba(255, 240, 195, 0.36)';
    ctx.fillRect(rx, ry, bw, 2.2);
    ctx.fillRect(rx, ry, 2.2, bh);
  }
  ctx.fillStyle = 'rgba(28, 17, 6, 0.42)';
  ctx.fillRect(rx, ry + bh - 2.2, bw, 2.2);
  ctx.fillRect(rx + bw - 2.2, ry, 2.2, bh);

  ctx.restore();

  ctx.strokeStyle = '#241709';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(rx, ry, bw, bh);

  s.canvas = canvas;
  s.drawX = s.col * tileSize - padX;
  s.drawY = s.row * tileSize - padTop;
}
