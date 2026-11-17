import { WEAPON_DEFS } from '../shared/api';
import { bus } from '../shared/events';
import type { GameState, Vec2 } from '../shared/types';
import { Camera } from './camera';
import type { ViewTransformHook } from './camera';
import { EffectsSystem } from './effects';
import { EnvironmentRenderer } from './environment';
import { PALETTE, teamColor, teamGlowColor } from './palette';
import { drawUnits } from './units';
import { computeVisibilityPolygon, hasLineOfSight } from './visibility';

export type RenderQuality = 'low' | 'med' | 'high';

export interface RendererOptions {
  quality: RenderQuality;
  screenShakeScale: number;
  colorblindAssist: boolean;
  reducedMotion: boolean;
}

export class Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private bloomCanvas: HTMLCanvasElement | null = null;
  private bloomCtx: CanvasRenderingContext2D | null = null;
  private shadowCanvas: HTMLCanvasElement | null = null;
  private shadowCtx: CanvasRenderingContext2D | null = null;

  private width = 1280;
  private height = 720;
  private dpr = 1;
  private lastTime = 0;

  private camera = new Camera();
  private environment = new EnvironmentRenderer();
  private effects = new EffectsSystem();
  private viewHook: ViewTransformHook | null = null;
  private aimTarget: Vec2 | null = null;
  private latestState: Readonly<GameState> | null = null;

  private visibilityAlpha = new Map<string, number>();
  private baseFlash = { player: 0, enemy: 0 };
  private unsubscribers: Array<() => void> = [];

  private options: RendererOptions = {
    quality: 'high',
    screenShakeScale: 1,
    colorblindAssist: false,
    reducedMotion: false,
  };

  init(canvas: HTMLCanvasElement): void {
    this.destroy();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    if (typeof document !== 'undefined') {
      this.bloomCanvas = document.createElement('canvas');
      this.bloomCtx = this.bloomCanvas.getContext('2d');
      this.shadowCanvas = document.createElement('canvas');
      this.shadowCtx = this.shadowCanvas.getContext('2d');
    }

    this.resize();
    this.bindEvents();
  }

  setViewTransform(hook: ViewTransformHook): void {
    this.viewHook = hook;
  }

  setAimTarget(worldPos: Vec2 | null): void {
    this.aimTarget = worldPos;
  }

  setOptions(next: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...next };
  }

  resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width || window.innerWidth || 1280));
    const h = Math.max(240, Math.floor(rect.height || window.innerHeight || 720));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    this.width = w;
    this.height = h;
    this.dpr = dpr;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);

    if (this.bloomCanvas) {
      this.bloomCanvas.width = Math.max(160, Math.floor(w * 0.35));
      this.bloomCanvas.height = Math.max(120, Math.floor(h * 0.35));
    }
    if (this.shadowCanvas) {
      this.shadowCanvas.width = Math.floor(w * 0.5);
      this.shadowCanvas.height = Math.floor(h * 0.5);
    }
  }

  draw(state: Readonly<GameState>, _alpha = 1): void {
    const ctx = this.ctx;
    if (!ctx) return;

    this.latestState = state;
    const dt =
      this.lastTime > 0
        ? Math.min(0.05, Math.max(0.001, state.time - this.lastTime))
        : 1 / 60;
    this.lastTime = state.time;

    const player = state.units.find((u) => u.id === state.playerId);
    const focusPos = player
      ? player.pos
      : {
          x: (state.map.width * state.map.tileSize) * 0.5,
          y: (state.map.height * state.map.tileSize) * 0.5,
        };

    let aimDir: Vec2 = { x: 0, y: 0 };
    if (player) {
      if (this.aimTarget) {
        const dx = this.aimTarget.x - player.pos.x;
        const dy = this.aimTarget.y - player.pos.y;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          const factor = Math.min(1, len / 280);
          aimDir = { x: (dx / len) * factor, y: (dy / len) * factor };
        }
      } else {
        aimDir = { x: Math.cos(player.angle) * 0.65, y: Math.sin(player.angle) * 0.65 };
      }
    }

    this.camera.update(focusPos, aimDir, dt);
    const vt = this.camera.getTransform(
      this.width,
      this.height,
      this.dpr,
      this.options.screenShakeScale,
      this.options.reducedMotion,
    );
    this.viewHook?.(vt);

    // Update enemy line-of-sight fade & base flashes
    this.baseFlash.player = Math.max(0, this.baseFlash.player - dt * 4);
    this.baseFlash.enemy = Math.max(0, this.baseFlash.enemy - dt * 4);
    this.effects.update(dt, state.projectiles);

    for (const unit of state.units) {
      if (unit.team === 'player' || !player || player.dead) {
        this.visibilityAlpha.set(unit.id, 1);
      } else {
        const visible = hasLineOfSight(state.map, player.pos, unit.pos);
        const cur = this.visibilityAlpha.get(unit.id) ?? 1;
        const target = visible ? 1 : 0.08;
        this.visibilityAlpha.set(unit.id, cur + (target - cur) * (1 - Math.exp(-12 * dt)));
      }
    }

    // Clear screen
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply camera transform
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.5);
    if (vt.shakeAngle !== 0) ctx.rotate(vt.shakeAngle);
    ctx.scale(vt.zoom, vt.zoom);
    ctx.translate(-vt.camX, -vt.camY);

    const viewHalfW = (this.width * 0.5) / vt.zoom + 64;
    const viewHalfH = (this.height * 0.5) / vt.zoom + 64;
    const minX = vt.camX - viewHalfW;
    const minY = vt.camY - viewHalfH;
    const maxX = vt.camX + viewHalfW;
    const maxY = vt.camY + viewHalfH;

    this.environment.drawMap(ctx, state.map, state.time, minX, minY, maxX, maxY);
    this.effects.drawScorchDecals(ctx);
    this.environment.drawZonesAndBases(ctx, state, this.baseFlash);
    this.environment.drawPickups(ctx, state.pickups, state.time);
    this.effects.drawProjectiles(ctx, state.projectiles);
    drawUnits(
      ctx,
      state.units,
      this.visibilityAlpha,
      this.effects.unitHitFlash,
      state.time,
      this.options.colorblindAssist,
    );
    this.effects.drawForegroundEffects(ctx);

    ctx.restore();

    // Dynamic shadow / visibility polygon pass (med & high quality)
    if (this.options.quality !== 'low' && player && !player.dead) {
      this.drawLightingOverlay(ctx, state, player.pos, vt.camX, vt.camY, vt.zoom);
    }

    // Bloom pass via offscreen compositing (high quality)
    if (this.options.quality === 'high' && this.bloomCanvas && this.bloomCtx) {
      this.drawBloomPass(ctx);
    }

    // Vignette + low-HP subtle danger pulse
    this.drawVignette(ctx, player ? player.hp / Math.max(1, player.maxHp) : 1, state.time);
  }

  destroy(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
    this.effects.clear();
    this.visibilityAlpha.clear();
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      bus.on('shot', ({ unitId, weaponId, pos, angle }) => {
        const def = WEAPON_DEFS[weaponId];
        const heavy = weaponId === 'shotgun' || weaponId === 'sniper' || weaponId === 'rocket';
        const isPlayer = this.latestState?.playerId === unitId;
        const unit = this.latestState?.units.find((u) => u.id === unitId);
        const color = teamGlowColor(unit?.team ?? 'player');

        this.effects.spawnMuzzleFlash(pos, angle, color, heavy);
        if (isPlayer) {
          this.camera.addTrauma(heavy ? 0.24 : 0.08);
          this.camera.addZoomKick(heavy ? 0.018 : 0.005);
        } else if (def.splashRadius > 0) {
          this.camera.addTrauma(0.1);
        }
      }),
      bus.on('hit', ({ targetId, damage, pos, killed }) => {
        this.effects.unitHitFlash.set(targetId, 0.11);
        const target = this.latestState?.units.find((u) => u.id === targetId);
        this.effects.spawnImpactSparks(
          pos,
          killed ? PALETTE.gold : teamGlowColor(target?.team ?? 'enemy'),
          killed ? 14 : 7,
        );
        this.effects.spawnFloatingDamage(pos, damage, killed || damage >= 50);
        if (this.latestState?.playerId === targetId) {
          this.camera.addTrauma(Math.min(0.45, 0.14 + damage / 180));
        }
      }),
      bus.on('kill', ({ victimId }) => {
        const victim = this.latestState?.units.find((u) => u.id === victimId);
        if (victim) {
          this.effects.spawnDeathDissolve(victim.pos, teamGlowColor(victim.team));
        }
      }),
      bus.on('explosion', ({ pos, radius }) => {
        this.effects.spawnExplosion(pos, radius);
        this.camera.addTrauma(0.48);
        this.camera.addZoomKick(0.024);
      }),
      bus.on('cover:destroyed', ({ tile }) => {
        const [colStr, rowStr] = tile.split(',');
        const ts = this.latestState?.map.tileSize ?? 32;
        const pos = {
          x: (Number(colStr) + 0.5) * ts,
          y: (Number(rowStr) + 0.5) * ts,
        };
        this.effects.spawnImpactSparks(pos, PALETTE.wallEdge, 14);
      }),
      bus.on('zone:captured', ({ zoneId, team }) => {
        const z = this.latestState?.map.zones.find((item) => item.id === zoneId);
        if (z) {
          this.effects.spawnZoneBeam(z.center, teamColor(team));
        }
      }),
      bus.on('pickup:collected', ({ unitId, weaponId }) => {
        const u = this.latestState?.units.find((unit) => unit.id === unitId);
        if (u) {
          const def = WEAPON_DEFS[weaponId];
          this.effects.spawnImpactSparks(
            u.pos,
            def.rarity === 'epic'
              ? PALETTE.epic
              : def.rarity === 'rare'
                ? PALETTE.rare
                : PALETTE.common,
            10,
          );
        }
      }),
      bus.on('base:damaged', ({ team }) => {
        this.baseFlash[team] = 1;
        this.camera.addTrauma(0.18);
      }),
      bus.on('match:start', () => {
        this.effects.clear();
        this.visibilityAlpha.clear();
        this.lastTime = 0;
      }),
    );
  }

  private drawLightingOverlay(
    ctx: CanvasRenderingContext2D,
    state: Readonly<GameState>,
    playerPos: Vec2,
    camX: number,
    camY: number,
    zoom: number,
  ): void {
    const sc = this.shadowCanvas;
    const sctx = this.shadowCtx;
    if (!sc || !sctx) return;

    const poly = computeVisibilityPolygon(state.map, playerPos, 680, 64);
    const sx = sc.width / this.width;
    const sy = sc.height / this.height;

    sctx.save();
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, sc.width, sc.height);
    sctx.fillStyle = 'rgba(7, 11, 20, 0.44)';
    sctx.fillRect(0, 0, sc.width, sc.height);

    sctx.globalCompositeOperation = 'destination-out';
    sctx.translate(sc.width * 0.5, sc.height * 0.5);
    sctx.scale(zoom * sx, zoom * sy);
    sctx.translate(-camX, -camY);

    if (poly.length > 2) {
      sctx.beginPath();
      sctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i += 1) {
        sctx.lineTo(poly[i].x, poly[i].y);
      }
      sctx.closePath();
      const grad = sctx.createRadialGradient(
        playerPos.x,
        playerPos.y,
        90,
        playerPos.x,
        playerPos.y,
        660,
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.88)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      sctx.fillStyle = grad;
      sctx.fill();
    }
    sctx.restore();

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(sc, 0, 0, this.width, this.height);
    ctx.restore();
  }

  private drawBloomPass(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.bloomCanvas || !this.bloomCtx) return;
    this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
    this.bloomCtx.filter = 'blur(4px) brightness(1.15)';
    this.bloomCtx.drawImage(
      this.canvas,
      0,
      0,
      this.bloomCanvas.width,
      this.bloomCanvas.height,
    );
    this.bloomCtx.filter = 'none';

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(this.bloomCanvas, 0, 0, this.width, this.height);
    ctx.restore();
  }

  private drawVignette(
    ctx: CanvasRenderingContext2D,
    hpRatio: number,
    time: number,
  ): void {
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const outerR = Math.hypot(this.width, this.height) * 0.56;
    const grad = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.5,
      outerR * 0.48,
      this.width * 0.5,
      this.height * 0.5,
      outerR,
    );
    grad.addColorStop(0, 'transparent');
    if (hpRatio < 0.3) {
      const pulse = 0.28 + 0.14 * Math.sin(time * 7);
      grad.addColorStop(1, `rgba(244, 63, 94, ${pulse.toFixed(2)})`);
    } else {
      grad.addColorStop(1, 'rgba(7, 11, 20, 0.58)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }
}
