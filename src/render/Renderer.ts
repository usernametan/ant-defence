import { WEAPON_DEFS } from '../shared/api';
import { bus } from '../shared/events';
import type {
  GameState,
  Grenade,
  HellcellBoss,
  HellcellState,
  MapTheme,
  Projectile,
  Unit,
  Vec2,
} from '../shared/types';
import { Camera } from './camera';
import type { ViewTransformHook } from './camera';
import {
  AutoQualityController,
  dprCapForQuality,
  type RenderQuality,
  type RenderQualitySetting,
} from './autoQuality';
import { EffectsSystem } from './effects';
import { EnvironmentRenderer } from './environment';
import { drawHellcellEntities, drawHellcellGroundLayer } from './hellcell';
import { PoseHistory, type Pose } from './interpolation';
import { PALETTE, getThemePalette, teamColor, teamGlowColor } from './palette';
import { perfMonitor } from './perf';
import { drawUnitBody, drawUnitOverlay } from './units';
import {
  VisibilityPolygonCache,
  hasLineOfSight,
} from './visibility';

export type { RenderQuality, RenderQualitySetting } from './autoQuality';

export interface RendererOptions {
  quality: RenderQualitySetting;
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
  private lastPerfMs = 0;
  private visualTime = 0;
  private readonly poseHistory = new PoseHistory();
  private readonly tempPose: Pose = { x: 0, y: 0, angle: 0 };

  private camera = new Camera();
  private environment = new EnvironmentRenderer();
  private effects = new EffectsSystem();
  private viewHook: ViewTransformHook | null = null;
  private aimTarget: Vec2 | null = null;
  private scoped = false;
  private scopeBlend = 0;
  private latestState: Readonly<GameState> | null = null;

  private visibilityAlpha = new Map<string, number>();
  private readonly unitLosState = new Map<string, { visible: boolean; nextCheckAt: number }>();
  private readonly visibilityCache = new VisibilityPolygonCache();
  private shadowMaskGrad: CanvasGradient | null = null;
  private vignetteGrads: {
    normal: CanvasGradient;
    scoped: CanvasGradient;
    lowHp: CanvasGradient;
    hellcell: CanvasGradient;
  } | null = null;
  private baseFlash = { player: 0, enemy: 0 };
  private lastBoss: HellcellBoss | null = null;
  private bossShutdown: { boss: HellcellBoss; elapsed: number; duration: number } | null = null;
  private unsubscribers: Array<() => void> = [];

  private readonly autoQuality = new AutoQualityController();
  private bloomFrame = 0;

  // Reusable per-frame pools to keep draw() allocation-free
  private readonly viewBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  private readonly renderUnitsPool: Unit[] = [];
  private readonly renderUnitSlots: Array<Unit & { pos: Vec2 }> = [];
  private readonly renderProjectilesPool: Projectile[] = [];
  private readonly renderProjSlots: Array<Projectile & { pos: Vec2 }> = [];
  private readonly renderGrenadesPool: Grenade[] = [];
  private readonly renderGrenadeSlots: Array<Grenade & { pos: Vec2 }> = [];
  private readonly lastBossCoachesPool: Array<{ pos: Vec2; angle: number }> = [];
  private readonly interpCoachesPool: Array<{ pos: Vec2; angle: number }> = [];
  private interpBossSlot: (HellcellBoss & { pos: Vec2 }) | null = null;
  private interpTrainStateSlot: NonNullable<HellcellBoss['trainState']> | null = null;
  private interpHellcellSlot: HellcellState | null = null;

  private options: RendererOptions = {
    quality: 'auto',
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
      if (this.shadowCtx) {
        const sg = this.shadowCtx.createRadialGradient(0, 0, 90, 0, 0, 660);
        sg.addColorStop(0, 'rgba(0, 0, 0, 1)');
        sg.addColorStop(0.75, 'rgba(0, 0, 0, 0.88)');
        sg.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        this.shadowMaskGrad = sg;
      }
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

  setScoped(scoped: boolean): void {
    this.scoped = scoped;
  }

  setOptions(next: Partial<RendererOptions>): void {
    const prevQuality = this.autoQuality.getActiveQuality();
    this.options = { ...this.options, ...next };
    if (next.quality !== undefined) {
      const nextActive = this.autoQuality.setSetting(next.quality);
      perfMonitor.setEffectiveQuality(nextActive);
      if (nextActive !== prevQuality) {
        this.resize();
      }
    }
  }

  getEffectiveQuality(): RenderQuality {
    return this.autoQuality.getActiveQuality();
  }

  resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width || window.innerWidth || 1280));
    const h = Math.max(240, Math.floor(rect.height || window.innerHeight || 720));
    const effQuality = this.autoQuality.getActiveQuality();
    const dpr = Math.min(dprCapForQuality(effQuality), window.devicePixelRatio || 1);

    this.width = w;
    this.height = h;
    this.dpr = dpr;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);

    if (this.bloomCanvas) {
      this.bloomCanvas.width = Math.max(80, Math.floor(w / 8));
      this.bloomCanvas.height = Math.max(45, Math.floor(h / 8));
    }
    if (this.shadowCanvas) {
      this.shadowCanvas.width = Math.floor(w * 0.5);
      this.shadowCanvas.height = Math.floor(h * 0.5);
    }

    if (this.ctx) {
      const makeVigGrad = (innerFactor: number, outerFactor: number, edgeColor: string): CanvasGradient => {
        const outerR = Math.hypot(w, h) * outerFactor;
        const g = this.ctx!.createRadialGradient(
          w * 0.5,
          h * 0.5,
          outerR * innerFactor,
          w * 0.5,
          h * 0.5,
          outerR,
        );
        g.addColorStop(0, 'transparent');
        g.addColorStop(1, edgeColor);
        return g;
      };
      this.vignetteGrads = {
        normal: makeVigGrad(0.48, 0.56, 'rgba(7, 11, 20, 0.58)'),
        scoped: makeVigGrad(0.4, 0.51, 'rgba(7, 11, 20, 0.76)'),
        lowHp: makeVigGrad(0.48, 0.56, 'rgba(244, 63, 94, 0.42)'),
        hellcell: makeVigGrad(0.48, 0.56, 'rgba(185, 28, 28, 0.30)'),
      };
    }
  }

  draw(state: Readonly<GameState>, alpha = 1, frameDtSeconds?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    this.latestState = state;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
    const rawDt =
      frameDtSeconds !== undefined
        ? frameDtSeconds
        : this.lastPerfMs > 0
          ? (nowMs - this.lastPerfMs) / 1000
          : 1 / 60;
    this.lastPerfMs = nowMs;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    this.visualTime += dt;

    if (state.status === 'playing' && this.autoQuality.recordFrame(rawDt * 1000, dt)) {
      perfMonitor.setEffectiveQuality(this.autoQuality.getActiveQuality());
      this.resize();
    }
    const effQuality = this.autoQuality.getActiveQuality();

    this.poseHistory.syncTick(state);
    const interpAlpha = Math.max(0, Math.min(1, alpha));

    const player = state.units.find((u) => u.id === state.playerId);
    const focusPose: Vec2 = player
      ? this.poseHistory.resolve(player.id, player.pos.x, player.pos.y, player.angle, interpAlpha)
      : {
          x: (state.map.width * state.map.tileSize) * 0.5,
          y: (state.map.height * state.map.tileSize) * 0.5,
        };

    let aimDir: Vec2 = { x: 0, y: 0 };
    if (player) {
      if (this.aimTarget) {
        const dx = this.aimTarget.x - focusPose.x;
        const dy = this.aimTarget.y - focusPose.y;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          const factor = Math.min(1, len / 280);
          aimDir = { x: (dx / len) * factor, y: (dy / len) * factor };
        }
      } else {
        aimDir = { x: Math.cos(player.angle) * 0.65, y: Math.sin(player.angle) * 0.65 };
      }
    }

    const activeScope = this.scoped && Boolean(player && !player.dead) && state.status === 'playing';
    this.camera.setScoped(activeScope);
    this.scopeBlend += ((activeScope ? 1 : 0) - this.scopeBlend) * (1 - Math.exp(-12 * dt));

    this.camera.update(focusPose, aimDir, dt, activeScope ? 112 : 72);
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
    this.effects.update(dt, state.projectiles, state.map);

    const isRampage = state.matchConfig.mode === 'rampage';
    const visBlend = 1 - Math.exp(-12 * dt);
    for (let i = 0; i < state.units.length; i += 1) {
      const unit = state.units[i];
      if (unit.isPlayer || (!isRampage && unit.team === 'player') || !player || player.dead) {
        this.visibilityAlpha.set(unit.id, 1);
      } else {
        let entry = this.unitLosState.get(unit.id);
        if (!entry) {
          entry = {
            visible: hasLineOfSight(state.map, focusPose, unit.pos),
            nextCheckAt: this.visualTime + 0.1 + ((i * 0.017) % 0.1),
          };
          this.unitLosState.set(unit.id, entry);
        } else if (this.visualTime >= entry.nextCheckAt) {
          entry.visible = hasLineOfSight(state.map, focusPose, unit.pos);
          entry.nextCheckAt = this.visualTime + 0.1;
        }
        const cur = this.visibilityAlpha.get(unit.id) ?? 1;
        const target = entry.visible ? 1 : 0.08;
        this.visibilityAlpha.set(unit.id, cur + (target - cur) * visBlend);
      }
    }

    // Clear screen with theme void backdrop
    const themePal = getThemePalette(state.map.theme);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = themePal.bgVoid;
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
    this.viewBounds.minX = minX;
    this.viewBounds.minY = minY;
    this.viewBounds.maxX = maxX;
    this.viewBounds.maxY = maxY;

    this.environment.drawGroundAndShadows(ctx, state.map, state.time, minX, minY, maxX, maxY);
    this.effects.drawScorchDecals(ctx, this.viewBounds);
    this.environment.drawZonesAndBases(ctx, state, this.baseFlash);
    const zoneBCenter =
      state.map.zones.find((z) => z.id === 'zone-2' || z.id === 'B')?.center ??
      state.map.zones[1]?.center;
    drawHellcellGroundLayer(
      ctx,
      state.hellcell,
      state.map.tileSize,
      state.time,
      zoneBCenter,
      this.viewBounds,
    );

    this.environment.drawDepthSortedStructures(
      ctx,
      state.map,
      state.time,
      minX,
      minY,
      maxX,
      maxY,
    );

    for (let i = 0; i < state.pickups.length; i += 1) {
      const pickup = state.pickups[i];
      if (
        pickup.pos.x + 40 < minX ||
        pickup.pos.x - 40 > maxX ||
        pickup.pos.y + 40 < minY ||
        pickup.pos.y - 40 > maxY
      ) {
        continue;
      }
      this.environment.drawSinglePickup(ctx, pickup, state.time);
    }

    const shouldInterp = interpAlpha < 0.999;
    const livingVisible = this.renderUnitsPool;
    livingVisible.length = 0;
    for (let i = 0; i < state.units.length; i += 1) {
      const u = state.units[i];
      if (u.dead || (this.visibilityAlpha.get(u.id) ?? 1) <= 0.02) continue;
      if (
        u.pos.x + 48 < minX ||
        u.pos.x - 48 > maxX ||
        u.pos.y + 48 < minY ||
        u.pos.y - 48 > maxY
      ) {
        continue;
      }
      if (shouldInterp) {
        this.poseHistory.resolve(u.id, u.pos.x, u.pos.y, u.angle, interpAlpha, this.tempPose);
        const slotIdx = livingVisible.length;
        let slot = this.renderUnitSlots[slotIdx];
        if (!slot) {
          slot = { ...u, pos: { x: this.tempPose.x, y: this.tempPose.y }, angle: this.tempPose.angle };
          this.renderUnitSlots[slotIdx] = slot;
        } else {
          const posObj = slot.pos;
          Object.assign(slot, u);
          posObj.x = this.tempPose.x;
          posObj.y = this.tempPose.y;
          slot.pos = posObj;
          slot.angle = this.tempPose.angle;
        }
        livingVisible.push(slot);
      } else {
        livingVisible.push(u);
      }
    }
    livingVisible.sort((a, b) => a.pos.y - b.pos.y);

    for (let i = 0; i < livingVisible.length; i += 1) {
      const unit = livingVisible[i];
      const vis = this.visibilityAlpha.get(unit.id) ?? 1;
      const flash = (this.effects.unitHitFlash.get(unit.id) ?? 0) > 0;
      drawUnitBody(ctx, unit, vis, flash, state.time, isRampage);
    }

    const activeBoss = state.hellcell?.boss;
    if (activeBoss && activeBoss.hp > 0) {
      this.syncLastBoss(activeBoss);
    }
    if (this.bossShutdown) {
      this.bossShutdown.elapsed += dt;
      if (this.bossShutdown.elapsed >= this.bossShutdown.duration) {
        this.bossShutdown = null;
      }
    }

    let renderHellcell: Readonly<HellcellState> | undefined = state.hellcell;
    if (shouldInterp && activeBoss && activeBoss.hp > 0 && state.hellcell) {
      renderHellcell = this.buildInterpolatedHellcell(state.hellcell, activeBoss, interpAlpha);
    }

    const bossHitFlash = activeBoss ? (this.effects.unitHitFlash.get(activeBoss.id) ?? 0) : 0;
    const shutdownBoss = this.bossShutdown
      ? {
          boss: this.bossShutdown.boss,
          progress: this.bossShutdown.elapsed / this.bossShutdown.duration,
        }
      : null;

    drawHellcellEntities(ctx, renderHellcell, state.time, {
      bossHitFlash: bossHitFlash > 0 ? Math.min(1, bossHitFlash / 0.11) : 0,
      shutdownBoss,
      view: this.viewBounds,
    });
    const renderProjectiles = this.renderProjectilesPool;
    renderProjectiles.length = 0;
    for (let i = 0; i < state.projectiles.length; i += 1) {
      const p = state.projectiles[i];
      if (
        p.pos.x + 64 < minX ||
        p.pos.x - 64 > maxX ||
        p.pos.y + 64 < minY ||
        p.pos.y - 64 > maxY
      ) {
        continue;
      }
      if (shouldInterp) {
        this.poseHistory.resolve(p.id, p.pos.x, p.pos.y, 0, interpAlpha, this.tempPose);
        const slotIdx = renderProjectiles.length;
        let slot = this.renderProjSlots[slotIdx];
        if (!slot) {
          slot = { ...p, pos: { x: this.tempPose.x, y: this.tempPose.y } };
          this.renderProjSlots[slotIdx] = slot;
        } else {
          const posObj = slot.pos;
          Object.assign(slot, p);
          posObj.x = this.tempPose.x;
          posObj.y = this.tempPose.y;
          slot.pos = posObj;
        }
        renderProjectiles.push(slot);
      } else {
        renderProjectiles.push(p);
      }
    }

    const rawGrenades = state.grenades ?? [];
    const renderGrenades = this.renderGrenadesPool;
    renderGrenades.length = 0;
    for (let i = 0; i < rawGrenades.length; i += 1) {
      const g = rawGrenades[i];
      if (
        g.pos.x + 64 < minX ||
        g.pos.x - 64 > maxX ||
        g.pos.y + 64 < minY ||
        g.pos.y - 64 > maxY
      ) {
        continue;
      }
      if (shouldInterp) {
        this.poseHistory.resolve(g.id, g.pos.x, g.pos.y, 0, interpAlpha, this.tempPose);
        const slotIdx = renderGrenades.length;
        let slot = this.renderGrenadeSlots[slotIdx];
        if (!slot) {
          slot = { ...g, pos: { x: this.tempPose.x, y: this.tempPose.y } };
          this.renderGrenadeSlots[slotIdx] = slot;
        } else {
          const posObj = slot.pos;
          Object.assign(slot, g);
          posObj.x = this.tempPose.x;
          posObj.y = this.tempPose.y;
          slot.pos = posObj;
        }
        renderGrenades.push(slot);
      } else {
        renderGrenades.push(g);
      }
    }

    this.effects.drawProjectiles(ctx, renderProjectiles);
    this.effects.drawGrenades(ctx, renderGrenades, state.time);
    for (let i = 0; i < livingVisible.length; i += 1) {
      const unit = livingVisible[i];
      const vis = this.visibilityAlpha.get(unit.id) ?? 1;
      drawUnitOverlay(ctx, unit, vis, this.options.colorblindAssist, isRampage);
    }
    this.effects.drawForegroundEffects(ctx, this.viewBounds);
    if (effQuality !== 'low' && !this.options.reducedMotion) {
      this.drawAmbientMotes(ctx, state.map.theme ?? 'fortress', minX, minY, maxX, maxY, this.visualTime);
    }

    ctx.restore();

    // Dynamic shadow / visibility polygon pass (subtle tactical fog so arena stays crisp)
    if (effQuality !== 'low' && player && !player.dead) {
      this.drawLightingOverlay(ctx, state, focusPose, vt.camX, vt.camY, vt.zoom, effQuality);
    }

    // Bloom pass via 1/8 bilinear downsampled compositing (high quality, every 2nd frame)
    if (effQuality === 'high' && this.bloomCanvas && this.bloomCtx) {
      this.drawBloomPass(ctx);
    }

    if (effQuality !== 'low') {
      this.environment.drawThemeAtmosphere(
        ctx,
        state.map.theme ?? 'fortress',
        this.width,
        this.height,
        state.time,
        this.options.reducedMotion,
      );
    }

    // Vignette + low-HP subtle danger pulse + Hellcell boss atmosphere + tactical scope focus
    this.drawVignette(
      ctx,
      player ? player.hp / Math.max(1, player.maxHp) : 1,
      this.visualTime,
      Boolean(state.hellcell?.isCeasefireActive),
      this.scopeBlend,
    );
  }

  destroy(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
    this.effects.clear();
    this.visibilityAlpha.clear();
    this.unitLosState.clear();
    this.visibilityCache.clear();
    this.poseHistory.clear();
    this.lastBoss = null;
    this.bossShutdown = null;
  }

  private syncLastBoss(activeBoss: Readonly<HellcellBoss>): void {
    if (!this.lastBoss || this.lastBoss.id !== activeBoss.id) {
      this.lastBossCoachesPool.length = 0;
      if (activeBoss.trainState) {
        for (let i = 0; i < activeBoss.trainState.coaches.length; i += 1) {
          const c = activeBoss.trainState.coaches[i];
          this.lastBossCoachesPool.push({ pos: { x: c.pos.x, y: c.pos.y }, angle: c.angle });
        }
      }
      this.lastBoss = {
        ...activeBoss,
        pos: { x: activeBoss.pos.x, y: activeBoss.pos.y },
        trainState: activeBoss.trainState
          ? {
              ...activeBoss.trainState,
              coaches: this.lastBossCoachesPool,
            }
          : undefined,
      };
      return;
    }

    const posObj = this.lastBoss.pos;
    Object.assign(this.lastBoss, activeBoss);
    posObj.x = activeBoss.pos.x;
    posObj.y = activeBoss.pos.y;
    this.lastBoss.pos = posObj;

    if (activeBoss.trainState) {
      const srcCoaches = activeBoss.trainState.coaches;
      for (let i = 0; i < srcCoaches.length; i += 1) {
        const sc = srcCoaches[i];
        let dst = this.lastBossCoachesPool[i];
        if (!dst) {
          dst = { pos: { x: sc.pos.x, y: sc.pos.y }, angle: sc.angle };
          this.lastBossCoachesPool[i] = dst;
        } else {
          dst.pos.x = sc.pos.x;
          dst.pos.y = sc.pos.y;
          dst.angle = sc.angle;
        }
      }
      this.lastBossCoachesPool.length = srcCoaches.length;
      if (!this.lastBoss.trainState) {
        this.lastBoss.trainState = {
          ...activeBoss.trainState,
          coaches: this.lastBossCoachesPool,
        };
      } else {
        Object.assign(this.lastBoss.trainState, activeBoss.trainState);
        this.lastBoss.trainState.coaches = this.lastBossCoachesPool;
      }
    } else {
      this.lastBoss.trainState = undefined;
    }
  }

  private buildInterpolatedHellcell(
    hellcell: Readonly<HellcellState>,
    activeBoss: Readonly<HellcellBoss>,
    interpAlpha: number,
  ): Readonly<HellcellState> {
    this.poseHistory.resolve(
      activeBoss.id,
      activeBoss.pos.x,
      activeBoss.pos.y,
      activeBoss.angle,
      interpAlpha,
      this.tempPose,
    );

    if (!this.interpBossSlot) {
      this.interpBossSlot = {
        ...activeBoss,
        pos: { x: this.tempPose.x, y: this.tempPose.y },
        angle: this.tempPose.angle,
      };
    } else {
      const posObj = this.interpBossSlot.pos;
      Object.assign(this.interpBossSlot, activeBoss);
      posObj.x = this.tempPose.x;
      posObj.y = this.tempPose.y;
      this.interpBossSlot.pos = posObj;
      this.interpBossSlot.angle = this.tempPose.angle;
    }

    if (activeBoss.trainState) {
      const srcCoaches = activeBoss.trainState.coaches;
      for (let i = 0; i < srcCoaches.length; i += 1) {
        const c = srcCoaches[i];
        this.poseHistory.resolve(`train-coach-${i}`, c.pos.x, c.pos.y, c.angle, interpAlpha, this.tempPose);
        let dst = this.interpCoachesPool[i];
        if (!dst) {
          dst = { pos: { x: this.tempPose.x, y: this.tempPose.y }, angle: this.tempPose.angle };
          this.interpCoachesPool[i] = dst;
        } else {
          dst.pos.x = this.tempPose.x;
          dst.pos.y = this.tempPose.y;
          dst.angle = this.tempPose.angle;
        }
      }
      this.interpCoachesPool.length = srcCoaches.length;
      if (!this.interpTrainStateSlot) {
        this.interpTrainStateSlot = {
          ...activeBoss.trainState,
          coaches: this.interpCoachesPool,
        };
      } else {
        Object.assign(this.interpTrainStateSlot, activeBoss.trainState);
        this.interpTrainStateSlot.coaches = this.interpCoachesPool;
      }
      this.interpBossSlot.trainState = this.interpTrainStateSlot;
    } else {
      this.interpBossSlot.trainState = undefined;
    }

    if (!this.interpHellcellSlot) {
      this.interpHellcellSlot = { ...hellcell, boss: this.interpBossSlot };
    } else {
      Object.assign(this.interpHellcellSlot, hellcell);
      this.interpHellcellSlot.boss = this.interpBossSlot;
    }
    return this.interpHellcellSlot;
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      bus.on('shot', ({ unitId, weaponId, pos, angle }) => {
        const def = WEAPON_DEFS[weaponId];
        const heavy = weaponId === 'shotgun' || weaponId === 'sniper' || weaponId === 'rocket';
        const isPlayer = this.latestState?.playerId === unitId;
        const unit = this.latestState?.units.find((u) => u.id === unitId);
        const rampage = this.latestState?.matchConfig.mode === 'rampage';
        const color = rampage
          ? unit?.isPlayer
            ? '#FFFFFF'
            : '#9CA3AF'
          : teamGlowColor(unit?.team ?? 'player');

        this.effects.spawnMuzzleFlash(pos, angle, color, heavy);
        this.effects.spawnShellCasing(pos, angle, weaponId);
        if (isPlayer) {
          this.camera.addTrauma(heavy ? 0.1 : 0.03);
          this.camera.addZoomKick(heavy ? 0.007 : 0.002);
        } else if (def.splashRadius > 0) {
          this.camera.addTrauma(0.035);
        }
      }),
      bus.on('hit', ({ targetId, damage, pos, killed }) => {
        this.effects.unitHitFlash.set(targetId, 0.11);
        const isBoss = targetId === 'hellcell-boss';
        const bossKind = this.latestState?.hellcell?.boss?.kind;
        const target = this.latestState?.units.find((u) => u.id === targetId);
        const rampage = this.latestState?.matchConfig.mode === 'rampage';
        const sparkColor = isBoss
          ? bossKind === 'venomCobra'
            ? killed
              ? '#8CE06C'
              : '#9BB076'
            : bossKind === 'pharaohSkeleton'
              ? killed
                ? '#2DD4BF'
                : '#D4B475'
              : bossKind === 'mumbaiTrain'
                ? killed
                  ? '#F59E0B'
                  : '#CBD5E1'
                : killed
                  ? '#FB923C'
                  : '#CBD5E1'
          : rampage
            ? target?.isPlayer
              ? '#FFFFFF'
              : '#9CA3AF'
            : teamGlowColor(target?.team ?? 'enemy');
        this.effects.spawnImpactSparks(
          pos,
          killed ? PALETTE.gold : sparkColor,
          killed ? 14 : isBoss ? 5 : 7,
        );
        this.effects.spawnFloatingDamage(pos, damage, killed || damage >= 50);
        if (this.latestState?.playerId === targetId) {
          this.camera.addTrauma(Math.min(0.18, 0.06 + damage / 360));
        }
      }),
      bus.on('kill', ({ victimId }) => {
        const victim = this.latestState?.units.find((u) => u.id === victimId);
        if (victim) {
          const rampage = this.latestState?.matchConfig.mode === 'rampage';
          const dissolveColor = rampage
            ? victim.isPlayer
              ? '#FFFFFF'
              : '#1F2937'
            : teamGlowColor(victim.team);
          this.effects.spawnDeathDissolve(victim.pos, dissolveColor);
        }
      }),
      bus.on('explosion', ({ pos, radius }) => {
        this.effects.spawnExplosion(pos, radius);
        const listener = this.latestState?.units.find((u) => u.id === this.latestState?.playerId)?.pos;
        const dist = listener ? Math.hypot(pos.x - listener.x, pos.y - listener.y) : 0;
        const falloff = Math.max(0.2, 1 - dist / 760);
        this.camera.addTrauma(0.18 * falloff);
        this.camera.addZoomKick(0.007 * falloff);
      }),
      bus.on('cover:damaged', ({ tile }) => {
        const [colStr, rowStr] = tile.split(',');
        const ts = this.latestState?.map.tileSize ?? 32;
        const pos = {
          x: (Number(colStr) + 0.5) * ts,
          y: (Number(rowStr) + 0.5) * ts,
        };
        this.effects.spawnImpactSparks(
          pos,
          getThemePalette(this.latestState?.map.theme).crateTrim,
          5,
        );
      }),
      bus.on('cover:destroyed', ({ tile }) => {
        if (this.latestState?.map) {
          this.environment.markDirtyTile(tile, this.latestState.map);
        }
        const [colStr, rowStr] = tile.split(',');
        const ts = this.latestState?.map.tileSize ?? 32;
        const pos = {
          x: (Number(colStr) + 0.5) * ts,
          y: (Number(rowStr) + 0.5) * ts,
        };
        this.effects.spawnImpactSparks(
          pos,
          getThemePalette(this.latestState?.map.theme).wallEdge,
          14,
        );
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
        this.camera.addTrauma(0.06);
      }),
      bus.on('hellcell:start', ({ boss }) => {
        this.bossShutdown = null;
        this.lastBoss = { ...boss, pos: { ...boss.pos } };
        this.effects.spawnZoneBeam(boss.pos, PALETTE.danger);
        this.camera.addTrauma(0.2);
      }),
      bus.on('hellcell:defeated', () => {
        if (this.lastBoss) {
          this.bossShutdown = {
            boss: { ...this.lastBoss, hp: 0 },
            elapsed: 0,
            duration: 1.15,
          };
          this.lastBoss = null;
        }
        this.camera.addTrauma(0.16);
      }),
      bus.on('ceasefire:spark', ({ pos }) => {
        this.effects.spawnImpactSparks(pos, '#94A3B8', 4);
      }),
      bus.on('boss:action', ({ kind, action, pos }) => {
        if (kind !== 'mumbaiTrain') return;
        if (action === 'chargeDash') {
          this.camera.addTrauma(0.08);
          this.effects.spawnImpactSparks(pos, '#F59E0B', 7);
        } else if (action === 'electricPulse') {
          this.camera.addTrauma(0.09);
          this.effects.spawnImpactSparks(pos, '#FDE047', 12);
        } else if (action === 'weakPointHit') {
          this.effects.spawnImpactSparks(pos, '#FBBF24', 8);
        }
      }),
      bus.on('match:start', () => {
        this.effects.clear();
        this.visibilityAlpha.clear();
        this.unitLosState.clear();
        this.visibilityCache.clear();
        this.poseHistory.clear();
        this.lastBoss = null;
        this.bossShutdown = null;
        this.scoped = false;
        this.scopeBlend = 0;
        this.lastPerfMs = 0;
        this.visualTime = 0;
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
    effQuality: RenderQuality,
  ): void {
    const sc = this.shadowCanvas;
    const sctx = this.shadowCtx;
    if (!sc || !sctx) return;

    const rayCount = effQuality === 'med' ? 48 : 64;
    const visStart = perfMonitor.enabled ? performance.now() : 0;
    this.visibilityCache.update(state.map, playerPos, 680, rayCount);
    if (perfMonitor.enabled) {
      perfMonitor.recordSubsystem('visibility', performance.now() - visStart);
    }
    const sx = sc.width / this.width;
    const sy = sc.height / this.height;

    sctx.save();
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, sc.width, sc.height);
    sctx.fillStyle = 'rgba(7, 11, 20, 0.24)';
    sctx.fillRect(0, 0, sc.width, sc.height);

    sctx.globalCompositeOperation = 'destination-out';
    sctx.translate(sc.width * 0.5, sc.height * 0.5);
    sctx.scale(zoom * sx, zoom * sy);
    sctx.translate(this.visibilityCache.originX - camX, this.visibilityCache.originY - camY);

    const ptCount = this.visibilityCache.pointCount;
    const pts = this.visibilityCache.relativePoints;
    if (ptCount > 2) {
      sctx.beginPath();
      sctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i < ptCount; i += 1) {
        sctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      }
      sctx.closePath();
      sctx.fillStyle = this.shadowMaskGrad ?? 'rgba(0, 0, 0, 0.9)';
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
    const bloomStart = perfMonitor.enabled ? performance.now() : 0;
    this.bloomFrame = (this.bloomFrame + 1) & 1;

    if (this.bloomFrame === 0) {
      this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
      this.bloomCtx.imageSmoothingEnabled = true;
      this.bloomCtx.imageSmoothingQuality = 'low';
      this.bloomCtx.drawImage(
        this.canvas,
        0,
        0,
        this.bloomCanvas.width,
        this.bloomCanvas.height,
      );
    }

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.2;
    ctx.drawImage(this.bloomCanvas, 0, 0, this.width, this.height);
    ctx.restore();
    if (perfMonitor.enabled) {
      perfMonitor.recordSubsystem('bloom', performance.now() - bloomStart);
    }
  }

  private drawVignette(
    ctx: CanvasRenderingContext2D,
    hpRatio: number,
    time: number,
    hellcellActive = false,
    scopeBlend = 0,
  ): void {
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.vignetteGrads) {
      if (hpRatio < 0.3) {
        const pulse = 0.28 + 0.14 * Math.sin(time * 7);
        ctx.globalAlpha = Math.min(1, pulse / 0.42);
        ctx.fillStyle = this.vignetteGrads.lowHp;
      } else if (hellcellActive) {
        const pulse = 0.22 + 0.08 * Math.sin(time * 4.5);
        ctx.globalAlpha = Math.min(1, pulse / 0.3);
        ctx.fillStyle = this.vignetteGrads.hellcell;
      } else if (scopeBlend > 0.5) {
        ctx.fillStyle = this.vignetteGrads.scoped;
      } else {
        ctx.fillStyle = this.vignetteGrads.normal;
      }
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    if (scopeBlend > 0.02) {
      const pad = 18;
      const arm = 22;
      ctx.strokeStyle = `rgba(103, 232, 249, ${(scopeBlend * 0.32).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Top-left bracket
      ctx.moveTo(pad, pad + arm);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + arm, pad);
      // Top-right bracket
      ctx.moveTo(this.width - pad - arm, pad);
      ctx.lineTo(this.width - pad, pad);
      ctx.lineTo(this.width - pad, pad + arm);
      // Bottom-left bracket
      ctx.moveTo(pad, this.height - pad - arm);
      ctx.lineTo(pad, this.height - pad);
      ctx.lineTo(pad + arm, this.height - pad);
      // Bottom-right bracket
      ctx.moveTo(this.width - pad - arm, this.height - pad);
      ctx.lineTo(this.width - pad, this.height - pad);
      ctx.lineTo(this.width - pad, this.height - pad - arm);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawAmbientMotes(
    ctx: CanvasRenderingContext2D,
    theme: MapTheme,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    time: number,
  ): void {
    const spanW = Math.max(1, maxX - minX);
    const spanH = Math.max(1, maxY - minY);
    const count = theme === 'fortress' ? 14 : theme === 'slumside' ? 20 : 26;
    ctx.save();
    for (let i = 0; i < count; i += 1) {
      const seedX = ((i * 293 + 47) % 1000) / 1000;
      const seedY = ((i * 461 + 83) % 1000) / 1000;
      const driftX =
        Math.sin(time * 0.45 + i * 1.3) * 24 +
        time * (theme === 'temple' ? 14 : theme === 'slumside' ? 11 : 7);
      const driftY = Math.cos(time * 0.55 + i * 0.9) * 16 - time * (theme === 'jungle' ? 5 : 2);
      const x = minX + (((seedX * spanW + driftX) % spanW) + spanW) % spanW;
      const y = minY + (((seedY * spanH + driftY) % spanH) + spanH) % spanH;
      const pulse = 0.28 + 0.32 * Math.sin(time * 2.4 + i * 1.7);
      ctx.globalAlpha = Math.max(0.08, pulse);
      if (theme === 'jungle') {
        ctx.fillStyle = i % 3 === 0 ? '#A3E635' : '#FACC15';
      } else if (theme === 'temple') {
        ctx.fillStyle = i % 2 === 0 ? '#FDE68A' : '#E2B45A';
      } else if (theme === 'slumside') {
        ctx.fillStyle = i % 2 === 0 ? '#FDE68A' : '#D6B485';
      } else {
        ctx.fillStyle = '#67E8F9';
      }
      ctx.beginPath();
      ctx.arc(x, y, i % 4 === 0 ? 2.2 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
