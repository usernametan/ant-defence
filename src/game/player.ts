import { PLAYER, WORLD } from './config';
import type { BiomeId } from './types';

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

  getMuzzle(combo = 0, powered = false): { x: number; y: number } {
    const shoulderX = this.x + 4;
    const shoulderY = this.y - 104 + 8;
    const recoilPull = this.recoil > 0 ? 7 * (this.recoil / PLAYER.recoilTime) : 0;
    const extraLength = powered || combo >= 10 ? 18 : combo >= 5 ? 9 : 0;
    const length = 66 + extraLength - recoilPull;
    return {
      x: shoulderX + Math.cos(this.aimAngle) * length,
      y: shoulderY + Math.sin(this.aimAngle) * length,
    };
  }

  draw(
    ctx: CanvasRenderingContext2D,
    shieldActive: boolean,
    combo = 0,
    powered = false,
    biome: BiomeId = 'dusk',
    lockedTarget: { x: number; y: number } | null = null,
  ): void {
    const bob = Math.sin(this.bobTime * 1.5) * 1.4;
    const recoilNorm = this.recoil / PLAYER.recoilTime;
    const lean = Math.sin(this.aimAngle) * 5 - recoilNorm * 3;
    const baseX = this.x;
    const baseY = this.y + bob;
    const weaponTier = powered || combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
    const muzzle = this.getMuzzle(combo, powered);

    // Night biome volumetric flashlight cone
    if (biome === 'night') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(muzzle.x, muzzle.y);
      ctx.rotate(this.aimAngle * 0.45);
      const cone = ctx.createRadialGradient(0, 0, 8, 520, 20, 760);
      cone.addColorStop(0, 'rgba(180, 240, 255, 0.16)');
      cone.addColorStop(0.45, 'rgba(120, 215, 235, 0.07)');
      cone.addColorStop(1, 'rgba(80, 180, 210, 0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(1180, -210);
      ctx.lineTo(1180, 240);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Laser sight when weapon tier >= 1 and locked onto a target
    if (weaponTier >= 1 && lockedTarget) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle =
        weaponTier === 2
          ? 'rgba(255, 215, 110, 0.42)'
          : 'rgba(255, 88, 76, 0.32)';
      ctx.lineWidth = weaponTier === 2 ? 1.8 : 1.1;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(muzzle.x, muzzle.y);
      ctx.lineTo(lockedTarget.x, lockedTarget.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

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

    // Tactical visor glow at higher streaks
    if (weaponTier >= 1) {
      ctx.fillStyle = weaponTier === 2 ? '#ffe29a' : '#7df0a9';
      ctx.shadowColor = weaponTier === 2 ? '#f2c364' : '#7df0a9';
      ctx.shadowBlur = 8;
      ctx.fillRect(headX + 8, headY - 3, 7, 2.6);
      ctx.shadowBlur = 0;
    }

    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = INK;
    ctx.strokeStyle =
      weaponTier === 2
        ? 'rgba(242, 195, 100, 0.68)'
        : weaponTier === 1
          ? 'rgba(159, 211, 255, 0.5)'
          : 'rgba(118, 112, 104, 0.42)';
    ctx.lineWidth = weaponTier >= 1 ? 1.2 : 0.9;

    const barrelEnd = weaponTier === 2 ? 48 : weaponTier === 1 ? 39 : 29;
    const gun = new Path2D();
    gun.moveTo(-8, -5);
    gun.lineTo(barrelEnd, -4.5);
    gun.lineTo(barrelEnd + 5, -1);
    gun.lineTo(barrelEnd + 4, 2.5);
    gun.lineTo(9, 3.5);
    gun.lineTo(7, 13);
    gun.lineTo(0, 14);
    gun.lineTo(-1, 5);
    gun.lineTo(-8, 2);
    gun.closePath();
    ctx.fill(gun);
    ctx.stroke(gun);

    if (weaponTier === 2) {
      // Glowing rail-rifle coils
      ctx.fillStyle = 'rgba(255, 218, 128, 0.9)';
      for (let c = 0; c < 3; c += 1) {
        ctx.fillRect(12 + c * 10, -3.2, 5, 2.4);
      }
    } else if (weaponTier === 1) {
      ctx.fillStyle = 'rgba(143, 199, 255, 0.78)';
      ctx.fillRect(14, -2.5, 14, 2);
    } else {
      ctx.fillRect(-3, -1, 9, 3);
    }
    ctx.restore();

    ctx.restore();

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
