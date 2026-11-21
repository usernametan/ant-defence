import type { Grenade, MapData, Projectile, Vec2, WeaponId } from '../shared/types';
import { PALETTE, getThemePalette, teamColor, teamGlowColor } from './palette';

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

export interface ExplosionFlash {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export class EffectsSystem {
  particles: Particle[] = [];
  shockwaves: Shockwave[] = [];
  scorchDecals: ScorchDecal[] = [];
  floatingTexts: FloatingText[] = [];
  muzzleFlashes: MuzzleFlash[] = [];
  explosionFlashes: ExplosionFlash[] = [];
  projectileTrails = new Map<string, Vec2[]>();
  private lastProjPos = new Map<string, { pos: Vec2; vel: Vec2; life: number }>();
  private readonly activeProjIds = new Set<string>();
  unitHitFlash = new Map<string, number>();

  private maxParticles = 340;
  private particleEvictIdx = 0;
  private scorchEvictIdx = 0;
  private scorchSprite: HTMLCanvasElement | null = null;

  clear(): void {
    this.particles.length = 0;
    this.shockwaves.length = 0;
    this.scorchDecals.length = 0;
    this.floatingTexts.length = 0;
    this.muzzleFlashes.length = 0;
    this.explosionFlashes.length = 0;
    this.projectileTrails.clear();
    this.lastProjPos.clear();
    this.activeProjIds.clear();
    this.unitHitFlash.clear();
    this.particleEvictIdx = 0;
    this.scorchEvictIdx = 0;
  }

  spawnShellCasing(pos: Vec2, angle: number, weaponId: WeaponId): void {
    if (weaponId === 'rocket') return;
    const ejectAngle = angle + Math.PI * 0.55 + (pos.x % 0.4) - 0.2;
    const speed = 42 + ((Math.abs(pos.x + pos.y) * 13) % 28);
    this.pushParticle({
      x: pos.x + Math.cos(angle) * 6,
      y: pos.y + Math.sin(angle) * 6,
      vx: Math.cos(ejectAngle) * speed,
      vy: Math.sin(ejectAngle) * speed - 14,
      size: weaponId === 'shotgun' ? 2.4 : 1.7,
      color: weaponId === 'shotgun' ? '#DC2626' : '#EAB308',
      alpha: 0.9,
      life: 0.48,
      maxLife: 0.48,
      glow: false,
    });
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
    this.explosionFlashes.push({
      x: pos.x,
      y: pos.y,
      radius: radius * 0.72,
      life: 0.22,
      maxLife: 0.22,
    });
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
    if (this.scorchDecals.length >= 24) {
      const slot = this.scorchEvictIdx % this.scorchDecals.length;
      this.scorchDecals[slot] = {
        x: pos.x,
        y: pos.y,
        radius: radius * 0.55,
        life: 16,
        maxLife: 16,
      };
      this.scorchEvictIdx = (slot + 1) % this.scorchDecals.length;
    } else {
      this.scorchDecals.push({
        x: pos.x,
        y: pos.y,
        radius: radius * 0.55,
        life: 16,
        maxLife: 16,
      });
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

  update(dt: number, projectiles: Projectile[], map?: MapData): void {
    for (const [id, t] of this.unitHitFlash) {
      const next = t - dt;
      if (next <= 0) this.unitHitFlash.delete(id);
      else this.unitHitFlash.set(id, next);
    }

    this.activeProjIds.clear();
    for (const p of projectiles) {
      this.activeProjIds.add(p.id);
      const cached = this.lastProjPos.get(p.id);
      if (cached) {
        cached.pos.x = p.pos.x;
        cached.pos.y = p.pos.y;
        cached.vel.x = p.vel.x;
        cached.vel.y = p.vel.y;
        cached.life = p.life;
      } else {
        this.lastProjPos.set(p.id, {
          pos: { x: p.pos.x, y: p.pos.y },
          vel: { x: p.vel.x, y: p.vel.y },
          life: p.life,
        });
      }
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
      if (!this.activeProjIds.has(id)) {
        const last = this.lastProjPos.get(id);
        if (last && map && last.life > 0.04) {
          const probeX = last.pos.x + last.vel.x * dt * 1.1;
          const probeY = last.pos.y + last.vel.y * dt * 1.1;
          const col = Math.floor(probeX / map.tileSize);
          const row = Math.floor(probeY / map.tileSize);
          if (map.tiles[row]?.[col] === 'wall') {
            const wallColor = getThemePalette(map.theme).wallEdge;
            this.spawnImpactSparks(last.pos, wallColor, 5);
          }
        }
        this.projectileTrails.delete(id);
        this.lastProjPos.delete(id);
      }
    }

    const particleDrag = Math.exp(-4.5 * dt);
    let pw = 0;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= particleDrag;
      p.vy *= particleDrag;
      this.particles[pw] = p;
      pw += 1;
    }
    this.particles.length = pw;

    let sw = 0;
    for (let i = 0; i < this.shockwaves.length; i += 1) {
      const s = this.shockwaves[i];
      s.life -= dt;
      if (s.life <= 0) continue;
      this.shockwaves[sw] = s;
      sw += 1;
    }
    this.shockwaves.length = sw;

    let dw = 0;
    for (let i = 0; i < this.scorchDecals.length; i += 1) {
      const d = this.scorchDecals[i];
      d.life -= dt;
      if (d.life <= 0) continue;
      this.scorchDecals[dw] = d;
      dw += 1;
    }
    this.scorchDecals.length = dw;

    const textDrag = Math.exp(-3 * dt);
    let fw = 0;
    for (let i = 0; i < this.floatingTexts.length; i += 1) {
      const f = this.floatingTexts[i];
      f.life -= dt;
      if (f.life <= 0) continue;
      f.y += f.vy * dt;
      f.vy *= textDrag;
      this.floatingTexts[fw] = f;
      fw += 1;
    }
    this.floatingTexts.length = fw;

    let mw = 0;
    for (let i = 0; i < this.muzzleFlashes.length; i += 1) {
      const m = this.muzzleFlashes[i];
      m.life -= dt;
      if (m.life <= 0) continue;
      this.muzzleFlashes[mw] = m;
      mw += 1;
    }
    this.muzzleFlashes.length = mw;

    let ew = 0;
    for (let i = 0; i < this.explosionFlashes.length; i += 1) {
      const e = this.explosionFlashes[i];
      e.life -= dt;
      if (e.life <= 0) continue;
      this.explosionFlashes[ew] = e;
      ew += 1;
    }
    this.explosionFlashes.length = ew;
  }

  private getScorchSprite(): HTMLCanvasElement | null {
    if (this.scorchSprite) return this.scorchSprite;
    if (typeof document === 'undefined') return null;
    const size = 128;
    const half = size * 0.5;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const gctx = c.getContext('2d');
    if (!gctx) return null;
    const grad = gctx.createRadialGradient(half, half, 4, half, half, half);
    grad.addColorStop(0, '#04060B');
    grad.addColorStop(0.65, '#0D1220');
    grad.addColorStop(1, 'transparent');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, size, size);
    this.scorchSprite = c;
    return c;
  }

  drawScorchDecals(
    ctx: CanvasRenderingContext2D,
    view?: { minX: number; minY: number; maxX: number; maxY: number },
  ): void {
    if (this.scorchDecals.length === 0) return;
    const sprite = this.getScorchSprite();
    ctx.save();
    for (let i = 0; i < this.scorchDecals.length; i += 1) {
      const d = this.scorchDecals[i];
      if (
        view &&
        (d.x + d.radius < view.minX ||
          d.x - d.radius > view.maxX ||
          d.y + d.radius < view.minY ||
          d.y - d.radius > view.maxY)
      ) {
        continue;
      }
      const alpha = Math.min(0.42, (d.life / d.maxLife) * 0.5);
      ctx.globalAlpha = alpha;
      if (sprite) {
        const size = d.radius * 2;
        ctx.drawImage(sprite, d.x - d.radius, d.y - d.radius, size, size);
      } else {
        const grad = ctx.createRadialGradient(d.x, d.y, 2, d.x, d.y, d.radius);
        grad.addColorStop(0, '#04060B');
        grad.addColorStop(0.65, '#0D1220');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
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
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.moveTo(-7, -2.5);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-7, 2.5);
        ctx.closePath();
        ctx.fill();
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
        // Soft outer glow + crisp team-tinted tracer core
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(-4, 0, 14, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const grad = ctx.createLinearGradient(-18, 0, 7, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.45, p.team === 'player' ? PALETTE.playerGlow : PALETTE.gold);
        grad.addColorStop(1, PALETTE.textHi);
        ctx.fillStyle = grad;
        ctx.fillRect(-18, -1.9, 25, 3.8);
      }
      ctx.restore();
    }
  }

  drawGrenades(
    ctx: CanvasRenderingContext2D,
    grenades: readonly Grenade[],
    time: number,
  ): void {
    for (const g of grenades) {
      const angle = Math.atan2(g.vel.y, g.vel.x);
      const speed = Math.hypot(g.vel.x, g.vel.y);
      const nx = speed > 1 ? g.vel.x / speed : Math.cos(angle);
      const ny = speed > 1 ? g.vel.y / speed : Math.sin(angle);
      const fuseRatio = Math.max(0, Math.min(1, g.fuse / Math.max(0.01, g.maxFuse)));
      const blink = Math.sin(time * (16 + (1 - fuseRatio) * 24)) > 0;

      // Straight tactical flight streak behind the grenade
      ctx.save();
      const trailLen = 36;
      const grad = ctx.createLinearGradient(
        g.pos.x - nx * trailLen,
        g.pos.y - ny * trailLen,
        g.pos.x,
        g.pos.y,
      );
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, blink ? 'rgba(250, 204, 21, 0.55)' : 'rgba(244, 63, 94, 0.55)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.pos.x - nx * trailLen, g.pos.y - ny * trailLen);
      ctx.lineTo(g.pos.x, g.pos.y);
      ctx.stroke();
      ctx.restore();

      // Ground shadow
      ctx.save();
      ctx.fillStyle = 'rgba(7, 11, 20, 0.45)';
      ctx.beginPath();
      ctx.ellipse(g.pos.x, g.pos.y + 8, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Spinning tactical frag canister
      ctx.save();
      ctx.translate(g.pos.x, g.pos.y);
      ctx.rotate(angle + time * 12);
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = PALETTE.bg0;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-5.5, -4.5, 11, 9, 3);
      ctx.fill();
      ctx.stroke();

      // Olive band + armed fuse LED
      ctx.fillStyle = '#4D7C0F';
      ctx.fillRect(-3.5, -3, 7, 6);
      ctx.fillStyle = blink ? PALETTE.danger : PALETTE.gold;
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawForegroundEffects(
    ctx: CanvasRenderingContext2D,
    view?: { minX: number; minY: number; maxX: number; maxY: number },
  ): void {
    for (let i = 0; i < this.explosionFlashes.length; i += 1) {
      const e = this.explosionFlashes[i];
      if (
        view &&
        (e.x + e.radius < view.minX ||
          e.x - e.radius > view.maxX ||
          e.y + e.radius < view.minY ||
          e.y - e.radius > view.maxY)
      ) {
        continue;
      }
      const ratio = e.life / e.maxLife;
      const r = e.radius * (0.45 + (1 - ratio) * 0.75);
      ctx.save();
      ctx.globalAlpha = ratio * 0.9;
      const grad = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, r);
      grad.addColorStop(0, '#FFFBEB');
      grad.addColorStop(0.32, '#FACC15');
      grad.addColorStop(0.68, '#FF5A3C');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < this.muzzleFlashes.length; i += 1) {
      const m = this.muzzleFlashes[i];
      if (
        view &&
        (m.x + m.radius * 2 < view.minX ||
          m.x - m.radius * 2 > view.maxX ||
          m.y + m.radius * 2 < view.minY ||
          m.y - m.radius * 2 > view.maxY)
      ) {
        continue;
      }
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
      ctx.ellipse(m.radius * 0.35, 0, m.radius * 1.15, m.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.textHi;
      ctx.beginPath();
      ctx.ellipse(m.radius * 0.15, 0, m.radius * 0.42, m.radius * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.shockwaves.length > 0) {
      ctx.save();
      for (let i = 0; i < this.shockwaves.length; i += 1) {
        const s = this.shockwaves[i];
        if (
          view &&
          (s.x + s.maxRadius < view.minX ||
            s.x - s.maxRadius > view.maxX ||
            s.y + s.maxRadius < view.minY ||
            s.y - s.maxRadius > view.maxY)
        ) {
          continue;
        }
        const progress = 1 - s.life / s.maxLife;
        const r = 8 + s.maxRadius * (1 - Math.pow(1 - progress, 2));
        ctx.globalAlpha = (s.life / s.maxLife) * 0.85;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.particles.length > 0) {
      ctx.save();
      for (let i = 0; i < this.particles.length; i += 1) {
        const p = this.particles[i];
        const margin = p.size * 2.5;
        if (
          view &&
          (p.x + margin < view.minX ||
            p.x - margin > view.maxX ||
            p.y + margin < view.minY ||
            p.y - margin > view.maxY)
        ) {
          continue;
        }
        const ratio = p.life / p.maxLife;
        const r = p.size * (0.5 + ratio * 0.5);
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.globalAlpha = Math.max(0, Math.min(0.32, ratio * p.alpha * 0.35));
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, ratio * p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.floatingTexts.length > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      for (let i = 0; i < this.floatingTexts.length; i += 1) {
        const f = this.floatingTexts[i];
        if (
          view &&
          (f.x + 48 < view.minX ||
            f.x - 48 > view.maxX ||
            f.y + 32 < view.minY ||
            f.y - 32 > view.maxY)
        ) {
          continue;
        }
        const alpha = Math.min(1, (f.life / f.maxLife) * 1.4);
        ctx.globalAlpha = alpha;
        ctx.font = `800 ${Math.round(13 * f.scale)}px Bahnschrift, "Segoe UI", system-ui, sans-serif`;
        ctx.fillStyle = PALETTE.bg0;
        ctx.fillText(f.text, f.x + 1, f.y + 1);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.restore();
    }
  }

  private pushParticle(p: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      const slot = this.particleEvictIdx % this.particles.length;
      this.particles[slot] = p;
      this.particleEvictIdx = (slot + 1) % this.particles.length;
      return;
    }
    this.particles.push(p);
  }
}
