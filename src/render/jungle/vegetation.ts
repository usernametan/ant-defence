import { PALETTE } from '../palette';
import type { JungleTextureAtlas } from './textures';

function propHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ATLAS_CELL_SIZE = 256;

const fallbackTreeSprites = new Map<number, HTMLCanvasElement>();

function drawPointedLeaf2D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  len: number,
  wid: number,
  angle: number,
  fill: string,
  stroke?: string,
): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const nx = -sa;
  const ny = ca;
  ctx.beginPath();
  ctx.moveTo(cx - ca * len * 0.08, cy - sa * len * 0.08);
  ctx.lineTo(cx + ca * len * 0.28 + nx * wid * 0.9, cy + sa * len * 0.28 + ny * wid * 0.9);
  ctx.lineTo(cx + ca * len * 0.65 + nx * wid * 0.55, cy + sa * len * 0.65 + ny * wid * 0.55);
  ctx.lineTo(cx + ca * len, cy + sa * len);
  ctx.lineTo(cx + ca * len * 0.65 - nx * wid * 0.55, cy + sa * len * 0.65 - ny * wid * 0.55);
  ctx.lineTo(cx + ca * len * 0.28 - nx * wid * 0.9, cy + sa * len * 0.28 - ny * wid * 0.9);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function getFallbackFoliageSprite(cellIndex: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = fallbackTreeSprites.get(cellIndex);
  if (cached) return cached;

  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const fctx = c.getContext('2d');
  if (!fctx) return null;

  const cx = size * 0.5;
  const cy = size * 0.5;
  const isPalm = cellIndex === 2;
  const seed = 911 + cellIndex * 37;

  if (isPalm) {
    for (let i = 0; i < 11; i += 1) {
      const a = (i / 11) * Math.PI * 2 + propHash(i, 1, seed) * 0.3;
      const len = 34 + propHash(i, 3, seed) * 18;
      for (let s = 2; s < 9; s += 1) {
        const t = s / 9;
        const px = cx + Math.cos(a) * len * t;
        const py = cy + Math.sin(a) * len * t;
        const lw = 8 + Math.sin(t * Math.PI) * 10;
        drawPointedLeaf2D(fctx, px, py, lw, 2.2, a + 1.05, i % 2 === 0 ? '#2D6B33' : '#468E42');
        drawPointedLeaf2D(fctx, px, py, lw, 2.2, a - 1.05, i % 2 === 0 ? '#2D6B33' : '#468E42');
      }
    }
  } else {
    const count = cellIndex >= 4 ? 18 : 28;
    const rad = cellIndex >= 4 ? 26 : 36;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + propHash(i, 2, seed) * 0.6;
      const d = propHash(i, 5, seed) * rad * 0.72;
      const lx = cx + Math.cos(a) * d;
      const ly = cy + Math.sin(a) * d;
      const fill = i % 3 === 0 ? '#1C4826' : i % 3 === 1 ? '#2F6C36' : '#4A9145';
      drawPointedLeaf2D(
        fctx,
        lx,
        ly,
        14 + propHash(i, 8, seed) * 14,
        5 + propHash(i, 11, seed) * 4,
        a + (propHash(i, 13, seed) - 0.5) * 0.7,
        fill,
        '#0F2414',
      );
    }
  }

  fallbackTreeSprites.set(cellIndex, c);
  return c;
}

function drawIrregularFoliageShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(cx + 12, cy + 14);
  ctx.fillStyle = 'rgba(6, 12, 8, 0.34)';
  ctx.beginPath();
  const lobes = 14;
  for (let i = 0; i <= lobes; i += 1) {
    const a = (i / lobes) * Math.PI * 2;
    const r = radius * (0.76 + propHash(i, 19, seed) * 0.38);
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r * 0.92;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawJunglePropShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
): void {
  ctx.fillStyle = 'rgba(7, 12, 8, 0.40)';
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 7, ts - 3, ts - 4, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(6, 10, 8, 0.45)';
  ctx.fillRect(x + 2, y + 3, ts - 4, ts - 4);
}

/**
 * Large multi-layered tropical jungle canopy tree rendered from the irregular
 * top-down botanical sprite atlas (banyan, rainforest hardwood, palm, broadleaf).
 */
export function drawJungleCanopyTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  withShadow: boolean,
  textures?: JungleTextureAtlas,
): void {
  const h = propHash(Math.round(cx), Math.round(cy), seed);
  if (withShadow) {
    drawIrregularFoliageShadow(ctx, cx, cy, radius * 1.05, seed);
  }

  // Distribute natural species: Banyan (0), Hardwood (1), Jungle Palm (2), Broadleaf (3)
  const speciesRoll = propHash(seed, Math.round(cx + cy), 601);
  const col = speciesRoll < 0.36 ? 0 : speciesRoll < 0.72 ? 1 : speciesRoll < 0.92 ? 2 : 3;
  const drawSize = radius * 2.55;
  const rot = h * Math.PI * 2;
  const atlas = textures?.getImage('foliageAtlas') ?? null;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  if (atlas) {
    ctx.drawImage(
      atlas,
      col * ATLAS_CELL_SIZE,
      0,
      ATLAS_CELL_SIZE,
      ATLAS_CELL_SIZE,
      -drawSize * 0.5,
      -drawSize * 0.5,
      drawSize,
      drawSize,
    );
  } else {
    const fb = getFallbackFoliageSprite(col);
    if (fb) {
      ctx.drawImage(fb, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
    }
  }
  ctx.restore();
}

export function drawTropicalBush(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  textures?: JungleTextureAtlas,
): void {
  const h = propHash(Math.round(cx), Math.round(cy), seed + 17);
  drawIrregularFoliageShadow(ctx, cx - 8, cy - 9, radius * 0.92, seed + 5);

  const col = h < 0.42 ? 0 : h < 0.72 ? 1 : h < 0.9 ? 2 : 3;
  const drawSize = radius * 2.55;
  const atlas = textures?.getImage('foliageAtlas') ?? null;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(h * Math.PI * 2);
  if (atlas) {
    ctx.drawImage(
      atlas,
      col * ATLAS_CELL_SIZE,
      ATLAS_CELL_SIZE,
      ATLAS_CELL_SIZE,
      ATLAS_CELL_SIZE,
      -drawSize * 0.5,
      -drawSize * 0.5,
      drawSize,
      drawSize,
    );
  } else {
    const fb = getFallbackFoliageSprite(4 + col);
    if (fb) {
      ctx.drawImage(fb, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
    }
  }
  ctx.restore();
}

export function drawTropicalFernCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  angle: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const fronds = 7 + (seed % 3);
  for (let i = 0; i < fronds; i += 1) {
    ctx.save();
    ctx.rotate((i / fronds) * Math.PI * 2 + propHash(i, 2, seed) * 0.34);
    const len = (10 + propHash(i, 7, seed) * 6) * scale;
    drawPointedLeaf2D(
      ctx,
      0,
      0,
      len,
      2.6 * scale,
      0,
      i % 2 === 0 ? '#2D6B36' : '#458B44',
      '#142E18',
    );
    ctx.restore();
  }
  ctx.restore();
}

export function drawBroadLeafPlant(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const leaves = 5;
  for (let i = 0; i < leaves; i += 1) {
    const a = (i / leaves) * Math.PI * 2 + propHash(i, 11, seed) * 0.8;
    const len = (10 + propHash(i, 17, seed) * 5) * scale;
    drawPointedLeaf2D(
      ctx,
      Math.cos(a) * 1.5,
      Math.sin(a) * 1.5,
      len,
      4.2 * scale,
      a,
      i % 2 === 0 ? '#265B32' : '#3C7E41',
      '#0F2214',
    );
  }
  ctx.restore();
}

/** Non-blocking surface tree roots spreading organically across ancient stone & soil. */
export function drawTreeRoots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const curve = (propHash(Math.round(x), Math.round(y), seed) - 0.5) * 14;

  ctx.strokeStyle = 'rgba(12, 10, 7, 0.42)';
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 1.5);
  ctx.quadraticCurveTo(length * 0.5, curve + 1.5, length, curve * 0.4 + 1.5);
  ctx.stroke();

  ctx.strokeStyle = '#5B432C';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.5, curve, length, curve * 0.4);
  ctx.stroke();

  // Secondary forked rootlet
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(length * 0.45, curve * 0.65);
  ctx.quadraticCurveTo(length * 0.72, curve * 1.25 + 6, length * 0.92, curve * 1.15 + 9);
  ctx.stroke();

  ctx.strokeStyle = '#7E5E3D';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -0.5);
  ctx.quadraticCurveTo(length * 0.45, curve - 0.5, length * 0.85, curve * 0.35 - 0.5);
  ctx.stroke();
  ctx.restore();
}

/** Fallen mossy jungle tree limb with twigs and sprout leaves (non-blocking ground detail). */
export function drawFallenJungleBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(8, 11, 7, 0.36)';
  ctx.beginPath();
  ctx.roundRect(-length * 0.5 + 2, -1, length, 6, 3);
  ctx.fill();

  ctx.strokeStyle = '#25180E';
  ctx.lineWidth = 5.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-length * 0.5, 0);
  ctx.quadraticCurveTo(0, 3, length * 0.5, -1);
  ctx.stroke();

  ctx.strokeStyle = '#5D432B';
  ctx.lineWidth = 3.6;
  ctx.stroke();

  // Forked twig
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(length * 0.1, 1);
  ctx.lineTo(length * 0.36, -8);
  ctx.stroke();

  // Moss strip along upper bark
  ctx.strokeStyle = '#3F7D3E';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-length * 0.28, -1);
  ctx.lineTo(length * 0.15, 1);
  ctx.stroke();

  if (propHash(Math.round(x), Math.round(y), seed) > 0.35) {
    drawPointedLeaf2D(ctx, length * 0.35, -8, 8, 2.8, -0.9, '#4D9646', '#153017');
    drawPointedLeaf2D(ctx, length * 0.36, -8, 7, 2.5, -0.2, '#357439', '#153017');
  }
  ctx.restore();
}

/** Blits a specific 256x256 botanical cell from `foliage_atlas.png` if loaded. */
export function drawFoliageAtlasCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  cx: number,
  cy: number,
  drawSize: number,
  angle: number,
  textures?: JungleTextureAtlas,
): boolean {
  const atlas = textures?.getImage('foliageAtlas') ?? null;
  if (!atlas) return false;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(
    atlas,
    col * ATLAS_CELL_SIZE,
    row * ATLAS_CELL_SIZE,
    ATLAS_CELL_SIZE,
    ATLAS_CELL_SIZE,
    -drawSize * 0.5,
    -drawSize * 0.5,
    drawSize,
    drawSize,
  );
  ctx.restore();
  return true;
}

/** Carved stone temple staircase with weathered stone grain, treads & balustrades. */
export function drawCarvedStoneStaircase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dir: 'N' | 'S' | 'E' | 'W',
  steps = 4,
  textures?: JungleTextureAtlas,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 10, 0.44)';
  ctx.fillRect(x + 2, y + 2, w, h);

  const stonePat = textures?.getPattern(ctx, 'wallRuinStone', 0.28) ?? null;
  ctx.fillStyle = stonePat ?? '#5B594B';
  ctx.fillRect(x, y, w, h);

  const verticalSteps = dir === 'N' || dir === 'S';
  if (verticalSteps) {
    ctx.fillStyle = stonePat ?? '#6D6B59';
    ctx.fillRect(x, y, 5, h);
    ctx.fillRect(x + w - 5, y, 5, h);
    ctx.strokeStyle = '#1E231B';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 5, h);
    ctx.strokeRect(x + w - 5, y, 5, h);

    const stepH = h / steps;
    for (let i = 0; i < steps; i += 1) {
      const sy = y + i * stepH;
      const shade = dir === 'S' ? (steps - i) / steps : (i + 1) / steps;
      ctx.fillStyle = stonePat ?? '#6D6B59';
      ctx.fillRect(x + 5, sy, w - 10, stepH);
      ctx.fillStyle = `rgba(18, 22, 16, ${(0.46 - shade * 0.34).toFixed(2)})`;
      ctx.fillRect(x + 5, sy, w - 10, stepH);
      ctx.fillStyle = 'rgba(12, 16, 11, 0.62)';
      ctx.fillRect(x + 5, sy + stepH - 2, w - 10, 2);
      ctx.fillStyle = 'rgba(235, 224, 192, 0.26)';
      ctx.fillRect(x + 5, sy, w - 10, 1.2);
    }
  } else {
    ctx.fillStyle = stonePat ?? '#6D6B59';
    ctx.fillRect(x, y, w, 5);
    ctx.fillRect(x, y + h - 5, w, 5);
    ctx.strokeStyle = '#1E231B';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 5);
    ctx.strokeRect(x, y + h - 5, w, 5);

    const stepW = w / steps;
    for (let i = 0; i < steps; i += 1) {
      const sx = x + i * stepW;
      const shade = dir === 'E' ? (steps - i) / steps : (i + 1) / steps;
      ctx.fillStyle = stonePat ?? '#6D6B59';
      ctx.fillRect(sx, y + 5, stepW, h - 10);
      ctx.fillStyle = `rgba(18, 22, 16, ${(0.46 - shade * 0.34).toFixed(2)})`;
      ctx.fillRect(sx, y + 5, stepW, h - 10);
      ctx.fillStyle = 'rgba(12, 16, 11, 0.62)';
      ctx.fillRect(sx + stepW - 2, y + 5, 2, h - 10);
      ctx.fillStyle = 'rgba(235, 224, 192, 0.26)';
      ctx.fillRect(sx, y + 5, 1.2, h - 10);
    }
  }

  ctx.fillStyle = 'rgba(48, 102, 42, 0.55)';
  ctx.fillRect(x + 5, y + h * 0.5 - 2, 7, 3);
  ctx.fillRect(x + w - 12, y + 3, 6, 3);
  ctx.restore();
}

/** Non-blocking shallow rainwater pool inside sunken stone courtyard depressions. */
export function drawSmallWaterPool(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const tracePool = (scale: number) => {
    ctx.beginPath();
    const pts = 14;
    for (let i = 0; i <= pts; i += 1) {
      const a = (i / pts) * Math.PI * 2;
      const wobble = 0.78 + propHash(i, 23, seed) * 0.34;
      const px = Math.cos(a) * rx * wobble * scale;
      const py = Math.sin(a) * ry * wobble * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  // Damp dark mud/stone basin rim
  tracePool(1.16);
  ctx.fillStyle = 'rgba(24, 30, 22, 0.65)';
  ctx.fill();

  tracePool(1);
  const grad = ctx.createRadialGradient(-rx * 0.25, -ry * 0.25, 2, 0, 0, Math.max(rx, ry));
  grad.addColorStop(0, '#1E646C');
  grad.addColorStop(0.65, '#134750');
  grad.addColorStop(1, '#0C2E35');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(92, 168, 152, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Subtle sky reflection glint & tiny floating lotus/lily leaf
  ctx.fillStyle = 'rgba(186, 230, 253, 0.24)';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.22, -ry * 0.2, rx * 0.32, ry * 0.14, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#337B3E';
  ctx.beginPath();
  ctx.arc(rx * 0.25, ry * 0.15, 3.6, 0.3, Math.PI * 1.9);
  ctx.lineTo(rx * 0.25, ry * 0.15);
  ctx.fill();
  ctx.restore();
}

/** Scattered mossy ancient stone rubble & broken slab chips beside walls. */
export function drawAncientStoneDebris(
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
    ctx.fillStyle = 'rgba(10, 12, 9, 0.35)';
    ctx.fillRect(x + dx + 1, y + dy + 1.5, w, h);
    ctx.fillStyle = i % 2 === 0 ? '#6E7162' : '#585C4E';
    ctx.fillRect(x + dx, y + dy, w, h);
    if (i === 0) {
      ctx.fillStyle = '#3F7D3E';
      ctx.fillRect(x + dx, y + dy, w * 0.5, h * 0.55);
    }
  }
  ctx.restore();
}

function drawJungleRubble(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  drawAncientStoneDebris(ctx, x + 16, y + 16, seed);
  ctx.fillStyle = '#4B3620';
  ctx.fillRect(x + 8, y + 14, 7, 3);
  ctx.fillRect(x + 17, y + 19, 6, 3);
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
  ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : '#161B14';
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

/** Carved weathered stone guardian deity statue / serpent totem on a textured pedestal. */
export function drawAncientTempleStatue(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: JungleTextureAtlas,
): void {
  if (hp <= 0) {
    drawJungleRubble(ctx, x, y, seed);
    return;
  }

  ctx.save();
  const stonePat = textures?.getPattern(ctx, 'wallRuinStone', 0.25) ?? null;

  // Textured stepped temple pedestal base & darker 2.5D south step face
  ctx.fillStyle = stonePat ?? '#585A4B';
  ctx.fillRect(x + 2, y + 4, ts - 4, ts - 5);
  ctx.fillStyle = 'rgba(20, 24, 18, 0.35)';
  ctx.fillRect(x + 2, y + ts - 6, ts - 4, 5);
  ctx.strokeStyle = '#121710';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x + 2, y + 4, ts - 4, ts - 5);

  // Inner carved plinth shadow recess
  ctx.fillStyle = 'rgba(18, 22, 16, 0.42)';
  ctx.fillRect(x + 5, y + 7, ts - 10, ts - 12);
  ctx.strokeStyle = 'rgba(195, 190, 160, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 7, ts - 10, ts - 12);

  // Carved stone guardian statue shoulders & headdress bust (textured + sunlit)
  const cx = x + ts * 0.5;
  const cy = y + ts * 0.46;
  ctx.fillStyle = 'rgba(10, 14, 10, 0.48)';
  ctx.beginPath();
  ctx.roundRect(cx - 7, cy - 1, 16, 13, 4);
  ctx.fill();

  ctx.fillStyle = stonePat ?? '#777965';
  ctx.beginPath();
  ctx.roundRect(cx - 8, cy - 3, 16, 13, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 238, 190, 0.14)';
  ctx.fill();
  ctx.strokeStyle = '#141A12';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Carved pointed lotus crown crest
  ctx.fillStyle = stonePat ?? '#8B8D76';
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 2);
  ctx.lineTo(cx, cy - 9);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 240, 195, 0.18)';
  ctx.fill();
  ctx.stroke();

  // Deep eye sockets & nose bridge
  ctx.fillStyle = nearZone ? '#34D399' : '#192017';
  ctx.fillRect(cx - 4.5, cy + 3, 3, 2);
  ctx.fillRect(cx + 1.5, cy + 3, 3, 2);
  ctx.fillStyle = '#3B3F33';
  ctx.fillRect(cx - 1, cy + 2, 2, 6);

  drawPointedLeaf2D(ctx, x + 6, y + 8, 8, 2.8, 0.7, '#3C7D3D');
  drawPointedLeaf2D(ctx, x + 7, y + 10, 7, 2.4, 1.4, '#549B49');
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** Fallen fluted ancient temple stone column drum textured & wrapped in moss/vines. */
export function drawCollapsedPillarDrum(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: JungleTextureAtlas,
): void {
  if (hp <= 0) {
    drawJungleRubble(ctx, x, y, seed);
    return;
  }

  ctx.save();
  const stonePat = textures?.getPattern(ctx, 'wallRuinStone', 0.25) ?? null;

  ctx.fillStyle = stonePat ?? '#4E5144';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 5, ts - 6, ts - 7, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(18, 22, 16, 0.35)';
  ctx.fill();

  const tilt = propHash(x, y, seed) > 0.5 ? 0.25 : -0.25;
  ctx.translate(x + ts * 0.5, y + ts * 0.5);
  ctx.rotate(tilt);

  ctx.fillStyle = stonePat ?? '#737461';
  ctx.beginPath();
  ctx.roundRect(-13, -9, 26, 18, 4);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, -10, 0, 10);
  grad.addColorStop(0, 'rgba(255, 240, 195, 0.26)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(10, 14, 10, 0.52)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#121710';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(18, 22, 16, 0.52)';
  ctx.lineWidth = 1.2;
  for (const fy of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.moveTo(-9, fy);
    ctx.lineTo(10, fy);
    ctx.stroke();
  }

  ctx.fillStyle = nearZone ? '#5B8064' : '#7C7A65';
  ctx.beginPath();
  ctx.ellipse(-10, 0, 4.2, 8.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#2B6130';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-2, -9);
  ctx.quadraticCurveTo(3, 0, -1, 9);
  ctx.stroke();
  drawPointedLeaf2D(ctx, 1, -2, 7, 2.5, -0.4, '#4B9646');
  drawPointedLeaf2D(ctx, 2, 2, 6, 2.2, 0.5, '#357438');
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** Destructible textured wooden expedition supply crate bundle with iron strapping. */
export function drawJungleSupplyCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  _nearZone: boolean,
  seed: number,
  textures?: JungleTextureAtlas,
): void {
  if (hp <= 0) {
    drawJungleRubble(ctx, x, y, seed);
    return;
  }

  ctx.save();
  const woodPat = textures?.getPattern(ctx, 'woodAncientPlank', 0.24) ?? null;

  ctx.fillStyle = '#4B3017';
  ctx.fillRect(x + 3, y + ts - 8, ts - 6, 6);

  ctx.fillStyle = woodPat ?? '#754D28';
  ctx.fillRect(x + 3, y + 3, ts - 6, ts - 10);

  ctx.strokeStyle = 'rgba(24, 15, 8, 0.45)';
  ctx.lineWidth = 1;
  for (let py = y + 9; py < y + ts - 9; py += 5) {
    ctx.beginPath();
    ctx.moveTo(x + 5, py);
    ctx.lineTo(x + ts - 5, py);
    ctx.stroke();
  }

  ctx.strokeStyle = '#382210';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(x + 5, y + 5, ts - 10, ts - 14);
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 5);
  ctx.lineTo(x + ts - 5, y + ts - 9);
  ctx.stroke();

  if (propHash(x, y, seed) > 0.45) {
    ctx.fillStyle = '#4C6440';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + 16, y + 3);
    ctx.lineTo(x + 3, y + 14);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#474B52';
  ctx.fillRect(x + 3, y + 3, 4, 4);
  ctx.fillRect(x + ts - 7, y + 3, 4, 4);
  ctx.fillRect(x + 3, y + ts - 10, 4, 4);
  ctx.fillRect(x + ts - 7, y + ts - 10, 4, 4);

  drawPointedLeaf2D(ctx, x + ts - 8, y + ts - 6, 7, 2.2, 2.4, '#3D7E3D');

  ctx.strokeStyle = '#0B120D';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3, y + 3, ts - 6, ts - 5);
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** Destructible multi-block textured ancient temple stone parapet with relief carvings. */
export function drawMossyStoneBarricade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  nearZone: boolean,
  seed: number,
  textures?: JungleTextureAtlas,
): void {
  if (hp <= 0) {
    drawJungleRubble(ctx, x, y, seed);
    return;
  }

  ctx.save();
  const stonePat = textures?.getPattern(ctx, 'wallRuinStone', 0.28) ?? null;

  // Stepped 2.5D sandstone south face showing coursed blocks
  ctx.fillStyle = stonePat ?? '#46493C';
  ctx.fillRect(x + 2, y + ts - 9, ts - 4, 7);
  ctx.fillStyle = 'rgba(14, 18, 13, 0.45)';
  ctx.fillRect(x + 2, y + ts - 9, ts - 4, 7);
  ctx.strokeStyle = '#1E221A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 15, y + ts - 9);
  ctx.lineTo(x + 15, y + ts - 2);
  ctx.stroke();

  // Top staggered stone coping blocks textured from ancient stone atlas
  ctx.fillStyle = stonePat ?? '#757662';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, 15, ts - 11, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 240, 200, 0.1)';
  ctx.fill();

  ctx.fillStyle = stonePat ?? '#656855';
  ctx.beginPath();
  ctx.roundRect(x + 16, y + 3, 14, ts - 10, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(18, 22, 16, 0.14)';
  ctx.fill();

  ctx.strokeStyle = nearZone ? 'rgba(52, 211, 153, 0.55)' : '#2B3025';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 5, y + 7, 9, ts - 17);
  ctx.strokeRect(x + 19, y + 6, 8, ts - 16);

  ctx.fillStyle = 'rgba(240, 228, 190, 0.25)';
  ctx.fillRect(x + 2, y + 4, 14, 1.8);
  ctx.fillRect(x + 16, y + 3, 14, 1.8);

  drawPointedLeaf2D(ctx, x + 7, y + 7, 8, 2.8, 0.4, '#3D7E3C', '#142B16');
  drawPointedLeaf2D(ctx, x + 7, y + 7, 7, 2.5, 1.3, '#529A49', '#142B16');

  ctx.strokeStyle = '#0D130C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 3, ts - 4, ts - 5, 2);
  ctx.stroke();
  ctx.restore();

  drawCoverDamage(ctx, x, y, ts, hp);
}

/** Destructible weathered terracotta temple urns on a textured mossy stone basin plinth. */
export function drawOvergrownUrnCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  seed: number,
  textures?: JungleTextureAtlas,
): void {
  if (hp <= 0) {
    drawJungleRubble(ctx, x, y, seed);
    return;
  }

  const stonePat = textures?.getPattern(ctx, 'wallRuinStone', 0.26) ?? null;
  ctx.fillStyle = stonePat ?? '#4E5343';
  ctx.fillRect(x + 3, y + 4, ts - 6, ts - 6);
  ctx.fillStyle = 'rgba(18, 22, 16, 0.22)';
  ctx.fillRect(x + 3, y + 4, ts - 6, ts - 6);
  ctx.strokeStyle = '#121811';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(x + 3, y + 4, ts - 6, ts - 6);

  const urns = [
    { cx: x + 11, cy: y + 12, r: 6.0 },
    { cx: x + 22, cy: y + 13, r: 5.4 },
    { cx: x + 16, cy: y + 22, r: 5.8 },
  ];
  for (const u of urns) {
    ctx.fillStyle = 'rgba(8, 11, 9, 0.45)';
    ctx.beginPath();
    ctx.arc(u.cx + 1.5, u.cy + 2, u.r, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(u.cx - 2, u.cy - 2, 1, u.cx, u.cy, u.r);
    grad.addColorStop(0, '#C27A4A');
    grad.addColorStop(0.65, '#8A4E29');
    grad.addColorStop(1, '#4E2A14');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(u.cx, u.cy, u.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2A160B';
    ctx.beginPath();
    ctx.arc(u.cx, u.cy, u.r * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0B120D';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(u.cx, u.cy, u.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawPointedLeaf2D(ctx, x + 23, y + 23, 7, 2.4, -0.6, '#438945');
  drawCoverDamage(ctx, x, y, ts, hp);
}
