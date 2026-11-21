import type { MapData } from '../../shared/types';
import { hash2, type JungleRuin } from './ruins';
import type { JungleTextureAtlas } from './textures';
import {
  drawAncientStoneDebris,
  drawBroadLeafPlant,
  drawCarvedStoneStaircase,
  drawFallenJungleBranch,
  drawSmallWaterPool,
  drawTreeRoots,
  drawTropicalFernCluster,
} from './vegetation';

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

function drawWoodenJungleBridge(
  ctx: CanvasRenderingContext2D,
  textures: JungleTextureAtlas,
  x: number,
  y: number,
  ts: number,
  horizontal: boolean,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 16, 14, 0.46)';
  ctx.fillRect(x + 3, y + 4, ts, ts);

  const plankPat = textures.getPattern(ctx, 'woodAncientPlank', 0.22);
  ctx.fillStyle = plankPat ?? '#644426';
  ctx.fillRect(x, y, ts, ts);

  ctx.strokeStyle = 'rgba(20, 14, 8, 0.58)';
  ctx.lineWidth = 1.2;
  if (horizontal) {
    for (let px = 4; px < ts; px += 8) {
      ctx.beginPath();
      ctx.moveTo(x + px, y + 2);
      ctx.lineTo(x + px, y + ts - 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#4A311B';
    ctx.fillRect(x, y, ts, 3.5);
    ctx.fillRect(x, y + ts - 3.5, ts, 3.5);
    ctx.fillStyle = '#755131';
    ctx.fillRect(x, y + 0.5, ts, 1.2);
  } else {
    for (let py = 4; py < ts; py += 8) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + py);
      ctx.lineTo(x + ts - 2, y + py);
      ctx.stroke();
    }
    ctx.fillStyle = '#4A311B';
    ctx.fillRect(x, y, 3.5, ts);
    ctx.fillRect(x + ts - 3.5, y, 3.5, ts);
    ctx.fillStyle = '#755131';
    ctx.fillRect(x + 0.5, y, 1.2, ts);
  }
  ctx.restore();
}

function drawJungleRiverAndBridges(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  textures: JungleTextureAtlas,
): void {
  const ts = map.tileSize;

  // 1. Dark damp riverbanks & mossy shoreline mud halo
  ctx.save();
  for (let r = 1; r < map.height - 1; r += 1) {
    for (let c = 1; c < map.width - 1; c += 1) {
      if (map.tiles[r][c] !== 'water') continue;
      const x = c * ts;
      const y = r * ts;
      const g = ctx.createRadialGradient(x + 16, y + 16, 10, x + 16, y + 16, 26);
      g.addColorStop(0, 'rgba(18, 24, 16, 0.72)');
      g.addColorStop(0.65, 'rgba(30, 44, 24, 0.34)');
      g.addColorStop(1, 'rgba(30, 44, 24, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 2. Emerald river water & stone pond rims
  const waterPat = textures.getPattern(ctx, 'waterJungleRiver', 0.35);
  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      if (map.tiles[r][c] !== 'water') continue;
      const x = c * ts;
      const y = r * ts;
      const padT = map.tiles[r - 1]?.[c] === 'water' ? 0 : 4;
      const padB = map.tiles[r + 1]?.[c] === 'water' ? 0 : 2;
      const padL = map.tiles[r]?.[c - 1] === 'water' ? 0 : 4;
      const padR = map.tiles[r]?.[c + 1] === 'water' ? 0 : 2;

      ctx.fillStyle = '#2A3324';
      ctx.fillRect(x, y, ts, ts);

      ctx.fillStyle = waterPat ?? '#0E4352';
      ctx.fillRect(x + padL, y + padT, ts - padL - padR, ts - padT - padB);

      if (padT > 0 || padL > 0 || padB > 0 || padR > 0) {
        ctx.fillStyle = 'rgba(64, 152, 138, 0.22)';
        if (padT > 0) ctx.fillRect(x + padL, y + padT, ts - padL - padR, 3);
        if (padL > 0) ctx.fillRect(x + padL, y + padT, 3, ts - padT - padB);
      }

      const h = hash2(c, r, map.seed + 419);
      if (h < 0.16) {
        const lx = x + 10 + h * 40;
        const ly = y + 14;
        ctx.fillStyle = '#2B6E3A';
        ctx.beginPath();
        ctx.arc(lx, ly, 4.2, 0.2, Math.PI * 1.9);
        ctx.lineTo(lx, ly);
        ctx.fill();
      } else if (padT > 0 && h < 0.55) {
        ctx.fillStyle = '#56604E';
        ctx.beginPath();
        ctx.arc(x + 9, y + 2, 3.4, 0, Math.PI * 2);
        ctx.arc(x + 21, y + 3, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. Weathered wooden plank bridges ONLY where a walkable corridor truly crosses water
  for (let r = 1; r < map.height - 1; r += 1) {
    for (let c = 1; c < map.width - 1; c += 1) {
      if (map.tiles[r][c] !== 'floor') continue;
      const wUp = map.tiles[r - 1]?.[c] === 'water';
      const wDown = map.tiles[r + 1]?.[c] === 'water';
      const wLeft = map.tiles[r]?.[c - 1] === 'water';
      const wRight = map.tiles[r]?.[c + 1] === 'water';
      if (wUp && wDown) {
        drawWoodenJungleBridge(ctx, textures, c * ts, r * ts, ts, false);
      } else if (wLeft && wRight) {
        drawWoodenJungleBridge(ctx, textures, c * ts, r * ts, ts, true);
      }
    }
  }
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

function drawCourtyardArchitectureDetails(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  ruins: readonly JungleRuin[],
  textures: JungleTextureAtlas,
): void {
  const ts = map.tileSize;
  const [, zB] = map.zones;

  // 1. Grand Central Ancient Courtyard architectural rings & 4 cardinal staircases (Zone B)
  if (zB) {
    const cx = zB.center.x;
    const cy = zB.center.y;
    ctx.save();
    ctx.strokeStyle = 'rgba(26, 30, 22, 0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 148, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(202, 192, 152, 0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 145, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(18, 22, 16, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 122, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(20, 24, 18, 0.35)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 122, cy + Math.sin(a) * 122);
      ctx.lineTo(cx + Math.cos(a) * 147, cy + Math.sin(a) * 147);
      ctx.stroke();
    }
    ctx.restore();

    const stairOffsets: Array<{ dx: number; dy: number; w: number; h: number; dir: 'N' | 'S' | 'E' | 'W' }> = [
      { dx: -24, dy: -162, w: 48, h: 24, dir: 'N' },
      { dx: -24, dy: 138, w: 48, h: 24, dir: 'S' },
      { dx: -162, dy: -24, w: 24, h: 48, dir: 'W' },
      { dx: 138, dy: -24, w: 24, h: 48, dir: 'E' },
    ];
    for (const s of stairOffsets) {
      const sx = cx + s.dx;
      const sy = cy + s.dy;
      if (isRectClearFloor(map, sx - 2, sy - 2, s.w + 4, s.h + 4)) {
        drawCarvedStoneStaircase(ctx, sx, sy, s.w, s.h, s.dir, 4, textures);
      }
    }
  }

  // 2. Stepped temple stone plinth curbs & stairs beside interior temple ruins
  for (const r of ruins) {
    if (r.isBorder || r.kind === 'pillar') continue;
    const rx = r.col * ts;
    const ry = r.row * ts;
    const rw = r.w * ts;
    const rh = r.h * ts;

    ctx.save();
    ctx.strokeStyle = 'rgba(20, 24, 18, 0.42)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rx - 8, ry - 8, rw + 16, rh + 16);
    ctx.strokeStyle = 'rgba(195, 190, 154, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx - 6, ry - 6, rw + 12, rh + 12);
    ctx.restore();

    if (r.w >= 3 && r.row + r.h + 1 < map.height) {
      const sx = rx + rw * 0.5 - 20;
      const sy = ry + rh + 2;
      if (isRectClearFloor(map, sx - 2, sy, 44, 20)) {
        drawCarvedStoneStaircase(ctx, sx, sy, 40, 18, 'S', 3, textures);
      }
    }
  }

  // 3. Outer Zone A & Zone C subtle stone sanctum curbs
  for (let i = 0; i < map.zones.length; i += 1) {
    if (i === 1) continue;
    const z = map.zones[i];
    ctx.save();
    ctx.strokeStyle = 'rgba(24, 28, 20, 0.46)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 134, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(196, 188, 148, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 131, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawJungleShadowsAndAo(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  ruins: readonly JungleRuin[],
): void {
  const ts = map.tileSize;
  const worldW = map.width * ts;
  const worldH = map.height * ts;

  // 1. Soft directional afternoon shadows from ruins & perimeter canopy trees
  if (typeof document !== 'undefined') {
    const sc = document.createElement('canvas');
    sc.width = Math.max(1, Math.floor(worldW * 0.5));
    sc.height = Math.max(1, Math.floor(worldH * 0.5));
    const sctx = sc.getContext('2d');
    if (sctx) {
      sctx.save();
      sctx.scale(0.5, 0.5);
      if ('filter' in sctx) sctx.filter = 'blur(6px)';
      sctx.fillStyle = '#071009';

      for (const r of ruins) {
        const bx = r.col * ts;
        const by = r.row * ts;
        const bw = r.w * ts;
        const bh = r.h * ts;
        const dx = r.elevation * 0.72;
        const dy = r.elevation * 0.6;

        sctx.beginPath();
        sctx.moveTo(bx + bw, by);
        sctx.lineTo(bx + bw + dx, by + dy);
        sctx.lineTo(bx + bw + dx, by + bh + dy);
        sctx.lineTo(bx + dx, by + bh + dy);
        sctx.lineTo(bx, by + bh);
        sctx.closePath();
        sctx.fill();
      }

      // Irregular leaf-crown shadow silhouettes cast inward from border forest trees
      for (let r = 0; r < map.height; r += 1) {
        for (let c = 0; c < map.width; c += 1) {
          const isBorder = r === 0 || c === 0 || r === map.height - 1 || c === map.width - 1;
          if (!isBorder) continue;
          const h = hash2(c, r, map.seed + 607);
          if (h >= 0.34) continue;
          const cx = c * ts + 24;
          const cy = r * ts + 24;
          const rad = 28 + h * 50;
          sctx.beginPath();
          for (let i = 0; i <= 10; i += 1) {
            const a = (i / 10) * Math.PI * 2;
            const rr = rad * (0.7 + hash2(i, c + r, map.seed + 19) * 0.42);
            const px = cx + Math.cos(a) * rr;
            const py = cy + Math.sin(a) * rr;
            if (i === 0) sctx.moveTo(px, py);
            else sctx.lineTo(px, py);
          }
          sctx.closePath();
          sctx.fill();
        }
      }
      sctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.44;
      ctx.drawImage(sc, 0, 0, worldW, worldH);
      ctx.restore();
    }
  }

  // 2. Darker shaded vegetation canopy borders around map edges
  ctx.save();
  const topShade = ctx.createLinearGradient(0, 0, 0, ts * 4);
  topShade.addColorStop(0, 'rgba(6, 15, 9, 0.55)');
  topShade.addColorStop(1, 'rgba(6, 15, 9, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, worldW, ts * 4);

  const botShade = ctx.createLinearGradient(0, worldH - ts * 4, 0, worldH);
  botShade.addColorStop(0, 'rgba(6, 15, 9, 0)');
  botShade.addColorStop(1, 'rgba(6, 15, 9, 0.5)');
  ctx.fillStyle = botShade;
  ctx.fillRect(0, worldH - ts * 4, worldW, ts * 4);

  const leftShade = ctx.createLinearGradient(0, 0, ts * 3.5, 0);
  leftShade.addColorStop(0, 'rgba(6, 15, 9, 0.52)');
  leftShade.addColorStop(1, 'rgba(6, 15, 9, 0)');
  ctx.fillStyle = leftShade;
  ctx.fillRect(0, 0, ts * 3.5, worldH);

  const rightShade = ctx.createLinearGradient(worldW - ts * 3.5, 0, worldW, 0);
  rightShade.addColorStop(0, 'rgba(6, 15, 9, 0)');
  rightShade.addColorStop(1, 'rgba(6, 15, 9, 0.48)');
  ctx.fillStyle = rightShade;
  ctx.fillRect(worldW - ts * 3.5, 0, ts * 3.5, worldH);

  // 3. Tight ambient occlusion contact creases around interior ruin structures
  for (const r of ruins) {
    if (r.isBorder) continue;
    const bx = r.col * ts;
    const by = r.row * ts;
    const bw = r.w * ts;
    const bh = r.h * ts;

    ctx.strokeStyle = 'rgba(8, 14, 9, 0.22)';
    ctx.lineWidth = 14;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.strokeStyle = 'rgba(6, 10, 7, 0.4)';
    ctx.lineWidth = 5;
    ctx.strokeRect(bx, by, bw, bh);
  }
  ctx.restore();

  // 4. Warm golden afternoon highlights on exposed central courtyard & stone avenues
  ctx.save();
  for (const z of map.zones) {
    const sunGrad = ctx.createRadialGradient(
      z.center.x - 16,
      z.center.y - 16,
      12,
      z.center.x,
      z.center.y,
      175,
    );
    sunGrad.addColorStop(0, 'rgba(255, 232, 162, 0.14)');
    sunGrad.addColorStop(0.55, 'rgba(255, 224, 140, 0.05)');
    sunGrad.addColorStop(1, 'rgba(255, 224, 140, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 175, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Bakes the redesigned 3-layer Jungle Outpost terrain: clean damp earth & moss
 * forest soil, overgrown stone corridors & ruin aprons, grand ancient stone temple
 * courtyards & carved staircases, emerald river & bridges, roots, pools, and shadows.
 */
export function bakeJungleGroundLayer(
  map: MapData,
  ruins: readonly JungleRuin[],
  textures: JungleTextureAtlas,
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

  // 1. Clean, non-repetitive damp jungle topsoil & mossy earth base (no brown leaf clutter!)
  const earthPat = textures.getPattern(ctx, 'groundJungleEarth', 0.44);
  ctx.fillStyle = earthPat ?? '#333929';
  ctx.fillRect(0, 0, worldW, worldH);

  const [zA, zB, zC] = map.zones;
  const [bP, bE] = map.bases;

  // 2. Overgrown stone ruin aprons & broken flagstone corridor shoulders (Layer 1 ground transition)
  const overgrownPat = textures.getPattern(ctx, 'groundOvergrownRuins', 0.36);
  drawMaskedTextureLayer(ctx, worldW, worldH, overgrownPat, (mctx) => {
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';
    mctx.fillStyle = 'rgba(0, 0, 0, 0.85)';

    // Broad overgrown temple zones beneath all interior ruins
    for (const r of ruins) {
      if (r.isBorder) continue;
      const cx = (r.col + r.w * 0.5) * ts;
      const cy = (r.row + r.h * 0.5) * ts;
      const rad = Math.max(r.w, r.h) * ts * 0.72 + 48;
      const g = mctx.createRadialGradient(cx, cy, rad * 0.35, cx, cy, rad);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
      g.addColorStop(0.7, 'rgba(0, 0, 0, 0.48)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = g;
      mctx.beginPath();
      mctx.arc(cx, cy, rad, 0, Math.PI * 2);
      mctx.fill();
    }

    // Wide feathered shoulders along main routes & upper/lower corridors
    if (bP && bE && zA && zB && zC) {
      mctx.strokeStyle = 'rgba(0, 0, 0, 0.52)';
      mctx.lineWidth = 152;
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
  });

  // 3. Interconnected Ancient Stone Pathways & Grand Temple Courtyards (fixed single source-in mask!)
  const stonePat = textures.getPattern(ctx, 'groundStoneMoss', 0.34);
  if (bP && bE && zA && zB && zC) {
    drawMaskedTextureLayer(ctx, worldW, worldH, stonePat, (mctx) => {
      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';

      // Soft feathered stone avenue passes (source-over first -> source-in once!)
      for (const pass of [
        { width: 108, alpha: 0.42 },
        { width: 82, alpha: 0.72 },
        { width: 58, alpha: 0.96 },
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

      // Grand stone courtyard plazas at Zones A, B, C & Bases
      for (let i = 0; i < map.zones.length; i += 1) {
        const z = map.zones[i];
        const radius = i === 1 ? 156 : 142;
        const g = mctx.createRadialGradient(z.center.x, z.center.y, radius * 0.68, z.center.x, z.center.y, radius);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
        g.addColorStop(0.84, 'rgba(0, 0, 0, 0.85)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        mctx.fillStyle = g;
        mctx.beginPath();
        mctx.arc(z.center.x, z.center.y, radius, 0, Math.PI * 2);
        mctx.fill();
      }
      for (const b of map.bases) {
        const g = mctx.createRadialGradient(b.center.x, b.center.y, 76, b.center.x, b.center.y, 128);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
        g.addColorStop(0.8, 'rgba(0, 0, 0, 0.72)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        mctx.fillStyle = g;
        mctx.beginPath();
        mctx.arc(b.center.x, b.center.y, 128, 0, Math.PI * 2);
        mctx.fill();
      }

      // Raised temple plinth aprons directly under interior ruin structures
      mctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
      for (const r of ruins) {
        if (r.isBorder || r.kind === 'pillar') continue;
        mctx.beginPath();
        mctx.roundRect(r.col * ts - 10, r.row * ts - 10, r.w * ts + 20, r.h * ts + 20, 6);
        mctx.fill();
      }
    });
  }

  // 4. Courtyard curbs, radial stone grooves, temple plinth rims & ancient staircases
  drawCourtyardArchitectureDetails(ctx, map, ruins, textures);

  // 5. Winding jungle river, mossy pond & weathered plank bridges
  drawJungleRiverAndBridges(ctx, map, textures);

  // 6. Selective small shallow rainwater pools & natural shoreline plants
  for (let i = 0; i < ruins.length; i += 1) {
    const r = ruins[i];
    if (r.isBorder || r.kind === 'pillar') continue;
    const h = hash2(r.col, r.row, map.seed + 521);
    if (h < 0.28) {
      const px = (r.col + r.w + 0.8) * ts;
      const py = (r.row + 0.7) * ts;
      if (
        px > ts * 3 &&
        px < (map.width - 4) * ts &&
        py > ts * 2 &&
        py < (map.height - 3) * ts &&
        isRectClearFloor(map, px - 18, py - 14, 36, 28) &&
        !map.zones.some((z) => Math.hypot(px - z.center.x, py - z.center.y) < z.radius + 26)
      ) {
        drawSmallWaterPool(ctx, px, py, 16, 11, r.seed + 19);
      }
    }
  }

  // 7. Spawn pads, river-bank ferns/rocks, wall-apron roots/ferns, scattered fallen branches & selective leaves
  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      const kind = map.tiles[r][c];
      const x = c * ts;
      const y = r * ts;
      const h = hash2(c, r, map.seed + 331);

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
        const wallLeft = map.tiles[r]?.[c - 1] === 'wall';
        const wallRight = map.tiles[r]?.[c + 1] === 'wall';
        const waterNear =
          map.tiles[r - 1]?.[c] === 'water' ||
          map.tiles[r + 1]?.[c] === 'water' ||
          map.tiles[r]?.[c - 1] === 'water' ||
          map.tiles[r]?.[c + 1] === 'water';
        const waterOpposite =
          (map.tiles[r - 1]?.[c] === 'water' && map.tiles[r + 1]?.[c] === 'water') ||
          (map.tiles[r]?.[c - 1] === 'water' && map.tiles[r]?.[c + 1] === 'water');
        const nearPerimeter = r <= 2 || r >= map.height - 3 || c <= 2 || c >= map.width - 3;

        if (waterNear && !waterOpposite && h < 0.42) {
          // Soften square river bends with natural bank boulders, ferns & broadleaf shoots
          if (h < 0.16) {
            drawTropicalFernCluster(ctx, x + 16, y + 16, 0.72, h * 9, c * 7 + r);
          } else if (h < 0.28) {
            drawBroadLeafPlant(ctx, x + 16, y + 16, 0.68, c + r * 11);
          } else {
            drawAncientStoneDebris(ctx, x + 16, y + 16, c * 19 + r);
          }
        } else if (wallUp) {
          if (h < 0.24) {
            drawTreeRoots(ctx, x + 16, y + 2, Math.PI * 0.48 + (h - 0.12) * 2, 16, map.seed + c);
          } else if (h < 0.44) {
            drawTropicalFernCluster(ctx, x + 16, y + 5, 0.82, h * 6, c * 11 + r);
          } else if (h < 0.62) {
            drawAncientStoneDebris(ctx, x + 16, y + 6, c * 17 + r);
          } else if (h > 0.84) {
            drawBroadLeafPlant(ctx, x + 16, y + 5, 0.78, c + r * 13);
          }
        } else if (wallLeft && h < 0.34) {
          drawTropicalFernCluster(ctx, x + 6, y + 16, 0.74, h * 6, c + r);
        } else if (wallRight && h > 0.7) {
          drawBroadLeafPlant(ctx, x + ts - 6, y + 16, 0.72, c * 3 + r);
        } else if (nearPerimeter && h > 0.88) {
          ctx.fillStyle = h > 0.94 ? 'rgba(136, 92, 42, 0.55)' : 'rgba(92, 128, 52, 0.5)';
          ctx.beginPath();
          ctx.ellipse(x + 12, y + 14, 3.2, 1.4, h * 5, 0, Math.PI * 2);
          ctx.ellipse(x + 21, y + 20, 2.8, 1.3, h * 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (!nearPerimeter && h > 0.955 && stonePat) {
          // Scattered weathered ancient flagstone slab protruding from soil transition
          ctx.save();
          ctx.translate(x + 16, y + 16);
          ctx.rotate((h - 0.97) * 4);
          ctx.fillStyle = stonePat;
          ctx.fillRect(-10, -7, 20, 14);
          ctx.strokeStyle = 'rgba(16, 20, 14, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-10, -7, 20, 14);
          ctx.restore();
        }

        const branchH = hash2(c, r, map.seed + 733);
        if (
          branchH < 0.018 &&
          c > 6 &&
          c < map.width - 7 &&
          r > 3 &&
          r < map.height - 4 &&
          !wallUp &&
          !waterNear &&
          !map.zones.some((z) => Math.hypot(x + 16 - z.center.x, y + 16 - z.center.y) < z.radius + 22)
        ) {
          drawFallenJungleBranch(ctx, x + 16, y + 16, (branchH * 100) % 3, 28, map.seed + c + r);
        }
      }
    }
  }

  // 8. Directional ruin shadows + irregular tree canopy shadows + ambient occlusion + courtyard sunlight
  drawJungleShadowsAndAo(ctx, map, ruins);

  return canvas;
}

export function drawJungleAnimatedWater(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  time: number,
  c: number,
  r: number,
): void {
  const wave = Math.sin(time * 2.1 + c * 0.75 + r * 0.55);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.18)';
  ctx.globalAlpha = 0.26 + (wave + 1) * 0.1;
  ctx.fillRect(x + 5, y + 8 + wave * 2.2, ts - 11, 2.2);
  ctx.fillRect(x + 9, y + 20 - wave * 2.2, ts - 15, 1.8);
  ctx.globalAlpha = 1;
}

/**
 * Warm jungle afternoon sunlight filtering through canopy + diagonal sunlight glow.
 */
export function drawJungleAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, 'rgba(255, 224, 148, 0.085)');
  wash.addColorStop(0.5, 'rgba(255, 224, 148, 0)');
  wash.addColorStop(1, 'rgba(7, 22, 16, 0.13)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  if (!reducedMotion) {
    const pulse = 0.048 + 0.015 * Math.sin(time * 0.65);
    const clearingLight = ctx.createRadialGradient(
      width * 0.45,
      height * 0.38,
      24,
      width * 0.48,
      height * 0.42,
      Math.max(width, height) * 0.56,
    );
    clearingLight.addColorStop(0, `rgba(255, 234, 168, ${pulse.toFixed(3)})`);
    clearingLight.addColorStop(1, 'rgba(255, 234, 168, 0)');
    ctx.fillStyle = clearingLight;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}
