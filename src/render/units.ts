import type { Unit, WeaponId } from '../shared/types';
import { PALETTE, teamGlowColor } from './palette';

function drawHumanWeapon(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  accent: string,
  flash: boolean,
): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 1.35;

  switch (weaponId) {
    case 'pistol': {
      // Ergonomic polymer grip + flared magazine baseplate
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(5.2, -0.6, 5.4, 4.8, 1.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(5.0, 3.4, 5.8, 1.3);

      // Underbarrel picatinny rail + micro laser/light module
      ctx.fillStyle = '#334155';
      ctx.fillRect(10.5, 0.4, 6.8, 2.2);
      ctx.strokeRect(10.5, 0.4, 6.8, 2.2);
      ctx.fillStyle = accent;
      ctx.fillRect(16.6, 0.8, 1.4, 1.4);

      // Machined two-tone stainless slide & frame
      ctx.fillStyle = flash ? '#FFFFFF' : '#E2E8F0';
      ctx.beginPath();
      ctx.roundRect(6.2, -3.1, 13.2, 3.9, 1);
      ctx.fill();
      ctx.stroke();

      // Top slide bevel & dark ejection port window
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(6.8, -1.0, 12.0, 1.4);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(10.6, -2.6, 3.6, 1.5);

      // Rear slide serrations
      ctx.fillStyle = '#475569';
      for (let sx = 7.4; sx <= 9.4; sx += 1) {
        ctx.fillRect(sx, -2.5, 0.6, 2.2);
      }

      // Threaded suppressor-ready barrel tip
      ctx.fillStyle = '#475569';
      ctx.fillRect(19.4, -2.1, 2.2, 2.0);
      ctx.strokeRect(19.4, -2.1, 2.2, 2.0);

      // Rear notch sight & glowing tritium front post
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(6.8, -3.8, 1.6, 0.9);
      ctx.fillStyle = accent;
      ctx.fillRect(17.4, -3.9, 1.8, 1.1);
      break;
    }

    case 'smg': {
      // Collapsible twin-rail PDW wire stock + rubber buttpad
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-1.5, -2.4, 2.2, 4.8);
      ctx.strokeRect(-1.5, -2.4, 2.2, 4.8);
      ctx.fillStyle = '#475569';
      ctx.fillRect(0.7, -1.8, 4.6, 1.1);
      ctx.fillRect(0.7, 0.5, 4.6, 1.1);

      // Extended forward-angled stick magazine with witness slots
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(11.2, 1.5);
      ctx.lineTo(14.8, 1.5);
      ctx.lineTo(16.2, 7.8);
      ctx.lineTo(12.4, 7.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(13.2, 3.4, 1.2, 2.6);

      // Compact monolithic upper receiver & lower magwell housing
      ctx.fillStyle = flash ? '#FFFFFF' : '#CBD5E1';
      ctx.beginPath();
      ctx.roundRect(4.8, -3.4, 16.4, 5.2, 1.2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.fillRect(5.4, -0.4, 15.2, 2.0);

      // Perforated barrel cooling shroud vents
      ctx.fillStyle = '#0F172A';
      for (let vx = 13.5; vx <= 19.0; vx += 2.2) {
        ctx.fillRect(vx, -2.3, 1.3, 1.3);
      }

      // Top picatinny rail + micro reflex red-dot optic
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(8.2, -5.8, 5.6, 2.6, 0.8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(9.8, -5.2, 2.6, 1.4);

      // Tri-lug muzzle compensator
      ctx.fillStyle = '#64748B';
      ctx.fillRect(21.2, -2.2, 3.6, 2.6);
      ctx.strokeRect(21.2, -2.2, 3.6, 2.6);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(22.4, -1.7, 1.2, 1.6);
      break;
    }

    case 'shotgun': {
      // Contoured walnut/polymer combat stock with dark rubber recoil pad
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-2.4, -1.8, 1.8, 5.2);
      ctx.fillStyle = '#7C4A21';
      ctx.beginPath();
      ctx.moveTo(-0.8, -1.7);
      ctx.lineTo(6.6, -2.4);
      ctx.lineTo(6.6, 2.5);
      ctx.lineTo(-0.8, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wood grain highlight on stock
      ctx.fillStyle = '#9A6232';
      ctx.fillRect(0.6, -1.2, 4.8, 1.4);

      // Heavy machined breech receiver + silver bolt carrier
      ctx.fillStyle = flash ? '#FFFFFF' : '#CBD5E1';
      ctx.beginPath();
      ctx.roundRect(6.0, -3.2, 9.6, 4.6, 1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(8.4, -2.4, 4.2, 1.5);

      // Side-saddle spare red 12-gauge shells on receiver
      ctx.fillStyle = '#DC2626';
      for (let sx = 7.2; sx <= 12.6; sx += 1.8) {
        ctx.fillRect(sx, -0.3, 1.2, 1.4);
      }

      // Long heavy barrel with top ventilated rib + under-barrel magazine tube
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(15.4, -2.9, 12.2, 2.4);
      ctx.strokeRect(15.4, -2.9, 12.2, 2.4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(15.4, -0.4, 10.6, 2.0);
      ctx.strokeRect(15.4, -0.4, 10.6, 2.0);

      // Ribbed wooden/polymer pump-action forend
      ctx.fillStyle = '#8F582A';
      ctx.beginPath();
      ctx.roundRect(14.0, -0.8, 7.6, 3.6, 1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3B2311';
      for (let gx = 15.2; gx <= 20.0; gx += 1.6) {
        ctx.fillRect(gx, -0.4, 0.8, 2.8);
      }

      // Breacher toothed choke + glowing fiber-optic bead sight
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(27.4, -3.1, 2.2, 2.8);
      ctx.fillStyle = accent;
      ctx.fillRect(25.8, -3.6, 1.6, 1.0);
      break;
    }

    case 'rifle': {
      // Adjustable tactical crane buttstock + cheek weld & rubber pad
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-2.2, -2.4, 1.8, 5.2);
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(-0.5, -2.3, 6.6, 4.8, 1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.fillRect(0.6, -1.8, 4.4, 1.4);

      // Curved STANAG/polymer magazine with structural ribs
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(10.8, 1.8);
      ctx.lineTo(14.8, 1.8);
      ctx.lineTo(16.6, 7.8);
      ctx.lineTo(12.4, 7.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(12.5, 3.6, 2.2, 1.2);

      // Forged upper & lower receiver + M-LOK free-float handguard
      ctx.fillStyle = flash ? '#FFFFFF' : '#E2E8F0';
      ctx.beginPath();
      ctx.roundRect(5.2, -3.0, 17.8, 5.0, 1.1);
      ctx.fill();
      ctx.stroke();

      // Lower receiver dark anodizing & ejection port dust cover
      ctx.fillStyle = '#334155';
      ctx.fillRect(5.6, -0.2, 16.8, 1.9);
      ctx.fillStyle = '#475569';
      ctx.fillRect(8.4, -2.3, 4.2, 1.5);

      // Machined M-LOK cooling slots along forward handguard
      ctx.fillStyle = '#0F172A';
      for (let hx = 14.2; hx <= 20.2; hx += 2.6) {
        ctx.fillRect(hx, -2.1, 1.8, 1.2);
      }

      // Holographic weapon sight + front PEQ laser module
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(7.8, -5.8, 6.2, 2.9, 0.9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(9.4, -5.1, 3.2, 1.5);

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(17.8, -4.6, 3.6, 1.7);
      ctx.fillStyle = accent;
      ctx.fillRect(20.6, -4.3, 1.0, 1.1);

      // Heavy barrel + twin-port compensator muzzle brake
      ctx.fillStyle = '#64748B';
      ctx.fillRect(22.8, -2.0, 4.6, 2.4);
      ctx.strokeRect(22.8, -2.0, 4.6, 2.4);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(26.8, -2.4, 2.4, 3.2);
      ctx.strokeRect(26.8, -2.4, 2.4, 3.2);
      break;
    }

    case 'sniper': {
      // Precision skeletonized chassis stock with adjustable cheek riser
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-3.2, -2.3, 2.0, 5.2);
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(-1.4, -2.2, 7.6, 4.8, 1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.fillRect(-0.2, -2.6, 4.8, 1.6);

      // Heavy box magazine & bolt handle knob
      ctx.fillStyle = '#334155';
      ctx.fillRect(10.0, 1.8, 4.8, 4.6);
      ctx.strokeRect(10.0, 1.8, 4.8, 4.6);

      // Precision machined chassis receiver & extended forend
      ctx.fillStyle = flash ? '#FFFFFF' : '#CBD5E1';
      ctx.beginPath();
      ctx.roundRect(5.2, -2.7, 15.2, 4.6, 1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.fillRect(5.8, -0.2, 14.0, 1.8);

      // Long free-floated fluted bull barrel
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(20.2, -1.8, 12.6, 2.5);
      ctx.strokeRect(20.2, -1.8, 12.6, 2.5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(21.5, -0.9, 10.0, 0.7);

      // Arrowhead multi-baffle anti-materiel muzzle brake
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(32.4, -2.9);
      ctx.lineTo(35.8, -2.1);
      ctx.lineTo(35.8, 1.0);
      ctx.lineTo(32.4, 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Folded front bipod legs under forend
      ctx.fillStyle = '#475569';
      ctx.fillRect(16.0, 1.8, 6.8, 1.9);
      ctx.strokeRect(16.0, 1.8, 6.8, 1.9);

      // High-magnification telescopic scope + elevation turret & glowing optic lenses
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(7.4, -6.5, 12.4, 3.3, 1);
      ctx.fill();
      ctx.stroke();
      // Scope mounting rings & top turret knob
      ctx.fillStyle = '#475569';
      ctx.fillRect(9.6, -3.5, 1.8, 1.2);
      ctx.fillRect(15.6, -3.5, 1.8, 1.2);
      ctx.fillRect(12.4, -7.4, 2.2, 1.1);
      // Glowing objective & ocular lenses
      ctx.fillStyle = PALETTE.epic;
      ctx.fillRect(18.0, -6.0, 1.8, 2.3);
      ctx.fillStyle = accent;
      ctx.fillRect(8.4, -5.6, 4.6, 1.4);
      break;
    }

    case 'rocket': {
      // Flared rear venturi exhaust cone
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(-3.2, -5.6);
      ctx.lineTo(1.6, -4.4);
      ctx.lineTo(1.6, 4.2);
      ctx.lineTo(-3.2, 5.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy recoilless launcher tube with military slate finish
      ctx.fillStyle = flash ? '#FFFFFF' : '#64748B';
      ctx.beginPath();
      ctx.roundRect(1.4, -4.6, 21.2, 9.0, 1.4);
      ctx.fill();
      ctx.stroke();

      // Upper tube specular ridge & lower shadow band
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(2.2, -3.8, 19.6, 2.2);
      ctx.fillStyle = '#334155';
      ctx.fillRect(2.2, 1.4, 19.6, 2.6);

      // Dual structural clamping bands + hazard warning stripe
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(6.5, -5.0, 2.8, 9.8);
      ctx.strokeRect(6.5, -5.0, 2.8, 9.8);
      ctx.fillRect(15.2, -5.0, 2.8, 9.8);
      ctx.strokeRect(15.2, -5.0, 2.8, 9.8);
      ctx.fillStyle = '#EAB308';
      ctx.fillRect(19.6, -4.3, 1.8, 8.4);

      // Electro-optical targeting computer pod on top
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(8.8, -7.4, 6.4, 3.0, 1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(10.6, -6.7, 3.2, 1.6);

      // Protruding fin-stabilized high-explosive warhead cone
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(22.4, -4.3);
      ctx.lineTo(29.2, -0.1);
      ctx.lineTo(22.4, 4.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(26.2, -0.9, 2.2, 1.6);
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
  isRampage = false,
): void {
  const armorColor = isRampage
    ? unit.isPlayer
      ? '#F1F5F9'
      : '#111621'
    : unit.team === 'player'
      ? PALETTE.playerArmor
      : PALETTE.enemyArmor;
  const armorShade = isRampage
    ? unit.isPlayer
      ? '#CBD5E1'
      : '#070A10'
    : unit.team === 'player'
      ? '#124D85'
      : '#962413';
  const armorHighlight = isRampage
    ? unit.isPlayer
      ? '#FFFFFF'
      : '#263244'
    : unit.team === 'player'
      ? '#38BDF8'
      : '#FF7B59';
  const glow = isRampage
    ? unit.isPlayer
      ? '#FFFFFF'
      : '#9CA3AF'
    : teamGlowColor(unit.team);
  const outlineColor = isRampage && !unit.isPlayer ? '#374151' : PALETTE.bg0;

  const facingRight = Math.cos(unit.angle) >= 0;
  const dir = facingRight ? 1 : -1;
  const speed = Math.hypot(unit.vel.x, unit.vel.y);
  const walkPhase = time * 13.5 + unit.pos.x * 0.05;
  const stride = speed > 10 ? Math.sin(walkPhase) * 4.2 : 0;
  const bob =
    speed > 10
      ? Math.abs(Math.cos(walkPhase)) * -1.6
      : Math.sin(time * 3.2 + unit.pos.y * 0.04) * 0.45;
  const isDashing = speed > 240;

  ctx.save();
  ctx.globalAlpha = vis;
  ctx.translate(unit.pos.x, unit.pos.y);

  // Dash motion wake & twin jetpack thruster plumes when boosting
  if (isDashing) {
    const dashAngle = Math.atan2(unit.vel.y, unit.vel.x);
    ctx.save();
    ctx.rotate(dashAngle);
    const wakeGrad = ctx.createLinearGradient(-38, 0, 0, 0);
    wakeGrad.addColorStop(0, 'transparent');
    wakeGrad.addColorStop(1, glow);
    ctx.globalAlpha = vis * 0.48;
    ctx.fillStyle = wakeGrad;
    ctx.beginPath();
    ctx.ellipse(-16, 0, 22, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Subtle tactical ground ring under the local player
  if (unit.isPlayer) {
    const pulse = 1 + 0.04 * Math.sin(time * 4);
    ctx.strokeStyle = isRampage ? '#FFFFFF' : PALETTE.player;
    ctx.lineWidth = 2;
    ctx.globalAlpha = vis * 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 11.5, 17 * pulse, 7.8 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner directional heading chevron on ground ring
    const hx = Math.cos(unit.angle) * 14.5;
    const hy = 11.5 + Math.sin(unit.angle) * 6.5;
    ctx.fillStyle = isRampage ? '#FFFFFF' : PALETTE.playerGlow;
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = vis;
  }

  // Ground contact shadow beneath boots
  ctx.fillStyle = 'rgba(7, 11, 20, 0.62)';
  ctx.beginPath();
  ctx.ellipse(0, 12.2, 12.4, 5.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bob);

  // --- Detailed Upright 3/4 Special-Forces Tactical Operator ---
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.85;

  // 1. Articulated legs, thigh plates, contoured knee pads & treaded combat boots
  const leftLegX = -5.8 + stride * 0.58;
  const rightLegX = 1.4 - stride * 0.58;
  const leftLegY = 3.2 - Math.max(0, stride * 0.16);
  const rightLegY = 3.2 - Math.max(0, -stride * 0.16);

  // Dark tactical trousers under armor plates
  ctx.fillStyle = flash ? PALETTE.textHi : '#1E293B';
  ctx.fillRect(leftLegX + 0.3, leftLegY, 4.4, 6.8);
  ctx.fillRect(rightLegX + 0.3, rightLegY, 4.4, 6.8);

  // Armored thigh & shin greaves
  ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
  ctx.beginPath();
  ctx.roundRect(leftLegX, leftLegY, 4.8, 6.6, 1.4);
  ctx.roundRect(rightLegX, rightLegY, 4.8, 6.6, 1.4);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Drop-leg sidearm holster strap on outer thigh
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(rightLegX - 0.3, rightLegY + 1.2, 5.4, 1.4);

    // Contoured hard-shell knee pads with specular cap
    ctx.fillStyle = armorHighlight;
    ctx.beginPath();
    ctx.roundRect(leftLegX + 0.6, leftLegY + 1.8, 3.6, 2.4, 0.8);
    ctx.roundRect(rightLegX + 0.6, rightLegY + 1.8, 3.6, 2.4, 0.8);
    ctx.fill();
  }

  // Heavy combat boots with armored toe cap & sole bevel
  ctx.fillStyle = '#0B101B';
  ctx.beginPath();
  ctx.roundRect(leftLegX - 0.6, leftLegY + 5.6, 5.8, 3.5, 1.2);
  ctx.roundRect(rightLegX - 0.4, rightLegY + 5.6, 5.8, 3.5, 1.2);
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(leftLegX + 0.4, leftLegY + 6.2, 3.8, 1.2);
    ctx.fillRect(rightLegX + 0.6, rightLegY + 6.2, 3.8, 1.2);
  }

  // 2. Tactical combat pack with thruster vents, battery cell & comm whip antenna
  const packX = dir > 0 ? -11.4 : 4.6;
  ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
  ctx.beginPath();
  ctx.roundRect(packX, -7.2, 6.8, 12.6, 2.2);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Pack inner equipment panel & power cell bars
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(packX + 1.2, -5.6, 4.4, 9.2);
    ctx.fillStyle = armorColor;
    ctx.fillRect(packX + 1.8, -1.4, 3.2, 3.6);

    // Whip comm antenna + pulsing status beacon at tip
    const antX = packX + (dir > 0 ? 2.0 : 4.8);
    const antTipX = antX - dir * 1.8;
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(antX, -7.2);
    ctx.lineTo(antTipX, -14.8);
    ctx.stroke();

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(antTipX, -14.8, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(packX + 2.2, -4.6, 2.4, 1.8);

    // Pack micro-thruster flare while dashing
    if (isDashing) {
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(packX + 3.4, 6.2, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Sculpted composite plate-carrier torso & tactical utility belt
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.9;
  ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
  ctx.beginPath();
  ctx.roundRect(-8.8, -7.6, 17.6, 13.4, 4.6);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Tactical load-bearing waist belt, mag pouches & metallic cobra buckle
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-8.2, 2.2, 16.4, 3.1);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-7.2, 1.8, 3.4, 3.5);
    ctx.fillRect(3.8, 1.8, 3.4, 3.5);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(-1.8, 2.4, 3.6, 2.6);

    // Sculpted ballistic chest plates, collar gorget & MOLLE webbing
    ctx.fillStyle = armorShade;
    ctx.beginPath();
    ctx.roundRect(-6.8, -5.8, 13.6, 7.6, 2.2);
    ctx.fill();

    // Diagonal shoulder harness straps
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-5.8, -7.2, 2.2, 4.4);
    ctx.fillRect(3.6, -7.2, 2.2, 4.4);

    // Upper chest specular highlight & glowing team IFF core reactor
    ctx.fillStyle = armorHighlight;
    ctx.fillRect(-5.2, -5.2, 10.4, 1.4);

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(-3.4, -3.4, 6.8, 3.8, 1.2);
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.globalAlpha = vis * 0.9;
    ctx.fillRect(-2.4, -2.6, 4.8, 2.2);
    ctx.globalAlpha = vis;
  }

  // 4. Layered segmented shoulder pauldrons with squad chevron trim
  for (const side of [-1, 1]) {
    const px = side * 7.6;
    ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(px, -5.2, 4.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      ctx.fillStyle = armorHighlight;
      ctx.beginPath();
      ctx.arc(px, -5.6, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.fillRect(px - 1.4, -6.0, 2.8, 1.1);
    }
  }

  // 5. Articulated two-handed aiming arms, forearm gauntlets, tactical gloves & weapon
  ctx.save();
  ctx.translate(0, -1.6);
  ctx.rotate(unit.angle);

  const supportReach =
    unit.weaponId === 'pistol'
      ? 8.5
      : unit.weaponId === 'sniper'
        ? 14.5
        : unit.weaponId === 'shotgun'
          ? 14.0
          : 12.5;

  // Support (left) arm + armored forearm vambrace + dark glove on handguard
  ctx.fillStyle = flash ? PALETTE.textHi : armorShade;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.55;
  ctx.beginPath();
  ctx.roundRect(1.0, 0.6, supportReach, 4.3, 2);
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(supportReach - 2.2, 0.4, 3.6, 4.5, 1.4);
    ctx.fill();
    ctx.stroke();
  }

  // Trigger (right) arm + forearm gauntlet + gloved trigger hand
  ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
  ctx.beginPath();
  ctx.roundRect(-1.4, -4.0, 9.8, 4.8, 2.2);
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = armorHighlight;
    ctx.fillRect(1.2, -3.2, 4.4, 1.6);
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(5.8, -3.8, 3.4, 4.4, 1.3);
    ctx.fill();
    ctx.stroke();
  }

  drawHumanWeapon(ctx, unit.weaponId, glow, flash);
  ctx.restore();

  // 6. Sculpted Ballistic Combat Helmet with ARC rails, ear-pro comms, side module & panoramic HUD visor
  ctx.fillStyle = flash ? PALETTE.textHi : armorColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -11.8, 8.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Upper crown armor plate & center ridge crest
    ctx.fillStyle = armorShade;
    ctx.beginPath();
    ctx.arc(0, -12.4, 6.2, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = armorHighlight;
    ctx.beginPath();
    ctx.roundRect(-2.3, -19.5, 4.6, 5.6, 1.6);
    ctx.fill();
    ctx.stroke();

    // Dual ear-pro comm pods + side helmet accessory rail module
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.roundRect(-8.8, -13.6, 2.6, 4.6, 1.1);
    ctx.roundRect(6.2, -13.6, 2.6, 4.6, 1.1);
    ctx.fill();
    ctx.stroke();

    // Side-mounted tactical lamp / telemetry pod on rear-facing ear rail
    const podX = dir > 0 ? -7.2 : 4.6;
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(podX, -15.4, 2.6, 2.0);
  }

  // Panoramic recessed dark ballistic visor housing
  const visorX = dir > 0 ? -1.4 : -7.4;
  ctx.fillStyle = PALETTE.bg0;
  ctx.beginPath();
  ctx.roundRect(visorX, -14.4, 8.8, 5.2, 2.2);
  ctx.fill();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Glowing tactical HUD visor optics + dual crisp specular glints
  ctx.fillStyle = glow;
  ctx.fillRect(dir > 0 ? 0.6 : -6.2, -12.8, 5.6, 1.9);
  ctx.fillStyle = PALETTE.textHi;
  ctx.globalAlpha = vis * 0.88;
  ctx.fillRect(dir > 0 ? 4.0 : -5.6, -13.6, 2.0, 1.0);
  ctx.fillRect(dir > 0 ? 1.4 : -2.6, -13.5, 1.0, 0.8);
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

  // Translucent energy shield bubble when unit carries active shield charge
  if ((unit.shield ?? 0) > 0) {
    const shieldPulse = 0.85 + 0.15 * Math.sin(time * 6 + unit.pos.x * 0.05);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -3, 18.5 * shieldPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function drawUnitSilhouette(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  isRampage = false,
): void {
  const color = isRampage
    ? unit.isPlayer
      ? '#FFFFFF'
      : '#9CA3AF'
    : unit.team === 'player'
      ? PALETTE.playerGlow
      : PALETTE.enemyGlow;
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
  isRampage = false,
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

  ctx.fillStyle = isRampage
    ? unit.isPlayer
      ? ratio < 0.3
        ? PALETTE.gold
        : '#FFFFFF'
      : '#9CA3AF'
    : unit.team === 'player'
      ? ratio < 0.3
        ? PALETTE.gold
        : PALETTE.success
      : PALETTE.danger;
  if (ratio > 0) {
    ctx.beginPath();
    ctx.roundRect(-bw / 2, barY, Math.max(2, bw * ratio), bh, 1.2);
    ctx.fill();
  }

  // Crisp cyan shield bar right below the HP bar when shielded
  const shield = unit.shield ?? 0;
  const maxShield = unit.maxShield ?? 50;
  if (shield > 0 && maxShield > 0) {
    const sRatio = Math.max(0, Math.min(1, shield / maxShield));
    ctx.fillStyle = 'rgba(7, 11, 20, 0.88)';
    ctx.fillRect(-bw / 2, barY + bh + 1, bw, 2.5);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(-bw / 2, barY + bh + 1, Math.max(2, bw * sRatio), 2.5);
  }

  if (unit.isPlayer) {
    ctx.font = '800 11px Bahnschrift, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillText(isRampage ? `You (${unit.kills})` : 'You', 1, barY - 5);
    ctx.fillStyle = isRampage ? '#FFFFFF' : PALETTE.playerGlow;
    ctx.fillText(isRampage ? `You (${unit.kills})` : 'You', 0, barY - 6);
  } else if (isRampage) {
    const tag = `${unit.name ?? 'Bot'} · ${unit.kills}`;
    ctx.font = '700 10px Bahnschrift, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#05070B';
    ctx.fillText(tag, 1, barY - 5);
    ctx.fillStyle = '#D1D5DB';
    ctx.fillText(tag, 0, barY - 6);
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
  isRampage = false,
): void {
  for (const unit of units) {
    if (unit.dead) continue;
    const vis = visibilityAlpha.get(unit.id) ?? 1;
    if (vis <= 0.02) continue;
    const flash = (hitFlash.get(unit.id) ?? 0) > 0;
    drawUnitBody(ctx, unit, vis, flash, time, isRampage);
    drawUnitOverlay(ctx, unit, vis, colorblindAssist, isRampage);
  }
}
