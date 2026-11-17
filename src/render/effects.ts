import type { Projectile, Vec2 } from '../shared/types';
import { PALETTE, teamColor, teamGlowColor } from './palette';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  glow: boolean;
}

export interface Shockwave {
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
  lineWidth: number;
}

export interface ScorchDecal {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface MuzzleFlash {
  x: number;
  y: number;
  angle: number;
  color: string;
  life: number;
  maxLife: number;
  radius: number;
}

export class EffectsSystem {
  particles: Particle[] = [];
  shockwaves: Shockwave[] = [];
  scorchDecals: ScorchDecal[] = [];
  floatingTexts: FloatingText[] = [];
  muzzleFlashes: MuzzleFlash[] = [];
  projectileTrails = new Map<string, Vec2[]>();
  unitHitFlash = new Map<string, number>();

  private maxParticles = 320;

  clear(): void {
    this.particles.length = 0;
    this.shockwaves.length = 0;
    this.scorchDecals.length = 0;
    this.floatingTexts.length = 0;
    this.muzzleFlashes.length = 0;
    this.projectileTrails.clear();
    this.unitHitFlash.clear();
  }

  spawnMuzzleFlash(pos: Vec2, angle: number, color: string, heavy: boolean): void {
    this.muzzleFlashes.push({
      x: pos.x + Math.cos(angle) * 16,
      y: pos.y + Math.sin(angle) * 16,
      angle,
      color,
      life: 0.09,
      maxLife: 0.09,
      radius: heavy ? 22 : 14,
    });
  }

  spawnImpactSparks(pos: Vec2, color: string, count = 8): void {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
      const speed = 75 + (i % 4) * 45;
      this.pushParticle({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: 2.2,
        color,
        alpha: 1,
        life: 0.24,
        maxLife: 0.24,
        glow: true,
      });
    }
  }

  spawnExplosion(pos: Vec2, radius: number): void {
    this.shockwaves.push({
      x: pos.x,
      y: pos.y,
      maxRadius: radius,
      color: PALETTE.enemyGlow,
      life: 0.42,
      maxLife: 0.42,
      lineWidth: 4,
    });
    this.shockwaves.push({
      x: pos.x,
      y: pos.y,
      maxRadius: radius * 0.65,
      color: PALETTE.gold,
      life: 0.26,
      maxLife: 0.26,
      lineWidth: 2.5,
    });
    this.scorchDecals.push({
      x: pos.x,
      y: pos.y,
      radius: radius * 0.55,
      life: 16,
      maxLife: 16,
    });
    if (this.scorchDecals.length > 24) {
      this.scorchDecals.shift();
    }

    const debrisCount = 26;
    for (let i = 0; i < debrisCount; i += 1) {
      const a = (i / debrisCount) * Math.PI * 2 + (i % 5) * 0.17;
      const speed = 90 + ((i * 37) % 190);
      const isEmber = i % 2 === 0;
      this.pushParticle({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: isEmber ? 3.5 : 2.5,
        color: isEmber ? PALETTE.enemyGlow : PALETTE.gold,
        alpha: 1,
        life: 0.35 + (i % 4) * 0.08,
        maxLife: 0.65,
        glow: true,
      });
    }
  }

  spawnDeathDissolve(pos: Vec2, color: string): void {
    for (let i = 0; i < 20; i += 1) {
      const a = (i / 20) * Math.PI * 2;
      const speed = 45 + (i % 5) * 28;
      this.pushParticle({
        x: pos.x + Math.cos(a) * 6,
        y: pos.y + Math.sin(a) * 6,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 18,
        size: 3,
        color,
        alpha: 1,
        life: 0.55,
        maxLife: 0.55,
        glow: true,
      });
    }
    this.shockwaves.push({
      x: pos.x,
      y: pos.y,
      maxRadius: 34,
      color,
      life: 0.3,
      maxLife: 0.3,
      lineWidth: 2,
    });
  }

  spawnZoneBeam(pos: Vec2, color: string): void {
    this.shockwaves.push({
      x: pos.x,
      y: pos.y,
      maxRadius: 155,
      color,
      life: 0.7,
      maxLife: 0.7,
      lineWidth: 3.5,
    });
  }

  spawnFloatingDamage(pos: Vec2, damage: number, crit: boolean): void {
    this.floatingTexts.push({
      x: pos.x + ((damage % 7) - 3) * 2,
      y: pos.y - 16,
      vy: -36,
      text: crit ? `${Math.round(damage)}!` : `${Math.round(damage)}`,
      color: crit ? PALETTE.gold : PALETTE.textHi,
      life: 0.72,
      maxLife: 0.72,
      scale: crit ? 1.25 : 1,
    });
  }

  update(dt: number, projectiles: Projectile[]): void {
    for (const [id, t] of this.unitHitFlash) {
      const next = t - dt;
      if (next <= 0) this.unitHitFlash.delete(id);
      else this.unitHitFlash.set(id, next);
    }

    const activeProjIds = new Set<string>();
    for (const p of projectiles) {
      activeProjIds.add(p.id);
      let trail = this.projectileTrails.get(p.id);
      if (!trail) {
        trail = [];
        this.projectileTrails.set(p.id, trail);
      }
      trail.push({ x: p.pos.x, y: p.pos.y });
      const maxTrail = p.weaponId === 'rocket' ? 12 : 7;
      if (trail.length > maxTrail) {
        trail.shift();
      }
      if (p.weaponId === 'rocket') {
        this.pushParticle({
          x: p.pos.x - p.vel.x * 0.012,
          y: p.pos.y - p.vel.y * 0.012,
          vx: -p.vel.x * 0.08,
          vy: -p.vel.y * 0.08,
          size: 4,
          color: PALETTE.neutral,
          alpha: 0.45,
          life: 0.28,
          maxLife: 0.28,
          glow: false,
        });
      }
    }
    for (const id of this.projectileTrails.keys()) {
      if (!activeProjIds.has(id)) {
        this.projectileTrails.delete(id);
      }
    }

    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-4.5 * dt);
      p.vy *= Math.exp(-4.5 * dt);
      return true;
    });

    this.shockwaves = this.shockwaves.filter((s) => {
      s.life -= dt;
      return s.life > 0;
    });

    this.scorchDecals = this.scorchDecals.filter((d) => {
      d.life -= dt;
      return d.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter((f) => {
      f.life -= dt;
      if (f.life <= 0) return false;
      f.y += f.vy * dt;
      f.vy *= Math.exp(-3 * dt);
      return true;
    });

    this.muzzleFlashes = this.muzzleFlashes.filter((m) => {
      m.life -= dt;
      return m.life > 0;
    });
  }

  drawScorchDecals(ctx: CanvasRenderingContext2D): void {
    for (const d of this.scorchDecals) {
      const alpha = Math.min(0.42, (d.life / d.maxLife) * 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(d.x, d.y, 2, d.x, d.y, d.radius);
      grad.addColorStop(0, '#04060B');
      grad.addColorStop(0.65, '#0D1220');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
    for (const p of projectiles) {
      const color = teamColor(p.team);
      const glow = teamGlowColor(p.team);
      const trail = this.projectileTrails.get(p.id);

      if (trail && trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i += 1) {
          const t = i / trail.length;
          ctx.strokeStyle = glow;
          ctx.globalAlpha = t * 0.65;
          ctx.lineWidth = p.weaponId === 'rocket' ? 4 * t : 2.5 * t;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      const angle = Math.atan2(p.vel.y, p.vel.x);
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(angle);
      if (p.weaponId === 'rocket') {
        ctx.fillStyle = PALETTE.textHi;
        ctx.fillRect(-7, -2.5, 11, 5);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(4, -3);
        ctx.lineTo(9, 0);
        ctx.lineTo(4, 3);
        ctx.closePath();
        ctx.fill();
      } else {
        // Golden-white luminous tracer streak
        const grad = ctx.createLinearGradient(-16, 0, 6, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.45, PALETTE.gold);
        grad.addColorStop(1, PALETTE.textHi);
        ctx.fillStyle = grad;
        ctx.fillRect(-16, -1.8, 22, 3.6);
      }
      ctx.restore();
    }
  }

  drawForegroundEffects(ctx: CanvasRenderingContext2D): void {
    for (const m of this.muzzleFlashes) {
      const t = m.life / m.maxLife;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.globalAlpha = t;
      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, m.radius);
      grad.addColorStop(0, PALETTE.textHi);
      grad.addColorStop(0.45, m.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(m.radius * 0.3, 0, m.radius, m.radius * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const s of this.shockwaves) {
      const progress = 1 - s.life / s.maxLife;
      const r = 8 + s.maxRadius * (1 - Math.pow(1 - progress, 2));
      ctx.save();
      ctx.globalAlpha = (s.life / s.maxLife) * 0.85;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      const ratio = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, ratio * p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + ratio * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const f of this.floatingTexts) {
      const alpha = Math.min(1, (f.life / f.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(13 * f.scale)}px Bahnschrift, "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  private pushParticle(p: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(p);
  }
}
