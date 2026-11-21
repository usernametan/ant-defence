import { PALETTE } from '../palette';
import { hash2 } from './architecture';

export function drawSlumPropShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
): void {
  // Soft directional drop shadow (sun upper-left -> down-right) + tight contact AO
  ctx.fillStyle = 'rgba(12, 10, 14, 0.34)';
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 6, ts - 2, ts - 3, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(8, 7, 10, 0.42)';
  ctx.fillRect(x + 2, y + 3, ts - 4, ts - 4);
}

function drawCoverRubble(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  ctx.fillStyle = 'rgba(20, 17, 14, 0.48)';
  ctx.fillRect(x + 5, y + 10, 9, 5);
  ctx.fillRect(x + 17, y + 17, 8, 5);
  ctx.fillStyle = '#5E442A';
  ctx.fillRect(x + 6, y + 11, 7, 3);
  ctx.fillRect(x + 18, y + 18, 6, 3);
  if (hash2(x, y, seed) > 0.5) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 12, y + 7, 5, 4);
  }
}

function drawDamageOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
): void {
  if (hp >= 75) return;
  ctx.save();
  ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : '#14110E';
  ctx.lineWidth = hp < 35 ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 7);
  ctx.lineTo(x + ts * 0.48, y + ts * 0.46);
  ctx.lineTo(x + ts * 0.38, y + ts - 8);
  if (hp < 45) {
    ctx.moveTo(x + ts - 7, y + 9);
    ctx.lineTo(x + ts * 0.54, y + ts * 0.52);
  }
  ctx.stroke();

  if (hp < 40) {
    ctx.fillStyle = 'rgba(15, 12, 10, 0.32)';
    ctx.beginPath();
    ctx.arc(x + ts * 0.5, y + ts * 0.5, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawSlumCrate(
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

  const h = hash2(x, y, seed + 13);
  const baseWood = h < 0.5 ? '#754C29' : '#654022';
  const plankHi = h < 0.5 ? '#966539' : '#85572F';

  // Main wooden crate body
  ctx.fillStyle = baseWood;
  ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);

  // Horizontal wood plank grooves
  ctx.fillStyle = plankHi;
  for (let py = y + 5; py < y + ts - 6; py += 6) {
    ctx.fillRect(x + 4, py, ts - 8, 4);
    ctx.fillStyle = 'rgba(20, 14, 10, 0.45)';
    ctx.fillRect(x + 4, py + 4, ts - 8, 1);
    ctx.fillStyle = plankHi;
  }

  // Diagonal timber brace & recessed frame
  ctx.strokeStyle = '#3B2311';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4.5, y + 4.5, ts - 9, ts - 9);
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 5);
  ctx.lineTo(x + ts - 5, y + ts - 5);
  ctx.stroke();

  // Iron corner straps or zone amber tactical highlight
  ctx.fillStyle = nearZone ? 'rgba(245, 158, 11, 0.85)' : '#475569';
  ctx.fillRect(x + 2.5, y + 2.5, 4.5, 4.5);
  ctx.fillRect(x + ts - 7, y + 2.5, 4.5, 4.5);
  ctx.fillRect(x + 2.5, y + ts - 7, 4.5, 4.5);
  ctx.fillRect(x + ts - 7, y + ts - 7, 4.5, 4.5);

  // Subtle sunlit top-left bevel & dark outline
  ctx.fillStyle = 'rgba(255, 232, 195, 0.22)';
  ctx.fillRect(x + 2, y + 2, ts - 4, 2);
  ctx.fillRect(x + 2, y + 2, 2, ts - 4);
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2.2;
  ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);

  drawDamageOverlay(ctx, x, y, ts, hp);
}

export function drawSlumBarrelCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  seed: number,
): void {
  if (hp <= 0) {
    drawCoverRubble(ctx, x, y, seed);
    return;
  }

  const drums: Array<{ cx: number; cy: number; r: number; blue: boolean }> = [
    { cx: x + 10, cy: y + 11, r: 6.8, blue: true },
    { cx: x + 22, cy: y + 12, r: 6.4, blue: hash2(x, y, seed + 3) > 0.5 },
    { cx: x + 15, cy: y + 22, r: 6.8, blue: false },
  ];

  for (const d of drums) {
    // Contact shadow
    ctx.fillStyle = 'rgba(10, 9, 12, 0.45)';
    ctx.beginPath();
    ctx.arc(d.cx + 1.5, d.cy + 2, d.r + 0.5, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(
      d.cx - d.r * 0.35,
      d.cy - d.r * 0.35,
      1,
      d.cx,
      d.cy,
      d.r,
    );
    if (d.blue) {
      grad.addColorStop(0, '#60A5FA');
      grad.addColorStop(0.55, '#1D4ED8');
      grad.addColorStop(1, '#1E3A8A');
    } else {
      grad.addColorStop(0, '#B45309');
      grad.addColorStop(0.55, '#78350F');
      grad.addColorStop(1, '#3B2314');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.r, 0, Math.PI * 2);
    ctx.fill();

    // Drum top rim & bung cap
    ctx.strokeStyle = d.blue ? '#93C5FD' : '#D97706';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.r - 1.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(d.cx + 2, d.cy - 1.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawDamageOverlay(ctx, x, y, ts, hp);
}

export function drawSlumAutoRickshaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
): void {
  if (hp <= 0) {
    drawCoverRubble(ctx, x, y, 71);
    return;
  }

  ctx.save();
  ctx.translate(x + ts * 0.5, y + ts * 0.5);
  ctx.rotate(-0.35);

  const w = 38;
  const h = 24;
  const hw = w * 0.5;
  const hh = h * 0.5;

  // Soft directional shadow under chassis
  ctx.fillStyle = 'rgba(10, 9, 12, 0.48)';
  ctx.beginPath();
  ctx.roundRect(-hw + 3, -hh + 3, w, h, 5);
  ctx.fill();

  // Rear tires & front wheel hint
  ctx.fillStyle = '#141417';
  ctx.fillRect(-hw + 2, -hh - 1.5, 7, 3);
  ctx.fillRect(-hw + 2, hh - 1.5, 7, 3);
  ctx.fillRect(hw - 6, -2, 6, 4);

  // Yellow body front & sides
  ctx.fillStyle = '#EAB308';
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w - 4, h, 5);
  ctx.fill();

  // Tapered front nose fairing & headlight
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.roundRect(hw - 12, -hh + 4, 11, h - 8, 4);
  ctx.fill();
  ctx.fillStyle = '#FEF9C3';
  ctx.fillRect(hw - 3, -2, 2.5, 4);

  // Side mirrors
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(hw - 13, -hh - 2, 2.5, 3);
  ctx.fillRect(hw - 13, hh - 1, 2.5, 3);

  // Curved glass windshield with sky glare
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(hw - 15, -hh + 3, 4.5, h - 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillRect(hw - 14.5, -hh + 4, 1.8, 7);

  // Ribbed black canvas soft-top canopy
  ctx.fillStyle = '#1E232B';
  ctx.beginPath();
  ctx.roundRect(-hw + 2, -hh + 1.5, w - 18, h - 3, 3);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-hw + 8, -hh + 2.5);
  ctx.lineTo(-hw + 8, hh - 2.5);
  ctx.moveTo(-hw + 14, -hh + 2.5);
  ctx.lineTo(-hw + 14, hh - 2.5);
  ctx.stroke();

  // Crisp silhouette outline
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w - 4, h, 5);
  ctx.stroke();
  ctx.restore();

  drawDamageOverlay(ctx, x, y, ts, hp);
}

export function drawSlumMarketStall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  seed: number,
): void {
  if (hp <= 0) {
    drawCoverRubble(ctx, x, y, seed);
    return;
  }

  const saffron = hash2(x, y, seed + 41) > 0.55;
  const stripeA = saffron ? '#D97706' : '#DC2626';
  const stripeB = saffron ? '#FEF3C7' : '#F8FAFC';

  // Wooden stall counter peeking out at bottom
  ctx.fillStyle = '#5C3A1E';
  ctx.fillRect(x + 4, y + ts - 7, ts - 8, 4);

  // Striped awning canopy
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, ts - 4, ts - 6, 3);
  ctx.clip();
  for (let sx = 0; sx < ts; sx += 5) {
    ctx.fillStyle = (sx / 5) % 2 === 0 ? stripeA : stripeB;
    ctx.fillRect(x + sx, y + 2, 5, ts - 6);
  }
  // Sunlit ridge & front valance shadow
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(x + 2, y + 2, ts - 4, 4);
  ctx.fillStyle = 'rgba(12, 10, 14, 0.34)';
  ctx.fillRect(x + 2, y + ts - 10, ts - 4, 6);
  ctx.restore();

  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, ts - 4, ts - 6, 3);
  ctx.stroke();

  drawDamageOverlay(ctx, x, y, ts, hp);
}

export function drawSlumHandcart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  hp: number,
  seed: number,
): void {
  if (hp <= 0) {
    drawCoverRubble(ctx, x, y, seed);
    return;
  }

  // Twin wooden push handles extending left
  ctx.fillStyle = '#4A2E17';
  ctx.fillRect(x + 1, y + 8, 6, 2.5);
  ctx.fillRect(x + 1, y + ts - 10.5, 6, 2.5);

  // Spoked wheels peeking top and bottom
  ctx.fillStyle = '#18181B';
  ctx.fillRect(x + 11, y + 2, 8, 3);
  ctx.fillRect(x + 11, y + ts - 5, 8, 3);

  // Cart wooden bed
  ctx.fillStyle = '#7C512B';
  ctx.fillRect(x + 6, y + 4, ts - 9, ts - 8);
  ctx.strokeStyle = '#3B2311';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 6, y + 4, ts - 9, ts - 8);

  // Burlap grain sacks & produce basket loaded on cart
  ctx.fillStyle = '#B89B72';
  ctx.beginPath();
  ctx.roundRect(x + 9, y + 7, 10, 8, 3);
  ctx.roundRect(x + 18, y + 14, 9, 10, 3);
  ctx.fill();
  ctx.strokeStyle = '#6E5636';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#C2410C';
  ctx.beginPath();
  ctx.arc(x + 13, y + 20, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 6, y + 4, ts - 9, ts - 8);

  drawDamageOverlay(ctx, x, y, ts, hp);
}

/** Non-blocking decorative two-wheeler scooter/motorbike parked against building wall apron. */
export function drawSlumParkedTwoWheeler(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Contact shadow
  ctx.fillStyle = 'rgba(10, 9, 14, 0.45)';
  ctx.beginPath();
  ctx.ellipse(1, 1.5, 8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tires
  ctx.fillStyle = '#18181B';
  ctx.fillRect(-7.5, -1.5, 4, 3);
  ctx.fillRect(4, -1.5, 4, 3);

  // Chassis & seat
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-5, -2.5, 10, 5, 2);
  ctx.fill();

  ctx.fillStyle = '#1F2937';
  ctx.fillRect(-3.5, -1.8, 5, 3.6);

  // Handlebars
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.lineTo(4, 4);
  ctx.stroke();

  ctx.restore();
}

export function drawSlumPalmTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  withShadow: boolean,
): void {
  ctx.save();
  if (withShadow) {
    ctx.save();
    ctx.translate(cx + 8, cy + 9);
    ctx.fillStyle = 'rgba(10, 9, 14, 0.3)';
    for (let i = 0; i < 7; i += 1) {
      ctx.save();
      ctx.rotate((i / 7) * Math.PI * 2 + seed * 0.1);
      ctx.beginPath();
      ctx.ellipse(radius * 0.52, 0, radius * 0.56, radius * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.translate(cx, cy);
  // Lower deeper green fronds
  for (let i = 0; i < 8; i += 1) {
    ctx.save();
    ctx.rotate((i / 8) * Math.PI * 2 + seed * 0.1);
    ctx.fillStyle = i % 2 === 0 ? '#1E4624' : '#2C5E31';
    ctx.strokeStyle = '#111610';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(radius * 0.52, 0, radius * 0.56, radius * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Sunlit upper palm fronds with central midribs
  for (let i = 0; i < 6; i += 1) {
    ctx.save();
    ctx.rotate((i / 6) * Math.PI * 2 + 0.3 + seed * 0.1);
    ctx.fillStyle = i % 2 === 0 ? '#3E7A38' : '#539445';
    ctx.beginPath();
    ctx.ellipse(radius * 0.44, 0, radius * 0.46, radius * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7BB65D';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(radius * 0.82, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Crown & coconuts cluster
  ctx.fillStyle = '#4B3621';
  ctx.beginPath();
  ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Small non-blocking clutter tucked tightly against wall aprons (4-7px margin). */
export function drawSlumWallClutter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  seed: number,
): void {
  const h = hash2(x, y, seed + 67);
  if (h < 0.35) {
    // Stacked plastic buckets
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(x + 6, y + 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = h < 0.18 ? '#2563EB' : '#DC2626';
    ctx.beginPath();
    ctx.arc(x + 5.5, y + 4.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (h < 0.7) {
    // PVC pipe bundle
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(x + 4, y + 2, 12, 2.5);
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(x + 4, y + 5, 10, 2);
  } else {
    // Wall-base weed tuft & cardboard scrap
    ctx.fillStyle = '#3B6E32';
    ctx.beginPath();
    ctx.arc(x + ts - 7, y + 4, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#92704E';
    ctx.fillRect(x + 5, y + 3, 6, 4);
  }
}
