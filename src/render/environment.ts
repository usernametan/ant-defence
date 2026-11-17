import type { GameState, MapData, Pickup } from '../shared/types';
import { PALETTE, rarityColor, teamColor, teamGlowColor } from './palette';

export class EnvironmentRenderer {
  private groundPattern: CanvasPattern | null = null;

  private ensureGroundPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
    if (this.groundPattern) return this.groundPattern;
    if (typeof document === 'undefined') return null;

    const tile = document.createElement('canvas');
    tile.width = 64;
    tile.height = 64;
    const tctx = tile.getContext('2d');
    if (!tctx) return null;

    tctx.fillStyle = PALETTE.bg0;
    tctx.fillRect(0, 0, 64, 64);

    // Subtle tactical micro-noise dots
    tctx.fillStyle = 'rgba(159, 176, 207, 0.04)';
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 19 + 7) % 64;
      const y = (i * 29 + 13) % 64;
      tctx.fillRect(x, y, 1, 1);
    }

    this.groundPattern = ctx.createPattern(tile, 'repeat');
    return this.groundPattern;
  }

  drawMap(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    time: number,
    viewMinX: number,
    viewMinY: number,
    viewMaxX: number,
    viewMaxY: number,
  ): void {
    const ts = map.tileSize;
    const minCol = Math.max(0, Math.floor(viewMinX / ts) - 1);
    const maxCol = Math.min(map.width - 1, Math.ceil(viewMaxX / ts) + 1);
    const minRow = Math.max(0, Math.floor(viewMinY / ts) - 1);
    const maxRow = Math.min(map.height - 1, Math.ceil(viewMaxY / ts) + 1);

    // Floor base + noise
    const pattern = this.ensureGroundPattern(ctx);
    ctx.fillStyle = pattern ?? PALETTE.bg0;
    ctx.fillRect(
      minCol * ts,
      minRow * ts,
      (maxCol - minCol + 1) * ts,
      (maxRow - minRow + 1) * ts,
    );

    // Subtle tactical grid
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (let c = minCol; c <= maxCol + 1; c += 1) {
      const x = c * ts + 0.5;
      ctx.moveTo(x, minRow * ts);
      ctx.lineTo(x, (maxRow + 1) * ts);
    }
    for (let r = minRow; r <= maxRow + 1; r += 1) {
      const y = r * ts + 0.5;
      ctx.moveTo(minCol * ts, y);
      ctx.lineTo((maxCol + 1) * ts, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Water & spawn pads first
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const kind = map.tiles[r][c];
        const x = c * ts;
        const y = r * ts;

        if (kind === 'water') {
          ctx.fillStyle = PALETTE.waterBase;
          ctx.fillRect(x, y, ts, ts);
          const wave = Math.sin(time * 2.4 + c * 0.7 + r * 0.5);
          ctx.fillStyle = PALETTE.waterShimmer;
          ctx.globalAlpha = 0.08 + (wave + 1) * 0.04;
          ctx.fillRect(x + 3, y + 6 + wave * 2, ts - 6, 3);
          ctx.fillRect(x + 6, y + 18 - wave * 2, ts - 12, 2);
          ctx.globalAlpha = 1;
        } else if (kind === 'spawnPlayer' || kind === 'spawnEnemy') {
          ctx.fillStyle =
            kind === 'spawnPlayer'
              ? 'rgba(34, 211, 238, 0.08)'
              : 'rgba(255, 90, 60, 0.08)';
          ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
        }
      }
    }

    // Low cover (crates & sandbags with damage cracks)
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'lowCover') continue;
        const x = c * ts;
        const y = r * ts;
        const hp = map.coverHp[`${c},${r}`] ?? 100;
        const isCrate = (c + r) % 2 === 0;

        // Drop shadow
        ctx.fillStyle = 'rgba(4, 6, 12, 0.55)';
        ctx.fillRect(x + 5, y + 7, ts - 6, ts - 6);

        if (isCrate) {
          ctx.fillStyle = PALETTE.crateBody;
          ctx.fillRect(x + 3, y + 3, ts - 6, ts - 6);
          ctx.strokeStyle = PALETTE.wallEdge;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 3, y + 3, ts - 6, ts - 6);
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 5);
          ctx.lineTo(x + ts - 5, y + ts - 5);
          ctx.stroke();
        } else {
          ctx.fillStyle = PALETTE.sandbagBody;
          ctx.beginPath();
          ctx.roundRect(x + 3, y + 5, ts - 6, ts - 10, 5);
          ctx.fill();
          ctx.strokeStyle = PALETTE.wallEdge;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + ts * 0.5, y + 6);
          ctx.lineTo(x + ts * 0.5, y + ts - 6);
          ctx.stroke();
        }

        // Progressive damage cracks
        if (hp < 75) {
          ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : PALETTE.bg0;
          ctx.lineWidth = hp < 35 ? 1.8 : 1.2;
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 8);
          ctx.lineTo(x + 15, y + 14);
          ctx.lineTo(x + 12, y + 22);
          if (hp < 40) {
            ctx.moveTo(x + 15, y + 14);
            ctx.lineTo(x + 24, y + 19);
            ctx.moveTo(x + 21, y + 7);
            ctx.lineTo(x + 16, y + 13);
          }
          ctx.stroke();
        }
      }
    }

    // Walls with extruded height and drop shadows
    const extrude = 7;
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'wall') continue;
        const x = c * ts;
        const y = r * ts;

        // Drop shadow
        ctx.fillStyle = 'rgba(4, 6, 12, 0.6)';
        ctx.fillRect(x + 6, y + 8, ts, ts);

        // Extruded front face
        ctx.fillStyle = PALETTE.wallSide;
        ctx.fillRect(x, y + ts - extrude, ts, extrude);

        // Elevated top face
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y - extrude, ts, ts);

        // Top bevel highlight
        ctx.strokeStyle = PALETTE.wallEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y - extrude + 0.5, ts - 1, ts - 1);
      }
    }
  }

  drawZonesAndBases(
    ctx: CanvasRenderingContext2D,
    state: Readonly<GameState>,
    baseFlash: { player: number; enemy: number },
  ): void {
    const time = state.time;

    for (const def of state.map.zones) {
      const zState = state.zones.find((z) => z.id === def.id);
      const owner = zState?.owner ?? 'neutral';
      const progress = zState?.progress ?? 0;
      const contested = zState?.contested ?? false;
      const color = teamColor(owner);
      const glow = teamGlowColor(owner);

      ctx.save();
      ctx.translate(def.center.x, def.center.y);

      // Soft floor tint
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, def.radius);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, contested ? 'rgba(250, 204, 21, 0.14)' : `${color}22`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating dashed outer ring
      ctx.save();
      ctx.rotate(time * 0.35);
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = contested ? PALETTE.gold : color;
      ctx.lineWidth = contested ? 2.8 : 2;
      ctx.globalAlpha = contested ? 0.65 + 0.35 * Math.sin(time * 9) : 0.72;
      ctx.beginPath();
      ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Progress arc
      const absProg = Math.min(1, Math.abs(progress));
      if (absProg > 0.01) {
        const progColor = progress >= 0 ? PALETTE.player : PALETTE.enemy;
        ctx.strokeStyle = progColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          def.radius - 7,
          -Math.PI / 2,
          -Math.PI / 2 + absProg * Math.PI * 2,
        );
        ctx.stroke();
      }

      // Zone label badge
      ctx.fillStyle = PALETTE.bg1;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '800 13px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.textHi;
      ctx.fillText(def.id, 0, 1);

      ctx.restore();
    }

    // Bases with energy cores
    for (const base of state.map.bases) {
      const hp = state.baseHp[base.team];
      const maxHp = Math.max(1, base.coreHp);
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      const color = teamColor(base.team);
      const glow = teamGlowColor(base.team);
      const flash = baseFlash[base.team];

      ctx.save();
      ctx.translate(base.center.x, base.center.y);

      // Base boundary
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, base.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Rotating energy core rings
      ctx.save();
      ctx.rotate(time * 0.9);
      ctx.strokeStyle = flash > 0 ? PALETTE.textHi : color;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Core orb
      const pulse = 1 + 0.08 * Math.sin(time * 5);
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * pulse);
      coreGrad.addColorStop(0, PALETTE.textHi);
      coreGrad.addColorStop(0.5, glow);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Cracks & sparks when core HP drops
      if (ratio < 0.75) {
        ctx.strokeStyle = PALETTE.bg0;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(-2, -1);
        ctx.lineTo(-7, 9);
        if (ratio < 0.4) {
          ctx.moveTo(8, -10);
          ctx.lineTo(2, 2);
          ctx.lineTo(11, 8);
        }
        ctx.stroke();
      }

      // Core HP arc
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawPickups(ctx: CanvasRenderingContext2D, pickups: Pickup[], time: number): void {
    for (const p of pickups) {
      const color = rarityColor(p.rarity);
      const bob = Math.sin(time * 3.5 + p.pos.x * 0.05) * 3.5;

      ctx.save();
      ctx.translate(p.pos.x, p.pos.y + bob);

      // Rotating light beam for epic pickups
      if (p.rarity === 'epic') {
        ctx.save();
        ctx.rotate(time * 1.4);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = color;
        ctx.fillRect(-3, -28, 6, 56);
        ctx.fillRect(-28, -3, 56, 6);
        ctx.restore();
      }

      // Outer rarity glow ring
      const pulse = 1 + 0.12 * Math.sin(time * 4.5 + p.pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, 14 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Crate icon core
      ctx.fillStyle = PALETTE.bg2;
      ctx.fillRect(-8, -6, 16, 12);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -6, 16, 12);

      ctx.font = '800 9px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(p.weaponId.slice(0, 3).toUpperCase(), 0, 1);

      ctx.restore();
    }
  }
}
