import { PALETTE } from '../palette';
import type { FortressTextureAtlas } from './textures';

function propHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ATLAS_CELL_SIZE = 256;

export function drawSciFiAtlasCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  cx: number,
  cy: number,
  drawW: number,
  drawH: number,
  angle: number,
  textures?: FortressTextureAtlas,
): boolean {
  const atlas = textures?.getImage('scifiAtlas') ?? null;
  if (!atlas) return false;
  ctx.save();
  ctx.translate(cx, cy);
  if (angle !== 0) ctx.rotate(angle);
  ctx.drawImage(
    atlas,
    col * ATLAS_CELL_SIZE,
    row * ATLAS_CELL_SIZE,
    ATLAS_CELL_SIZE,
    ATLAS_CELL_SIZE,
    -drawW * 0.5,
    -drawH * 0.5,
    drawW,
    drawH,
  );
  ctx.restore();
  return true;
}

export function drawHazardChevronStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#EAB308';
  const step = 8;
  for (let sx = x - h; sx < x + w + h; sx += step * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + step, y + h);
    ctx.lineTo(sx + step + h, y);
    ctx.lineTo(sx + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawRecessedVentGrille(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.fillStyle = '#070B14';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.fillStyle = '#1E293B';
  if (w >= h) {
    for (let sx = x + 4; sx < x + w - 3; sx += 5) {
      ctx.fillRect(sx, y + 3, 2.2, h - 6);
    }
  } else {
    for (let sy = y + 4; sy < y + h - 3; sy += 5) {
      ctx.fillRect(x + 3, sy, w - 6, 2.2);
    }
  }
  ctx.restore();
}

export function drawEnergyConduitChannel(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  glowColor: string,
  width = 6,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#070B14';
  ctx.lineWidth = width + 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = width;
  ctx.stroke();

  ctx.strokeStyle = glowColor;
  ctx.globalAlpha = 0.52;
  ctx.lineWidth = Math.max(1.5, width * 0.35);
  ctx.stroke();
  ctx.restore();
}

export function drawTechFloorLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
): void {
  ctx.save();
  ctx.font = '700 8px "Courier New", monospace';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawSciFiPropShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
): void {
  ctx.fillStyle = 'rgba(4, 8, 18, 0.55)';
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 6, ts - 2, ts - 2, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(3, 6, 14, 0.6)';
  ctx.fillRect(x + 2, y + 3, ts - 4, ts - 4);
}

function drawCoverRubble(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 15, 28, 0.6)';
  ctx.fillRect(x + 6, y + 10, 8, 5);
  ctx.fillRect(x + 17, y + 18, 7, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 8, y + 15, 6, 4);
  ctx.fillStyle = propHash(x, y, seed) > 0.5 ? '#CA8A04' : '#1E293B';
  ctx.fillRect(x + 15, y + 10, 6, 4);
  ctx.restore();
}

function drawCoverDamage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
): void {
  if (hp >= 75) return;
  ctx.save();
  ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : '#070B14';
  ctx.lineWidth = hp < 35 ? 2 : 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 7);
  ctx.lineTo(x + ts * 0.5, y + ts * 0.45);
  ctx.lineTo(x + ts * 0.36, y + ts - 7);
  if (hp < 45) {
    ctx.moveTo(x + ts - 7, y + 8);
    ctx.lineTo(x + ts * 0.52, y + ts * 0.48);
  }
  ctx.stroke();
  ctx.restore();
}

/** 2.5D high-visibility industrial yellow tech cargo crate (signature destructible cover). */
export function drawSciFiYellowTechCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
): void {
  if (hp <= 0) {
    drawCoverRubble(ctx, x, y, seed);
    return;
  }

  ctx.save();
  // 2.5D shaded south metallic base face
  ctx.fillStyle = '#475569';
  ctx.fillRect(x + 2, y + ts - 8, ts - 4, 6);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(x + 5, y + ts - 6, ts - 10, 2.5);
  // Subtle status LED dot on front lip
  ctx.fillStyle = nearZone ? '#22D3EE' : '#FACC15';
  ctx.fillRect(x + ts - 8, y + ts - 6, 2.5, 2);

  // Beveled yellow industrial top cover casing
  const topGrad = ctx.createLinearGradient(x + 2, y + 2, x + ts - 2, y + ts - 8);
  topGrad.addColorStop(0, '#FDE047');
  topGrad.addColorStop(0.55, '#EAB308');
  topGrad.addColorStop(1, '#A16207');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, ts - 4, ts - 9, 2.5);
  ctx.fill();

  // Dark gunmetal inner lock core & diagonal magnetic clamp seams
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(x + 8, y + 7, ts - 16, ts - 19);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 8, y + 7, ts - 16, ts - 19);

  // Inner metallic handle strip
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(x + 12, y + 11, ts - 24, 2);

  // Crisp upper-left highlight & dark outer border
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(x + 3, y + 2.5, ts - 6, 1.5);
  ctx.strokeStyle = '#070B14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, ts - 4, ts - 4, 2.5);
  ctx.stroke();
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** Heavy armored gunmetal research supply locker with glowing cyan/violet cell & hazard strip. */
export function drawSciFiCapacitorCase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: FortressTextureAtlas,
): void {
  if (hp <= 0) {
    drawCoverRubble(ctx, x, y, seed);
    return;
  }

  ctx.save();
  const hullPat = textures?.getPattern(ctx, 'wallArmoredHull', 0.28) ?? null;

  // 2.5D south metallic base face
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(x + 2, y + ts - 8, ts - 4, 6);

  // Armored top housing
  ctx.fillStyle = hullPat ?? '#334155';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, ts - 4, ts - 9, 2.5);
  ctx.fill();

  // Hazard stripe across bottom trim
  drawHazardChevronStrip(ctx, x + 4, y + ts - 11, ts - 8, 3);

  // Recessed glowing cyan / violet energy core slot in center
  const isViolet = !nearZone && propHash(x, y, seed + 13) > 0.58;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(x + 7, y + 6, ts - 14, ts - 19);
  ctx.fillStyle = isViolet ? '#A855F7' : '#22D3EE';
  ctx.fillRect(x + 10, y + 9, ts - 20, 4);

  // Upper-left metallic highlight bevel
  ctx.fillStyle = 'rgba(226, 232, 240, 0.24)';
  ctx.fillRect(x + 3, y + 2.5, ts - 6, 1.5);
  ctx.strokeStyle = '#070B14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, ts - 4, ts - 4, 2.5);
  ctx.stroke();
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}
