import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import type { DroneState, LightningArc, MortarShell, Particle } from './types';

/** Build a jagged lightning polyline between two points. */
export function makeArcPoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  segments = 9,
  jitter = 22,
): Array<{ x: number; y: number }> {
  const points = [{ x: from.x, y: from.y }];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    const falloff = Math.sin(t * Math.PI);
    const offset = (Math.random() - 0.5) * 2 * jitter * falloff;
    points.push({ x: from.x + dx * t + nx * offset, y: from.y + dy * t + ny * offset });
  }
  points.push({ x: to.x, y: to.y });
  return points;
}

export function updateArcs(arcs: LightningArc[], dt: number): void {
  for (let i = arcs.length - 1; i >= 0; i -= 1) {
    arcs[i].life -= dt;
    if (arcs[i].life <= 0) arcs.splice(i, 1);
  }
}

export function drawArcs(ctx: CanvasRenderingContext2D, arcs: LightningArc[]): void {
  if (arcs.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (const arc of arcs) {
    const alpha = Math.max(0, arc.life / arc.maxLife);
    const flicker = 0.65 + Math.random() * 0.35;
    ctx.globalAlpha = alpha * flicker;
    ctx.beginPath();
    arc.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = arc.color;
    ctx.shadowColor = arc.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = arc.width * 2.6;
    ctx.globalAlpha = alpha * 0.35 * flicker;
    ctx.stroke();
    ctx.globalAlpha = alpha * flicker;
    ctx.lineWidth = arc.width;
    ctx.strokeStyle = '#f4fbff';
    ctx.stroke();
  }
  ctx.restore();
}

export function drawMortarShells(
  ctx: CanvasRenderingContext2D,
  shells: MortarShell[],
  time: number,
): void {
  for (const shell of shells) {
    const progress = 1 - shell.timer / shell.maxTimer;
    ctx.save();
    // Ground warning ellipse.
    ctx.translate(shell.x, shell.y);
    ctx.scale(1, 0.32);
    const pulse = 0.5 + Math.sin(time * 22) * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, shell.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 80, 60, ${0.08 + progress * 0.14})`;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -time * 60;
    ctx.strokeStyle = `rgba(255, 120, 90, ${0.5 + pulse * 0.4})`;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, shell.radius * (1 - progress), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 220, 160, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Falling shell with a streak.
    const fallY = shell.y - 620 * (1 - progress) * (1 - progress) - 20;
    ctx.save();
    const grad = ctx.createLinearGradient(shell.x, fallY - 120, shell.x, fallY);
    grad.addColorStop(0, 'rgba(255, 200, 120, 0)');
    grad.addColorStop(1, 'rgba(255, 220, 160, 0.75)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(shell.x, fallY - 120);
    ctx.lineTo(shell.x, fallY);
    ctx.stroke();
    ctx.fillStyle = '#1b1712';
    ctx.strokeStyle = 'rgba(255, 210, 150, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(shell.x, fallY, 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export function spawnMortarBlast(
  particles: Particle[],
  x: number,
  y: number,
  radius: number,
): void {
  for (let i = 0; i < 70; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 480;
    particles.push({
      x,
      y: y - 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.55 - 160,
      life: 0.5 + Math.random() * 0.7,
      maxLife: 1.2,
      size: 2 + Math.random() * 5,
      color: i % 3 === 0 ? 'rgba(255, 236, 190, 0.95)' : i % 3 === 1 ? 'rgba(255, 140, 60, 0.9)' : 'rgba(90, 70, 50, 0.85)',
      gravity: 520,
      drag: 1.6,
      shape: i % 4 === 0 ? 'dust' : 'spark',
    });
  }
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.45,
    maxLife: 0.45,
    size: radius / 3,
    color: 'rgba(255, 200, 130, 0.8)',
    gravity: 0,
    drag: 0,
    shape: 'ring',
  });
}

export function drawDrone(
  ctx: CanvasRenderingContext2D,
  drone: DroneState,
  time: number,
  overdrive: boolean,
): void {
  const { x, y } = drone;
  const glow = overdrive ? 'rgba(120, 230, 255, 0.9)' : 'rgba(255, 210, 130, 0.85)';
  ctx.save();
  ctx.translate(x, y);
  // Soft hover glow on the ground below.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms and rotors.
  ctx.strokeStyle = '#0b0d10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, -4);
  ctx.lineTo(20, -4);
  ctx.stroke();
  const spin = time * 40;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 20, -7);
    ctx.fillStyle = 'rgba(220, 230, 240, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * Math.abs(Math.cos(spin + side)), 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = '#0a0c0f';
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.lineTo(11, -4);
  ctx.lineTo(7, 6);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eye.
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12 + drone.flash * 40;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(2, 1, 2.6 + drone.flash * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Darkness overlay with a flashlight cone cut out from the player. */
export function drawBlackout(
  ctx: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  angle: number,
  revealX: number,
  time: number,
): void {
  ctx.save();
  const flicker = 0.97 + Math.sin(time * 13) * 0.015 + Math.sin(time * 31) * 0.01;
  ctx.fillStyle = `rgba(2, 4, 8, ${0.8 * flicker})`;
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  // Cone (counter-clockwise path punches a hole with evenodd).
  const reach = revealX - origin.x + 160;
  const spread = 0.34;
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + Math.cos(angle + spread) * reach, origin.y + Math.sin(angle + spread) * reach);
  ctx.lineTo(origin.x + Math.cos(angle - spread) * reach, origin.y + Math.sin(angle - spread) * reach);
  ctx.closePath();
  ctx.fill('evenodd');

  // Soft beam light.
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createRadialGradient(origin.x, origin.y, 10, origin.x, origin.y, reach);
  beam.addColorStop(0, 'rgba(255, 236, 190, 0.16)');
  beam.addColorStop(0.7, 'rgba(255, 220, 160, 0.05)');
  beam.addColorStop(1, 'rgba(255, 220, 160, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + Math.cos(angle + spread) * reach, origin.y + Math.sin(angle + spread) * reach);
  ctx.lineTo(origin.x + Math.cos(angle - spread) * reach, origin.y + Math.sin(angle - spread) * reach);
  ctx.closePath();
  ctx.fill();

  // Ground band near the line stays dimly visible so lanes read.
  ctx.globalCompositeOperation = 'source-over';
  const band = ctx.createLinearGradient(revealX - 200, 0, revealX + 60, 0);
  band.addColorStop(0, 'rgba(2, 4, 8, 0)');
  band.addColorStop(1, 'rgba(2, 4, 8, 0.35)');
  ctx.fillStyle = band;
  ctx.fillRect(revealX - 200, 560, VIEW_WIDTH - revealX + 200, 260);
  ctx.restore();
}

/** Cyan edge glow while Overdrive is active. */
export function drawOverdriveTint(ctx: CanvasRenderingContext2D, time: number, strength: number): void {
  if (strength <= 0) return;
  ctx.save();
  const pulse = 0.75 + Math.sin(time * 8) * 0.25;
  const grad = ctx.createRadialGradient(
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_HEIGHT * 0.35,
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_WIDTH * 0.62,
  );
  grad.addColorStop(0, 'rgba(60, 200, 255, 0)');
  grad.addColorStop(1, `rgba(60, 200, 255, ${0.22 * pulse * strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.restore();
}
