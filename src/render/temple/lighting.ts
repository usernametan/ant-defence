import type { MapData } from '../../shared/types';
import {
  drawStructureShadowsAndAoRegion,
  type ChunkRect,
  type ShadowStrokeOptions,
} from '../groundCache';
import { hash2, type TempleStructure } from './architecture';
import {
  drawCarvedFloorAnkh,
  drawDesertScrub,
  drawEgyptianAtlasCell,
  drawEgyptianStaircase,
  drawSandstoneDebris,
} from './props';
import type { TempleTextureAtlas } from './textures';

function drawMaskedTextureLayer(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  worldH: number,
  pattern: CanvasPattern | null,
  drawMask: (mctx: CanvasRenderingContext2D) => void,
): void {
  if (!pattern || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = worldW;
  canvas.height = worldH;
  const mctx = canvas.getContext('2d');
  if (!mctx) return;

  mctx.globalCompositeOperation = 'source-over';
  drawMask(mctx);

  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = pattern;
  mctx.fillRect(0, 0, worldW, worldH);

  ctx.drawImage(canvas, 0, 0);
}

function isRectClearFloor(
  map: MapData,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const ts = map.tileSize;
  const c0 = Math.floor(x / ts);
  const c1 = Math.floor((x + w - 0.1) / ts);
  const r0 = Math.floor(y / ts);
  const r1 = Math.floor((y + h - 0.1) / ts);
  for (let rr = r0; rr <= r1; rr += 1) {
    for (let cc = c0; cc <= c1; cc += 1) {
      if (map.tiles[rr]?.[cc] !== 'floor') return false;
    }
  }
  return true;
}

function drawSacredOasisPools(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  textures: TempleTextureAtlas,
): void {
  const ts = map.tileSize;
  const waterPat = textures.getPattern(ctx, 'waterSacredOasis', 0.36);

  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      if (map.tiles[r][c] !== 'water') continue;
      const x = c * ts;
      const y = r * ts;
      const padT = map.tiles[r - 1]?.[c] === 'water' ? 0 : 4;
      const padB = map.tiles[r + 1]?.[c] === 'water' ? 0 : 3;
      const padL = map.tiles[r]?.[c - 1] === 'water' ? 0 : 4;
      const padR = map.tiles[r]?.[c + 1] === 'water' ? 0 : 3;

      // Stepped carved sandstone & lapis-blue oasis coping stone rim
      ctx.fillStyle = '#B89158';
      ctx.fillRect(x, y, ts, ts);
      ctx.fillStyle = '#1E40AF';
      if (padT > 0) ctx.fillRect(x, y + 1, ts, 2);
      if (padL > 0) ctx.fillRect(x + 1, y, 2, ts);
      ctx.fillStyle = '#D97706';
      if (padB > 0) ctx.fillRect(x, y + ts - 2, ts, 1.5);
      if (padR > 0) ctx.fillRect(x + ts - 2, y, 1.5, ts);

      // Turquoise oasis water fill
      ctx.fillStyle = waterPat ?? '#126E78';
      ctx.fillRect(x + padL, y + padT, ts - padL - padR, ts - padT - padB);

      // Shallow turquoise sandstone step ledge along top/left water edges
      if (padT > 0) {
        ctx.fillStyle = 'rgba(103, 232, 249, 0.24)';
        ctx.fillRect(x + padL, y + padT, ts - padL - padR, 4);
      }
      if (padL > 0) {
        ctx.fillStyle = 'rgba(103, 232, 249, 0.2)';
        ctx.fillRect(x + padL, y + padT, 4, ts - padT - padB);
      }

      // Sacred lotus pads on pool surface
      const h = hash2(c, r, map.seed + 509);
      if (h < 0.22) {
        const lx = x + 10 + h * 36;
        const ly = y + 15;
        ctx.fillStyle = '#2F6E3E';
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0.25, Math.PI * 1.9);
        ctx.lineTo(lx, ly);
        ctx.fill();
        if (h < 0.08) {
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(lx, ly - 1, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function drawTempleCourtyardDetails(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  structures: readonly TempleStructure[],
  textures: TempleTextureAtlas,
): void {
  const ts = map.tileSize;
  const [, zB] = map.zones;

  // 1. Ceremonial Blue-and-Gold Egyptian Temple Rugs in safe open sanctuary halls
  const rugSpots: Array<{ c: number; r: number; w: number; h: number }> = [
    { c: 12, r: 25, w: 3, h: 4 },
    { c: map.width - 15, r: 10, w: 3, h: 4 },
    { c: 28, r: 6, w: 4, h: 2 },
    { c: 28, r: map.height - 9, w: 4, h: 2 },
  ];
  for (const rug of rugSpots) {
    const rx = rug.c * ts + 4;
    const ry = rug.r * ts + 4;
    const rw = rug.w * ts - 8;
    const rh = rug.h * ts - 8;
    if (!isRectClearFloor(map, rx, ry, rw, rh)) continue;
    const drewAtlas = drawEgyptianAtlasCell(
      ctx,
      3,
      1,
      rx + rw * 0.5,
      ry + rh * 0.5,
      rw > rh ? rh : rw,
      rw > rh ? rw : rh,
      rw > rh ? Math.PI * 0.5 : 0,
      textures,
    );
    if (!drewAtlas) {
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx + 4, ry + 4, rw - 8, rh - 8);
    }
  }

  // 2. Grand Central Temple Courtyard (Zone B) — Solar Rings, 4 Floor Ankhs & Cardinal Staircases
  if (zB) {
    const cx = zB.center.x;
    const cy = zB.center.y;
    ctx.save();
    // Outer stone curb + lapis-blue & gold inlaid circular band
    ctx.strokeStyle = 'rgba(42, 26, 10, 0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 152, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(29, 78, 216, 0.52)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 148, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 145, 0, Math.PI * 2);
    ctx.stroke();

    // Inner stone ring + 12 golden solar rays
    ctx.strokeStyle = 'rgba(38, 24, 10, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 122, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(218, 168, 52, 0.38)' : 'rgba(54, 34, 14, 0.34)';
      ctx.lineWidth = i % 3 === 0 ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
      ctx.lineTo(cx + Math.cos(a) * 147, cy + Math.sin(a) * 147);
      ctx.stroke();
    }
    ctx.restore();

    // 4 Carved Golden Ankhs along diagonal courtyard axes
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const ax = cx + Math.cos(a) * 134;
      const ay = cy + Math.sin(a) * 134;
      if (isRectClearFloor(map, ax - 10, ay - 10, 20, 20)) {
        drawCarvedFloorAnkh(ctx, ax, ay, 14, a + Math.PI * 0.5);
      }
    }

    // 4 Cardinal Sandstone Staircases ascending onto Central Courtyard
    const stairOffsets: Array<{ dx: number; dy: number; w: number; h: number; dir: 'N' | 'S' | 'E' | 'W' }> = [
      { dx: -24, dy: -166, w: 48, h: 24, dir: 'N' },
      { dx: -24, dy: 142, w: 48, h: 24, dir: 'S' },
      { dx: -166, dy: -24, w: 24, h: 48, dir: 'W' },
      { dx: 142, dy: -24, w: 24, h: 48, dir: 'E' },
    ];
    for (const s of stairOffsets) {
      const sx = cx + s.dx;
      const sy = cy + s.dy;
      if (isRectClearFloor(map, sx - 2, sy - 2, s.w + 4, s.h + 4)) {
        drawEgyptianStaircase(ctx, sx, sy, s.w, s.h, s.dir, 4, textures);
      }
    }
  }

  // 3. Outer Zones A & C sandstone sanctum rings + 2 diagonal Ankhs
  for (let i = 0; i < map.zones.length; i += 1) {
    if (i === 1) continue;
    const z = map.zones[i];
    ctx.save();
    ctx.strokeStyle = 'rgba(42, 26, 10, 0.48)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 136, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(29, 78, 216, 0.36)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 132, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawCarvedFloorAnkh(ctx, z.center.x - 106, z.center.y, 13, 0);
    drawCarvedFloorAnkh(ctx, z.center.x + 106, z.center.y, 13, 0);
  }

  // 4. Raised stone plinth curbs & stairs below multi-tile Egyptian Pylons/Walls
  for (const s of structures) {
    if (s.isBorder || s.kind === 'colonnadePillar') continue;
    const rx = s.col * ts;
    const ry = s.row * ts;
    const rw = s.w * ts;
    const rh = s.h * ts;

    ctx.save();
    ctx.strokeStyle = 'rgba(38, 24, 10, 0.44)';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(rx - 7, ry - 7, rw + 14, rh + 14);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(rx - 5, ry - 5, rw + 10, rh + 10);
    ctx.restore();

    if (s.w >= 3 && s.row + s.h + 1 < map.height) {
      const sx = rx + rw * 0.5 - 22;
      const sy = ry + rh + 2;
      if (isRectClearFloor(map, sx - 2, sy, 48, 20)) {
        drawEgyptianStaircase(ctx, sx, sy, 44, 18, 'S', 3, textures);
      }
    }
  }
}

const TEMPLE_SHADOW_OPTS: ShadowStrokeOptions = {
  shadowColor: '#241407',
  shadowAlpha: 0.42,
  shadowOffsetXFactor: 0.85,
  shadowOffsetYFactor: 0.62,
  blurPx: 5,
  aoOuterColor: 'rgba(28, 16, 6, 0.22)',
  aoOuterWidth: 14,
  aoInnerColor: 'rgba(20, 11, 4, 0.44)',
  aoInnerWidth: 5,
};

export function drawTempleShadowsForRect(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  structures: readonly TempleStructure[],
  rect?: ChunkRect,
  scratchCanvas?: HTMLCanvasElement | null,
): void {
  drawStructureShadowsAndAoRegion(ctx, map, structures, TEMPLE_SHADOW_OPTS, rect, scratchCanvas);
}

function drawTempleEdgeShadeAndSunPools(ctx: CanvasRenderingContext2D, map: MapData): void {
  const ts = map.tileSize;
  const worldW = map.width * ts;
  const worldH = map.height * ts;

  ctx.save();
  const edgeShade = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(36, 20, 8, 0.42)');
    g.addColorStop(1, 'rgba(36, 20, 8, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  edgeShade(0, 0, 0, ts * 3.2, 0, 0, worldW, ts * 3.2);
  edgeShade(0, worldH, 0, worldH - ts * 3.2, 0, worldH - ts * 3.2, worldW, ts * 3.2);
  edgeShade(0, 0, ts * 3.2, 0, 0, 0, ts * 3.2, worldH);
  edgeShade(worldW, 0, worldW - ts * 3.2, 0, worldW - ts * 3.2, 0, ts * 3.2, worldH);
  ctx.restore();

  // Warm golden desert sunlight pools across open courtyard centers & sandstone avenues
  ctx.save();
  for (const z of map.zones) {
    const sunGrad = ctx.createRadialGradient(
      z.center.x - 14,
      z.center.y - 14,
      16,
      z.center.x,
      z.center.y,
      178,
    );
    sunGrad.addColorStop(0, 'rgba(255, 228, 148, 0.16)');
    sunGrad.addColorStop(0.6, 'rgba(255, 214, 120, 0.05)');
    sunGrad.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 178, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Bakes the static Ancient Temple ground layer: weathered sandstone slabs,
 * windblown golden sand drifts, dressed royal avenues & Zone B courtyard,
 * carved floor Ankhs, stone staircases, ceremonial rugs, sacred oasis pools,
 * partial buried rubble, long desert afternoon shadows, and AO.
 */
export function bakeTempleGroundLayer(
  map: MapData,
  structures: readonly TempleStructure[],
  textures: TempleTextureAtlas,
  existingCanvas?: HTMLCanvasElement | null,
  skipDynamicShadows = false,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const ts = map.tileSize;
  const worldW = map.width * ts;
  const worldH = map.height * ts;
  const canvas = existingCanvas ?? document.createElement('canvas');
  canvas.width = worldW;
  canvas.height = worldH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Irregular weathered sandstone slabs with desert sand in crevices
  const slabPat = textures.getPattern(ctx, 'groundSandstoneSlabs', 0.36);
  ctx.fillStyle = slabPat ?? '#B28C55';
  ctx.fillRect(0, 0, worldW, worldH);

  // 2. Windblown desert sand drifts along perimeter walls, corners & sandy dune shoulders
  const sandPat = textures.getPattern(ctx, 'groundDesertSand', 0.4);
  drawMaskedTextureLayer(ctx, worldW, worldH, sandPat, (mctx) => {
    for (let i = 0; i < 28; i += 1) {
      const edge = i % 4;
      const pos = hash2(i, edge, map.seed + 823);
      const sx =
        edge === 0 ? 48 + pos * 110 : edge === 1 ? worldW - 48 - pos * 110 : pos * worldW;
      const sy =
        edge === 2 ? 44 + pos * 90 : edge === 3 ? worldH - 44 - pos * 90 : pos * worldH;
      const rad = 110 + hash2(i, 9, map.seed) * 140;
      const g = mctx.createRadialGradient(sx, sy, rad * 0.2, sx, sy, rad);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
      g.addColorStop(0.65, 'rgba(0, 0, 0, 0.42)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = g;
      mctx.beginPath();
      mctx.arc(sx, sy, rad, 0, Math.PI * 2);
      mctx.fill();
    }
  });

  // 3. Dressed Royal Sandstone Processional Avenues & Courtyards
  const [zA, zB, zC] = map.zones;
  const [bP, bE] = map.bases;
  const royalPat = textures.getPattern(ctx, 'groundRoyalCourtyard', 0.34);
  if (bP && bE && zA && zB && zC) {
    drawMaskedTextureLayer(ctx, worldW, worldH, royalPat, (mctx) => {
      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';
      for (const pass of [
        { width: 112, alpha: 0.44 },
        { width: 84, alpha: 0.78 },
        { width: 60, alpha: 0.96 },
      ]) {
        mctx.strokeStyle = `rgba(0, 0, 0, ${pass.alpha})`;
        mctx.lineWidth = pass.width;
        mctx.beginPath();
        mctx.moveTo(bP.center.x, bP.center.y);
        mctx.lineTo(zA.center.x, zA.center.y);
        mctx.lineTo(zB.center.x, zB.center.y);
        mctx.lineTo(zC.center.x, zC.center.y);
        mctx.lineTo(bE.center.x, bE.center.y);
        mctx.moveTo(bP.center.x, bP.center.y);
        mctx.lineTo(zB.center.x, zB.center.y);
        mctx.lineTo(bE.center.x, bE.center.y);
        mctx.moveTo(zA.center.x, zA.center.y);
        mctx.lineTo(zC.center.x, zC.center.y);
        mctx.stroke();
      }

      for (let i = 0; i < map.zones.length; i += 1) {
        const z = map.zones[i];
        const radius = i === 1 ? 160 : 142;
        const g = mctx.createRadialGradient(z.center.x, z.center.y, radius * 0.7, z.center.x, z.center.y, radius);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
        g.addColorStop(0.85, 'rgba(0, 0, 0, 0.84)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        mctx.fillStyle = g;
        mctx.beginPath();
        mctx.arc(z.center.x, z.center.y, radius, 0, Math.PI * 2);
        mctx.fill();
      }
      for (const b of map.bases) {
        const g = mctx.createRadialGradient(b.center.x, b.center.y, 76, b.center.x, b.center.y, 128);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        mctx.fillStyle = g;
        mctx.beginPath();
        mctx.arc(b.center.x, b.center.y, 128, 0, Math.PI * 2);
        mctx.fill();
      }
    });
  }

  // 4. Royal ceremonial rugs, Zone B solar plaza & cardinal staircases, temple plinth curbs
  drawTempleCourtyardDetails(ctx, map, structures, textures);

  // 5. Sacred turquoise oasis basins & lotus flowers
  drawSacredOasisPools(ctx, map, textures);

  // 6. Spawn pads, sandstone debris, oasis shoreline reeds, & partially buried blocks
  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      const kind = map.tiles[r][c];
      const x = c * ts;
      const y = r * ts;
      const h = hash2(c, r, map.seed + 373);

      if (kind === 'spawnPlayer' || kind === 'spawnEnemy') {
        ctx.fillStyle =
          kind === 'spawnPlayer' ? 'rgba(34, 211, 238, 0.14)' : 'rgba(255, 90, 60, 0.14)';
        ctx.fillRect(x, y, ts, ts);
        ctx.strokeStyle =
          kind === 'spawnPlayer' ? 'rgba(34, 211, 238, 0.34)' : 'rgba(255, 90, 60, 0.34)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
      } else if (kind === 'floor') {
        const wallUp = map.tiles[r - 1]?.[c] === 'wall';
        const waterNear =
          map.tiles[r - 1]?.[c] === 'water' ||
          map.tiles[r + 1]?.[c] === 'water' ||
          map.tiles[r]?.[c - 1] === 'water' ||
          map.tiles[r]?.[c + 1] === 'water';

        if (waterNear && h < 0.38) {
          drawDesertScrub(ctx, x + 16, y + 16, 12, c * 11 + r, textures);
        } else if (wallUp && h < 0.42) {
          drawSandstoneDebris(ctx, x + 16, y + 7, c * 19 + r);
        } else if (h > 0.965 && !waterNear) {
          // Partially sand-buried sandstone flagstone slab fragment
          ctx.save();
          ctx.translate(x + 16, y + 16);
          ctx.rotate((h - 0.98) * 5);
          ctx.fillStyle = 'rgba(184, 146, 88, 0.72)';
          ctx.fillRect(-9, -6, 18, 12);
          ctx.strokeStyle = 'rgba(42, 26, 10, 0.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-9, -6, 18, 12);
          ctx.restore();
        }
      }
    }
  }

  drawTempleEdgeShadeAndSunPools(ctx, map);

  // 7. Long afternoon shadows, warm umber AO
  if (!skipDynamicShadows) {
    drawTempleShadowsForRect(ctx, map, structures);
  }

  return canvas;
}

export function drawTempleAnimatedWater(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  time: number,
  c: number,
  r: number,
): void {
  const wave = Math.sin(time * 2.0 + c * 0.75 + r * 0.55);
  ctx.fillStyle = 'rgba(125, 249, 255, 0.2)';
  ctx.globalAlpha = 0.28 + (wave + 1) * 0.1;
  ctx.fillRect(x + 6, y + 9 + wave * 2.1, ts - 12, 2.2);
  ctx.fillRect(x + 9, y + 20 - wave * 2.1, ts - 16, 1.8);
  ctx.globalAlpha = 1;
}

/** Warm Egyptian desert afternoon sunbeams & soft lapis shade gradient. */
export function drawTempleAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, 'rgba(255, 224, 144, 0.1)');
  wash.addColorStop(0.55, 'rgba(255, 214, 120, 0)');
  wash.addColorStop(1, 'rgba(28, 18, 10, 0.11)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  if (!reducedMotion) {
    const pulse = 0.055 + 0.015 * Math.sin(time * 0.65);
    const sun = ctx.createRadialGradient(
      width * 0.36,
      height * 0.32,
      28,
      width * 0.42,
      height * 0.38,
      Math.max(width, height) * 0.58,
    );
    sun.addColorStop(0, `rgba(255, 232, 160, ${pulse.toFixed(3)})`);
    sun.addColorStop(1, 'rgba(255, 232, 160, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}
