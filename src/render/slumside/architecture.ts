import type { MapData } from '../../shared/types';
import type { SlumsideTextureAtlas, SlumsideTextureKey } from './textures';

export type SlumRoofType =
  | 'tinRust'
  | 'tinSlate'
  | 'blueTarp'
  | 'orangeTarp'
  | 'concreteTerrace'
  | 'workshopMetal'
  | 'tealConcrete';

export type SlumFacadeStyle =
  | 'plaster'
  | 'brick'
  | 'paintedTeal'
  | 'paintedOchre'
  | 'paintedBlue'
  | 'shutterWorkshop';

export interface SlumBuilding {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
  bottomRow: number;
  isBorder: boolean;
  stories: 1 | 2 | 3;
  elevation: number;
  roofType: SlumRoofType;
  facadeStyle: SlumFacadeStyle;
  facadeColor: string;
  facadeTrim: string;
  hasWaterTank: boolean;
  hasBalcony: boolean;
  hasShopShutter: boolean;
  hasTarpOverlay: boolean;
  tarpColor: 'blue' | 'orange' | 'grey';
  hasAcUnit: boolean;
  hasDish: boolean;
  hasRoofPlants: boolean;
  hasStairhead: boolean;
  hasAwning: boolean;
  awningColor: string;
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

function splitRectIrregularly(rect: RawRect, seed: number, out: RawRect[]): void {
  if (rect.w <= 4 && rect.h <= 4) {
    out.push(rect);
    return;
  }

  const h = hash2(rect.col, rect.row, seed + rect.w * 17 + rect.h * 31);
  const splitHorizontal = rect.w >= 5 && (rect.h < 5 || (rect.w >= rect.h && h < 0.65));

  if (splitHorizontal) {
    const maxFirst = Math.min(4, rect.w - 2);
    const firstW = Math.max(2, 2 + Math.floor(h * (maxFirst - 1)));
    splitRectIrregularly(
      { col: rect.col, row: rect.row, w: firstW, h: rect.h, isBorder: rect.isBorder },
      seed + 13,
      out,
    );
    splitRectIrregularly(
      { col: rect.col + firstW, row: rect.row, w: rect.w - firstW, h: rect.h, isBorder: rect.isBorder },
      seed + 29,
      out,
    );
    return;
  }

  const maxFirstH = Math.min(4, rect.h - 2);
  const firstH = Math.max(2, 2 + Math.floor(h * (maxFirstH - 1)));
  splitRectIrregularly(
    { col: rect.col, row: rect.row, w: rect.w, h: firstH, isBorder: rect.isBorder },
    seed + 37,
    out,
  );
  splitRectIrregularly(
    { col: rect.col, row: rect.row + firstH, w: rect.w, h: rect.h - firstH, isBorder: rect.isBorder },
    seed + 53,
    out,
  );
}

function createBuildingDescriptor(
  rect: RawRect,
  mapWidth: number,
  seed: number,
  index: number,
): SlumBuilding {
  const bSeed = (seed + rect.col * 73856093 + rect.row * 19349663 + index * 83492791) >>> 0;
  const h1 = hash2(rect.col, rect.row, bSeed);
  const h2 = hash2(rect.col + 7, rect.row + 3, bSeed + 19);
  const h3 = hash2(rect.col + 13, rect.row + 11, bSeed + 47);

  const area = rect.w * rect.h;
  const centerX = rect.col + rect.w * 0.5;
  const isEastWorkshop = !rect.isBorder && centerX >= mapWidth * 0.65;
  const isMarket = !rect.isBorder && centerX >= mapWidth * 0.34 && centerX < mapWidth * 0.65;
  const isCentralLandmark =
    !rect.isBorder && rect.w >= 4 && rect.h >= 4 && centerX >= mapWidth * 0.35 && centerX <= mapWidth * 0.65;

  const stories: 1 | 2 | 3 = rect.isBorder
    ? 1
    : isCentralLandmark || (area >= 12 && h1 > 0.48)
      ? 3
      : area >= 4 && h1 > 0.28
        ? 2
        : 1;
  const elevation = rect.isBorder ? 18 : stories === 3 ? 34 : stories === 2 ? 25 : 16;

  let roofType: SlumRoofType;
  if (isCentralLandmark) {
    roofType = 'concreteTerrace';
  } else if (isEastWorkshop) {
    if (h2 < 0.38) roofType = 'workshopMetal';
    else if (h2 < 0.62) roofType = 'tinRust';
    else if (h2 < 0.8) roofType = 'concreteTerrace';
    else roofType = 'blueTarp';
  } else if (isMarket) {
    if (h2 < 0.25) roofType = 'concreteTerrace';
    else if (h2 < 0.45) roofType = 'blueTarp';
    else if (h2 < 0.64) roofType = 'tinRust';
    else if (h2 < 0.82) roofType = 'orangeTarp';
    else roofType = 'tealConcrete';
  } else {
    if (h2 < 0.28) roofType = 'tinRust';
    else if (h2 < 0.48) roofType = 'blueTarp';
    else if (h2 < 0.68) roofType = 'concreteTerrace';
    else if (h2 < 0.82) roofType = 'tinSlate';
    else if (h2 < 0.92) roofType = 'orangeTarp';
    else roofType = 'tealConcrete';
  }

  let facadeStyle: SlumFacadeStyle;
  let facadeColor: string;
  let facadeTrim: string;
  if (isEastWorkshop && h3 < 0.55) {
    facadeStyle = 'shutterWorkshop';
    facadeColor = '#6B7278';
    facadeTrim = '#464C52';
  } else if (h3 < 0.22) {
    facadeStyle = 'paintedTeal';
    facadeColor = '#4B8285';
    facadeTrim = '#D8CFC0';
  } else if (h3 < 0.42) {
    facadeStyle = 'paintedOchre';
    facadeColor = '#B58958';
    facadeTrim = '#E5D3B3';
  } else if (h3 < 0.6) {
    facadeStyle = 'paintedBlue';
    facadeColor = '#587898';
    facadeTrim = '#CBD5E1';
  } else if (h3 < 0.8) {
    facadeStyle = 'brick';
    facadeColor = '#8F5844';
    facadeTrim = '#6B4234';
  } else {
    facadeStyle = 'plaster';
    facadeColor = '#9C9082';
    facadeTrim = '#73685B';
  }

  const tarpColors: Array<'blue' | 'orange' | 'grey'> = ['blue', 'orange', 'grey'];
  const tarpColor = tarpColors[Math.floor(h1 * 17) % 3];
  const awningPalette = ['#B91C1C', '#1D4ED8', '#D97706', '#0F766E'];

  return {
    id: `b-${rect.col}-${rect.row}-${rect.w}x${rect.h}`,
    col: rect.col,
    row: rect.row,
    w: rect.w,
    h: rect.h,
    bottomRow: rect.row + rect.h - 1,
    isBorder: rect.isBorder,
    stories,
    elevation,
    roofType,
    facadeStyle,
    facadeColor,
    facadeTrim,
    hasWaterTank:
      isCentralLandmark ||
      (!rect.isBorder &&
        rect.w >= 2 &&
        rect.h >= 2 &&
        (roofType === 'concreteTerrace' || roofType === 'tealConcrete') &&
        h1 > 0.34),
    hasBalcony: isCentralLandmark || (!rect.isBorder && stories >= 2 && rect.w >= 2 && h2 > 0.38),
    hasShopShutter: !rect.isBorder && rect.w >= 2 && (isMarket || isEastWorkshop || h3 > 0.56),
    hasTarpOverlay:
      !rect.isBorder &&
      rect.w >= 2 &&
      rect.h >= 2 &&
      roofType !== 'blueTarp' &&
      roofType !== 'orangeTarp' &&
      h1 > 0.62,
    tarpColor,
    hasAcUnit: !rect.isBorder && stories >= 2 && h3 > 0.45,
    hasDish: !rect.isBorder && area >= 6 && h2 > 0.66,
    hasRoofPlants:
      !rect.isBorder &&
      (roofType === 'concreteTerrace' || roofType === 'tealConcrete') &&
      h3 > 0.58,
    hasStairhead:
      isCentralLandmark || (!rect.isBorder && stories === 3 && rect.w >= 3 && rect.h >= 3 && h1 > 0.52),
    hasAwning: isCentralLandmark || (!rect.isBorder && rect.w >= 2 && (isMarket || h2 > 0.68)),
    awningColor: isCentralLandmark ? '#1D4ED8' : awningPalette[Math.floor(h3 * 23) % awningPalette.length],
    seed: bSeed,
    canvas: null,
    drawX: 0,
    drawY: 0,
  };
}

/**
 * Deterministically decomposes all wall tiles in a Slumside map into varied
 * 1-to-3 story shanties, concrete compounds, market shopfronts, and workshops.
 */
export function decomposeSlumBuildings(map: MapData): SlumBuilding[] {
  const rects: RawRect[] = [];
  const W = map.width;
  const H = map.height;

  // 1. Segment perimeter border walls cleanly so perimeter structures frame the arena
  const pushBorderRun = (c0: number, r0: number, w: number, h: number) => {
    rects.push({ col: c0, row: r0, w, h, isBorder: true });
  };
  for (let c = 0; c < W; c += 5) {
    const segW = Math.min(5, W - c);
    if (map.tiles[0][c] === 'wall') pushBorderRun(c, 0, segW, 1);
    if (map.tiles[H - 1][c] === 'wall') pushBorderRun(c, H - 1, segW, 1);
  }
  for (let r = 1; r < H - 1; r += 5) {
    const segH = Math.min(5, H - 1 - r);
    if (map.tiles[r][0] === 'wall') pushBorderRun(0, r, 1, segH);
    if (map.tiles[r][W - 1] === 'wall') pushBorderRun(W - 1, r, 1, segH);
  }

  // 2. Partition all interior wall tiles with zero overlap and zero missed tiles
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

      splitRectIrregularly(
        { col: c, row: r, w: rw, h: rh, isBorder: false },
        map.seed,
        rects,
      );
    }
  }

  return rects.map((rect, idx) => createBuildingDescriptor(rect, W, map.seed, idx));
}

function textureKeyForRoof(roofType: SlumRoofType): SlumsideTextureKey {
  switch (roofType) {
    case 'blueTarp':
      return 'roofTarpBlue';
    case 'orangeTarp':
      return 'roofTerracotta';
    case 'concreteTerrace':
    case 'tealConcrete':
      return 'roofConcrete';
    case 'tinRust':
    case 'tinSlate':
    case 'workshopMetal':
    default:
      return 'roofTinRust';
  }
}

function drawRoofWaterTank(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  // Directional shadow down-right
  ctx.fillStyle = 'rgba(10, 9, 14, 0.44)';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 5, r + 1, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tank dark ribbed cylinder
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
  grad.addColorStop(0, '#444E5C');
  grad.addColorStop(0.55, '#1F242C');
  grad.addColorStop(1, '#101318');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3B4554';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // Top cap
  ctx.fillStyle = '#333C4A';
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 1, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0B0E12';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPartialTarp(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  color: 'blue' | 'orange' | 'grey',
  textures: SlumsideTextureAtlas,
  seed: number,
): void {
  const h = hash2(rx, ry, seed + 101);
  const tx = rx + (h < 0.5 ? 4 : rw * 0.32);
  const ty = ry + (h < 0.33 || h > 0.7 ? 4 : rh * 0.28);
  const tw = Math.max(18, rw * 0.56);
  const th = Math.max(16, rh * 0.54);

  ctx.save();
  // Tarp drop shadow onto roof
  ctx.fillStyle = 'rgba(10, 9, 14, 0.38)';
  ctx.beginPath();
  ctx.moveTo(tx + 3, ty + 4);
  ctx.lineTo(tx + tw + 4, ty + 6);
  ctx.lineTo(tx + tw + 1, ty + th + 5);
  ctx.lineTo(tx + 2, ty + th + 3);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + tw, ty + 2);
  ctx.lineTo(tx + tw - 2, ty + th);
  ctx.lineTo(tx + 1, ty + th - 2);
  ctx.closePath();
  ctx.clip();

  const texKey: SlumsideTextureKey =
    color === 'blue' ? 'roofTarpBlue' : color === 'orange' ? 'roofTerracotta' : 'roofConcrete';
  const pat = textures.getPattern(ctx, texKey, 0.25);
  ctx.fillStyle =
    pat ?? (color === 'blue' ? '#2563EB' : color === 'orange' ? '#C25932' : '#64748B');
  ctx.fillRect(tx - 2, ty - 2, tw + 6, th + 6);

  if (color === 'grey') {
    ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.fillRect(tx - 2, ty - 2, tw + 6, th + 6);
  }

  // Fold highlight & crease lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(tx + 3, ty + 4);
  ctx.lineTo(tx + tw - 5, ty + th - 6);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.42)';
  ctx.beginPath();
  ctx.moveTo(tx + 5, ty + th - 4);
  ctx.lineTo(tx + tw - 4, ty + 5);
  ctx.stroke();
  ctx.restore();

  // Weight bricks pinning tarp corners
  ctx.fillStyle = '#57483F';
  ctx.fillRect(tx + 2, ty + 2, 4, 3);
  ctx.fillRect(tx + tw - 7, ty + th - 6, 4, 3);
}

function drawBuildingFacade(
  ctx: CanvasRenderingContext2D,
  b: SlumBuilding,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): void {
  // Base wall gradient (lit slightly near top overhang shadow, darker AO at street base)
  ctx.fillStyle = b.facadeColor;
  ctx.fillRect(fx, fy, fw, fh);

  // Overhang roof shadow cast onto top of facade
  const overhangGrad = ctx.createLinearGradient(fx, fy, fx, fy + Math.min(10, fh * 0.45));
  overhangGrad.addColorStop(0, 'rgba(12, 10, 14, 0.58)');
  overhangGrad.addColorStop(1, 'rgba(12, 10, 14, 0)');
  ctx.fillStyle = overhangGrad;
  ctx.fillRect(fx, fy, fw, Math.min(10, fh * 0.45));

  // Brick courses or plaster rain streaks
  if (b.facadeStyle === 'brick') {
    ctx.fillStyle = 'rgba(42, 20, 14, 0.26)';
    for (let by = fy + 4; by < fy + fh - 2; by += 4) {
      ctx.fillRect(fx, by, fw, 1);
    }
  } else {
    ctx.fillStyle = 'rgba(26, 22, 18, 0.22)';
    for (let s = 0; s < 4; s += 1) {
      const sx = fx + 6 + Math.floor(hash2(s, b.col, b.seed) * Math.max(4, fw - 14));
      ctx.fillRect(sx, fy + 2, 2, fh - 3);
    }
  }

  // Story slab band on 2-3 story buildings
  if (b.stories >= 2) {
    const midY = fy + Math.floor(fh * 0.46);
    ctx.fillStyle = b.facadeTrim;
    ctx.fillRect(fx, midY, fw, 2.5);
    ctx.fillStyle = 'rgba(10, 8, 12, 0.35)';
    ctx.fillRect(fx, midY + 2.5, fw, 2);

    // Upper-floor windows
    const winCount = Math.max(1, Math.floor((fw - 12) / 20));
    const spacing = fw / (winCount + 1);
    for (let i = 1; i <= winCount; i += 1) {
      const wx = fx + i * spacing - 5;
      const wy = fy + 4;
      const lit = hash2(i, b.row, b.seed + 71) > 0.62;
      ctx.fillStyle = lit ? '#A17440' : '#1E232B';
      ctx.fillRect(wx, wy, 10, 8);
      ctx.strokeStyle = b.facadeTrim;
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, 10, 8);
      // Security grill bars
      ctx.fillStyle = '#0F1318';
      ctx.fillRect(wx + 3, wy, 1, 8);
      ctx.fillRect(wx + 6, wy, 1, 8);
    }

    // Balcony railing on upper floor
    if (b.hasBalcony && fw >= 44) {
      const bx = fx + 8;
      const bw = fw - 16;
      const by = midY - 7;
      ctx.fillStyle = 'rgba(15, 18, 24, 0.45)';
      ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = b.facadeTrim;
      ctx.fillRect(bx - 1, midY - 1, bw + 2, 2);
      ctx.fillRect(bx - 1, by, bw + 2, 1.5);
      for (let rx = bx + 2; rx < bx + bw; rx += 5) {
        ctx.fillRect(rx, by, 1.2, 6);
      }
      // Colorful hanging laundry along balcony clothesline
      const laundry = ['#EF4444', '#FACC15', '#3B82F6', '#F8FAFC', '#10B981'];
      for (let lx = bx + 6, li = 0; lx < bx + bw - 8; lx += 8, li += 1) {
        ctx.fillStyle = laundry[(li + b.col) % laundry.length];
        ctx.fillRect(lx, by + 1.5, 4.5, 5.5);
      }
    }

    // Wall-mounted AC unit
    if (b.hasAcUnit && fw >= 40) {
      const acX = fx + fw - 14;
      const acY = fy + 5;
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(acX, acY, 10, 7);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(acX + 4, acY + 3.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ground-floor shop shutters or recessed wooden doors
  const groundTop = b.stories >= 2 ? fy + Math.floor(fh * 0.54) : fy + 3;
  const groundH = fy + fh - groundTop;
  if (b.hasShopShutter && fw >= 38 && groundH >= 10) {
    const sw = Math.min(28, fw - 16);
    const sx = fx + Math.floor((fw - sw) * 0.5);
    ctx.fillStyle = '#475569';
    ctx.fillRect(sx, groundTop + 1, sw, groundH - 1);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    for (let sy = groundTop + 3; sy < fy + fh - 1; sy += 2.5) {
      ctx.fillRect(sx + 1, sy, sw - 2, 1);
    }
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, groundTop + 1, sw, groundH - 1);
  } else if (fw >= 26 && groundH >= 9) {
    const dx = fx + Math.floor(fw * 0.36);
    ctx.fillStyle = '#3B281B';
    ctx.fillRect(dx, groundTop + 1, 9, groundH - 1);
    ctx.strokeStyle = '#1A130D';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, groundTop + 1, 9, groundH - 1);
  }

  // Projecting shop awning (chajja) over ground floor
  if (b.hasAwning && fw >= 40) {
    const awX = fx + 6;
    const awW = fw - 12;
    const awY = groundTop - 1;
    ctx.fillStyle = 'rgba(10, 9, 14, 0.45)';
    ctx.fillRect(awX + 2, awY + 4, awW, 5);
    ctx.fillStyle = b.awningColor;
    ctx.fillRect(awX, awY, awW, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    for (let sx = awX + 2; sx < awX + awW - 3; sx += 8) {
      ctx.fillRect(sx, awY, 4, 5);
    }
  }

  // Vertical PVC downspout on right edge
  if (!b.isBorder && fw >= 32) {
    ctx.fillStyle = '#64748B';
    ctx.fillRect(fx + fw - 4, fy, 2.5, fh);
  }

  // Street-contact base darkening + side outlines
  const baseAo = ctx.createLinearGradient(fx, fy + fh - 6, fx, fy + fh);
  baseAo.addColorStop(0, 'rgba(8, 7, 10, 0)');
  baseAo.addColorStop(1, 'rgba(8, 7, 10, 0.48)');
  ctx.fillStyle = baseAo;
  ctx.fillRect(fx, fy + fh - 6, fw, 6);

  ctx.strokeStyle = '#161310';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
}

/**
 * Renders an entire SlumBuilding (2.5D south facade + high-res textured roof +
 * rooftop water tanks, tarps, clutter, and directional bevels) into its cached canvas.
 */
export function bakeBuildingCanvas(
  b: SlumBuilding,
  textures: SlumsideTextureAtlas,
  tileSize: number,
): void {
  if (typeof document === 'undefined') return;
  const padX = 10;
  const padTop = 14;
  const padBottom = 4;
  const bw = b.w * tileSize;
  const fullBh = b.h * tileSize;
  const facadeH = Math.min(b.elevation, Math.max(10, Math.floor(fullBh * 0.32)));
  const bh = fullBh - facadeH;

  const canvas = b.canvas ?? document.createElement('canvas');
  canvas.width = bw + padX * 2;
  canvas.height = fullBh + padTop + padBottom;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rx = padX;
  const ry = padTop;

  // 1. Draw south-facing 2.5D facade wall below roof edge down to ground footprint
  drawBuildingFacade(ctx, b, rx, ry + bh, bw, facadeH);

  // 2. Draw textured rooftop
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, bw, bh);
  ctx.clip();

  const texKey = textureKeyForRoof(b.roofType);
  const pattern = textures.getPattern(ctx, texKey, 0.34);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(rx, ry, bw, bh);
  } else {
    ctx.fillStyle = '#7C7469';
    ctx.fillRect(rx, ry, bw, bh);
  }

  // Per-building weathering / color tone modulation so adjacent roofs never look identical
  if (b.roofType === 'blueTarp') {
    ctx.fillStyle = 'rgba(36, 38, 44, 0.22)';
    ctx.fillRect(rx, ry, bw, bh);
  } else if (b.roofType === 'tinSlate') {
    ctx.fillStyle = 'rgba(42, 54, 68, 0.38)';
    ctx.fillRect(rx, ry, bw, bh);
  } else if (b.roofType === 'workshopMetal') {
    ctx.fillStyle = 'rgba(54, 62, 68, 0.34)';
    ctx.fillRect(rx, ry, bw, bh);
  } else if (b.roofType === 'tealConcrete') {
    ctx.fillStyle = 'rgba(42, 108, 112, 0.34)';
    ctx.fillRect(rx, ry, bw, bh);
  } else {
    const toneShift = hash2(b.col, b.row, b.seed + 5);
    ctx.fillStyle =
      toneShift < 0.5
        ? `rgba(22, 18, 14, ${(0.06 + toneShift * 0.14).toFixed(2)})`
        : `rgba(235, 215, 185, ${((toneShift - 0.5) * 0.14).toFixed(2)})`;
    ctx.fillRect(rx, ry, bw, bh);
  }

  // Corrugated seam overlaps on tin/metal roofs
  if (
    b.roofType === 'tinRust' ||
    b.roofType === 'tinSlate' ||
    b.roofType === 'workshopMetal'
  ) {
    ctx.strokeStyle = 'rgba(20, 16, 14, 0.36)';
    ctx.lineWidth = 1.2;
    for (let sy = ry + tileSize; sy < ry + bh - 4; sy += tileSize) {
      ctx.beginPath();
      ctx.moveTo(rx, sy);
      ctx.lineTo(rx + bw, sy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(138, 62, 32, 0.25)';
    ctx.fillRect(
      rx + hash2(1, 2, b.seed) * (bw * 0.4),
      ry + hash2(3, 4, b.seed) * (bh * 0.4),
      bw * 0.38,
      bh * 0.28,
    );
  }

  // Concrete parapet walls with inner shadow on concrete terraces
  if (b.roofType === 'concreteTerrace' || b.roofType === 'tealConcrete') {
    ctx.strokeStyle = '#ACA396';
    ctx.lineWidth = 4;
    ctx.strokeRect(rx + 2, ry + 2, bw - 4, bh - 4);
    ctx.strokeStyle = 'rgba(12, 10, 14, 0.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx + 4, ry + bh - 4);
    ctx.lineTo(rx + 4, ry + 4);
    ctx.lineTo(rx + bw - 4, ry + 4);
    ctx.stroke();
  }

  // Stairhead (mumty) on tall 3-story concrete buildings
  if (b.hasStairhead) {
    const mx = rx + 8;
    const my = ry + 8;
    ctx.fillStyle = 'rgba(10, 9, 14, 0.45)';
    ctx.fillRect(mx + 4, my + 4, 24, 20);
    ctx.fillStyle = '#A89F92';
    ctx.fillRect(mx, my, 24, 20);
    ctx.strokeStyle = '#2B2620';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx, my, 24, 20);
  }

  // Partial draped tarpaulin sheet over roof corner
  if (b.hasTarpOverlay) {
    drawPartialTarp(ctx, rx, ry, bw, bh, b.tarpColor, textures, b.seed);
  }

  // Rooftop potted plants
  if (b.hasRoofPlants) {
    const px = rx + bw - 14;
    const py = ry + bh - 14;
    ctx.fillStyle = 'rgba(10, 9, 14, 0.35)';
    ctx.beginPath();
    ctx.arc(px + 2, py + 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3B6E32';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5CA148';
    ctx.beginPath();
    ctx.arc(px - 1.5, py - 1.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // PVC pipes & weighted spare tires on roofs
  if (!b.isBorder && bw >= 48 && bh >= 48) {
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx + 10, ry + bh - 12);
    ctx.lineTo(rx + bw - 14, ry + bh - 12);
    ctx.stroke();

    if (hash2(b.col, b.row, b.seed + 89) > 0.55) {
      const tx = rx + 14;
      const ty = ry + 14;
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Rooftop sunlit upper-left bevel & shaded lower-right edge
  ctx.fillStyle = 'rgba(255, 244, 224, 0.2)';
  ctx.fillRect(rx, ry, bw, 2);
  ctx.fillRect(rx, ry, 2, bh);
  ctx.fillStyle = 'rgba(14, 12, 10, 0.32)';
  ctx.fillRect(rx, ry + bh - 2, bw, 2);
  ctx.fillRect(rx + bw - 2, ry, 2, bh);

  ctx.restore();

  // Outer roof silhouette border (warm shaded umber)
  ctx.strokeStyle = '#241D18';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(rx, ry, bw, bh);

  // Rooftop water tank (drawn after roof clip so tall cylindrical silhouette can sit cleanly near edge)
  if (b.hasWaterTank) {
    const tankR = bw >= 120 ? 12 : 9.5;
    const tx = rx + bw - (tankR + 6);
    const ty = ry + (tankR + 6);
    drawRoofWaterTank(ctx, tx, ty, tankR);
    if (bw >= 96 && hash2(b.col, b.row, b.seed + 131) > 0.48) {
      drawRoofWaterTank(ctx, tx - (tankR * 2 + 4), ty + 2, 8);
    }
  }

  // Satellite dish
  if (b.hasDish) {
    const dx = rx + 14;
    const dy = ry + bh - 14;
    ctx.fillStyle = 'rgba(10, 9, 14, 0.38)';
    ctx.beginPath();
    ctx.arc(dx + 2, dy + 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(dx, dy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(dx + 1, dy + 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  b.canvas = canvas;
  b.drawX = b.col * tileSize - padX;
  b.drawY = b.row * tileSize - padTop;
}
