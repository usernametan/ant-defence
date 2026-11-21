import { PALETTE } from '../palette';
import type { TempleTextureAtlas } from './textures';

function propHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ATLAS_CELL_SIZE = 256;

export function drawEgyptianAtlasCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  cx: number,
  cy: number,
  drawW: number,
  drawH: number,
  angle: number,
  textures?: TempleTextureAtlas,
): boolean {
  const atlas = textures?.getImage('egyptianAtlas') ?? null;
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

export function drawTemplePropShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
): void {
  // Long warm desert afternoon cast shadow (upper-left sun -> down-right)
  ctx.fillStyle = 'rgba(28, 18, 9, 0.42)';
  ctx.beginPath();
  ctx.roundRect(x + 7, y + 8, ts - 2, ts - 2, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(22, 14, 7, 0.48)';
  ctx.fillRect(x + 3, y + 4, ts - 4, ts - 4);
}

/** Sunken chiseled gold-inlaid Egyptian Ankh carved directly into courtyard flagstones. */
export function drawCarvedFloorAnkh(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  angle = 0,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  if (angle !== 0) ctx.rotate(angle);

  ctx.strokeStyle = 'rgba(38, 26, 12, 0.52)';
  ctx.lineWidth = Math.max(2.6, size * 0.19);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -size * 0.24, size * 0.2, 0, Math.PI * 2);
  ctx.moveTo(-size * 0.34, 0);
  ctx.lineTo(size * 0.34, 0);
  ctx.moveTo(0, -size * 0.04);
  ctx.lineTo(0, size * 0.48);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(218, 168, 52, 0.72)';
  ctx.lineWidth = Math.max(1.4, size * 0.1);
  ctx.beginPath();
  ctx.arc(0, -size * 0.24, size * 0.2, 0, Math.PI * 2);
  ctx.moveTo(-size * 0.34, 0);
  ctx.lineTo(size * 0.34, 0);
  ctx.moveTo(0, -size * 0.04);
  ctx.lineTo(0, size * 0.48);
  ctx.stroke();
  ctx.restore();
}

/** Carved golden sandstone staircase with lapis-and-gold trimmed balustrades. */
export function drawEgyptianStaircase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dir: 'N' | 'S' | 'E' | 'W',
  steps = 4,
  textures?: TempleTextureAtlas,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(30, 19, 9, 0.45)';
  ctx.fillRect(x + 3, y + 3, w, h);

  const stonePat = textures?.getPattern(ctx, 'groundRoyalCourtyard', 0.28) ?? null;
  ctx.fillStyle = stonePat ?? '#BC965D';
  ctx.fillRect(x, y, w, h);

  const vertical = dir === 'N' || dir === 'S';
  if (vertical) {
    // Flanking balustrades painted with lapis & gold end caps
    ctx.fillStyle = '#B89158';
    ctx.fillRect(x, y, 5, h);
    ctx.fillRect(x + w - 5, y, 5, h);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(x + 1, y + 2, 3, h - 4);
    ctx.fillRect(x + w - 4, y + 2, 3, h - 4);
    ctx.strokeStyle = '#332210';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 5, h);
    ctx.strokeRect(x + w - 5, y, 5, h);

    const stepH = h / steps;
    for (let i = 0; i < steps; i += 1) {
      const sy = y + i * stepH;
      const shade = dir === 'S' ? (steps - i) / steps : (i + 1) / steps;
      ctx.fillStyle = stonePat ?? '#C8A36A';
      ctx.fillRect(x + 5, sy, w - 10, stepH);
      ctx.fillStyle = `rgba(38, 24, 11, ${(0.34 - shade * 0.26).toFixed(2)})`;
      ctx.fillRect(x + 5, sy, w - 10, stepH);
      ctx.fillStyle = 'rgba(26, 16, 7, 0.56)';
      ctx.fillRect(x + 5, sy + stepH - 2, w - 10, 2);
      ctx.fillStyle = 'rgba(255, 232, 175, 0.32)';
      ctx.fillRect(x + 5, sy, w - 10, 1.3);
    }
  } else {
    ctx.fillStyle = '#B89158';
    ctx.fillRect(x, y, w, 5);
    ctx.fillRect(x, y + h - 5, w, 5);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(x + 2, y + 1, w - 4, 3);
    ctx.fillRect(x + 2, y + h - 4, w - 4, 3);
    ctx.strokeStyle = '#332210';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 5);
    ctx.strokeRect(x, y + h - 5, w, 5);

    const stepW = w / steps;
    for (let i = 0; i < steps; i += 1) {
      const sx = x + i * stepW;
      const shade = dir === 'E' ? (steps - i) / steps : (i + 1) / steps;
      ctx.fillStyle = stonePat ?? '#C8A36A';
      ctx.fillRect(sx, y + 5, stepW, h - 10);
      ctx.fillStyle = `rgba(38, 24, 11, ${(0.34 - shade * 0.26).toFixed(2)})`;
      ctx.fillRect(sx, y + 5, stepW, h - 10);
      ctx.fillStyle = 'rgba(26, 16, 7, 0.56)';
      ctx.fillRect(sx + stepW - 2, y + 5, 2, h - 10);
      ctx.fillStyle = 'rgba(255, 232, 175, 0.32)';
      ctx.fillRect(sx, y + 5, 1.3, h - 10);
    }
  }
  ctx.restore();
}

/** Lit Egyptian tripod bronze brazier with dynamic firelight glow (non-blocking). */
export function drawEgyptianBrazier(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  textures?: TempleTextureAtlas,
): void {
  const flicker = 0.88 + 0.12 * Math.sin(time * 9.5 + cx * 0.1);
  ctx.save();
  // Warm golden firelight spill on sandstone courtyard
  const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 36 * flicker);
  glow.addColorStop(0, 'rgba(255, 196, 68, 0.42)');
  glow.addColorStop(0.5, 'rgba(234, 88, 12, 0.16)');
  glow.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 36 * flicker, 0, Math.PI * 2);
  ctx.fill();

  // Contact shadow
  ctx.fillStyle = 'rgba(22, 13, 6, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + 4, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const drewAtlas = drawEgyptianAtlasCell(ctx, 2, 1, cx, cy, 24, 24, 0, textures);
  if (!drewAtlas) {
    ctx.fillStyle = '#9A6C26';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5 * flicker, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Top-down Egyptian date palm tree rendered from atlas cell (0,1). */
export function drawDatePalmTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  withShadow: boolean,
  textures?: TempleTextureAtlas,
): void {
  const h = propHash(Math.round(cx), Math.round(cy), seed);
  if (withShadow) {
    ctx.save();
    ctx.translate(cx + 15, cy + 14);
    ctx.fillStyle = 'rgba(24, 15, 7, 0.34)';
    ctx.beginPath();
    const fronds = 12;
    for (let i = 0; i <= fronds * 2; i += 1) {
      const a = (i / (fronds * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? radius * 1.15 : radius * 0.55;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const size = radius * 2.5;
  const drew = drawEgyptianAtlasCell(ctx, 0, 1, cx, cy, size, size, h * Math.PI * 2, textures);
  if (!drew) {
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + h;
      ctx.fillStyle = i % 2 === 0 ? '#4D7C36' : '#659B43';
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(a) * radius * 0.5,
        Math.sin(a) * radius * 0.5,
        radius * 0.48,
        radius * 0.14,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawDesertScrub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  textures?: TempleTextureAtlas,
): void {
  const h = propHash(Math.round(cx), Math.round(cy), seed);
  const size = radius * 2.4;
  const drew = drawEgyptianAtlasCell(ctx, 1, 1, cx, cy, size, size, h * Math.PI * 2, textures);
  if (!drew) {
    ctx.save();
    ctx.fillStyle = '#58783A';
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.8, radius * 0.6, h * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawSandstoneDebris(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
): void {
  ctx.save();
  const count = 3 + (seed % 3);
  for (let i = 0; i < count; i += 1) {
    const dx = (propHash(i, 1, seed) - 0.5) * 20;
    const dy = (propHash(1, i, seed) - 0.5) * 16;
    const w = 4 + propHash(i, i, seed) * 5;
    const h = 3 + propHash(i + 2, i, seed) * 4;
    ctx.fillStyle = 'rgba(28, 18, 8, 0.36)';
    ctx.fillRect(x + dx + 1.5, y + dy + 1.5, w, h);
    ctx.fillStyle = i % 2 === 0 ? '#B89158' : '#967241';
    ctx.fillRect(x + dx, y + dy, w, h);
  }
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
  ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : '#291B0C';
  ctx.lineWidth = hp < 35 ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 7);
  ctx.lineTo(x + ts * 0.48, y + ts * 0.48);
  ctx.lineTo(x + ts * 0.38, y + ts - 7);
  if (hp < 45) {
    ctx.moveTo(x + ts - 7, y + 8);
    ctx.lineTo(x + ts * 0.54, y + ts * 0.52);
  }
  ctx.stroke();
  ctx.restore();
}

/** 1. Colossal Pharaoh Statue cover with blue-and-gold Nemes headdress. */
export function drawPharaohStatueCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: TempleTextureAtlas,
): void {
  if (hp <= 0) {
    drawSandstoneDebris(ctx, x + 16, y + 16, seed);
    return;
  }

  ctx.save();
  const drew = drawEgyptianAtlasCell(
    ctx,
    0,
    0,
    x + ts * 0.5,
    y + ts * 0.46,
    ts + 4,
    ts + 4,
    0,
    textures,
  );
  if (!drew) {
    ctx.fillStyle = '#B89158';
    ctx.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    ctx.fillStyle = '#1E40AF';
    ctx.fillRect(x + 9, y + 6, ts - 18, 12);
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(x + 12, y + 8, ts - 24, 6);
  }
  if (nearZone) {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.52)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 3, y + 3, ts - 6, ts - 6);
  }
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** 2. Guardian Sphinx Sculpture cover on sandstone temple plinth. */
export function drawSphinxStatueCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: TempleTextureAtlas,
): void {
  if (hp <= 0) {
    drawSandstoneDebris(ctx, x + 16, y + 16, seed);
    return;
  }

  ctx.save();
  const drew = drawEgyptianAtlasCell(
    ctx,
    1,
    0,
    x + ts * 0.5,
    y + ts * 0.48,
    ts + 2,
    ts + 4,
    0,
    textures,
  );
  if (!drew) {
    ctx.fillStyle = '#C29A5D';
    ctx.fillRect(x + 4, y + 3, ts - 8, ts - 6);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(x + 10, y + 12, ts - 20, 8);
  }
  if (nearZone) {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 4, y + 3, ts - 8, ts - 6);
  }
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** 3. Royal Sandstone Sarcophagus with gilded mask & Ankh lid relief. */
export function drawSarcophagusCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  _nearZone: boolean,
  seed: number,
  textures?: TempleTextureAtlas,
): void {
  if (hp <= 0) {
    drawSandstoneDebris(ctx, x + 16, y + 16, seed);
    return;
  }

  ctx.save();
  const rot = propHash(x, y, seed) > 0.5 ? 0 : Math.PI * 0.5;
  const drew = drawEgyptianAtlasCell(
    ctx,
    2,
    0,
    x + ts * 0.5,
    y + ts * 0.5,
    ts + 2,
    ts + 2,
    rot,
    textures,
  );
  if (!drew) {
    ctx.fillStyle = '#9E7843';
    ctx.fillRect(x + 4, y + 3, ts - 8, ts - 6);
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(x + 8, y + 6, ts - 16, ts - 12);
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(x + 14, y + 10, 4, 12);
  }
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** 4. Ornate sandstone chest wall barricade with lapis/gold frieze & carved Ankh relief. */
export function drawEgyptianStoneBarricade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: TempleTextureAtlas,
): void {
  if (hp <= 0) {
    drawSandstoneDebris(ctx, x + 16, y + 16, seed);
    return;
  }

  ctx.save();
  const stonePat = textures?.getPattern(ctx, 'wallEgyptianSandstone', 0.28) ?? null;

  // 2.5D south stone face with lapis trim
  ctx.fillStyle = stonePat ?? '#8F6C3D';
  ctx.fillRect(x + 2, y + ts - 9, ts - 4, 7);
  ctx.fillStyle = 'rgba(28, 17, 7, 0.38)';
  ctx.fillRect(x + 2, y + ts - 9, ts - 4, 7);

  // Top staggered sandstone blocks
  ctx.fillStyle = stonePat ?? '#C8A164';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, 15, ts - 11, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 232, 170, 0.12)';
  ctx.fill();

  ctx.fillStyle = stonePat ?? '#BA9358';
  ctx.beginPath();
  ctx.roundRect(x + 16, y + 3, 14, ts - 10, 2);
  ctx.fill();

  // Blue-and-gold Egyptian cornice band along upper front crest
  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(x + 3, y + ts - 11, ts - 6, 3);
  ctx.fillStyle = nearZone ? '#FACC15' : '#D4A14B';
  ctx.fillRect(x + 3, y + ts - 12, ts - 6, 1.5);

  // Subtle carved top Ankh motif
  drawCarvedFloorAnkh(ctx, x + ts * 0.5, y + 11, 8, 0);

  ctx.strokeStyle = '#241709';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 3, ts - 4, ts - 5, 2);
  ctx.stroke();
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** 5. Fallen cylindrical painted Egyptian column drum resting in sand. */
export function drawBrokenEgyptianColumnCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: TempleTextureAtlas,
): void {
  if (hp <= 0) {
    drawSandstoneDebris(ctx, x + 16, y + 16, seed);
    return;
  }

  ctx.save();
  const stonePat = textures?.getPattern(ctx, 'groundRoyalCourtyard', 0.25) ?? null;

  const tilt = propHash(x, y, seed) > 0.5 ? 0.22 : -0.22;
  ctx.translate(x + ts * 0.5, y + ts * 0.5);
  ctx.rotate(tilt);

  ctx.fillStyle = stonePat ?? '#C49D61';
  ctx.beginPath();
  ctx.roundRect(-13, -9, 26, 18, 4);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, -10, 0, 10);
  grad.addColorStop(0, 'rgba(255, 236, 180, 0.28)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(32, 18, 8, 0.5)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Painted lapis-blue, turquoise & gold Egyptian column collar rings
  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(-5, -9, 4, 18);
  ctx.fillStyle = '#0D9488';
  ctx.fillRect(0, -9, 3, 18);
  ctx.fillStyle = nearZone ? '#FACC15' : '#D97706';
  ctx.fillRect(3, -9, 2, 18);

  // Fractured circular sandstone core on left drum end
  ctx.fillStyle = '#A8834E';
  ctx.beginPath();
  ctx.ellipse(-10, 0, 4.2, 8.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#241709';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-13, -9, 26, 18, 4);
  ctx.stroke();
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** 6. Egyptian wood-and-rope supply crate paired with striped terracotta canopic jars. */
export function drawEgyptianPotteryAndCrateCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
): void {
  if (hp <= 0) {
    drawSandstoneDebris(ctx, x + 16, y + 16, seed);
    return;
  }

  ctx.save();
  // Carved wood supply chest (left 65%)
  ctx.fillStyle = '#5E3B1B';
  ctx.fillRect(x + 2, y + ts - 8, 19, 6);
  ctx.fillStyle = '#8F5D2E';
  ctx.fillRect(x + 2, y + 4, 19, ts - 11);
  ctx.strokeStyle = '#38220D';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x + 4, y + 6, 15, ts - 15);
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 6);
  ctx.lineTo(x + 19, y + ts - 9);
  ctx.stroke();

  // Golden corner brass brackets
  ctx.fillStyle = nearZone ? '#FACC15' : '#D4A14B';
  ctx.fillRect(x + 2, y + 4, 3.5, 3.5);
  ctx.fillRect(x + 17.5, y + 4, 3.5, 3.5);
  ctx.fillRect(x + 2, y + ts - 8, 3.5, 3.5);

  ctx.strokeStyle = '#181008';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(x + 2, y + 4, 19, ts - 6);

  // Pair of painted Egyptian terracotta amphorae / canopic vessels on right
  const pots = [
    { cx: x + 25, cy: y + 11, r: 5.2 },
    { cx: x + 24, cy: y + 22, r: 5.5 },
  ];
  for (const p of pots) {
    const grad = ctx.createRadialGradient(p.cx - 1.5, p.cy - 1.5, 1, p.cx, p.cy, p.r);
    grad.addColorStop(0, '#D9864E');
    grad.addColorStop(0.65, '#9F562B');
    grad.addColorStop(1, '#582C13');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, p.r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#381B0B';
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, p.r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#181008';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}
