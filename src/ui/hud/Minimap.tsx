import React, { useEffect, useRef } from 'react';
import { PALETTE, rarityColor, teamColor } from '../../render/palette';
import type { GameState } from '../../shared/types';

export interface ZonePing {
  zoneId: string;
  until: number;
}

export interface MinimapProps {
  state: Readonly<GameState>;
  pings: ZonePing[];
  colorblindAssist?: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({
  state,
  pings,
  colorblindAssist = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    const tileW = map.tileSize * sx;
    const tileH = map.tileSize * sy;
    for (let r = 0; r < map.height; r += 1) {
      for (let c = 0; c < map.width; c += 1) {
        const kind = map.tiles[r][c];
        if (kind === 'wall') {
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(c * tileW, r * tileH, Math.ceil(tileW), Math.ceil(tileH));
        } else if (kind === 'lowCover') {
          ctx.fillStyle = PALETTE.crateBody;
          ctx.fillRect(c * tileW, r * tileH, Math.ceil(tileW), Math.ceil(tileH));
        } else if (kind === 'water') {
          ctx.fillStyle = PALETTE.waterMid;
          ctx.fillRect(c * tileW, r * tileH, Math.ceil(tileW), Math.ceil(tileH));
        }
      }
    }

    // Bases
    for (const base of map.bases) {
      ctx.fillStyle = teamColor(base.team);
      ctx.beginPath();
      ctx.arc(base.center.x * sx, base.center.y * sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Zones
    for (const def of map.zones) {
      const zState = state.zones.find((z) => z.id === def.id);
      const owner = zState?.owner ?? 'neutral';
      const contested = zState?.contested ?? false;
      const zx = def.center.x * sx;
      const zy = def.center.y * sy;
      const zr = Math.max(8, def.radius * sx);
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

      ctx.fillStyle = PALETTE.textHi;
      ctx.font = '800 9px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.id, zx, zy + 0.5);
    }

    // Pickups
    for (const p of state.pickups) {
      ctx.fillStyle = rarityColor(p.rarity);
      ctx.fillRect(p.pos.x * sx - 1.5, p.pos.y * sy - 1.5, 3, 3);
    }

    // Units
    const pipR = colorblindAssist ? 4.2 : 3;
    for (const u of state.units) {
      if (u.dead) continue;
      const ux = u.pos.x * sx;
      const uy = u.pos.y * sy;
      ctx.fillStyle = u.isPlayer ? PALETTE.textHi : teamColor(u.team);
      ctx.beginPath();
      if (u.team === 'player') {
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
};
