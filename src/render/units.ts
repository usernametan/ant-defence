import type { Unit, WeaponId } from '../shared/types';
import { PALETTE, teamGlowColor } from './palette';

function drawHumanWeapon(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  accent: string,
): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 1.5;

  switch (weaponId) {
    case 'pistol': {
      // Dark polymer grip & underbarrel frame
      ctx.fillStyle = '#334155';
      ctx.fillRect(6, -0.5, 5, 4);
      ctx.strokeRect(6, -0.5, 5, 4);
      // Two-tone brushed gunmetal slide
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(7, -2.6, 11.5, 3.6);
      ctx.strokeRect(7, -2.6, 11.5, 3.6);
      // Ejection port & glowing tritium front sight
      ctx.fillStyle = '#475569';
      ctx.fillRect(10.5, -2.2, 3, 1.4);
      ctx.fillStyle = accent;
      ctx.fillRect(16.8, -3.2, 1.6, 1.2);
      break;
    }
    case 'smg': {
      // Folding wire stock & extended vertical magazine
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(1, -1.2, 5, 2.2);
      ctx.fillRect(11, 1.8, 3.2, 5.2);
      ctx.strokeRect(11, 1.8, 3.2, 5.2);
      // Compact upper receiver & perforated shroud
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(5, -3, 15.5, 4.8);
      ctx.strokeRect(5, -3, 15.5, 4.8);
      // Micro holo optic & barrel tip
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(8.5, -5, 4.5, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(10, -4.6, 2, 1.3);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(20.5, -1.8, 3, 2.4);
      break;
    }
    case 'shotgun': {
      // Angled wooden/polymer buttstock
      ctx.fillStyle = '#784A24';
      ctx.beginPath();
      ctx.moveTo(0, -1.5);
      ctx.lineTo(7, -2.2);
      ctx.lineTo(7, 2.4);
      ctx.lineTo(0, 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Heavy steel receiver & long barrel
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(6, -2.8, 18.5, 3.6);
      ctx.strokeRect(6, -2.8, 18.5, 3.6);
      // Under-barrel tube & ribbed pump forend
      ctx.fillStyle = '#475569';
      ctx.fillRect(10, 0.8, 11.5, 2.4);
      ctx.strokeRect(10, 0.8, 11.5, 2.4);
      ctx.fillStyle = '#925B2D';
      ctx.fillRect(11.5, 0.5, 6.5, 3);
      ctx.strokeRect(11.5, 0.5, 6.5, 3);
      break;
    }
    case 'rifle': {
      // Tactical buttstock & angled curved magazine
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, -2, 6, 4.2);
      ctx.strokeRect(0, -2, 6, 4.2);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(11, 2);
      ctx.lineTo(14.5, 2);
      ctx.lineTo(16, 7.2);
      ctx.lineTo(12.2, 7.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Sculpted upper receiver + vented handguard
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(5, -2.6, 17, 4.6);
      ctx.strokeRect(5, -2.6, 17, 4.6);
      // Barrel & muzzle brake
      ctx.fillStyle = '#64748B';
      ctx.fillRect(22, -1.6, 5, 2.4);
      ctx.strokeRect(22, -1.6, 5, 2.4);
      // Holographic sight with glowing reticle lens
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(9, -5.2, 5.5, 2.6);
      ctx.strokeRect(9, -5.2, 5.5, 2.6);
      ctx.fillStyle = accent;
      ctx.fillRect(10.5, -4.5, 2.8, 1.3);
      break;
    }
    case 'sniper': {
      // Cheek-rest stock & precision chassis
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-1, -1.8, 7, 4.4);
      ctx.strokeRect(-1, -1.8, 7, 4.4);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(5, -2.2, 14, 4);
      ctx.strokeRect(5, -2.2, 14, 4);
      // Long fluted barrel + heavy muzzle brake
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(19, -1.4, 11.5, 2.2);
      ctx.strokeRect(19, -1.4, 11.5, 2.2);
      ctx.fillStyle = '#334155';
      ctx.fillRect(29, -2.1, 3, 3.6);
      // Folded bipod under forend
      ctx.fillStyle = '#475569';
      ctx.fillRect(15, 1.8, 6, 1.8);
      // Raised telescopic scope + glowing purple optic lens
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(8.5, -5.8, 10, 2.8);
      ctx.strokeRect(8.5, -5.8, 10, 2.8);
      ctx.fillStyle = PALETTE.epic;
      ctx.fillRect(16.8, -5.4, 2, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(10, -5, 4, 1.2);
      break;
    }
    case 'rocket': {
      // Flared rear exhaust cone
      ctx.fillStyle = '#334155';
      ctx.fillRect(-1, -4.8, 4, 9.2);
      ctx.strokeRect(-1, -4.8, 4, 9.2);
      // Olive-slate launcher tube
      ctx.fillStyle = '#64748B';
      ctx.fillRect(2, -4.2, 20, 8);
      ctx.strokeRect(2, -4.2, 20, 8);
      // Reinforcement bands
      ctx.fillStyle = '#334155';
      ctx.fillRect(7, -4.5, 2.5, 8.6);
      ctx.fillRect(15, -4.5, 2.5, 8.6);
      // Optical targeting pod on top
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(9, -6.5, 5, 2.5);
      ctx.fillStyle = accent;
      ctx.fillRect(10.5, -6, 2.2, 1.4);
      // Protruding warhead cone
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(22, -4);
      ctx.lineTo(27.5, -0.2);
      ctx.lineTo(22, 3.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
}

export function drawUnitBody(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  vis: number,
  flash: boolean,
  time: number,
): void {
  const armorColor =
    unit.team === 'player' ? PALETTE.playerArmor : PALETTE.enemyArmor;
  const armorShade = unit.team === 'player' ? '#124D85' : '#962413';
  const armorHighlight = unit.team === 'player' ? '#38BDF8' : '#FF7B59';
  const glow = teamGlowColor(unit.team);

  const facingRight = Math.cos(unit.angle) >= 0;
  const dir = facingRight ? 1 : -1;
  const speed = Math.hypot(unit.vel.x, unit.vel.y);
  const stride = speed > 10 ? Math.sin(time * 13 + unit.pos.x * 0.05) * 3.8 : 0;
  const bob = speed > 10 ? Math.abs(Math.cos(time * 13 + unit.pos.x * 0.05)) * -1.4 : 0;

  ctx.save();
  ctx.globalAlpha = vis;
  ctx.translate(unit.pos.x, unit.pos.y);

  // Dash motion wake when boosting
  if (speed > 240) {
    const dashAngle = Math.atan2(unit.vel.y, unit.vel.x);
    ctx.save();
    ctx.rotate(dashAngle);
    const wakeGrad = ctx.createLinearGradient(-34, 0, 0, 0);
    wakeGrad.addColorStop(0, 'transparent');
    wakeGrad.addColorStop(1, glow);
    ctx.globalAlpha = vis * 0.45;
    ctx.fillStyle = wakeGrad;
    ctx.beginPath();
    ctx.ellipse(-14, 0, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Subtle ground selection ring under the player
  if (unit.isPlayer) {
    const pulse = 1 + 0.04 * Math.sin(time * 4);
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 2;
    ctx.globalAlpha = vis * 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 11.5, 16.5 * pulse, 7.5 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = vis;
  }

  // Ground contact shadow beneath boots
  ctx.fillStyle = 'rgba(7, 11, 20, 0.58)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 11.5, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bob);

  // --- Detailed Upright 3/4 Tactical Trooper ---
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 1.9;

  // Articulated legs, knee pads & combat boots
  const leftLegX = -5.5 + stride * 0.55;
  const rightLegX = 1.2 - stride * 0.55;

  ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
  ctx.fillRect(leftLegX, 3.5, 4.4, 6.5);
  ctx.strokeRect(leftLegX, 3.5, 4.4, 6.5);
  ctx.fillRect(rightLegX, 3.5, 4.4, 6.5);
  ctx.strokeRect(rightLegX, 3.5, 4.4, 6.5);

  // Armored knee pads
  if (!flash) {
    ctx.fillStyle = armorHighlight;
    ctx.fillRect(leftLegX + 0.6, 5, 3.2, 2.2);
    ctx.fillRect(rightLegX + 0.6, 5, 3.2, 2.2);
  }

  // Heavy boots with sole bevel
  ctx.fillStyle = '#0B101B';
  ctx.fillRect(leftLegX - 0.5, 9, 5.2, 3.2);
  ctx.fillRect(rightLegX - 0.3, 9, 5.2, 3.2);

  // Tactical backpack with comm antenna & glowing status LED
  const packX = dir > 0 ? -10.5 : 4.5;
  ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
  ctx.beginPath();
  ctx.roundRect(packX, -6.5, 6, 11.5, 2);
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(packX + 3, -6.5);
    ctx.lineTo(packX + 3 - dir * 1.5, -13);
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.fillRect(packX + 2, -4, 2, 2);
  }

  // Armored chest rig & contoured waist belt
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 1.9;
  ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
  ctx.beginPath();
  ctx.roundRect(-8, -7, 16, 12.5, 4.5);
  ctx.fill();
  ctx.stroke();

  // Waist belt + metallic buckle + side mag pouches
  if (!flash) {
    ctx.fillStyle = '#141B2B';
    ctx.fillRect(-7.5, 2.5, 15, 2.8);
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-1.5, 2.5, 3, 2.8);

    // Chest armor bevel & team core emblem
    ctx.fillStyle = armorShade;
    ctx.fillRect(-6, -3.5, 12, 5.5);
    ctx.fillStyle = glow;
    ctx.globalAlpha = vis * 0.72;
    ctx.fillRect(-2.5, -4.8, 5, 2.4);
    ctx.globalAlpha = vis;
  }

  // Sculpted shoulder pauldrons
  ctx.fillStyle = flash ? PALETTE.textHi : armorHighlight;
  ctx.beginPath();
  ctx.arc(-6.8, -5.2, 3.4, 0, Math.PI * 2);
  ctx.arc(6.8, -5.2, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Two-handed aiming arms + detailed firearm along unit.angle
  ctx.save();
  ctx.translate(0, -1.5);
  ctx.rotate(unit.angle);

  // Support arm reaching forward to handguard
  ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(1, 0.5, 11.5, 4.2, 2);
  ctx.fill();
  ctx.stroke();

  // Trigger arm & gloved grip
  ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
  ctx.beginPath();
  ctx.roundRect(-1, -3.5, 9.5, 4.8, 2.2);
  ctx.fill();
  ctx.stroke();

  drawHumanWeapon(ctx, unit.weaponId, glow);
  ctx.restore();

  // Detailed 3/4 Helmet with crest ridge, ear comms & reflective visor
  ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -11.5, 7.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Helmet top crest & ear comm pod
    ctx.fillStyle = armorHighlight;
    ctx.beginPath();
    ctx.roundRect(-2.2, -18.8, 4.4, 5.2, 1.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(dir > 0 ? -6.2 : 6.2, -11.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Dark visor housing
  ctx.fillStyle = PALETTE.bg0;
  ctx.beginPath();
  ctx.roundRect(dir > 0 ? -0.8 : -7, -14, 7.8, 4.8, 2);
  ctx.fill();

  // Glowing tactical visor strip + crisp specular glint
  ctx.fillStyle = glow;
  ctx.fillRect(dir > 0 ? 1.4 : -5.6, -12.4, 4.6, 1.7);
  ctx.fillStyle = PALETTE.textHi;
  ctx.globalAlpha = vis * 0.8;
  ctx.fillRect(dir > 0 ? 4.4 : -5, -13.2, 1.6, 1);
  ctx.globalAlpha = vis;

  // Reload arc
  if (unit.reloading) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      0,
      -2,
      19,
      -Math.PI / 2,
      -Math.PI / 2 + unit.reloadProgress * Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.restore();
}

export function drawUnitSilhouette(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
): void {
  const color = unit.team === 'player' ? PALETTE.playerGlow : PALETTE.enemyGlow;
  ctx.save();
  ctx.translate(unit.pos.x, unit.pos.y);
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([3, 3]);

  ctx.beginPath();
  ctx.arc(0, -11.5, 7.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-8, -7, 16, 17, 4.5);
  ctx.stroke();

  ctx.restore();
}

export function drawUnitOverlay(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  vis: number,
  colorblindAssist: boolean,
): void {
  const glow = teamGlowColor(unit.team);
  ctx.save();
  ctx.globalAlpha = vis;
  ctx.translate(unit.pos.x, unit.pos.y);

  const bw = 34;
  const bh = 5;
  const barY = -29;
  const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
  ctx.fillStyle = 'rgba(7, 11, 20, 0.9)';
  ctx.beginPath();
  ctx.roundRect(-bw / 2 - 1.5, barY - 1.5, bw + 3, bh + 3, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(159, 176, 207, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle =
    unit.team === 'player'
      ? ratio < 0.3
        ? PALETTE.gold
        : PALETTE.success
      : PALETTE.danger;
  if (ratio > 0) {
    ctx.beginPath();
    ctx.roundRect(-bw / 2, barY, Math.max(2, bw * ratio), bh, 1.2);
    ctx.fill();
  }

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
    const flash = (hitFlash.get(unit.id) ?? 0) > 0;
    drawUnitBody(ctx, unit, vis, flash, time);
    drawUnitOverlay(ctx, unit, vis, colorblindAssist);
  }
}
