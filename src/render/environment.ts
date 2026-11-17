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

    tctx.fillStyle = PALETTE.floorBase;
    tctx.fillRect(0, 0, 64, 64);
    tctx.fillStyle = PALETTE.floorAlt;
    tctx.fillRect(0, 0, 32, 32);
    tctx.fillRect(32, 32, 32, 32);

    tctx.strokeStyle = PALETTE.floorSeam;
    tctx.lineWidth = 1;
    tctx.strokeRect(0.5, 0.5, 31, 31);
    tctx.strokeRect(32.5, 0.5, 31, 31);
    tctx.strokeRect(0.5, 32.5, 31, 31);
    tctx.strokeRect(32.5, 32.5, 31, 31);

    // Subtle stone texture speckles
    tctx.fillStyle = 'rgba(234, 242, 255, 0.035)';
    for (let i = 0; i < 28; i += 1) {
      tctx.fillRect((i * 19 + 5) % 64, (i * 29 + 9) % 64, 2, 1);
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

    // Stone floor
    const pattern = this.ensureFloorPattern(ctx);
    ctx.fillStyle = pattern ?? PALETTE.floorBase;
    ctx.fillRect(
      minCol * ts,
      minRow * ts,
      (maxCol - minCol + 1) * ts,
      (maxRow - minRow + 1) * ts,
    );

    // Water basins with stone curb & glowing caustic shimmer
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const kind = map.tiles[r][c];
        const x = c * ts;
        const y = r * ts;

        if (kind === 'water') {
          ctx.fillStyle = PALETTE.waterDeep;
          ctx.fillRect(x, y, ts, ts);

          const wave = Math.sin(time * 2.1 + c * 0.75 + r * 0.55);
          ctx.fillStyle = PALETTE.waterMid;
          ctx.globalAlpha = 0.65;
          ctx.fillRect(x + 1, y + 2, ts - 2, ts - 3);

          // Caustic shimmer bands
          ctx.fillStyle = PALETTE.waterShimmer;
          ctx.globalAlpha = 0.28 + (wave + 1) * 0.1;
          ctx.fillRect(x + 4, y + 7 + wave * 2.2, ts - 9, 2.5);
          ctx.fillRect(x + 8, y + 20 - wave * 2.2, ts - 13, 2);
          ctx.globalAlpha = 1;

          // Sunken stone basin rim on exposed sides
          ctx.fillStyle = PALETTE.wallSide;
          if (map.tiles[r - 1]?.[c] !== 'water') ctx.fillRect(x, y, ts, 4);
          if (map.tiles[r + 1]?.[c] !== 'water') ctx.fillRect(x, y + ts - 2, ts, 2);
          if (map.tiles[r][c - 1] !== 'water') ctx.fillRect(x, y, 4, ts);
          if (map.tiles[r][c + 1] !== 'water') ctx.fillRect(x + ts - 2, y, 2, ts);
        } else if (kind === 'spawnPlayer' || kind === 'spawnEnemy') {
          ctx.fillStyle =
            kind === 'spawnPlayer'
              ? 'rgba(34, 211, 238, 0.12)'
              : 'rgba(255, 90, 60, 0.12)';
          ctx.fillRect(x, y, ts, ts);
          ctx.strokeStyle =
            kind === 'spawnPlayer'
              ? 'rgba(34, 211, 238, 0.24)'
              : 'rgba(255, 90, 60, 0.24)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
        }
      }
    }

    // Low cover: Tactical supply crates & stone half-walls
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'lowCover') continue;
        const x = c * ts;
        const y = r * ts;
        const hp = map.coverHp[`${c},${r}`] ?? 100;
        const isCrate = (c + r) % 2 === 0;

        ctx.fillStyle = 'rgba(7, 11, 20, 0.62)';
        ctx.fillRect(x + 5, y + 7, ts - 4, ts - 3);

        if (isCrate) {
          // Gold-trimmed wooden supply crate
          ctx.fillStyle = PALETTE.crateBody;
          ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
          ctx.fillStyle = '#734F1E';
          ctx.fillRect(x + 2, y + ts - 7, ts - 4, 5);
          ctx.strokeStyle = PALETTE.crateTrim;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, ts - 6, ts - 6);
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 5);
          ctx.lineTo(x + ts - 5, y + ts - 7);
          ctx.stroke();
        } else {
          // Low stone barrier connected with neighbors
          const leftCover = map.tiles[r]?.[c - 1] === 'lowCover';
          const rightCover = map.tiles[r]?.[c + 1] === 'lowCover';
          const padL = leftCover ? 0 : 2;
          const padR = rightCover ? 0 : 2;
          ctx.fillStyle = PALETTE.sandbagBody;
          ctx.fillRect(x + padL, y + 4, ts - padL - padR, ts - 8);
          ctx.fillStyle = PALETTE.wallSide;
          ctx.fillRect(x + padL, y + ts - 9, ts - padL - padR, 5);
          ctx.strokeStyle = PALETTE.wallEdge;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x + padL + 0.5, y + 4.5, ts - padL - padR - 1, ts - 9);
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

    // Connected 2.5D Stone Fortress Walls
    const extrude = 11;
    // Pass 1: ambient floor drop shadow cast to south-east
    ctx.fillStyle = 'rgba(7, 11, 20, 0.55)';
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'wall') continue;
        const x = c * ts;
        const y = r * ts;
        ctx.fillRect(x + 7, y + 8, ts, ts);
      }
    }

    // Pass 2: continuous masonry top faces, extruded front faces, and outer rim borders
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        if (map.tiles[r][c] !== 'wall') continue;
        const x = c * ts;
        const y = r * ts;
        const nUp = map.tiles[r - 1]?.[c] === 'wall';
        const nDown = map.tiles[r + 1]?.[c] === 'wall';
        const nLeft = map.tiles[r]?.[c - 1] === 'wall';
        const nRight = map.tiles[r]?.[c + 1] === 'wall';

        // Extruded vertical face if exposed on south side
        if (!nDown) {
          ctx.fillStyle = PALETTE.wallSide;
          ctx.fillRect(x, y + ts - extrude, ts, extrude);
          // Stone brick vertical seam on front face
          ctx.fillStyle = PALETTE.floorSeam;
          ctx.fillRect(x + ts * 0.5, y + ts - extrude, 1, extrude);
          ctx.fillRect(x, y + ts - 2, ts, 2);
        }

        // Elevated top cap (contiguous ashlar masonry)
        ctx.fillStyle = (c + r) % 3 === 0 ? PALETTE.wallTopAlt : PALETTE.wallTop;
        ctx.fillRect(x, y - extrude, ts, ts);

        // Subtle interior stone mortar line
        ctx.strokeStyle = 'rgba(21, 27, 43, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y - extrude + 0.5, ts - 1, ts - 1);

        // Crisp bevel highlights ONLY on exposed outer edges (makes walls look like solid structures!)
        ctx.fillStyle = PALETTE.wallEdge;
        if (!nUp) ctx.fillRect(x, y - extrude, ts, 2.5);
        if (!nLeft) ctx.fillRect(x, y - extrude, 2.5, ts);

        ctx.fillStyle = PALETTE.bg0;
        if (!nRight) ctx.fillRect(x + ts - 1.5, y - extrude, 1.5, ts);
        if (!nDown) ctx.fillRect(x, y + ts - extrude - 1.5, ts, 1.5);

        // Corner foliage & vines along walls near water or exposed corners
        const nearWater =
          map.tiles[r + 1]?.[c] === 'water' ||
          map.tiles[r - 1]?.[c] === 'water' ||
          map.tiles[r]?.[c + 1] === 'water' ||
          map.tiles[r]?.[c - 1] === 'water';

        if ((!nDown && !nLeft && (c + r) % 2 === 0) || (nearWater && (c * 7 + r * 3) % 3 === 0)) {
          this.drawFoliageCluster(ctx, x + 5, y + ts - 2);
        }
        if (!nDown && !nRight && (c + r) % 3 === 0) {
          this.drawFoliageCluster(ctx, x + ts - 6, y + ts - 2);
        }
      }
    }
  }

  private drawFoliageCluster(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = PALETTE.bg0;
    ctx.beginPath();
    ctx.arc(x, y + 1, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.foliageDark;
    ctx.beginPath();
    ctx.arc(x - 2, y, 6, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 1, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.foliageBright;
    ctx.beginPath();
    ctx.arc(x - 1, y - 2, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 2.5, y - 2.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
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

      const ringColor =
        owner === 'neutral' || contested ? PALETTE.gold : teamColor(owner);
      const glow =
        owner === 'neutral' || contested ? PALETTE.gold : teamGlowColor(owner);

      ctx.save();
      ctx.translate(def.center.x, def.center.y);

      const zoneR = Math.min(def.radius, 76);

      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, zoneR + 18);
      grad.addColorStop(0, `${ringColor}36`);
      grad.addColorStop(0.65, `${ringColor}18`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, zoneR + 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(time * 0.45);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = contested ? 0.65 + 0.35 * Math.sin(time * 8) : 0.92;
      ctx.beginPath();
      ctx.arc(0, 0, zoneR, 0, Math.PI * 2);
      ctx.stroke();

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

      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, zoneR - 12, 0, Math.PI * 2);
      ctx.stroke();

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

      ctx.font = '900 30px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillText(def.id, 1.5, 2.5);
      ctx.fillStyle = PALETTE.textHi;
      ctx.fillText(def.id, 0, 1);

      ctx.restore();
    }

    // Framed Base Energy Cores
    for (const base of state.map.bases) {
      const hp = state.baseHp[base.team];
      const maxHp = Math.max(1, base.coreHp);
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      const color = teamColor(base.team);
      const glow = teamGlowColor(base.team);
      const flash = baseFlash[base.team];

      ctx.save();
      ctx.translate(base.center.x, base.center.y);

      // Stone chamber pad
      ctx.fillStyle = PALETTE.bg1;
      ctx.strokeStyle = PALETTE.wallEdge;
      ctx.lineWidth = 3;
      ctx.fillRect(-48, -48, 96, 96);
      ctx.strokeRect(-48, -48, 96, 96);

      ctx.fillStyle = `${color}28`;
      ctx.fillRect(-42, -42, 84, 84);

      ctx.save();
      ctx.rotate(time * 0.8);
      ctx.strokeStyle = flash > 0 ? PALETTE.textHi : color;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const pulse = 1 + 0.08 * Math.sin(time * 5);
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * pulse);
      coreGrad.addColorStop(0, PALETTE.textHi);
      coreGrad.addColorStop(0.5, glow);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
      ctx.fill();

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
