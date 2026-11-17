import type { GameState, MapData, Pickup } from '../shared/types';
import { PALETTE, rarityColor, teamColor, teamGlowColor } from './palette';

export class EnvironmentRenderer {
  private floorPattern: CanvasPattern | null = null;

  private ensureFloorPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
    if (this.floorPattern) return this.floorPattern;
    if (typeof document === 'undefined') return null;

    const tile = document.createElement('canvas');
    tile.width = 64;
    tile.height = 64;
    const tctx = tile.getContext('2d');
    if (!tctx) return null;

    // 2x2 subtle checkerboard stone arena tiles
    tctx.fillStyle = PALETTE.floorBase;
    tctx.fillRect(0, 0, 64, 64);
    tctx.fillStyle = PALETTE.floorAlt;
    tctx.fillRect(0, 0, 32, 32);
    tctx.fillRect(32, 32, 32, 32);

    // Fine stone seams + corner rivets
    tctx.strokeStyle = PALETTE.floorSeam;
    tctx.lineWidth = 1;
    tctx.strokeRect(0.5, 0.5, 31, 31);
    tctx.strokeRect(32.5, 0.5, 31, 31);
    tctx.strokeRect(0.5, 32.5, 31, 31);
    tctx.strokeRect(32.5, 32.5, 31, 31);

    tctx.fillStyle = 'rgba(234, 242, 255, 0.03)';
    for (let i = 0; i < 24; i += 1) {
      tctx.fillRect((i * 17 + 5) % 64, (i * 29 + 9) % 64, 2, 1);
    }

    this.floorPattern = ctx.createPattern(tile, 'repeat');
    return this.floorPattern;
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

    // Textured stone floor
    const pattern = this.ensureFloorPattern(ctx);
    ctx.fillStyle = pattern ?? PALETTE.floorBase;
    ctx.fillRect(
      minCol * ts,
      minRow * ts,
      (maxCol - minCol + 1) * ts,
      (maxRow - minRow + 1) * ts,
    );

    // Water pools with animated caustics & stone border
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const kind = map.tiles[r][c];
        const x = c * ts;
        const y = r * ts;

        if (kind === 'water') {
          ctx.fillStyle = PALETTE.waterDeep;
          ctx.fillRect(x, y, ts, ts);

          const wave = Math.sin(time * 2.1 + c * 0.8 + r * 0.6);
          ctx.fillStyle = PALETTE.waterMid;
          ctx.globalAlpha = 0.55;
          ctx.fillRect(x + 2, y + 3, ts - 4, ts - 6);

          // Caustic shimmer highlights
          ctx.fillStyle = PALETTE.waterShimmer;
          ctx.globalAlpha = 0.22 + (wave + 1) * 0.08;
          ctx.fillRect(x + 4, y + 7 + wave * 2.5, ts - 10, 2.5);
          ctx.fillRect(x + 9, y + 19 - wave * 2.5, ts - 14, 2);
          ctx.globalAlpha = 1;

          // Stone rim on adjacent non-water edges
          ctx.fillStyle = PALETTE.wallSide;
          if (map.tiles[r - 1]?.[c] !== 'water') ctx.fillRect(x, y, ts, 3);
          if (map.tiles[r][c - 1] !== 'water') ctx.fillRect(x, y, 3, ts);
        } else if (kind === 'spawnPlayer' || kind === 'spawnEnemy') {
          ctx.fillStyle =
            kind === 'spawnPlayer'
              ? 'rgba(34, 211, 238, 0.1)'
              : 'rgba(255, 90, 60, 0.1)';
          ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
        }
      }
    }

    // Low cover: Tactical wooden/brass crates & stone barriers with damage cracks
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'lowCover') continue;
        const x = c * ts;
        const y = r * ts;
        const hp = map.coverHp[`${c},${r}`] ?? 100;
        const isCrate = (c + r) % 2 === 0;

        // Crisp drop shadow
        ctx.fillStyle = 'rgba(7, 11, 20, 0.6)';
        ctx.fillRect(x + 5, y + 7, ts - 5, ts - 4);

        if (isCrate) {
          ctx.fillStyle = PALETTE.crateBody;
          ctx.fillRect(x + 3, y + 3, ts - 6, ts - 6);
          ctx.strokeStyle = PALETTE.crateTrim;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3.5, y + 3.5, ts - 7, ts - 7);
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 5);
          ctx.lineTo(x + ts - 5, y + ts - 5);
          ctx.stroke();
        } else {
          ctx.fillStyle = PALETTE.sandbagBody;
          ctx.fillRect(x + 2, y + 4, ts - 4, ts - 8);
          ctx.strokeStyle = PALETTE.wallEdge;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 2.5, y + 4.5, ts - 5, ts - 9);
          ctx.fillStyle = PALETTE.wallSide;
          ctx.fillRect(x + 2, y + ts - 8, ts - 4, 4);
        }

        if (hp < 75) {
          ctx.strokeStyle = hp < 35 ? PALETTE.enemyGlow : PALETTE.bg0;
          ctx.lineWidth = hp < 35 ? 2 : 1.4;
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 8);
          ctx.lineTo(x + 16, y + 15);
          ctx.lineTo(x + 12, y + 23);
          if (hp < 40) {
            ctx.moveTo(x + 16, y + 15);
            ctx.lineTo(x + 24, y + 20);
          }
          ctx.stroke();
        }
      }
    }

    // 2.5D Stone Walls with extruded front face, mortar seams, and corner foliage
    const extrude = 9;
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'wall') continue;
        const x = c * ts;
        const y = r * ts;
        const wallBelow = map.tiles[r + 1]?.[c] === 'wall';

        // Floor shadow
        ctx.fillStyle = 'rgba(7, 11, 20, 0.55)';
        ctx.fillRect(x + 6, y + 7, ts, ts);

        // Front extruded wall face (visible if no wall directly below)
        if (!wallBelow) {
          ctx.fillStyle = PALETTE.wallSide;
          ctx.fillRect(x, y + ts - extrude, ts, extrude);
          ctx.fillStyle = PALETTE.bg0;
          ctx.fillRect(x, y + ts - 2, ts, 2);
        }

        // Top stone block
        ctx.fillStyle = (c + r) % 3 === 0 ? PALETTE.wallTopAlt : PALETTE.wallTop;
        ctx.fillRect(x, y - extrude, ts, ts);

        // Brick seam & bevel highlight
        ctx.strokeStyle = PALETTE.floorSeam;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y - extrude + 0.5, ts - 1, ts - 1);

        ctx.fillStyle = PALETTE.wallEdge;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x + 1, y - extrude + 1, ts - 2, 2);
        ctx.globalAlpha = 1;

        // Occasional subtle moss/foliage tuft along wall corners
        if ((c * 13 + r * 7) % 11 === 0 && !wallBelow) {
          ctx.fillStyle = PALETTE.foliageDark;
          ctx.beginPath();
          ctx.arc(x + 5, y + ts - 1, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = PALETTE.foliageBright;
          ctx.beginPath();
          ctx.arc(x + 4, y + ts - 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
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
      const contested = zState?.contested ?? false;
      const progress = zState?.progress ?? 0;

      // Neutral/contested zones glow warm gold like Zone B in the reference!
      const ringColor =
        owner === 'neutral' || contested ? PALETTE.gold : teamColor(owner);
      const glow =
        owner === 'neutral' || contested ? PALETTE.gold : teamGlowColor(owner);

      ctx.save();
      ctx.translate(def.center.x, def.center.y);

      const zoneR = Math.min(def.radius, 76);

      // Soft floor halo
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, zoneR + 18);
      grad.addColorStop(0, `${ringColor}36`);
      grad.addColorStop(0.65, `${ringColor}18`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, zoneR + 18, 0, Math.PI * 2);
      ctx.fill();

      // Rotating cog-notched holographic ring
      ctx.save();
      ctx.rotate(time * 0.45);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = contested ? 0.65 + 0.35 * Math.sin(time * 8) : 0.92;
      ctx.beginPath();
      ctx.arc(0, 0, zoneR, 0, Math.PI * 2);
      ctx.stroke();

      // 8 outer cog brackets
      const teeth = 8;
      ctx.fillStyle = glow;
      for (let i = 0; i < teeth; i += 1) {
        const a = (i / teeth) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.fillRect(zoneR - 2, -5, 8, 10);
        ctx.restore();
      }
      ctx.restore();

      // Inner crisp circle
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, zoneR - 12, 0, Math.PI * 2);
      ctx.stroke();

      // Progress arc
      const absProg = Math.min(1, Math.abs(progress));
      if (absProg > 0.02) {
        ctx.strokeStyle = progress >= 0 ? PALETTE.playerGlow : PALETTE.enemyGlow;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          zoneR - 6,
          -Math.PI / 2,
          -Math.PI / 2 + absProg * Math.PI * 2,
        );
        ctx.stroke();
      }

      // Bold Zone Letter
      ctx.font = '900 30px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillText(def.id, 1.5, 2.5);
      ctx.fillStyle = PALETTE.textHi;
      ctx.fillText(def.id, 0, 1);

      ctx.restore();
    }

    // Bases with glowing energy cores
    for (const base of state.map.bases) {
      const hp = state.baseHp[base.team];
      const maxHp = Math.max(1, base.coreHp);
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      const color = teamColor(base.team);
      const glow = teamGlowColor(base.team);
      const flash = baseFlash[base.team];

      ctx.save();
      ctx.translate(base.center.x, base.center.y);

      ctx.fillStyle = `${color}22`;
      ctx.beginPath();
      ctx.arc(0, 0, base.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(time * 0.8);
      ctx.strokeStyle = flash > 0 ? PALETTE.textHi : color;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const pulse = 1 + 0.08 * Math.sin(time * 5);
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26 * pulse);
      coreGrad.addColorStop(0, PALETTE.textHi);
      coreGrad.addColorStop(0.45, glow);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
      ctx.fill();

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

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 40, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
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

      if (p.rarity === 'epic') {
        ctx.save();
        ctx.rotate(time * 1.4);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = color;
        ctx.fillRect(-3, -28, 6, 56);
        ctx.fillRect(-28, -3, 56, 6);
        ctx.restore();
      }

      const pulse = 1 + 0.12 * Math.sin(time * 4.5 + p.pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = PALETTE.bg1;
      ctx.fillRect(-9, -7, 18, 14);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(-9, -7, 18, 14);

      ctx.font = '800 9px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(p.weaponId.slice(0, 3).toUpperCase(), 0, 1);

      ctx.restore();
    }
  }
}
