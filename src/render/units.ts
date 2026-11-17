import type { Unit, WeaponId } from '../shared/types';
import { PALETTE, teamColor, teamGlowColor } from './palette';

function drawWeaponSprite(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  accent: string,
): void {
  ctx.fillStyle = '#CBD5E1';
  switch (weaponId) {
    case 'pistol':
      ctx.fillRect(6, -2, 10, 4);
      break;
    case 'smg':
      ctx.fillRect(6, -2.5, 13, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(9, -1, 4, 2);
      break;
    case 'shotgun':
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(4, -3, 16, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(10, -1.5, 5, 3);
      break;
    case 'rifle':
      ctx.fillRect(5, -2.5, 18, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(11, -1.5, 5, 3);
      break;
    case 'sniper':
      ctx.fillRect(4, -2, 23, 4);
      ctx.fillStyle = PALETTE.epic;
      ctx.fillRect(9, -3.5, 6, 2);
      break;
    case 'rocket':
      ctx.fillStyle = '#64748B';
      ctx.fillRect(2, -4, 19, 8);
      ctx.fillStyle = accent;
      ctx.fillRect(16, -4.5, 4, 9);
      break;
  }
}

export function drawUnits(
  ctx: CanvasRenderingContext2D,
  units: Unit[],
  visibilityAlpha: Map<string, number>,
  hitFlash: Map<string, number>,
  time: number,
  colorblindAssist: boolean,
): void {
  for (const unit of units) {
    if (unit.dead) continue;
    const vis = visibilityAlpha.get(unit.id) ?? 1;
    if (vis <= 0.02) continue;

    const color = teamColor(unit.team);
    const glow = teamGlowColor(unit.team);
    const flash = (hitFlash.get(unit.id) ?? 0) > 0;

    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(unit.pos.x, unit.pos.y);

    // Subtle ground ring under the player
    if (unit.isPlayer) {
      const pulse = 1 + 0.06 * Math.sin(time * 4);
      ctx.strokeStyle = PALETTE.playerGlow;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = vis * 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, 18 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = vis;
    }

    // Contact shadow
    ctx.fillStyle = 'rgba(4, 6, 12, 0.55)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotated body + weapon
    ctx.save();
    ctx.rotate(unit.angle);

    drawWeaponSprite(ctx, unit.weaponId, color);

    // Shoulders
    ctx.fillStyle = flash ? PALETTE.textHi : PALETTE.bg2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-8, -11, 14, 22, 6);
    ctx.fill();
    ctx.stroke();

    // Helmet / visor
    ctx.fillStyle = flash ? PALETTE.textHi : '#1E293B';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glowing visor slit
    ctx.fillStyle = glow;
    ctx.fillRect(3, -3.5, 4, 7);

    ctx.restore();

    // Reload arc around unit
    if (unit.reloading) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        16,
        -Math.PI / 2,
        -Math.PI / 2 + unit.reloadProgress * Math.PI * 2,
      );
      ctx.stroke();
    }

    // Health bar (for damaged units or enemies)
    if (unit.hp < unit.maxHp || unit.team === 'enemy') {
      const bw = 26;
      const bh = 4;
      const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillRect(-bw / 2, -22, bw, bh);
      ctx.fillStyle = color;
      ctx.fillRect(-bw / 2, -22, bw * ratio, bh);
    }

    // Colorblind-safe distinct shape marker: Allies = triangle pip, Enemies = diamond pip
    const pipY = unit.hp < unit.maxHp || unit.team === 'enemy' ? -29 : -22;
    ctx.fillStyle = color;
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 1.2;
    const pipSize = colorblindAssist ? 5.5 : 4.2;
    ctx.beginPath();
    if (unit.team === 'player') {
      ctx.moveTo(0, pipY - pipSize);
      ctx.lineTo(pipSize, pipY + pipSize * 0.7);
      ctx.lineTo(-pipSize, pipY + pipSize * 0.7);
    } else {
      ctx.moveTo(0, pipY - pipSize);
      ctx.lineTo(pipSize, pipY);
      ctx.lineTo(0, pipY + pipSize);
      ctx.lineTo(-pipSize, pipY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ally name tag
    if (unit.team === 'player' && !unit.isPlayer) {
      ctx.font = '700 9px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.playerGlow;
      ctx.fillText('ALLY', 0, pipY - 8);
    }

    ctx.restore();
  }
}
