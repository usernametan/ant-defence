import { PLAYER, WORLD } from './config';

const INK = '#040406';
const EDGE = 'rgba(255, 221, 178, 0.22)';

function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export class Player {
  x = WORLD.playerX;

  y = WORLD.playerFeetY;

  aimAngle = 0.05;

  recoil = 0;

  flash = 0;

  private bobTime = 0;

  update(dt: number, target: { x: number; y: number } | null, active: boolean): void {
    this.bobTime += dt;
    this.recoil = Math.max(0, this.recoil - dt);
    this.flash = Math.max(0, this.flash - dt);

    const neckX = this.x + 4;
    const neckY = this.y - 104;
    const desired = target
      ? Math.atan2(target.y - neckY, target.x - neckX)
      : 0.08;
    const clamped = Math.max(-1.12, Math.min(0.42, desired));
    const rate = active ? 15 : 6;
    this.aimAngle = damp(this.aimAngle, clamped, rate, dt);
  }

  shoot(target: { x: number; y: number }): void {
    const neckX = this.x + 4;
    const neckY = this.y - 104;
    this.aimAngle = Math.max(
      -1.12,
      Math.min(0.42, Math.atan2(target.y - neckY, target.x - neckX)),
    );
    this.recoil = PLAYER.recoilTime;
    this.flash = PLAYER.muzzleFlashTime;
  }

  getMuzzle(): { x: number; y: number } {
    const shoulderX = this.x + 4;
    const shoulderY = this.y - 104 + 8;
    const recoilPull = this.recoil > 0 ? 7 * (this.recoil / PLAYER.recoilTime) : 0;
    const length = 66 - recoilPull;
    return {
      x: shoulderX + Math.cos(this.aimAngle) * length,
      y: shoulderY + Math.sin(this.aimAngle) * length,
    };
  }

  draw(ctx: CanvasRenderingContext2D, shieldActive: boolean): void {
    const bob = Math.sin(this.bobTime * 1.5) * 1.4;
    const recoilNorm = this.recoil / PLAYER.recoilTime;
    const lean = Math.sin(this.aimAngle) * 5 - recoilNorm * 3;
    const baseX = this.x;
    const baseY = this.y + bob;

    ctx.save();

    const shadow = ctx.createRadialGradient(baseX + 2, baseY + 2, 4, baseX + 2, baseY + 2, 62);
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(baseX + 2, baseY + 2, 62, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    const hipX = baseX;
    const hipY = baseY - 58;
    const neckX = baseX + 4 + lean * 0.5;
    const neckY = baseY - 104;
    const shoulderX = neckX;
    const shoulderY = neckY + 8;
    const headX = neckX + lean * 0.34;
    const headY = neckY - 19;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;

    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(hipX - 1, hipY + 2);
    ctx.lineTo(baseX - 23, baseY - 32);
    ctx.lineTo(baseX - 39, baseY - 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hipX + 3, hipY + 1);
    ctx.lineTo(baseX + 22, baseY - 27);
    ctx.lineTo(baseX + 40, baseY - 1);
    ctx.stroke();

    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(neckX - 5, hipY - 28, neckX, neckY + 6);
    ctx.stroke();

    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(neckX - 1, neckY + 2);
    ctx.lineTo(neckX - 15, neckY + 24);
    ctx.lineTo(neckX - 5, neckY + 43);
    ctx.stroke();

    const handX = shoulderX + Math.cos(this.aimAngle) * 39 - recoilNorm * 4;
    const handY = shoulderY + Math.sin(this.aimAngle) * 39 + recoilNorm * 2;
    const elbowX = shoulderX + Math.cos(this.aimAngle) * 20 - 5;
    const elbowY = shoulderY + Math.sin(this.aimAngle) * 20 + 8;

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(neckX - 8, neckY + 8);
    ctx.lineTo(handX - 6, handY + 2);
    ctx.lineTo(handX - 1, handY + 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(headX, headY, 16.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(headX, headY, 16.5, Math.PI * 1.15, Math.PI * 1.9);
    ctx.stroke();

    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = INK;
    ctx.strokeStyle = 'rgba(118, 112, 104, 0.42)';
    ctx.lineWidth = 0.9;

    const gun = new Path2D();
    gun.moveTo(-4, -4);
    gun.lineTo(29, -4);
    gun.lineTo(34, -1);
    gun.lineTo(33, 2);
    gun.lineTo(9, 3);
    gun.lineTo(7, 13);
    gun.lineTo(0, 14);
    gun.lineTo(-1, 5);
    gun.lineTo(-6, 2);
    gun.closePath();
    ctx.fill(gun);
    ctx.stroke(gun);

    ctx.fillRect(-3, -1, 9, 3);
    ctx.restore();

    ctx.restore();

    const muzzle = this.getMuzzle();
    if (this.flash > 0) {
      const strength = this.flash / PLAYER.muzzleFlashTime;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(muzzle.x, muzzle.y);
      ctx.rotate(this.aimAngle);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 42 * strength);
      glow.addColorStop(0, 'rgba(255, 251, 221, 0.95)');
      glow.addColorStop(0.35, 'rgba(255, 204, 108, 0.62)');
      glow.addColorStop(1, 'rgba(255, 150, 58, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 42 * strength, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 243, 199, 0.95)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(36 * strength, -5 * strength);
      ctx.lineTo(12 * strength, 0);
      ctx.lineTo(30 * strength, 8 * strength);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (shieldActive) {
      const pulse = 0.4 + Math.sin(this.bobTime * 5) * 0.08;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bubble = ctx.createRadialGradient(baseX, baseY - 66, 18, baseX, baseY - 66, 116);
      bubble.addColorStop(0, 'rgba(118, 196, 255, 0)');
      bubble.addColorStop(0.72, `rgba(111, 184, 255, ${pulse * 0.08})`);
      bubble.addColorStop(0.9, `rgba(128, 206, 255, ${pulse * 0.5})`);
      bubble.addColorStop(1, 'rgba(128, 206, 255, 0)');
      ctx.fillStyle = bubble;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY - 62, 108, 132, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(163, 220, 255, ${pulse})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY - 62, 108, 132, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
