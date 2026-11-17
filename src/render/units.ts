import type { Unit, WeaponId } from '../shared/types';
import { PALETTE, teamGlowColor } from './palette';

function drawHumanWeapon(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  accent: string,
): void {
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 1.6;
  ctx.fillStyle = '#D8E2F0';

  switch (weaponId) {
    case 'pistol':
      ctx.fillRect(8, -2, 10, 4);
      ctx.strokeRect(8, -2, 10, 4);
      break;
    case 'smg':
      ctx.fillRect(6, -2.5, 14, 4.5);
      ctx.strokeRect(6, -2.5, 14, 4.5);
      ctx.fillStyle = accent;
      ctx.fillRect(11, -1, 4, 2);
      break;
    case 'shotgun':
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(5, -2.5, 18, 5);
      ctx.strokeRect(5, -2.5, 18, 5);
      ctx.fillStyle = '#475569';
      ctx.fillRect(9, 0.5, 8, 2.5);
      break;
    case 'rifle':
      ctx.fillRect(5, -2.2, 20, 4.4);
      ctx.strokeRect(5, -2.2, 20, 4.4);
      ctx.fillStyle = accent;
      ctx.fillRect(12, -1, 5, 2);
      break;
    case 'sniper':
      ctx.fillRect(4, -1.8, 25, 3.6);
      ctx.strokeRect(4, -1.8, 25, 3.6);
      ctx.fillStyle = PALETTE.epic;
      ctx.fillRect(10, -4, 7, 2.2);
      break;
    case 'rocket':
      ctx.fillStyle = '#64748B';
      ctx.fillRect(2, -4, 21, 7.5);
      ctx.strokeRect(2, -4, 21, 7.5);
      ctx.fillStyle = accent;
      ctx.fillRect(18, -4.5, 4, 8.5);
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
    const armorShade = unit.team === 'player' ? '#135E9E' : '#A62B17';
    const glow = teamGlowColor(unit.team);
    const flash = (hitFlash.get(unit.id) ?? 0) > 0;

    const facingRight = Math.cos(unit.angle) >= 0;
    const dir = facingRight ? 1 : -1;
    const speed = Math.hypot(unit.vel.x, unit.vel.y);
    const stride = speed > 10 ? Math.sin(time * 13 + unit.pos.x * 0.05) * 3.5 : 0;

    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(unit.pos.x, unit.pos.y);

    // Subtle ground selection ring under the player
    if (unit.isPlayer) {
      const pulse = 1 + 0.04 * Math.sin(time * 4);
      ctx.strokeStyle = PALETTE.player;
      ctx.lineWidth = 2;
      ctx.globalAlpha = vis * 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 11, 15 * pulse, 7 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = vis;
    }

    // Ground contact shadow beneath boots
    ctx.fillStyle = 'rgba(7, 11, 20, 0.58)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Upright 3/4 Humanoid Trooper ---
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2;

    // Legs & dark tactical boots
    ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
    ctx.fillRect(-5 + stride * 0.5, 4, 4, 6);
    ctx.strokeRect(-5 + stride * 0.5, 4, 4, 6);
    ctx.fillRect(1 - stride * 0.5, 4, 4, 6);
    ctx.strokeRect(1 - stride * 0.5, 4, 4, 6);

    ctx.fillStyle = '#0B101B';
    ctx.fillRect(-5.5 + stride * 0.5, 9, 5, 3);
    ctx.fillRect(0.5 - stride * 0.5, 9, 5, 3);

    // Backpack behind torso
    ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
    ctx.beginPath();
    ctx.roundRect(dir > 0 ? -10 : 4, -6, 6, 11, 2);
    ctx.fill();
    ctx.stroke();

    // Armored human torso
    ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
    ctx.beginPath();
    ctx.roundRect(-6.5, -6.5, 13, 12, 4);
    ctx.fill();
    ctx.stroke();

    // Chest plate highlight
    if (!flash) {
      ctx.fillStyle = glow;
      ctx.globalAlpha = vis * 0.32;
      ctx.fillRect(-3.5, -4, 7, 3);
      ctx.globalAlpha = vis;
    }

    // Pivoting arms & firearm aimed along unit.angle
    ctx.save();
    ctx.translate(0, -1);
    ctx.rotate(unit.angle);

    // Forearm + gloved hand gripping weapon
    ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(0, -3.2, 10, 6.4, 2.5);
    ctx.fill();
    ctx.stroke();

    drawHumanWeapon(ctx, unit.weaponId, glow);
    ctx.restore();

    // Humanoid helmeted head sitting above shoulders
    ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(0, -11, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Helmet top crest highlight
    if (!flash) {
      ctx.fillStyle = glow;
      ctx.globalAlpha = vis * 0.35;
      ctx.beginPath();
      ctx.arc(-1 * dir, -14, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = vis;
    }

    // Horizontal tactical visor facing aim side
    ctx.fillStyle = PALETTE.bg0;
    ctx.beginPath();
    ctx.roundRect(dir > 0 ? -1 : -6.5, -13.2, 7.5, 4.4, 2);
    ctx.fill();

    ctx.fillStyle = glow;
    ctx.fillRect(dir > 0 ? 1.5 : -5, -11.8, 4.2, 1.5);

    // Reload arc
    if (unit.reloading) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        0,
        -2,
        18,
        -Math.PI / 2,
        -Math.PI / 2 + unit.reloadProgress * Math.PI * 2,
      );
      ctx.stroke();
    }

    // Overhead crisp bordered health bar
    const bw = 32;
    const bh = 5;
    const barY = -27;
    const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(-bw / 2 - 1, barY - 1, bw + 2, bh + 2);
    ctx.fillStyle = unit.team === 'player' ? PALETTE.success : PALETTE.danger;
    ctx.fillRect(-bw / 2, barY, bw * ratio, bh);

    // Overhead label ("You" for player, shape pip for others)
    if (unit.isPlayer) {
      ctx.font = '800 11px Bahnschrift, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillText('You', 1, barY - 5);
      ctx.fillStyle = PALETTE.playerGlow;
      ctx.fillText('You', 0, barY - 6);
    } else {
      const pipY = barY - 7;
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
