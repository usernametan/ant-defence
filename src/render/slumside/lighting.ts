import type { GameState, MapData } from '../../shared/types';
import {
  drawStructureShadowsAndAoRegion,
  type ChunkRect,
  type ShadowStrokeOptions,
} from '../groundCache';
import { hash2, type SlumBuilding } from './architecture';
import { drawSlumParkedTwoWheeler, drawSlumWallClutter } from './props';
import type { SlumsideTextureAtlas } from './textures';

function drawRailwayCorridor(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  textures: SlumsideTextureAtlas,
): void {
  const ts = map.tileSize;
  const rx = 51 * ts - 4;
  const rw = 3 * ts + 8;
  const ry = ts;
  const rh = (map.height - 2) * ts;

  ctx.save();
  // Soft dirt shoulder beneath ballast
  const shoulderGrad = ctx.createLinearGradient(rx - 8, 0, rx + rw + 8, 0);
  shoulderGrad.addColorStop(0, 'rgba(62, 54, 44, 0)');
  shoulderGrad.addColorStop(0.1, 'rgba(54, 46, 38, 0.62)');
  shoulderGrad.addColorStop(0.9, 'rgba(54, 46, 38, 0.62)');
  shoulderGrad.addColorStop(1, 'rgba(62, 54, 44, 0)');
  ctx.fillStyle = shoulderGrad;
  ctx.fillRect(rx - 8, ry, rw + 16, rh);

  // Ballast stone fill
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();

  const ballastPat = textures.getPattern(ctx, 'railwayBallast', 0.28);
  ctx.fillStyle = ballastPat ?? '#4A433B';
  ctx.fillRect(rx, ry, rw, rh);

  // Subtle recessed track bed shadow along the two rail lanes
  for (const trackX of [51 * ts + 16, 52 * ts + 28]) {
    const bedGrad = ctx.createLinearGradient(trackX - 18, 0, trackX + 18, 0);
    bedGrad.addColorStop(0, 'rgba(20, 18, 16, 0.25)');
    bedGrad.addColorStop(0.5, 'rgba(20, 18, 16, 0.05)');
    bedGrad.addColorStop(1, 'rgba(20, 18, 16, 0.25)');
    ctx.fillStyle = bedGrad;
    ctx.fillRect(trackX - 18, ry, 36, rh);

    // Timber sleepers / ties every 9px
    for (let ty = ry + 3; ty < ry + rh - 2; ty += 9) {
      ctx.fillStyle = 'rgba(12, 10, 8, 0.45)';
      ctx.fillRect(trackX - 13, ty + 1, 26, 3.5);
      ctx.fillStyle = hash2(trackX, ty, map.seed) > 0.5 ? '#3D2B1F' : '#473325';
      ctx.fillRect(trackX - 13, ty, 26, 3);
      // Iron rail clips
      ctx.fillStyle = '#1E242B';
      ctx.fillRect(trackX - 9, ty - 0.5, 3, 4);
      ctx.fillRect(trackX + 6, ty - 0.5, 3, 4);
    }

    // Twin metallic steel rails with dark shadow and sunlit top flange
    for (const railOffset of [-8, 6.5]) {
      const lx = trackX + railOffset;
      ctx.fillStyle = 'rgba(10, 9, 8, 0.5)';
      ctx.fillRect(lx + 1, ry, 3, rh);
      ctx.fillStyle = '#525A65';
      ctx.fillRect(lx, ry, 2.5, rh);
      ctx.fillStyle = '#B8C2CC';
      ctx.fillRect(lx + 0.4, ry, 1.3, rh);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(lx + 0.5, ry, 0.7, rh);
    }
  }

  ctx.restore();

  // Trackside whistle post & signal junction boxes + dry ballast grass tufts
  for (let r = 3; r < map.height - 3; r += 1) {
    const h = hash2(50, r, map.seed + 409);
    const ty = r * ts;
    if (h < 0.22) {
      ctx.fillStyle = '#3B5929';
      ctx.beginPath();
      ctx.arc(51 * ts - 4, ty + 10, 3.2, 0, Math.PI * 2);
      ctx.arc(54 * ts + 3, ty + 20, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (r % 11 === 4 && map.tiles[r]?.[50] === 'floor') {
      // Concrete trackside junction box flush beside ballast edge
      ctx.fillStyle = 'rgba(12, 10, 14, 0.4)';
      ctx.fillRect(50 * ts + 21, ty + 9, 8, 12);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(50 * ts + 20, ty + 8, 7, 11);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(50 * ts + 21, ty + 10, 5, 2);
    }
  }
}

const SLUMSIDE_SHADOW_OPTS: ShadowStrokeOptions = {
  shadowColor: '#0D0B12',
  shadowAlpha: 0.42,
  shadowOffsetXFactor: 0.65,
  shadowOffsetYFactor: 0.55,
  blurPx: 5,
  aoOuterColor: 'rgba(12, 10, 14, 0.14)',
  aoOuterWidth: 14,
  aoInnerColor: 'rgba(10, 8, 12, 0.34)',
  aoInnerWidth: 5,
};

export function drawSlumsideShadowsForRect(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  buildings: readonly SlumBuilding[],
  rect?: ChunkRect,
  scratchCanvas?: HTMLCanvasElement | null,
): void {
  drawStructureShadowsAndAoRegion(ctx, map, buildings, SLUMSIDE_SHADOW_OPTS, rect, scratchCanvas);

  const ts = map.tileSize;
  const minC = rect ? Math.max(1, Math.floor(rect.x / ts)) : 1;
  const maxC = rect ? Math.min(map.width - 2, Math.ceil((rect.x + rect.w) / ts)) : map.width - 2;
  const minR = rect ? Math.max(1, Math.floor(rect.y / ts)) : 1;
  const maxR = rect ? Math.min(map.height - 2, Math.ceil((rect.y + rect.h) / ts)) : map.height - 2;

  // Subtle extra AO darkening inside narrow 1-2 tile alleyways
  ctx.save();
  ctx.fillStyle = 'rgba(12, 10, 14, 0.12)';
  for (let r = minR; r <= maxR; r += 1) {
    for (let c = minC; c <= maxC; c += 1) {
      if (map.tiles[r][c] !== 'floor') continue;
      const wallLR = map.tiles[r][c - 1] === 'wall' && map.tiles[r][c + 1] === 'wall';
      const wallUD = map.tiles[r - 1][c] === 'wall' && map.tiles[r + 1][c] === 'wall';
      if (wallLR || wallUD) {
        ctx.fillRect(c * ts, r * ts, ts, ts);
      }
    }
  }
  ctx.restore();
}

export function bakeSlumsideBaseFloorLayer(
  map: MapData,
  textures: SlumsideTextureAtlas,
  existingCanvas?: HTMLCanvasElement | null,
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

  // 1. Base dusty concrete texture (fine slab scale matching unit proportions)
  const concretePat = textures.getPattern(ctx, 'groundConcrete', 0.28);
  ctx.fillStyle = concretePat ?? '#736A5E';
  ctx.fillRect(0, 0, worldW, worldH);

  // 2. Soft feathered neighborhood ground blends (zero hard rectangular seams)
  const marketPat = textures.getPattern(ctx, 'groundMarket', 0.26);
  const [zA, zB, zC] = map.zones;
  if (marketPat && typeof document !== 'undefined') {
    const mCanvas = document.createElement('canvas');
    mCanvas.width = worldW;
    mCanvas.height = worldH;
    const mctx = mCanvas.getContext('2d');
    if (mctx) {
      mctx.fillStyle = marketPat;
      mctx.fillRect(0, 0, worldW, worldH);

      mctx.globalCompositeOperation = 'destination-in';
      const spots: Array<{ x: number; y: number; r: number; alpha: number }> = [];
      if (zB) spots.push({ x: zB.center.x, y: zB.center.y, r: 360, alpha: 0.85 });
      if (zA) spots.push({ x: zA.center.x, y: zA.center.y, r: 195, alpha: 0.55 });
      if (zC) spots.push({ x: zC.center.x, y: zC.center.y, r: 195, alpha: 0.55 });

      for (const s of spots) {
        const g = mctx.createRadialGradient(s.x, s.y, s.r * 0.25, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(0, 0, 0, ${s.alpha})`);
        g.addColorStop(0.65, `rgba(0, 0, 0, ${(s.alpha * 0.45).toFixed(2)})`);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        mctx.fillStyle = g;
        mctx.beginPath();
        mctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        mctx.fill();
      }
      ctx.drawImage(mCanvas, 0, 0);
    }
  }

  // Soft weathered industrial asphalt wash across eastern workshop district
  const eastGrad = ctx.createLinearGradient(37 * ts, 0, 51 * ts, 0);
  eastGrad.addColorStop(0, 'rgba(32, 30, 28, 0)');
  eastGrad.addColorStop(0.45, 'rgba(32, 30, 28, 0.16)');
  eastGrad.addColorStop(1, 'rgba(28, 26, 24, 0.24)');
  ctx.fillStyle = eastGrad;
  ctx.fillRect(37 * ts, ts, 14 * ts, (map.height - 2) * ts);

  // Multi-scale organic warm dust drifts & grime patches breaking up repetition
  ctx.save();
  for (let i = 0; i < 46; i += 1) {
    const px = hash2(i, 1, map.seed + 901) * worldW;
    const py = hash2(1, i, map.seed + 907) * worldH;
    const rx = 38 + hash2(i, i, map.seed + 911) * 76;
    const ry = 24 + hash2(i, i + 5, map.seed + 919) * 48;
    const warm = i % 2 === 0;
    const dg = ctx.createRadialGradient(px, py, 2, px, py, rx);
    dg.addColorStop(0, warm ? 'rgba(176, 152, 118, 0.16)' : 'rgba(34, 29, 24, 0.14)');
    dg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, hash2(i, 3, map.seed) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Subtle worn dusty footpaths guiding along major routes between bases & zones
  ctx.save();
  ctx.strokeStyle = 'rgba(196, 180, 154, 0.13)';
  ctx.lineWidth = 38;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const [bP, bE] = map.bases;
  if (bP && bE && zA && zB && zC) {
    ctx.beginPath();
    ctx.moveTo(bP.center.x, bP.center.y);
    ctx.lineTo(zA.center.x, zA.center.y);
    ctx.lineTo(zB.center.x, zB.center.y);
    ctx.lineTo(zC.center.x, zC.center.y);
    ctx.lineTo(bE.center.x, bE.center.y);
    ctx.moveTo(bP.center.x, bP.center.y);
    ctx.lineTo(zB.center.x, zB.center.y);
    ctx.moveTo(zA.center.x, zA.center.y);
    ctx.lineTo(zC.center.x, zC.center.y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Double railway track along eastern flank (col 51..53)
  drawRailwayCorridor(ctx, map, textures);

  // 5. Recessed storm drains ('water'), street grates, stains, spawn pads, and flush wall clutter
  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      const kind = map.tiles[r][c];
      const x = c * ts;
      const y = r * ts;
      const h = hash2(c, r, map.seed + 211);

      if (kind === 'water') {
        ctx.fillStyle = '#4B443B';
        ctx.fillRect(x, y, ts, ts);
        const padT = map.tiles[r - 1]?.[c] === 'water' ? 0 : 4;
        const padB = map.tiles[r + 1]?.[c] === 'water' ? 0 : 3;
        const padL = map.tiles[r]?.[c - 1] === 'water' ? 0 : 4;
        const padR = map.tiles[r]?.[c + 1] === 'water' ? 0 : 3;

        ctx.fillStyle = '#1B2B2E';
        ctx.fillRect(x + padL, y + padT, ts - padL - padR, ts - padT - padB);
        ctx.fillStyle = 'rgba(55, 82, 87, 0.5)';
        ctx.fillRect(x + padL + 2, y + padT + 2, ts - padL - padR - 4, ts - padT - padB - 4);
      } else if (kind === 'spawnPlayer' || kind === 'spawnEnemy') {
        ctx.fillStyle =
          kind === 'spawnPlayer' ? 'rgba(34, 211, 238, 0.14)' : 'rgba(255, 90, 60, 0.14)';
        ctx.fillRect(x, y, ts, ts);
        ctx.strokeStyle =
          kind === 'spawnPlayer' ? 'rgba(34, 211, 238, 0.34)' : 'rgba(255, 90, 60, 0.34)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
      } else if (kind === 'floor' && (c < 50 || c > 53)) {
        if (h < 0.12) {
          ctx.fillStyle = 'rgba(40, 34, 28, 0.2)';
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 16, 12, 8, h * 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (h > 0.93) {
          ctx.fillStyle = 'rgba(182, 162, 134, 0.18)';
          ctx.beginPath();
          ctx.ellipse(x + 14, y + 18, 13, 9, h * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        const wallUp = map.tiles[r - 1]?.[c] === 'wall';
        if (!wallUp && h > 0.61 && h < 0.635) {
          ctx.fillStyle = '#252A30';
          ctx.beginPath();
          ctx.arc(x + 16, y + 16, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (wallUp && r > 1) {
          ctx.fillStyle = 'rgba(148, 138, 124, 0.36)';
          ctx.fillRect(x + 2, y, ts - 4, 6);
          if (h < 0.18) {
            drawSlumWallClutter(ctx, x, y, ts, map.seed + c + r);
          } else if (h > 0.87 && c > 9 && c < 50) {
            const bikeColors = ['#DC2626', '#2563EB', '#E2E8F0', '#16A34A'];
            drawSlumParkedTwoWheeler(
              ctx,
              x + 16,
              y + 6,
              h > 0.93 ? 0.12 : Math.PI - 0.12,
              bikeColors[Math.floor(h * 100) % bikeColors.length],
            );
          }
        }
      }
    }
  }

  return canvas;
}

/**
 * Bakes the multi-layered Slumside ground cache: high-res painted textures per
 * neighborhood, pedestrian footpaths, double railway track, storm drains, wall-apron
 * clutter, soft directional building shadows, and ambient occlusion.
 */
export function bakeSlumsideGroundLayer(
  map: MapData,
  buildings: readonly SlumBuilding[],
  textures: SlumsideTextureAtlas,
  existingCanvas?: HTMLCanvasElement | null,
  baseFloorCanvas?: HTMLCanvasElement | null,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const base = baseFloorCanvas ?? bakeSlumsideBaseFloorLayer(map, textures);
  if (!base) return null;

  const ts = map.tileSize;
  const worldW = map.width * ts;
  const worldH = map.height * ts;
  const canvas = existingCanvas ?? document.createElement('canvas');
  canvas.width = worldW;
  canvas.height = worldH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, worldW, worldH);
  ctx.drawImage(base, 0, 0);
  drawSlumsideShadowsForRect(ctx, map, buildings);

  return canvas;
}

/**
 * Subtle warm Mumbai late-afternoon atmospheric wash + gentle top-left sunbeams
 * tying ground, buildings, props, and characters into one cohesive physical scene.
 */
export function drawSlumsideAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Subtle warm-key / cool-shadow directional ambient light
  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, 'rgba(255, 224, 168, 0.065)');
  wash.addColorStop(0.55, 'rgba(255, 224, 168, 0.0)');
  wash.addColorStop(1, 'rgba(14, 20, 38, 0.085)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  if (!reducedMotion) {
    const pulse = 0.03 + 0.012 * Math.sin(time * 0.7);
    const beam = ctx.createRadialGradient(
      width * 0.12,
      height * 0.08,
      20,
      width * 0.2,
      height * 0.15,
      Math.max(width, height) * 0.65,
    );
    beam.addColorStop(0, `rgba(255, 228, 175, ${pulse.toFixed(3)})`);
    beam.addColorStop(1, 'rgba(255, 228, 175, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

export function drawSlumAnimatedWater(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  time: number,
  c: number,
  r: number,
): void {
  const wave = Math.sin(time * 2.0 + c * 0.7 + r * 0.5);
  ctx.fillStyle = 'rgba(127, 163, 168, 0.26)';
  ctx.fillRect(x + 6, y + 9 + wave * 2, ts - 12, 2);
  ctx.fillRect(x + 10, y + 20 - wave * 2, ts - 16, 1.5);
}

export function isNearAnySlumZone(state: Readonly<GameState>, cx: number, cy: number): boolean {
  for (const z of state.map.zones) {
    if (Math.hypot(cx - z.center.x, cy - z.center.y) <= z.radius + 24) return true;
  }
  return false;
}
