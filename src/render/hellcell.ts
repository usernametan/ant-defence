import type { HellcellBoss, HellcellState, Vec2 } from '../shared/types';
import { PALETTE } from './palette';

/** Draw ground telegraphs, Zone B emergence breach portal, acid puddles, rocket reticles, and venom spray cone. */
export function drawHellcellGroundLayer(
  ctx: CanvasRenderingContext2D,
  hellcell: Readonly<HellcellState> | undefined,
  tileSize: number,
  time: number,
  zoneBCenter?: Vec2,
): void {
  if (!hellcell) return;

  // 0. Hellcell Breach Crater & Emergence Vortex (Zone B first, then random map breach spots)
  const breachCenter = hellcell.spawnPos ?? zoneBCenter ?? hellcell.boss?.pos;
  if (breachCenter && (hellcell.phase === 'WARNING' || hellcell.phase === 'CEASEFIRE_BOSS')) {
    const isWarning = hellcell.phase === 'WARNING';
    const pulse = 0.5 + 0.5 * Math.sin(time * (isWarning ? 9 : 4.5));
    const outerR = tileSize * (isWarning ? 2.8 : 3.2);
    ctx.save();
    ctx.translate(breachCenter.x, breachCenter.y);

    // Abyssal ground fissure glow
    const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, outerR);
    grad.addColorStop(0, isWarning ? 'rgba(244, 63, 94, 0.52)' : 'rgba(220, 38, 38, 0.38)');
    grad.addColorStop(0.55, 'rgba(255, 90, 60, 0.22)');
    grad.addColorStop(1, 'rgba(7, 11, 20, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Jagged magma/energy ground cracks radiating from Zone B
    ctx.strokeStyle = isWarning ? 'rgba(253, 164, 175, 0.75)' : 'rgba(255, 90, 60, 0.55)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const r1 = tileSize * 0.7;
      const r2 = tileSize * 1.65;
      const r3 = outerR * (0.85 + 0.12 * ((i % 2) * 2 - 1));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a + 0.14) * r2, Math.sin(a + 0.14) * r2);
      ctx.lineTo(Math.cos(a - 0.08) * r3, Math.sin(a - 0.08) * r3);
      ctx.stroke();
    }

    // Rotating breach containment ring
    ctx.rotate(time * (isWarning ? 1.8 : 0.75));
    ctx.strokeStyle = isWarning ? '#F43F5E' : 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, tileSize * (2.25 + pulse * 0.15), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 1. Glowing neon-green acid puddles (Jungle Outpost Leviathan hazard)
  for (const pool of hellcell.acidPools) {
    const fade = Math.min(1, pool.ttl / 0.8);
    const pulse = 1 + 0.07 * Math.sin(time * 6.5 + pool.tileX);
    ctx.save();
    ctx.translate(pool.pos.x, pool.pos.y);
    ctx.globalAlpha = 0.86 * fade;

    ctx.fillStyle = '#14532D';
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(
      -tileSize * 0.54 * pulse,
      -tileSize * 0.54 * pulse,
      tileSize * 1.08 * pulse,
      tileSize * 1.08 * pulse,
      8,
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.roundRect(
      -tileSize * 0.42,
      -tileSize * 0.42,
      tileSize * 0.84,
      tileSize * 0.84,
      6,
    );
    ctx.fill();

    ctx.fillStyle = '#A3E635';
    ctx.beginPath();
    ctx.roundRect(
      -tileSize * 0.25,
      -tileSize * 0.25,
      tileSize * 0.5,
      tileSize * 0.5,
      4,
    );
    ctx.fill();

    // Bubbling acid Spores
    ctx.fillStyle = '#ECFCCB';
    const b1 = Math.sin(time * 7.5 + pool.tileX * 2) * 6;
    const b2 = Math.cos(time * 6.5 + pool.tileY * 2) * 6;
    ctx.beginPath();
    ctx.arc(b1, -4, 2.8, 0, Math.PI * 2);
    ctx.arc(-5, b2 + 3, 2.2, 0, Math.PI * 2);
    ctx.arc(4, -b2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Translucent red target reticles before Dreadnought rocket impact
  for (const ret of hellcell.reticles) {
    const progress = 1 - Math.max(0, Math.min(1, ret.timer / Math.max(0.01, ret.maxTimer)));
    ctx.save();
    ctx.translate(ret.targetPos.x, ret.targetPos.y);

    ctx.fillStyle = `rgba(244, 63, 94, ${(0.22 + progress * 0.16).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(0, 0, ret.splashRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.88)';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, ret.splashRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shrinking impact timing ring
    ctx.strokeStyle = '#FDA4AF';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(4, ret.splashRadius * (1 - progress)), 0, Math.PI * 2);
    ctx.stroke();

    // Growing core impact point
    ctx.fillStyle = `rgba(244, 63, 94, ${(0.35 + progress * 0.55).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 4 + progress * 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Translucent neon-green venom spray cone with animated toxic droplets
  if (hellcell.venomCone) {
    const cone = hellcell.venomCone;
    const alpha = Math.min(1, cone.ttl / Math.max(0.01, cone.maxTtl));
    ctx.save();
    ctx.translate(cone.pos.x, cone.pos.y);
    const coneGrad = ctx.createRadialGradient(0, 0, 16, 0, 0, cone.range);
    coneGrad.addColorStop(0, `rgba(190, 242, 100, ${(0.55 * alpha).toFixed(2)})`);
    coneGrad.addColorStop(0.6, `rgba(74, 222, 128, ${(0.38 * alpha).toFixed(2)})`);
    coneGrad.addColorStop(1, `rgba(22, 163, 74, ${(0.14 * alpha).toFixed(2)})`);
    ctx.fillStyle = coneGrad;
    ctx.strokeStyle = `rgba(190, 242, 100, ${(0.85 * alpha).toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, cone.range, cone.angle - cone.halfArc, cone.angle + cone.halfArc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(217, 249, 157, ${(0.85 * alpha).toFixed(2)})`;
    for (let d = 0; d < 10; d += 1) {
      const frac = ((time * 2.4 + d * 0.1) % 1);
      const da = cone.angle + Math.sin(d * 2.3) * cone.halfArc * 0.85;
      const dr = 34 + frac * (cone.range - 40);
      ctx.beginPath();
      ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, 3.2 - frac * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Draw enormous 2D code-animated Hellcell Bosses, world health bars, and projectiles. */
export function drawHellcellEntities(
  ctx: CanvasRenderingContext2D,
  hellcell: Readonly<HellcellState> | undefined,
  time: number,
): void {
  if (!hellcell) return;

  if (hellcell.boss && hellcell.boss.hp > 0) {
    drawBoss(ctx, hellcell.boss, time);
  }

  // Draw Boss Projectiles (heavy siege missiles, toxic venom globs, spinning cursed bone scythes)
  for (const proj of hellcell.bossProjectiles) {
    ctx.save();
    if (proj.kind === 'rocket') {
      const backX = proj.pos.x - Math.cos(proj.rotation) * 28;
      const backY = proj.pos.y - Math.sin(proj.rotation) * 28;
      ctx.strokeStyle = 'rgba(255, 138, 107, 0.78)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(backX, backY);
      ctx.lineTo(proj.pos.x, proj.pos.y);
      ctx.stroke();

      ctx.translate(proj.pos.x, proj.pos.y);
      ctx.rotate(proj.rotation);

      // Thruster flame cone
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(-11, -3.5);
      ctx.lineTo(-21 - Math.sin(time * 40) * 4, 0);
      ctx.lineTo(-11, 3.5);
      ctx.closePath();
      ctx.fill();

      // Stabilizer fins
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = PALETTE.bg0;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-14, -9);
      ctx.lineTo(-5, -4);
      ctx.moveTo(-10, 4);
      ctx.lineTo(-14, 9);
      ctx.lineTo(-5, 4);
      ctx.fill();
      ctx.stroke();

      // Heavy missile body
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(-11, -5, 22, 10, 4);
      ctx.fill();
      ctx.stroke();

      // Crimson warhead nose
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.roundRect(1, -5, 11, 10, 4);
      ctx.fill();
      ctx.stroke();
    } else if (proj.kind === 'venomBlob') {
      ctx.translate(proj.pos.x, proj.pos.y);
      ctx.rotate(proj.rotation);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
      ctx.beginPath();
      ctx.arc(-5, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = PALETTE.bg0;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#BEF264';
      ctx.beginPath();
      ctx.arc(-2.5, -2.5, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.kind === 'bone') {
      const speed = Math.hypot(proj.vel.x, proj.vel.y) || 1;
      const nx = proj.vel.x / speed;
      const ny = proj.vel.y / speed;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
      ctx.lineWidth = 3.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(proj.pos.x - nx * 32, proj.pos.y - ny * 32);
      ctx.lineTo(proj.pos.x, proj.pos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.translate(proj.pos.x, proj.pos.y);
      ctx.rotate(proj.rotation);

      // Cursed cyan aura around spinning giant bone
      ctx.fillStyle = 'rgba(34, 211, 238, 0.24)';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = PALETTE.bg0;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-13, -3.5, 26, 7, 3);
      ctx.fill();
      ctx.stroke();
      for (const endX of [-12, 12]) {
        for (const endY of [-4.5, 4.5]) {
          ctx.beginPath();
          ctx.arc(endX, endY, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: HellcellBoss, time: number): void {
  const enraged = boss.hp < boss.maxHp * 0.5;
  ctx.save();
  ctx.translate(boss.pos.x, boss.pos.y);

  // Enormous ground shadow & menacing shockwave aura beneath the boss
  const auraRadius = boss.radius + 26 + Math.sin(time * 5) * 6;
  const auraGrad = ctx.createRadialGradient(0, 0, boss.radius * 0.35, 0, 0, auraRadius);
  if (boss.kind === 'venomCobra') {
    auraGrad.addColorStop(0, 'rgba(34, 197, 94, 0.42)');
    auraGrad.addColorStop(0.65, 'rgba(21, 128, 61, 0.22)');
  } else if (boss.kind === 'pharaohSkeleton') {
    auraGrad.addColorStop(0, 'rgba(34, 211, 238, 0.42)');
    auraGrad.addColorStop(0.65, 'rgba(234, 179, 8, 0.22)');
  } else {
    auraGrad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
    auraGrad.addColorStop(0.65, 'rgba(255, 90, 60, 0.22)');
  }
  auraGrad.addColorStop(1, 'rgba(7, 11, 20, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  // Heavy dark contact ring
  ctx.fillStyle = 'rgba(7, 11, 20, 0.62)';
  ctx.beginPath();
  ctx.arc(0, 6, boss.radius + 10, 0, Math.PI * 2);
  ctx.fill();

  // Enraged outer lightning/threat ring when < 50% HP
  if (enraged) {
    ctx.save();
    ctx.rotate(-time * 2.4);
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (boss.kind === 'rocketSiegeBot') {
    drawRocketSiegeBot(ctx, boss, time);
  } else if (boss.kind === 'venomCobra') {
    drawVenomCobra(ctx, boss, time);
  } else {
    drawPharaohSkeleton(ctx, boss, time);
  }

  // World-space proportional segmented Boss Health Bar floating above the colossal monster
  drawBossWorldHealthBar(ctx, boss);

  ctx.restore();
}

function drawBossWorldHealthBar(ctx: CanvasRenderingContext2D, boss: HellcellBoss): void {
  // Estimate total players from maxHp (~1350-1450 HP per player) so bar width & segments scale proportionally
  const approxPlayers = Math.max(4, Math.min(20, Math.round(boss.maxHp / 1400)));
  const barW = Math.min(220, 108 + approxPlayers * 5.5);
  const barH = 11;
  const yOffset = -boss.radius - 36;
  const ratio = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)));
  const enraged = ratio < 0.5;

  ctx.save();
  ctx.font = '800 10px Bahnschrift, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.bg0;
  ctx.fillText(boss.name, 1, yOffset - 8);
  ctx.fillStyle = enraged ? '#FDA4AF' : '#FACC15';
  ctx.fillText(boss.name, 0, yOffset - 9);

  ctx.fillStyle = 'rgba(7, 11, 20, 0.92)';
  ctx.strokeStyle = enraged ? '#FB7185' : '#F43F5E';
  ctx.lineWidth = enraged ? 2.2 : 1.8;
  ctx.beginPath();
  ctx.roundRect(-barW * 0.5 - 3, yOffset - 3, barW + 6, barH + 6, 4);
  ctx.fill();
  ctx.stroke();

  const fillW = barW * ratio;
  if (fillW > 0) {
    const grad = ctx.createLinearGradient(-barW * 0.5, 0, barW * 0.5, 0);
    grad.addColorStop(0, '#DC2626');
    grad.addColorStop(0.55, '#FF5A3C');
    grad.addColorStop(1, '#FACC15');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-barW * 0.5, yOffset, fillW, barH, 2.5);
    ctx.fill();
  }

  // Proportional per-player segment dividers
  ctx.strokeStyle = 'rgba(7, 11, 20, 0.8)';
  ctx.lineWidth = 1.2;
  for (let i = 1; i < approxPlayers; i += 1) {
    const sx = -barW * 0.5 + (barW * i) / approxPlayers;
    ctx.beginPath();
    ctx.moveTo(sx, yOffset);
    ctx.lineTo(sx, yOffset + barH);
    ctx.stroke();
  }
  ctx.restore();
}

/** A. Sci-Fi Arena Boss: COLOSSAL OMEGA SIEGE DREADNOUGHT (~176x176px multi-legged spider-tank mecha) */
function drawRocketSiegeBot(ctx: CanvasRenderingContext2D, boss: HellcellBoss, time: number): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 3.2;

  // 4 Articulated Hydraulic Spider-Tank Siege Legs at the corners with walking stride animation
  const corners: Array<[number, number, number]> = [
    [-1, -1, 0],
    [1, -1, Math.PI * 0.5],
    [-1, 1, Math.PI],
    [1, 1, Math.PI * 1.5],
  ];
  for (const [cx, cy, phase] of corners) {
    const stride = Math.sin(time * 5.5 + phase) * 5;
    const footX = cx * 68 + stride;
    const footY = cy * 68 - stride * 0.5;
    const kneeX = cx * 46;
    const kneeY = cy * 46;

    // Hydraulic leg strut
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx * 28, cy * 28);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx * 28, cy * 28);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    // Armored claw footpad
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(footX, footY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing knee piston node
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Enormous Octagonal Dreadnought Lower Chassis (112x112px)
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.roundRect(-56, -56, 112, 112, 18);
  ctx.fill();
  ctx.stroke();

  // Inner beveled titanium armor deck
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(-46, -46, 92, 92, 14);
  ctx.fill();
  ctx.stroke();

  // High-contrast industrial yellow hazard stripes on all 4 armor corners
  ctx.fillStyle = '#FACC15';
  for (const sx of [-42, 20]) {
    for (const sy of [-42, 34]) {
      ctx.fillRect(sx, sy, 22, 7);
    }
  }

  // Glowing crimson thermal exhaust vents on the hull
  ctx.fillStyle = '#F43F5E';
  ctx.fillRect(-38, -8, 8, 16);
  ctx.fillRect(30, -8, 8, 16);

  // Rotating Colossal Upper Superstructure, Twin Multi-Tube Missile Pods & Rotary Plasma Cannons
  ctx.save();
  ctx.rotate(boss.angle);
  const recoilScale = 1 - boss.attackAnim * 0.14;
  const podRecoilX = -boss.attackAnim * 12;
  ctx.scale(recoilScale, 2 - recoilScale);

  // Twin Heavy Rotary Plasma Cannons extending forward
  for (const side of [-1, 1]) {
    const cy = side * 22;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(18 + podRecoilX * 0.6, cy - 6, 38, 12, 3);
    ctx.fill();
    ctx.stroke();

    // Glowing plasma barrel coils
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(32 + podRecoilX * 0.6, cy - 3, 14, 6);
  }

  // Colossal Twin Shoulder Missile Batteries (2x4 Warhead Silos on each shoulder)
  for (const side of [-1, 1]) {
    const py = side * 46;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(-28 + podRecoilX, py - 15, 56, 30, 7);
    ctx.fill();
    ctx.stroke();

    // Dark recessed missile bays
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-20 + podRecoilX, py - 11, 40, 22);

    // 2x4 glowing warhead tips inside each pod
    ctx.fillStyle = '#FF5A3C';
    for (let col = 0; col < 4; col += 1) {
      for (const rowY of [-6, 3]) {
        ctx.beginPath();
        ctx.arc(-13 + col * 9 + podRecoilX, py + rowY + 1.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Central Gunmetal Dreadnought Turret Dome
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.arc(-3, -3, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spinning crimson plasma core turbine in center of turret
  ctx.save();
  ctx.rotate(time * 4);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-4, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F43F5E';
  for (let b = 0; b < 4; b += 1) {
    ctx.rotate(Math.PI * 0.5);
    ctx.fillRect(2, -2.5, 9, 5);
  }
  ctx.restore();

  // Menacing Cybernetic Armored Visor & Sweeping Crimson Laser Eye
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(12, -20, 20, 40, 7);
  ctx.fill();
  ctx.stroke();

  const scanY = Math.sin(time * 7) * 10;
  ctx.fillStyle = '#F43F5E';
  ctx.fillRect(16, -15, 11, 30);
  ctx.fillStyle = '#FFE4E6';
  ctx.fillRect(19, scanY - 5, 6, 10);
  ctx.restore();
}

/** B. Jungle Outpost Boss: COLOSSAL HYDRA-VIPER LEVIATHAN (~210px coiling apex serpent monster) */
function drawVenomCobra(ctx: CanvasRenderingContext2D, boss: HellcellBoss, time: number): void {
  ctx.save();
  ctx.rotate(boss.angle);
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 3.2;

  // 8 Massive Undulating Serpent Body & Tail Segments with Dorsal Spines & Bioluminescent Veins
  for (let i = 8; i >= 1; i -= 1) {
    const segX = -i * 15;
    const segY = Math.sin(time * 6.4 + i * 0.85) * (6 + i * 2.4);
    const r = Math.max(12, 38 - i * 3.1);

    // Side spine barbs on body segments
    ctx.fillStyle = '#14532D';
    ctx.beginPath();
    ctx.moveTo(segX, segY - r);
    ctx.lineTo(segX - 9, segY - r - 9);
    ctx.lineTo(segX + 6, segY - r * 0.6);
    ctx.moveTo(segX, segY + r);
    ctx.lineTo(segX - 9, segY + r + 9);
    ctx.lineTo(segX + 6, segY + r * 0.6);
    ctx.fill();
    ctx.stroke();

    // Armored scale segment
    ctx.fillStyle = i % 2 === 0 ? '#15803D' : '#166534';
    ctx.beginPath();
    ctx.arc(segX, segY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing toxic bioluminescent ring & golden dorsal chevron
    ctx.fillStyle = '#4ADE80';
    ctx.beginPath();
    ctx.arc(segX + 2, segY, r * 0.52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(segX + 4, segY, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Aggressive forward strike lunge on attack
  const lungeX = boss.attackAnim * 18;
  ctx.translate(lungeX, 0);

  // Colossal Flared King-Cobra Hood Wings (~112px span!)
  ctx.fillStyle = '#14532D';
  ctx.beginPath();
  ctx.ellipse(-6, 0, 42, 56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#16A34A';
  ctx.beginPath();
  ctx.ellipse(-4, 0, 35, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ribbed bone struts across the flared hood
  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 2.6;
  for (const side of [-1, 1]) {
    for (const angleOffset of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(0, side * 10);
      ctx.lineTo(Math.sin(angleOffset) * 24, side * 44);
      ctx.stroke();
    }
  }

  // Hypnotic pulsing gold-and-obsidian eyespot spectacles on the hood wings
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2.6;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(-8, side * 28, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#070B14';
    ctx.beginPath();
    ctx.arc(-8, side * 28, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Backward-swept venomous horn crown
  ctx.fillStyle = '#FEF08A';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-10, side * 14);
    ctx.lineTo(-32, side * 24);
    ctx.lineTo(-18, side * 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Massive Armored Reptilian Head & Snout
  ctx.fillStyle = '#22C55E';
  ctx.beginPath();
  ctx.ellipse(10, 0, 32, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner toxic crest plate
  ctx.fillStyle = '#4ADE80';
  ctx.beginPath();
  ctx.ellipse(6, 0, 20, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4 Curved Ivory Venom Fangs protruding from the front jaws
  ctx.fillStyle = '#F8FAFC';
  for (const fy of [-15, -7, 7, 15]) {
    ctx.beginPath();
    ctx.moveTo(36, fy - 3);
    ctx.lineTo(50, fy);
    ctx.lineTo(36, fy + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Whipping Forked Neon-Crimson Tongue
  const tongueWave = Math.sin(time * 15) * 5;
  ctx.strokeStyle = '#F43F5E';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(42, 0);
  ctx.lineTo(58, tongueWave * 0.5);
  ctx.lineTo(68, tongueWave - 7);
  ctx.moveTo(58, tongueWave * 0.5);
  ctx.lineTo(68, tongueWave + 7);
  ctx.stroke();

  // Blazing Slit-Pupil Predator Eyes
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#BEF264';
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(20, side * 12, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vertical reptile slit pupil
    ctx.fillStyle = '#070B14';
    ctx.beginPath();
    ctx.ellipse(21, side * 12, 4.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** C. Ancient Temple Boss: COLOSSAL NECRO-PHARAOH TITAN (~190x190px undead skeletal overlord) */
function drawPharaohSkeleton(ctx: CanvasRenderingContext2D, boss: HellcellBoss, time: number): void {
  // Rotating Ancient Hieroglyphic Ritual Seal beneath the Titan
  ctx.save();
  ctx.rotate(time * 0.65);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.38)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, boss.radius + 8, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (boss.radius - 10), Math.sin(a) * (boss.radius - 10));
    ctx.lineTo(Math.cos(a) * (boss.radius + 8), Math.sin(a) * (boss.radius + 8));
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(boss.angle);
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 3.2;

  // Colossal Ribcage & Roaring Turquoise Soul-Flame Core
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(-6, 0, 36, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pulsing Soul-Flame Furnace inside the Ribcage
  const soulPulse = 1 + Math.sin(time * 9) * 0.14;
  ctx.fillStyle = 'rgba(34, 211, 238, 0.78)';
  ctx.beginPath();
  ctx.arc(-4, 0, 22 * soulPulse, 0, Math.PI * 2);
  ctx.fill();

  // Giant Curved Ivory Ribs
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 5;
  for (const ry of [-28, -16, 16, 28]) {
    ctx.beginPath();
    ctx.moveTo(-22, ry);
    ctx.quadraticCurveTo(0, ry * 1.15, 16, ry * 0.8);
    ctx.stroke();
  }

  // Ornate Gold-and-Lapis Winged Scarab Shoulder Pauldrons
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.roundRect(-22, side * 42 - 14, 38, 28, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(-16, side * 42 - 8, 26, 16);
  }

  // Two Enormous Articulated Skeletal Arms & 4-Clawed Gauntlets Wreathed in Cyan Soul-Fire
  const punchX = boss.attackAnim * 28;
  for (const side of [-1, 1]) {
    const bobX = Math.sin(time * 4.2 + side * 1.4) * 6 + punchX;
    const bobY = side * 60 + Math.cos(time * 4.2 + side * 1.4) * 6;

    // Forearm bone connecting shoulder to giant claw hand
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, side * 44);
    ctx.lineTo(14 + bobX * 0.5, side * 54);
    ctx.lineTo(24 + bobX, bobY);
    ctx.stroke();

    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-4, side * 44);
    ctx.lineTo(14 + bobX * 0.5, side * 54);
    ctx.lineTo(24 + bobX, bobY);
    ctx.stroke();

    ctx.save();
    ctx.translate(26 + bobX, bobY);

    // Soul-fire glow around gauntlet
    ctx.fillStyle = 'rgba(34, 211, 238, 0.34)';
    ctx.beginPath();
    ctx.arc(4, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    // Jeweled Golden Wrist Cuff
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = PALETTE.bg0;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.roundRect(-14, -12, 11, 24, 4);
    ctx.fill();
    ctx.stroke();

    // Enormous Skeletal Palm & Four Razor Claws
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(-3, -14, 20, 28, 6);
    ctx.fill();
    ctx.stroke();

    for (const cy of [-10, -3.5, 3.5, 10]) {
      ctx.beginPath();
      ctx.moveTo(16, cy - 2.6);
      ctx.lineTo(31, cy);
      ctx.lineTo(16, cy + 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Towering Gold-and-Cobalt Royal Pharaoh Nemes Headdress (84x92px)
  ctx.fillStyle = '#EAB308';
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.roundRect(-44, -46, 76, 92, 18);
  ctx.fill();
  ctx.stroke();

  // Royal Lapis Blue Headdress Stripes
  ctx.fillStyle = '#1D4ED8';
  for (const sy of [-34, -22, -10, 10, 22, 34]) {
    ctx.fillRect(-39, sy - 3, 66, 6);
  }

  // Colossal Battle-Cracked Ivory Skull
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(4, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ceremonial Golden Pharaoh Chin Beard extending forward
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.roundRect(28, -6, 18, 12, 4);
  ctx.fill();
  ctx.stroke();

  // Deep Jagged Battle Cracks across Skull Crown
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-14, -20);
  ctx.lineTo(-3, -9);
  ctx.lineTo(-10, 4);
  ctx.moveTo(-3, -9);
  ctx.lineTo(6, -2);
  ctx.stroke();

  // Golden Royal Uraeus Cobra Emblem on Brow with Ruby Gem
  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = PALETTE.bg0;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(18, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F43F5E';
  ctx.beginPath();
  ctx.arc(19, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Blazing Cyan Soul-Fire Eye Sockets
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(14, side * 14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22D3EE';
    ctx.beginPath();
    ctx.arc(16, side * 14, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ECFEFF';
    ctx.beginPath();
    ctx.arc(17, side * 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
