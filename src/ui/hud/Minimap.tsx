import React, { useEffect, useRef } from 'react';
import {
  SLUM_ROOF_PREVIEW_COLORS,
  formatZoneCode,
  slumRoofStyle,
} from '../../render/environment';
import { PALETTE, getThemePalette, rarityColor, teamColor } from '../../render/palette';
import type { GameState } from '../../shared/types';

type GameMap = GameState['map'];

export interface ZonePing {
  zoneId: string;
  until: number;
}

export interface MinimapProps {
  state: Readonly<GameState>;
  pings: ZonePing[];
  colorblindAssist?: boolean;
}

function drawStaticMinimapTerrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  map: Readonly<GameMap>,
): void {
  const tp = getThemePalette(map.theme);
  const worldW = map.width * map.tileSize;
  const worldH = map.height * map.tileSize;
  const sx = w / worldW;
  const sy = h / worldH;

  ctx.fillStyle = tp.bgVoid;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = tp.floorBase;
  ctx.fillRect(1, 1, w - 2, h - 2);

  const tileW = map.tileSize * sx;
  const tileH = map.tileSize * sy;
  if (map.theme === 'slumside') {
    ctx.fillStyle = '#4D453C';
    ctx.fillRect(51 * tileW, tileH, tileW * 3, (map.height - 2) * tileH);
    ctx.fillStyle = '#8C959F';
    ctx.fillRect(51.4 * tileW, tileH, Math.max(1, tileW * 0.28), (map.height - 2) * tileH);
    ctx.fillRect(52.5 * tileW, tileH, Math.max(1, tileW * 0.28), (map.height - 2) * tileH);
  }

  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      const kind = map.tiles[r][c];
      if (kind === 'wall') {
        ctx.fillStyle =
          map.theme === 'slumside'
            ? SLUM_ROOF_PREVIEW_COLORS[slumRoofStyle(c, r, map.seed)]
            : tp.wallTop;
        ctx.fillRect(c * tileW, r * tileH, Math.ceil(tileW), Math.ceil(tileH));
      } else if (kind === 'lowCover') {
        ctx.fillStyle = tp.crateBody;
        ctx.fillRect(c * tileW, r * tileH, Math.ceil(tileW), Math.ceil(tileH));
      } else if (kind === 'water') {
        ctx.fillStyle = tp.waterMid;
        ctx.fillRect(c * tileW, r * tileH, Math.ceil(tileW), Math.ceil(tileH));
      }
    }
  }
}

/** Offscreen cache for static minimap terrain so 60x40 tiles only draw when walls change. */
export class MinimapTerrainCache {
  private canvas: HTMLCanvasElement | null = null;
  private cachedKey = '';
  public fullRebuilds = 0;

  ensureTerrain(
    width: number,
    height: number,
    map: Readonly<GameMap>,
    createCanvas?: (w: number, h: number) => HTMLCanvasElement | null,
  ): HTMLCanvasElement | null {
    const key = `${width}x${height}:${map.seed}:${map.theme ?? 'fortress'}:w${map.wallRevision ?? 0}`;
    if (this.canvas && this.cachedKey === key) {
      return this.canvas;
    }
    if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
      if (createCanvas) {
        this.canvas = createCanvas(width, height);
      } else if (typeof document !== 'undefined') {
        const off = document.createElement('canvas');
        off.width = width;
        off.height = height;
        this.canvas = off;
      }
    }
    if (!this.canvas) return null;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return null;
    drawStaticMinimapTerrain(ctx, width, height, map);
    this.cachedKey = key;
    this.fullRebuilds += 1;
    return this.canvas;
  }
}

export const Minimap = React.memo<MinimapProps>(({
  state,
  pings,
  colorblindAssist = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrainCacheRef = useRef<MinimapTerrainCache | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const map = state.map;
    const worldW = map.width * map.tileSize;
    const worldH = map.height * map.tileSize;
    const sx = w / worldW;
    const sy = h / worldH;

    if (!terrainCacheRef.current) {
      terrainCacheRef.current = new MinimapTerrainCache();
    }
    const terrain = terrainCacheRef.current.ensureTerrain(w, h, map);
    if (terrain) {
      ctx.drawImage(terrain, 0, 0);
    } else {
      drawStaticMinimapTerrain(ctx, w, h, map);
    }

    const isRampage = state.matchConfig.mode === 'rampage';

    if (!isRampage) {
      // Bases
      for (const base of map.bases) {
        ctx.fillStyle = teamColor(base.team);
        ctx.beginPath();
        ctx.arc(base.center.x * sx, base.center.y * sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Zones
      for (const def of map.zones) {
        const zx = def.center.x * sx;
        const zy = def.center.y * sy;
        const zr = Math.max(8, def.radius * sx);

        // Replace the active emergence zone icon with a pulsing red ring while first boss breaches
        const breachZoneId = state.hellcell?.emergenceZoneId ?? 'zone-2';
        if (def.id === breachZoneId && state.hellcell?.isCeasefireActive && (state.hellcell.bossCount ?? 0) === 0) {
          const pulse = (state.time * 2.6) % 1;
          ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
          ctx.strokeStyle = PALETTE.danger;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(zx, zy, zr, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = PALETTE.enemyGlow;
          ctx.globalAlpha = 1 - pulse;
          ctx.beginPath();
          ctx.arc(zx, zy, zr + pulse * 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          continue;
        }

        const zState = state.zones.find((z) => z.id === def.id);
        const owner = zState?.owner ?? 'neutral';
        const contested = zState?.contested ?? false;
        const ringColor =
          owner === 'neutral' || contested ? PALETTE.gold : teamColor(owner);

        ctx.fillStyle = `${ringColor}2e`;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(zx, zy, zr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const hasPing = pings.some((p) => p.zoneId === def.id);
        if (hasPing || contested) {
          const phase = (state.time * 2.2) % 1;
          ctx.strokeStyle = PALETTE.gold;
          ctx.globalAlpha = 1 - phase;
          ctx.beginPath();
          ctx.arc(zx, zy, zr + phase * 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        const label = formatZoneCode(def.id);
        ctx.fillStyle = PALETTE.textHi;
        ctx.font = '800 9px Bahnschrift, "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, zx, zy + 0.5);
      }

      // Active Boss / Breach Marker anywhere on the map
      if (state.hellcell && (state.hellcell.boss || state.hellcell.phase === 'WARNING')) {
        const bPos = state.hellcell.boss?.pos ?? state.hellcell.spawnPos;
        if (bPos) {
          const bx = bPos.x * sx;
          const by = bPos.y * sy;
          const pulse = (state.time * 2.8) % 1;
          ctx.strokeStyle = PALETTE.danger;
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = 1 - pulse;
          ctx.beginPath();
          ctx.arc(bx, by, 7 + pulse * 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;

          ctx.fillStyle = PALETTE.danger;
          ctx.beginPath();
          ctx.arc(bx, by, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Pickups
    for (const p of state.pickups) {
      ctx.fillStyle = rarityColor(p.rarity);
      ctx.fillRect(p.pos.x * sx - 1.5, p.pos.y * sy - 1.5, 3, 3);
    }

    // Player aim cone & unit markers
    const playerUnit = state.units.find((u) => u.id === state.playerId && !u.dead);
    if (playerUnit) {
      const px = playerUnit.pos.x * sx;
      const py = playerUnit.pos.y * sy;
      ctx.save();
      ctx.fillStyle = isRampage
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(103, 232, 249, 0.16)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, 24, playerUnit.angle - 0.42, playerUnit.angle + 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const pipR = colorblindAssist ? 4.2 : 3;
    for (const u of state.units) {
      if (u.dead) continue;
      const ux = u.pos.x * sx;
      const uy = u.pos.y * sy;
      const isFriendly = u.isPlayer || (!isRampage && u.team === 'player');
      ctx.fillStyle = isRampage
        ? u.isPlayer
          ? '#FFFFFF'
          : '#05070B'
        : u.isPlayer
          ? PALETTE.textHi
          : isFriendly
            ? teamColor('player')
            : teamColor('enemy');
      ctx.beginPath();
      if (isFriendly) {
        ctx.moveTo(ux, uy - pipR);
        ctx.lineTo(ux + pipR, uy + pipR * 0.8);
        ctx.lineTo(ux - pipR, uy + pipR * 0.8);
      } else {
        ctx.moveTo(ux, uy - pipR);
        ctx.lineTo(ux + pipR, uy);
        ctx.lineTo(ux, uy + pipR);
        ctx.lineTo(ux - pipR, uy);
      }
      ctx.closePath();
      ctx.fill();
      if (isRampage) {
        ctx.strokeStyle = u.isPlayer ? '#070B14' : '#9CA3AF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [state, pings, colorblindAssist]);

  return (
    <div className="ht-chamfer-panel ht-minimap-frame">
      <canvas
        ref={canvasRef}
        width={196}
        height={130}
        style={{
          display: 'block',
          borderRadius: '2px',
        }}
        aria-label="Tactical Minimap"
      />
    </div>
  );
});
