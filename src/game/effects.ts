import { COLOR, POWERUP_DEFS, VIEW_HEIGHT, VIEW_WIDTH, WORLD } from './config';
import type { Bullet, FloatingText, Particle, Pickup, PowerupType } from './types';

export function drawDefenseLine(
  ctx: CanvasRenderingContext2D,
  time: number,
  breachFlash: number,
  shieldActive: boolean,
): void {
  const x = WORLD.lineX;
  const top = WORLD.lineTop;
  const bottom = WORLD.lineBottom;
  const pulse = 0.72 + Math.sin(time * 4.2) * 0.08 + Math.sin(time * 13.7) * 0.03;
  const flash = Math.max(0, Math.min(1, breachFlash));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const groundGlow = ctx.createRadialGradient(x, bottom - 18, 4, x, bottom - 18, 120);
  groundGlow.addColorStop(0, `rgba(255, 72, 72, ${0.26 * pulse + flash * 0.28})`);
  groundGlow.addColorStop(1, 'rgba(255, 60, 60, 0)');
  ctx.fillStyle = groundGlow;
  ctx.beginPath();
  ctx.ellipse(x, bottom - 16, 120, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  const beam = ctx.createLinearGradient(0, top, 0, bottom);
  beam.addColorStop(0, 'rgba(255, 74, 74, 0)');
  beam.addColorStop(0.14, `rgba(255, 73, 73, ${0.24 * pulse})`);
  beam.addColorStop(0.5, `rgba(255, 67, 67, ${0.46 * pulse})`);
  beam.addColorStop(0.86, `rgba(255, 73, 73, ${0.24 * pulse})`);
  beam.addColorStop(1, 'rgba(255, 74, 74, 0)');

  ctx.strokeStyle = beam;
  ctx.lineWidth = 34;
  ctx.shadowColor = 'rgba(255, 38, 38, 0.85)';
  ctx.shadowBlur = 34;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();

  ctx.lineWidth = 12;
  ctx.strokeStyle = `rgba(255, 82, 82, ${0.35 * pulse + flash * 0.3})`;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();

  ctx.lineWidth = 2.4;
  ctx.strokeStyle = `rgba(255, 217, 198, ${0.82 + flash * 0.18})`;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let i = 0; i < 9; i += 1) {
    const span = bottom - top;
    const y = bottom - ((time * 74 + i * 72) % span);
    const alpha = 0.18 + (i % 3) * 0.1;
    ctx.strokeStyle = `rgba(255, 151, 137, ${alpha})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 15, y - 18);
    ctx.stroke();
  }

  for (const y of [top + 16, bottom - 18]) {
    ctx.fillStyle = 'rgba(255, 191, 164, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (shieldActive) {
    const shieldPulse = 0.32 + Math.sin(time * 5.4) * 0.07;
    ctx.strokeStyle = `rgba(135, 203, 255, ${shieldPulse})`;
    ctx.lineWidth = 7;
    ctx.shadowColor = 'rgba(116, 192, 255, 0.8)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(x - 5, top);
    ctx.lineTo(x - 5, bottom);
    ctx.stroke();
  }

  if (flash > 0) {
    ctx.strokeStyle = `rgba(255, 245, 233, ${flash * 0.9})`;
    ctx.lineWidth = 7 + flash * 10;
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  const trail = bullet.trail;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (trail.length > 1) {
    for (let i = 1; i < trail.length; i += 1) {
      const ratio = i / trail.length;
      ctx.strokeStyle = bullet.powered
        ? `rgba(255, 205, 102, ${ratio * 0.7})`
        : `rgba(255, 231, 178, ${ratio * 0.55})`;
      ctx.lineWidth = bullet.powered ? 5 * ratio : 3.4 * ratio;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
  }

  const glow = ctx.createRadialGradient(
    bullet.x,
    bullet.y,
    0,
    bullet.x,
    bullet.y,
    bullet.powered ? 20 : 13,
  );
  glow.addColorStop(0, 'rgba(255, 255, 239, 0.95)');
  glow.addColorStop(0.3, bullet.powered ? 'rgba(255, 210, 100, 0.7)' : 'rgba(255, 227, 161, 0.55)');
  glow.addColorStop(1, 'rgba(255, 173, 74, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.powered ? 20 : 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fffdf2';
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.powered ? 3.4 : 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function updateParticles(particles: Particle[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.vx *= 1 - p.drag * dt;
    p.vy *= 1 - p.drag * 0.4 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  ctx.save();
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    if (p.shape === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.4 - alpha) * 2.2 + 4, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.shape === 'spark') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.shape === 'leaf') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx) + p.life * 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  texts: FloatingText[],
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const text of texts) {
    const alpha = Math.max(0, text.life / text.maxLife);
    ctx.font = `700 ${text.size}px "Barlow Condensed", "Trebuchet MS", sans-serif`;
    ctx.globalAlpha = Math.min(1, alpha * 1.7);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(4, 7, 10, 0.72)';
    ctx.strokeText(text.text, text.x, text.y);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();
}

export function spawnDeathBurst(
  particles: Particle[],
  x: number,
  y: number,
  boss: boolean,
): void {
  const count = boss ? 54 : 18;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * (boss ? 300 : 190);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.36 + Math.random() * 0.55,
      maxLife: 0.9,
      size: 1.2 + Math.random() * (boss ? 3.6 : 2.4),
      color:
        i % 5 === 0
          ? COLOR.goldBright
          : i % 3 === 0
            ? '#9f2f2c'
            : '#3a2117',
      gravity: 480,
      drag: 1.2,
      shape: i % 4 === 0 ? 'spark' : i % 7 === 0 ? 'leaf' : 'dust',
    });
  }
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.36,
    maxLife: 0.36,
    size: boss ? 36 : 16,
    color: boss ? 'rgba(255, 151, 112, 0.8)' : 'rgba(255, 198, 132, 0.5)',
    gravity: 0,
    drag: 0,
    shape: 'ring',
  });
}

export function spawnHitSparks(
  particles: Particle[],
  x: number,
  y: number,
  powered: boolean,
): void {
  const count = powered ? 22 : 10;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * (powered ? 250 : 150);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.18 + Math.random() * 0.3,
      maxLife: 0.48,
      size: 1 + Math.random() * 2.4,
      color: i % 3 === 0 ? '#ffd78a' : '#ffefc5',
      gravity: 280,
      drag: 2,
      shape: 'spark',
    });
  }
}

export function spawnBreachBurst(
  particles: Particle[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < 26; i += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const speed = 60 + Math.random() * 230;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.5,
      maxLife: 0.85,
      size: 1.5 + Math.random() * 3,
      color: i % 3 === 0 ? '#ff8a7a' : i % 2 === 0 ? '#c93a38' : '#49231d',
      gravity: 240,
      drag: 1.1,
      shape: 'spark',
    });
  }
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.5,
    maxLife: 0.5,
    size: 24,
    color: 'rgba(255, 106, 88, 0.9)',
    gravity: 0,
    drag: 0,
    shape: 'ring',
  });
}

export function spawnSpawnDust(
  particles: Particle[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < 7; i += 1) {
    particles.push({
      x: x + (Math.random() - 0.5) * 26,
      y: y - Math.random() * 6,
      vx: (Math.random() - 0.5) * 36,
      vy: -10 - Math.random() * 26,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.7,
      size: 1.6 + Math.random() * 3,
      color: 'rgba(174, 160, 132, 0.35)',
      gravity: 40,
      drag: 1,
      shape: 'dust',
    });
  }
}

export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const vignette = ctx.createRadialGradient(
    VIEW_WIDTH / 2,
    VIEW_HEIGHT * 0.46,
    VIEW_HEIGHT * 0.22,
    VIEW_WIDTH / 2,
    VIEW_HEIGHT * 0.5,
    VIEW_WIDTH * 0.72,
  );
  vignette.addColorStop(0, 'rgba(3, 6, 10, 0)');
  vignette.addColorStop(0.7, 'rgba(3, 6, 10, 0.14)');
  vignette.addColorStop(1, 'rgba(3, 6, 10, 0.56)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const bottom = ctx.createLinearGradient(0, VIEW_HEIGHT - 220, 0, VIEW_HEIGHT);
  bottom.addColorStop(0, 'rgba(3, 6, 9, 0)');
  bottom.addColorStop(1, 'rgba(3, 6, 9, 0.6)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, VIEW_HEIGHT - 220, VIEW_WIDTH, 220);
}

export function drawBreachFlash(
  ctx: CanvasRenderingContext2D,
  strength: number,
): void {
  if (strength <= 0) return;
  const alpha = Math.max(0, Math.min(1, strength));
  const gradient = ctx.createRadialGradient(
    WORLD.lineX,
    VIEW_HEIGHT * 0.55,
    40,
    WORLD.lineX,
    VIEW_HEIGHT * 0.55,
    VIEW_WIDTH * 0.85,
  );
  gradient.addColorStop(0, `rgba(255, 58, 52, ${alpha * 0.3})`);
  gradient.addColorStop(1, 'rgba(255, 38, 38, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const edge = ctx.createLinearGradient(0, 0, VIEW_WIDTH, 0);
  edge.addColorStop(0, `rgba(255, 45, 45, ${alpha * 0.26})`);
  edge.addColorStop(0.18, 'rgba(255, 45, 45, 0)');
  edge.addColorStop(0.82, 'rgba(255, 45, 45, 0)');
  edge.addColorStop(1, `rgba(255, 45, 45, ${alpha * 0.26})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

export function drawWordText(
  ctx: CanvasRenderingContext2D,
  word: string,
  typed: string,
  startX: number,
  textY: number,
  font: string,
): void {
  ctx.font = font;
  ctx.textAlign = 'left';
  let cursor = startX;
  for (let i = 0; i < word.length; i += 1) {
    const char = word[i];
    const isTyped = i < typed.length;
    const isNext = i === typed.length;
    ctx.fillStyle = isTyped
      ? COLOR.green
      : isNext
        ? COLOR.goldBright
        : COLOR.cream;
    ctx.fillText(char, cursor, textY);
    const charWidth = ctx.measureText(char).width;
    if (isNext) {
      ctx.strokeStyle = 'rgba(255, 220, 132, 0.86)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cursor, textY + 11);
      ctx.lineTo(cursor + charWidth + 1, textY + 11);
      ctx.stroke();
    }
    cursor += charWidth;
  }
}

const PICKUP_FONT = '600 15px "IBM Plex Mono", monospace';
const PICKUP_BADGE_FONT = '600 9px "IBM Plex Mono", monospace';

const PICKUP_STYLE: Record<PowerupType, { glow: string; solid: string; edge: string }> = {
  med: {
    glow: 'rgba(125, 240, 169, 0.42)',
    solid: '#0f1a12',
    edge: 'rgba(125, 240, 169, 0.75)',
  },
  amp: {
    glow: 'rgba(143, 199, 255, 0.42)',
    solid: '#0e1420',
    edge: 'rgba(143, 199, 255, 0.75)',
  },
  gold: {
    glow: 'rgba(242, 195, 100, 0.46)',
    solid: '#1a150a',
    edge: 'rgba(242, 195, 100, 0.8)',
  },
};

function pickupAlpha(pickup: Pickup): number {
  const fadeIn = Math.min(1, (pickup.maxLife - pickup.life) / 0.35);
  const fadeOut = Math.min(1, pickup.life / 2);
  return Math.max(0, fadeIn * fadeOut);
}

export function drawPickupBodies(
  ctx: CanvasRenderingContext2D,
  pickups: Pickup[],
): void {
  ctx.save();
  for (const pickup of pickups) {
    const alpha = pickupAlpha(pickup);
    if (alpha <= 0) continue;
    const bob = Math.sin(pickup.bobPhase) * 5;
    const x = pickup.x;
    const y = pickup.y + bob;
    const style = PICKUP_STYLE[pickup.type];
    const tilt = Math.sin(pickup.bobPhase * 0.7) * 0.1;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(x, y - 26, 4, x, y - 26, 48);
    glow.addColorStop(0, style.glow);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(x, y - 26, 48, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.translate(x, y - 26);
    ctx.rotate(tilt);
    ctx.fillStyle = style.solid;
    ctx.strokeStyle = style.edge;
    ctx.lineWidth = 1.6;
    roundRect(ctx, -15, -11, 30, 22, 5);
    ctx.fill();
    ctx.stroke();

    if (pickup.type === 'med') {
      ctx.fillStyle = style.edge;
      ctx.fillRect(-1.6, -6.5, 3.2, 13);
      ctx.fillRect(-6.5, -1.6, 13, 3.2);
    } else if (pickup.type === 'amp') {
      ctx.fillStyle = style.edge;
      ctx.beginPath();
      ctx.moveTo(3, -8);
      ctx.lineTo(-4, 1);
      ctx.lineTo(0, 1);
      ctx.lineTo(-3, 8);
      ctx.lineTo(5, -2);
      ctx.lineTo(1, -2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = style.edge;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = style.solid;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
  ctx.restore();
}

export function drawPickupLabels(
  ctx: CanvasRenderingContext2D,
  pickups: Pickup[],
  typed: string,
  targetPickupId: number | null,
): void {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const pickup of pickups) {
    const alpha = pickupAlpha(pickup);
    if (alpha <= 0) continue;
    const bob = Math.sin(pickup.bobPhase) * 5;
    const x = pickup.x;
    const y = pickup.y + bob;
    const style = PICKUP_STYLE[pickup.type];
    const isTarget = pickup.id === targetPickupId;

    ctx.font = PICKUP_FONT;
    const metrics = ctx.measureText(pickup.word);
    const padX = 12;
    const width = metrics.width + padX * 2;
    const height = 26;
    const lx = Math.max(12, Math.min(VIEW_WIDTH - width - 12, x - width / 2));
    const ly = y - 68 - height;

    ctx.globalAlpha = alpha;

    ctx.save();
    if (isTarget) {
      ctx.shadowColor = 'rgba(255, 196, 82, 0.85)';
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = isTarget ? 'rgba(23, 17, 9, 0.94)' : 'rgba(8, 12, 17, 0.84)';
    roundRect(ctx, lx, ly, width, height, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isTarget ? 'rgba(255, 211, 118, 0.95)' : style.edge;
    ctx.lineWidth = isTarget ? 1.8 : 1;
    roundRect(ctx, lx, ly, width, height, 7);
    ctx.stroke();
    ctx.restore();

    drawWordText(
      ctx,
      pickup.word,
      isTarget ? typed : '',
      lx + padX,
      ly + height / 2,
      PICKUP_FONT,
    );

    ctx.font = PICKUP_BADGE_FONT;
    ctx.fillStyle = style.edge;
    ctx.fillText(POWERUP_DEFS[pickup.type].name, lx + padX, ly - 7);
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
