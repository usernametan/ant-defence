import React, { useEffect, useRef, useState } from 'react';
import { EnvironmentRenderer, formatZoneCode } from '../../render/environment';
import { drawHellcellEntities, drawHellcellGroundLayer } from '../../render/hellcell';
import { MAP_THEME_PALETTES, PALETTE, getThemePalette } from '../../render/palette';
import { drawUnitBody, drawUnitOverlay } from '../../render/units';
import type {
  BossKind,
  GameMode,
  GameState,
  HellcellState,
  MapData,
  MapTheme,
  Team,
  Unit,
  Vec2,
  WeaponId,
} from '../../shared/types';
import { playUiClick, playUiHover } from '../design/uiSound';
import { generatePreviewMap } from '../previewMap';

export interface BattlefieldPreviewProps {
  theme?: MapTheme;
  onThemeChange?: (theme: MapTheme) => void;
  mode?: GameMode;
  onModeChange?: (mode: GameMode) => void;
  equippedWeapon?: WeaponId;
}

export const ARENA_META: ReadonlyArray<{
  id: MapTheme;
  shortLabel: string;
  fullName: string;
}> = [
  { id: 'slumside', shortLabel: 'Slumside', fullName: 'Slumside' },
  { id: 'fortress', shortLabel: 'Sci-Fi', fullName: 'Sci-Fi Arena' },
  { id: 'jungle', shortLabel: 'Jungle', fullName: 'Jungle Outpost' },
  { id: 'temple', shortLabel: 'Temple', fullName: 'Ancient Temple' },
];

const MODE_OPTIONS: ReadonlyArray<{ id: GameMode; label: string }> = [
  { id: 'zoneControl', label: 'Zone Control' },
  { id: 'hellcell', label: 'Hellcell' },
  { id: 'rampage', label: 'Rampage' },
];

const THEME_SEEDS: Record<MapTheme, number> = {
  slumside: 4242,
  fortress: 1337,
  jungle: 5150,
  temple: 7373,
};

function isFloorTile(map: MapData, col: number, row: number): boolean {
  if (row < 2 || row >= map.height - 2 || col < 2 || col >= map.width - 2) return false;
  return map.tiles[row]?.[col] === 'floor';
}

function findNearestFloorPos(
  map: MapData,
  targetX: number,
  targetY: number,
  occupied: Vec2[],
): Vec2 {
  const ts = map.tileSize;
  const startCol = Math.floor(targetX / ts);
  const startRow = Math.floor(targetY / ts);

  for (let radius = 0; radius <= 8; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const c = startCol + dx;
        const r = startRow + dy;
        if (!isFloorTile(map, c, r)) continue;
        const candidate = { x: (c + 0.5) * ts, y: (r + 0.5) * ts };
        const tooClose = occupied.some(
          (p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) < ts * 1.4,
        );
        if (!tooClose) {
          occupied.push(candidate);
          return candidate;
        }
      }
    }
  }

  return { x: targetX, y: targetY };
}

function makePreviewUnit(
  id: string,
  name: string,
  team: Team,
  isPlayer: boolean,
  pos: Vec2,
  aimTarget: Vec2,
  weaponId: WeaponId,
  hp: number,
  kills: number,
  shield = 0,
): Unit {
  return {
    id,
    name,
    team,
    isPlayer,
    pos,
    vel: { x: 0, y: 0 },
    angle: Math.atan2(aimTarget.y - pos.y, aimTarget.x - pos.x),
    hp,
    maxHp: 100,
    shield,
    maxShield: 50,
    weaponId,
    ammoInMag: 24,
    reserveAmmo: 72,
    grenades: 2,
    grenadeCooldown: 0,
    reloading: false,
    reloadProgress: 0,
    dashCooldown: 0,
    dead: false,
    respawnIn: 0,
    kills,
    deaths: 0,
  };
}

function bossForTheme(theme: MapTheme): { kind: BossKind; name: string; subtitle?: string } {
  if (theme === 'jungle') return { kind: 'venomCobra', name: 'Jungle Centipede' };
  if (theme === 'temple') return { kind: 'pharaohSkeleton', name: 'Pharaoh' };
  if (theme === 'slumside') {
    return { kind: 'mumbaiTrain', name: 'The Last Local', subtitle: 'The Final Departure' };
  }
  return { kind: 'rocketSiegeBot', name: 'Omega Dreadnought' };
}

function buildHellcellPreview(theme: MapTheme, zoneB: Vec2, time: number): HellcellState {
  const { kind, name, subtitle } = bossForTheme(theme);
  const angle = Math.sin(time * 0.65) * 0.45 + Math.PI;
  return {
    phase: 'CEASEFIRE_BOSS',
    isCeasefireActive: true,
    hasTriggered: true,
    bossDefeated: false,
    triggerTime: 0,
    countdown: 0,
    spawnPos: zoneB,
    blueBossDamage: 480,
    redBossDamage: 420,
    boss: {
      id: 'preview-boss',
      kind,
      name,
      subtitle,
      pos: { x: zoneB.x, y: zoneB.y },
      radius: 26,
      angle,
      targetAngle: angle,
      hp: 1480,
      maxHp: 2200,
      attackTimer: 1.1,
      attackAnim: Math.max(0, Math.sin(time * 2.2) * 0.4),
    },
    reticles: [],
    acidPools: [],
    bossProjectiles: [],
    venomCone: null,
  };
}

interface PreviewScene {
  map: MapData;
  baseUnits: Unit[];
  zoneA: Vec2;
  zoneB: Vec2;
  pickups: GameState['pickups'];
  seed: number;
}

function createPreviewScene(theme: MapTheme, equippedWeapon: WeaponId): PreviewScene {
  const seed = THEME_SEEDS[theme];
  const map = generatePreviewMap(seed, theme);
  const zoneA = map.zones[0]?.center ?? { x: 512, y: 544 };
  const zoneB = map.zones[1]?.center ?? { x: 960, y: 640 };
  const occupied: Vec2[] = [];

  const playerPos = findNearestFloorPos(map, zoneB.x - 102, zoneB.y + 18, occupied);
  const ally1Pos = findNearestFloorPos(map, zoneB.x - 166, zoneB.y - 78, occupied);
  const ally2Pos = findNearestFloorPos(map, zoneA.x + 88, zoneA.y + 36, occupied);

  const enemy1Pos = findNearestFloorPos(map, zoneB.x + 92, zoneB.y - 26, occupied);
  const enemy2Pos = findNearestFloorPos(map, zoneB.x + 156, zoneB.y + 72, occupied);
  const enemy3Pos = findNearestFloorPos(map, zoneB.x + 174, zoneB.y - 104, occupied);

  const pickup1Pos = findNearestFloorPos(map, zoneB.x - 24, zoneB.y - 54, occupied);
  const pickup2Pos = findNearestFloorPos(map, zoneB.x + 28, zoneB.y + 68, occupied);

  const baseUnits: Unit[] = [
    makePreviewUnit('preview-you', 'You', 'player', true, playerPos, enemy1Pos, equippedWeapon, 100, 4, 38),
    makePreviewUnit('preview-ally-1', 'Alpha-2', 'player', false, ally1Pos, enemy3Pos, 'smg', 86, 3),
    makePreviewUnit('preview-ally-2', 'Alpha-3', 'player', false, ally2Pos, zoneB, 'shotgun', 94, 2),
    makePreviewUnit('preview-enemy-1', 'Vanguard-1', 'enemy', false, enemy1Pos, playerPos, 'rifle', 78, 3),
    makePreviewUnit('preview-enemy-2', 'Vanguard-2', 'enemy', false, enemy2Pos, playerPos, 'sniper', 100, 2),
    makePreviewUnit('preview-enemy-3', 'Vanguard-3', 'enemy', false, enemy3Pos, ally1Pos, 'smg', 64, 1),
  ];

  return {
    map,
    baseUnits,
    zoneA,
    zoneB,
    seed,
    pickups: [
      { id: 'preview-drop-1', pos: pickup1Pos, weaponId: 'sniper', rarity: 'epic', ttl: 24 },
      { id: 'preview-drop-2', pos: pickup2Pos, weaponId: 'shotgun', rarity: 'rare', ttl: 24 },
    ],
  };
}

function drawTracerVolley(
  ctx: CanvasRenderingContext2D,
  units: Unit[],
  elapsed: number,
  mode: GameMode,
  zoneB: Vec2,
): void {
  const pairs: ReadonlyArray<[number, number, number]> = [
    [0, 3, 0.0],
    [3, 0, 0.42],
    [1, 5, 0.85],
    [4, 0, 1.28],
    [5, 1, 1.65],
  ];

  for (const [fromIdx, toIdx, phase] of pairs) {
    const shooter = units[fromIdx];
    const target = units[toIdx];
    if (!shooter || !target) continue;

    const cycle = (elapsed * 0.95 + phase) % 2.1;
    if (cycle > 0.55) continue;

    const endPos = mode === 'hellcell' ? zoneB : target.pos;
    const dx = endPos.x - shooter.pos.x;
    const dy = endPos.y - shooter.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 24) continue;
    const ux = dx / dist;
    const uy = dy / dist;

    const muzzleX = shooter.pos.x + ux * 20;
    const muzzleY = shooter.pos.y + uy * 20;

    if (cycle < 0.09) {
      const flashAlpha = 1 - cycle / 0.09;
      ctx.save();
      ctx.globalAlpha = flashAlpha * 0.85;
      ctx.fillStyle = shooter.team === 'player' ? PALETTE.playerGlow : PALETTE.enemyGlow;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const travel = cycle / 0.55;
    const headDist = 20 + travel * Math.max(40, dist - 28);
    const tailDist = Math.max(20, headDist - 42);
    const hx = shooter.pos.x + ux * headDist;
    const hy = shooter.pos.y + uy * headDist;
    const tx = shooter.pos.x + ux * tailDist;
    const ty = shooter.pos.y + uy * tailDist;

    const tracerColor =
      mode === 'rampage'
        ? shooter.isPlayer
          ? '#F8FAFC'
          : '#D99A38'
        : shooter.team === 'player'
          ? PALETTE.playerGlow
          : PALETTE.enemyGlow;

    ctx.save();
    const grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, tracerColor);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return true;
  if (document.documentElement.dataset.reducedMotion === 'true') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export const BattlefieldPreview: React.FC<BattlefieldPreviewProps> = ({
  theme: controlledTheme,
  onThemeChange,
  mode: controlledMode,
  onModeChange,
  equippedWeapon = 'rifle',
}) => {
  const [internalTheme, setInternalTheme] = useState<MapTheme>('slumside');
  const [internalMode, setInternalMode] = useState<GameMode>('zoneControl');
  const theme = controlledTheme ?? internalTheme;
  const mode = controlledMode ?? internalMode;

  const setTheme = (next: MapTheme) => {
    if (onThemeChange) onThemeChange(next);
    else setInternalTheme(next);
  };

  const setMode = (next: GameMode) => {
    if (onModeChange) onModeChange(next);
    else setInternalMode(next);
  };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const envRef = useRef<EnvironmentRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (!envRef.current) {
      envRef.current = new EnvironmentRenderer();
    }
    const env = envRef.current;
    const scene = createPreviewScene(theme, equippedWeapon);
    const tp = getThemePalette(theme);

    const anchorX = scene.zoneA.x * 0.3 + scene.zoneB.x * 0.7;
    const anchorY = scene.zoneA.y * 0.28 + scene.zoneB.y * 0.72;

    let width = 640;
    let height = 400;
    let dpr = 1;

    const updateSize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(300, Math.floor(rect.width || 640));
      height = Math.max(200, Math.floor(rect.height || 400));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    updateSize();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    observer?.observe(wrap);
    window.addEventListener('resize', updateSize);

    let rafId = 0;
    const startAt = performance.now();

    const renderFrame = (now: number) => {
      const reduced = isReducedMotionPreferred();
      const elapsed = reduced ? 0 : (now - startAt) / 1000;
      const simTime = 1.4 + elapsed * 0.7;

      const animatedUnits = scene.baseUnits.map((u, idx) => {
        const swayX = reduced ? 0 : Math.sin(elapsed * 1.1 + idx * 1.4) * 7;
        const swayY = reduced ? 0 : Math.cos(elapsed * 0.85 + idx * 1.7) * 5;
        const nextPos = { x: u.pos.x + swayX, y: u.pos.y + swayY };
        const aimTarget =
          mode === 'hellcell'
            ? scene.zoneB
            : u.team === 'player'
              ? scene.baseUnits[3]?.pos ?? scene.zoneB
              : scene.baseUnits[0]?.pos ?? scene.zoneB;
        return {
          ...u,
          pos: nextPos,
          angle: Math.atan2(aimTarget.y - nextPos.y, aimTarget.x - nextPos.x),
        };
      });

      const zoneBOsc = reduced ? 0.44 : 0.35 + 0.3 * Math.sin(elapsed * 0.45);
      const hellcell =
        mode === 'hellcell' ? buildHellcellPreview(theme, scene.zoneB, simTime) : undefined;

      const frameState: GameState = {
        tick: 120,
        time: simTime,
        timeLimit: 300,
        map: scene.map,
        units: animatedUnits,
        projectiles: [],
        grenades: [],
        pickups: scene.pickups,
        zones: scene.map.zones.map((z, idx) => {
          const code = formatZoneCode(z.id);
          if (idx === 0 || code === 'A') {
            return { id: z.id, owner: 'player', progress: 1, contested: false };
          }
          if (idx === 1 || code === 'B') {
            return {
              id: z.id,
              owner: 'neutral',
              progress: zoneBOsc,
              contested: true,
            };
          }
          return { id: z.id, owner: 'enemy', progress: -1, contested: false };
        }),
        score: { player: 312, enemy: 268 },
        baseHp: { player: 1000, enemy: 1000 },
        status: 'playing',
        playerId: 'preview-you',
        ...(hellcell ? { hellcell } : {}),
        matchConfig: {
          seed: scene.seed,
          mode,
          difficulty: 'normal',
          scoreToWin: 600,
          enemyCount: 4,
          startingWeapon: equippedWeapon,
          mapTheme: theme,
        },
      };

      const driftX = reduced ? 0 : Math.sin(elapsed * 0.24) * 16;
      const driftY = reduced ? 0 : Math.cos(elapsed * 0.18) * 10;
      const camX = anchorX + driftX;
      const camY = anchorY + driftY;

      const zoom = Math.max(0.56, Math.min(0.96, width / 800));
      const viewHalfW = (width * 0.5) / zoom + 64;
      const viewHalfH = (height * 0.5) / zoom + 64;
      const minX = camX - viewHalfW;
      const minY = camY - viewHalfH;
      const maxX = camX + viewHalfW;
      const maxY = camY + viewHalfH;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = tp.bgVoid;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(zoom, zoom);
      ctx.translate(-camX, -camY);

      env.drawGroundAndShadows(ctx, frameState.map, simTime, minX, minY, maxX, maxY);
      env.drawZonesAndBases(ctx, frameState, { player: 0, enemy: 0 });
      drawHellcellGroundLayer(ctx, frameState.hellcell, frameState.map.tileSize, simTime, scene.zoneB);

      const sortedUnits = [...frameState.units].sort((a, b) => a.pos.y - b.pos.y);
      const isRampage = mode === 'rampage';

      env.drawDepthSortedStructures(
        ctx,
        frameState.map,
        simTime,
        minX,
        minY,
        maxX,
        maxY,
      );

      for (const pickup of frameState.pickups) {
        env.drawSinglePickup(ctx, pickup, simTime);
      }
      for (const unit of sortedUnits) {
        drawUnitBody(ctx, unit, 1, false, simTime, isRampage);
      }

      drawHellcellEntities(ctx, frameState.hellcell, simTime);
      drawTracerVolley(ctx, animatedUnits, reduced ? 0.15 : elapsed, mode, scene.zoneB);

      for (const unit of sortedUnits) {
        drawUnitOverlay(ctx, unit, 1, false, isRampage);
      }

      ctx.restore();

      // Restrained edge integration so the battlefield blends smoothly into the dark frame
      const edgeGrad = ctx.createLinearGradient(0, 0, width * 0.14, 0);
      edgeGrad.addColorStop(0, 'rgba(16, 20, 25, 0.5)');
      edgeGrad.addColorStop(1, 'rgba(16, 20, 25, 0)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, width * 0.14, height);

      if (!reduced || now - startAt < 2500) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [theme, mode, equippedWeapon]);

  const currentArena = ARENA_META.find((item) => item.id === theme) ?? ARENA_META[0];

  return (
    <figure className="zc-preview-frame">
      <div className="zc-preview-viewport" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="zc-preview-canvas"
          aria-label={`Live Zone Control battlefield preview: ${currentArena.fullName}`}
        />
      </div>

      <figcaption className="zc-preview-bar">
        <div className="zc-theme-switcher" role="group" aria-label="Arena environment">
          {ARENA_META.map((item) => {
            const active = item.id === theme;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                className={`zc-feed-tab ${active ? 'is-active' : ''}`}
                onMouseEnter={() => playUiHover()}
                onClick={() => {
                  playUiClick();
                  setTheme(item.id);
                }}
              >
                <span
                  className="zc-arena-dot"
                  style={{ backgroundColor: MAP_THEME_PALETTES[item.id].accent }}
                  aria-hidden="true"
                />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="zc-mode-switcher" role="group" aria-label="Preview mode">
          {MODE_OPTIONS.map((opt) => {
            const active = opt.id === mode;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                className={`zc-feed-tab ${active ? 'is-active' : ''}`}
                onMouseEnter={() => playUiHover()}
                onClick={() => {
                  playUiClick();
                  setMode(opt.id);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </figcaption>
    </figure>
  );
};
