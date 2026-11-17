import type { Unit, WeaponId } from '../shared/types';
import { PALETTE, teamGlowColor } from './palette';

function drawWeaponSprite(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  accent: string,
): void {
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#CBD5E1';
  switch (weaponId) {
    case 'pistol':
      ctx.fillRect(6, -2.5, 11, 5);
      ctx.strokeRect(6, -2.5, 11, 5);
      break;
    case 'smg':
      ctx.fillRect(6, -3, 14, 6);
      ctx.strokeRect(6, -3, 14, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(10, -1, 4, 2);
      break;
    case 'shotgun':
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(4, -3, 18, 6);
      ctx.strokeRect(4, -3, 18, 6);
      break;
    case 'rifle':
      ctx.fillRect(5, -2.5, 20, 5);
      ctx.strokeRect(5, -2.5, 20, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(12, -1.5, 5, 3);
      break;
    case 'sniper':
      ctx.fillRect(4, -2, 24, 4);
      ctx.strokeRect(4, -2, 24, 4);
      ctx.fillStyle = PALETTE.epic;
      ctx.fillRect(10, -4, 6, 2.5);
      break;
    case 'rocket':
      ctx.fillStyle = '#64748B';
      ctx.fillRect(2, -4.5, 20, 9);
      ctx.strokeRect(2, -4.5, 20, 9);
      ctx.fillStyle = accent;
      ctx.fillRect(17, -5, 4, 10);
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

    const armorColor =
      unit.team === 'player' ? PALETTE.playerArmor : PALETTE.enemyArmor;
    const glow = teamGlowColor(unit.team);
    const flash = (hitFlash.get(unit.id) ?? 0) > 0;

    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(unit.pos.x, unit.pos.y);

    // Subtle ground selection ring under the player
    if (unit.isPlayer) {
      const pulse = 1 + 0.05 * Math.sin(time * 4);
      ctx.strokeStyle = PALETTE.player;
      ctx.lineWidth = 2;
      ctx.globalAlpha = vis * 0.75;
      ctx.beginPath();
      ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = vis;
    }

    // Contact shadow
    ctx.fillStyle = 'rgba(7, 11, 20, 0.58)';
    ctx.beginPath();
    ctx.ellipse(2, 5, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotated trooper torso, helmet, and weapon
    ctx.save();
    ctx.rotate(unit.angle);

    drawWeaponSprite(ctx, unit.weaponId, glow);

    // Armored pack/shoulders with crisp dark ink outline
    ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(-10, -11, 15, 22, 6);
    ctx.fill();
    ctx.stroke();

    // Helmet
    ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dark tactical visor + bright rim
    ctx.fillStyle = PALETTE.bg0;
    ctx.beginPath();
    ctx.roundRect(1, -5, 6.5, 10, 3);
    ctx.fill();

    ctx.fillStyle = glow;
    ctx.fillRect(4.5, -3.5, 2, 7);

    ctx.restore();

    // Reload arc
    if (unit.reloading) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        19,
        -Math.PI / 2,
        -Math.PI / 2 + unit.reloadProgress * Math.PI * 2,
      );
      ctx.stroke();
    }

    // Overhead crisp bordered health bar (like reference)
    const bw = 32;
    const bh = 5;
    const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(-bw / 2 - 1, -24 - 1, bw + 2, bh + 2);
    ctx.fillStyle = unit.team === 'player' ? PALETTE.success : PALETTE.danger;
    ctx.fillRect(-bw / 2, -24, bw * ratio, bh);

    // Overhead label ("You" for player, "ALLY" for allies) + colorblind shape pip
    if (unit.isPlayer) {
      ctx.font = '800 11px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillText('You', 1, -30);
      ctx.fillStyle = PALETTE.playerGlow;
      ctx.fillText('You', 0, -31);
    } else {
      const pipY = -31;
      const pipSize = colorblindAssist ? 5.5 : 4;
      ctx.fillStyle = glow;
      ctx.strokeStyle = PALETTE.bg0;
      ctx.lineWidth = 1.2;
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
    }

    ctx.restore();
  }
}
