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

  // 3. Organic jungle venom spray cone with toxic droplets
  if (hellcell.venomCone) {
    const cone = hellcell.venomCone;
    const alpha = Math.min(1, cone.ttl / Math.max(0.01, cone.maxTtl));
    ctx.save();
    ctx.translate(cone.pos.x, cone.pos.y);
    const coneGrad = ctx.createRadialGradient(0, 0, 16, 0, 0, cone.range);
    coneGrad.addColorStop(0, `rgba(132, 204, 22, ${(0.44 * alpha).toFixed(2)})`);
    coneGrad.addColorStop(0.55, `rgba(77, 124, 15, ${(0.34 * alpha).toFixed(2)})`);
    coneGrad.addColorStop(1, `rgba(20, 83, 45, ${(0.1 * alpha).toFixed(2)})`);
    ctx.fillStyle = coneGrad;
    ctx.strokeStyle = `rgba(132, 204, 22, ${(0.65 * alpha).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, cone.range, cone.angle - cone.halfArc, cone.angle + cone.halfArc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(190, 242, 100, ${(0.72 * alpha).toFixed(2)})`;
    for (let d = 0; d < 10; d += 1) {
      const frac = ((time * 2.4 + d * 0.1) % 1);
      const da = cone.angle + Math.sin(d * 2.3) * cone.halfArc * 0.85;
      const dr = 34 + frac * (cone.range - 40);
      ctx.beginPath();
      ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, 2.8 - frac * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Mumbai Local Train ("THE LAST LOCAL") ground telegraphs: headlight beams, charge lane, and 25kV electrical AoE
  const activeBoss = hellcell.boss;
  if (activeBoss && activeBoss.hp > 0 && activeBoss.kind === 'mumbaiTrain') {
    drawTrainGroundTelegraphs(ctx, activeBoss, time);
  }
}

function getTrainCoachesForRender(
  boss: HellcellBoss,
): Array<{ pos: Vec2; angle: number }> {
  if (boss.trainState && boss.trainState.coaches.length > 0) {
    return boss.trainState.coaches;
  }
  const spacing = boss.radius < 45 ? 42 : 94;
  return [0, 1, 2].map((i) => ({
    pos: {
      x: boss.pos.x - Math.cos(boss.angle) * (i * spacing),
      y: boss.pos.y - Math.sin(boss.angle) * (i * spacing),
    },
    angle: boss.angle,
  }));
}

function drawTrainGroundTelegraphs(
  ctx: CanvasRenderingContext2D,
  boss: HellcellBoss,
  time: number,
): void {
  const train = boss.trainState;
  const coaches = getTrainCoachesForRender(boss);
  const head = coaches[0] ?? { pos: boss.pos, angle: boss.angle };
  const behavior = train?.behavior ?? 'cruise';
  const isChargeWindup = behavior === 'chargeWindup';
  const isChargeDash = behavior === 'chargeDash';
  const isElectricWindup = behavior === 'electricWindup';
  const isElectricPulse = behavior === 'electricPulse';

  // Subtle dust wake behind coaches while train is rolling fast
  const speed = train?.speed ?? 200;
  if (speed > 110) {
    const dustAlpha = Math.min(0.24, (speed / 800) * 0.24);
    ctx.save();
    for (let c = 0; c < coaches.length; c += 1) {
      const coach = coaches[c];
      for (let p = 0; p < 3; p += 1) {
        const phase = (time * 3.8 + c * 0.37 + p * 0.33) % 1;
        const backDist = 30 + phase * 38;
        const side = (p % 2 === 0 ? 1 : -1) * (14 + phase * 12);
        const dx =
          coach.pos.x - Math.cos(coach.angle) * backDist - Math.sin(coach.angle) * side;
        const dy =
          coach.pos.y - Math.sin(coach.angle) * backDist + Math.cos(coach.angle) * side;
        ctx.fillStyle = `rgba(148, 134, 114, ${((1 - phase) * dustAlpha).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(dx, dy, 4 + phase * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Twin warm headlight illumination cones projected forward onto ground
  ctx.save();
  ctx.translate(head.pos.x, head.pos.y);
  ctx.rotate(head.angle);
  const flicker =
    isChargeWindup || isChargeDash
      ? 1
      : 0.72 + 0.28 * Math.sin(time * 23 + Math.sin(time * 7.3) * 2);
  const beamLen = isChargeDash ? 210 : isChargeWindup ? 185 : 118;
  const beamSpread = isChargeDash ? 42 : isChargeWindup ? 36 : 26;
  const beamAlpha = isChargeDash ? 0.34 : isChargeWindup ? 0.28 : 0.16 * flicker;
  for (const side of [-1, 1]) {
    const beamGrad = ctx.createLinearGradient(42, side * 12, 42 + beamLen, side * 12);
    beamGrad.addColorStop(0, `rgba(253, 224, 71, ${beamAlpha.toFixed(2)})`);
    beamGrad.addColorStop(0.55, `rgba(245, 158, 11, ${(beamAlpha * 0.4).toFixed(2)})`);
    beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(41, side * 12 - 3);
    ctx.lineTo(42 + beamLen, side * 14 - beamSpread);
    ctx.lineTo(42 + beamLen, side * 14 + beamSpread);
    ctx.lineTo(41, side * 12 + 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Charge Attack Directional Warning Corridor
  if (train && (isChargeWindup || isChargeDash)) {
    const len = train.chargeLength;
    const halfW = 30;
    const progress = isChargeDash
      ? 1
      : 1 - Math.max(0, Math.min(1, train.behaviorTimer / 1.05));
    ctx.save();
    ctx.translate(head.pos.x, head.pos.y);
    ctx.rotate(train.chargeAngle);

    ctx.fillStyle = isChargeDash
      ? 'rgba(220, 38, 38, 0.22)'
      : `rgba(234, 88, 12, ${(0.1 + progress * 0.16).toFixed(2)})`;
    ctx.fillRect(38, -halfW, len, halfW * 2);

    // Progressive charge fill indicator
    ctx.fillStyle = `rgba(239, 68, 68, ${(0.14 + progress * 0.18).toFixed(2)})`;
    ctx.fillRect(38, -halfW, len * progress, halfW * 2);

    // Industrial hazard track rails along warning lane
    ctx.strokeStyle = isChargeDash
      ? 'rgba(248, 113, 113, 0.78)'
      : 'rgba(245, 158, 11, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(38, -halfW);
    ctx.lineTo(38 + len, -halfW);
    ctx.moveTo(38, halfW);
    ctx.lineTo(38 + len, halfW);
    ctx.stroke();
    ctx.setLineDash([]);

    // Forward directional chevrons
    ctx.strokeStyle = `rgba(253, 224, 71, ${(0.35 + progress * 0.45).toFixed(2)})`;
    ctx.lineWidth = 2;
    for (let cx = 74; cx < len + 20; cx += 56) {
      ctx.beginPath();
      ctx.moveTo(cx - 10, -13);
      ctx.lineTo(cx + 6, 0);
      ctx.lineTo(cx - 10, 13);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Overhead 25kV Electrical Attack Area Indicator & Ground Arcs
  if (train && (isElectricWindup || isElectricPulse)) {
    const elecR = train.electricRadius;
    const windupProg = isElectricPulse
      ? 1
      : 1 - Math.max(0, Math.min(1, train.behaviorTimer / 1.05));
    const pulseFade = isElectricPulse
      ? Math.max(0, Math.min(1, train.behaviorTimer / 0.65))
      : 1;

    ctx.save();
    // Soft amber high-voltage hazard wash around all 3 coaches
    for (const coach of coaches) {
      const grad = ctx.createRadialGradient(
        coach.pos.x,
        coach.pos.y,
        24,
        coach.pos.x,
        coach.pos.y,
        elecR + 28,
      );
      const a = isElectricPulse ? 0.24 * pulseFade : 0.1 + windupProg * 0.12;
      grad.addColorStop(0, `rgba(245, 158, 11, ${a.toFixed(2)})`);
      grad.addColorStop(0.7, `rgba(234, 88, 12, ${(a * 0.55).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(coach.pos.x, coach.pos.y, elecR + 28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Perimeter dashed hazard rings per coach + closing timing arc during windup
    for (let i = 0; i < coaches.length; i += 1) {
      const coach = coaches[i];
      ctx.strokeStyle = isElectricPulse
        ? `rgba(253, 224, 71, ${(0.75 * pulseFade).toFixed(2)})`
        : `rgba(245, 158, 11, ${(0.45 + windupProg * 0.4).toFixed(2)})`;
      ctx.lineWidth = isElectricPulse ? 2.4 : 1.8;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(coach.pos.x, coach.pos.y, elecR + 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isElectricWindup) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          coach.pos.x,
          coach.pos.y,
          Math.max(28, (elecR + 22) * (1 - windupProg)),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else if (isElectricPulse) {
        // Jagged overhead electrical discharge arcs snapping from coach roofs to the ground
        for (let b = 0; b < 5; b += 1) {
          const baseA = (b / 5) * Math.PI * 2 + time * 7 + i * 1.4;
          const rEnd = elecR + 18;
          ctx.strokeStyle =
            b % 2 === 0
              ? `rgba(254, 240, 138, ${(0.88 * pulseFade).toFixed(2)})`
              : `rgba(249, 115, 22, ${(0.82 * pulseFade).toFixed(2)})`;
          ctx.lineWidth = b % 2 === 0 ? 2.1 : 1.5;
          ctx.beginPath();
          ctx.moveTo(coach.pos.x, coach.pos.y);
          for (let seg = 1; seg <= 4; seg += 1) {
            const frac = seg / 4;
            const jitter = Math.sin(time * 48 + b * 3.1 + seg * 5.7 + i) * 16;
            const px =
              coach.pos.x +
              Math.cos(baseA) * (rEnd * frac) -
              Math.sin(baseA) * jitter;
            const py =
              coach.pos.y +
              Math.sin(baseA) * (rEnd * frac) +
              Math.cos(baseA) * jitter;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}

export interface HellcellRenderOptions {
  /** 0..1 hit-flash intensity on the active boss. */
  bossHitFlash?: number;
  /** Optional snapshot of a recently defeated boss playing its defeat animation. */
  shutdownBoss?: { boss: HellcellBoss; progress: number } | null;
}

/** Draw enormous 2D code-animated Hellcell Bosses, world health bars, and projectiles. */
export function drawHellcellEntities(
  ctx: CanvasRenderingContext2D,
  hellcell: Readonly<HellcellState> | undefined,
  time: number,
  options?: HellcellRenderOptions,
): void {
  if (!hellcell) return;

  if (options?.shutdownBoss) {
    const { boss, progress } = options.shutdownBoss;
    const clamped = Math.max(0, Math.min(1, progress));
    const visualScale = Math.max(1, boss.radius / 68.8);
    ctx.save();
    ctx.translate(boss.pos.x, boss.pos.y);
    ctx.scale(visualScale, visualScale);
    if (boss.kind === 'rocketSiegeBot') {
      drawRocketSiegeBot(ctx, boss, time, 0, clamped);
    } else if (boss.kind === 'venomCobra') {
      drawJungleCentipede(ctx, boss, time, 0, clamped);
    } else if (boss.kind === 'mumbaiTrain') {
      drawMumbaiLocalTrain(ctx, boss, time, 0, clamped);
    } else {
      drawPharaohGuardian(ctx, boss, time, 0, clamped);
    }
    ctx.restore();
  }

  if (hellcell.boss && hellcell.boss.hp > 0) {
    drawBoss(ctx, hellcell.boss, time, options?.bossHitFlash ?? 0);
  }

  // Draw Boss Projectiles (heavy siege missiles, toxic venom globs, spinning cursed bone scythes)
  for (const proj of hellcell.bossProjectiles) {
    ctx.save();
    if (proj.kind === 'rocket') {
      const backX = proj.pos.x - Math.cos(proj.rotation) * 26;
      const backY = proj.pos.y - Math.sin(proj.rotation) * 26;
      const trailGrad = ctx.createLinearGradient(backX, backY, proj.pos.x, proj.pos.y);
      trailGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
      trailGrad.addColorStop(0.55, 'rgba(148, 163, 184, 0.34)');
      trailGrad.addColorStop(1, 'rgba(251, 146, 60, 0.78)');
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(backX, backY);
      ctx.lineTo(proj.pos.x, proj.pos.y);
      ctx.stroke();

      ctx.translate(proj.pos.x, proj.pos.y);
      ctx.rotate(proj.rotation);

      // Thruster exhaust cone
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.moveTo(-10, -2.8);
      ctx.lineTo(-19 - Math.sin(time * 42) * 3, 0);
      ctx.lineTo(-10, 2.8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FED7AA';
      ctx.beginPath();
      ctx.moveTo(-10, -1.3);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-10, 1.3);
      ctx.closePath();
      ctx.fill();

      // Machined stabilizer fins
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#090E17';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-9, -3.5);
      ctx.lineTo(-13, -7.5);
      ctx.lineTo(-4, -3.5);
      ctx.moveTo(-9, 3.5);
      ctx.lineTo(-13, 7.5);
      ctx.lineTo(-4, 3.5);
      ctx.fill();
      ctx.stroke();

      // Gunmetal missile airframe
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-10, -3.8, 16, 7.6, 2);
      ctx.fill();
      ctx.stroke();

      // Industrial yellow ordnance band
      ctx.fillStyle = '#EAB308';
      ctx.fillRect(0, -3.3, 3, 6.6);

      // Tapered steel warhead cone
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.moveTo(6, -3.6);
      ctx.lineTo(13, -1.1);
      ctx.lineTo(13, 1.1);
      ctx.lineTo(6, 3.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EA580C';
      ctx.fillRect(10.5, -1, 2.5, 2);
    } else if (proj.kind === 'venomBlob') {
      ctx.translate(proj.pos.x, proj.pos.y);
      ctx.rotate(proj.rotation);
      ctx.fillStyle = 'rgba(77, 124, 15, 0.32)';
      ctx.beginPath();
      ctx.arc(-5, 0, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4D7C0F';
      ctx.strokeStyle = '#111612';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#A3E635';
      ctx.beginPath();
      ctx.arc(-2, -2, 3.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.kind === 'bone') {
      const speed = Math.hypot(proj.vel.x, proj.vel.y) || 1;
      const nx = proj.vel.x / speed;
      const ny = proj.vel.y / speed;
      const trailGrad = ctx.createLinearGradient(
        proj.pos.x - nx * 28,
        proj.pos.y - ny * 28,
        proj.pos.x,
        proj.pos.y,
      );
      trailGrad.addColorStop(0, 'rgba(45, 212, 191, 0)');
      trailGrad.addColorStop(1, 'rgba(45, 212, 191, 0.45)');
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(proj.pos.x - nx * 28, proj.pos.y - ny * 28);
      ctx.lineTo(proj.pos.x, proj.pos.y);
      ctx.stroke();

      ctx.translate(proj.pos.x, proj.pos.y);
      ctx.rotate(proj.rotation);

      // Subtle turquoise energy halo around carved sandstone-and-gold ritual disc
      ctx.fillStyle = 'rgba(45, 212, 191, 0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Weathered sandstone & antique-gold throwing blade
      ctx.fillStyle = '#B89B72';
      ctx.strokeStyle = '#1A120B';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-13, -3);
      ctx.lineTo(-4, -5.5);
      ctx.lineTo(13, 0);
      ctx.lineTo(-4, 5.5);
      ctx.lineTo(-13, 3);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#B58D3D';
      ctx.fillRect(-5, -2, 8, 4);

      ctx.fillStyle = '#2DD4BF';
      ctx.beginPath();
      ctx.arc(4, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  boss: HellcellBoss,
  time: number,
  hitFlash = 0,
): void {
  const enraged = boss.hp < boss.maxHp * 0.5;
  const visualScale = Math.max(1, boss.radius / 68.8);
  ctx.save();
  ctx.translate(boss.pos.x, boss.pos.y);

  if (boss.kind === 'rocketSiegeBot') {
    const prep = Math.max(0, Math.min(1, (0.48 - boss.attackTimer) / 0.48));
    // Grounded top-down chassis shadow (offset down-right to match Sci-Fi Arena lighting)
    ctx.fillStyle = 'rgba(4, 7, 14, 0.56)';
    ctx.beginPath();
    ctx.ellipse(6, 9, boss.radius * 0.88, boss.radius * 0.84, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle red-orange under-chassis reactor thermal spill
    const thermalAlpha = 0.14 + prep * 0.16 + (enraged ? 0.08 : 0);
    const thermalGrad = ctx.createRadialGradient(0, 2, 10, 0, 2, boss.radius * 0.92);
    thermalGrad.addColorStop(0, `rgba(234, 88, 12, ${thermalAlpha.toFixed(2)})`);
    thermalGrad.addColorStop(0.65, `rgba(185, 28, 28, ${(thermalAlpha * 0.45).toFixed(2)})`);
    thermalGrad.addColorStop(1, 'rgba(7, 11, 20, 0)');
    ctx.fillStyle = thermalGrad;
    ctx.beginPath();
    ctx.arc(0, 2, boss.radius * 0.92, 0, Math.PI * 2);
    ctx.fill();

    if (enraged) {
      ctx.save();
      ctx.rotate(-time * 1.4);
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.scale(visualScale, visualScale);
    drawRocketSiegeBot(ctx, boss, time, hitFlash, 0);
    ctx.restore();
  } else if (boss.kind === 'venomCobra') {
    const prep = Math.max(0, Math.min(1, (0.45 - boss.attackTimer) / 0.45));
    // Subtle natural organic under-glow (restrained bioluminescent venom sac shadow)
    if (enraged || prep > 0.1) {
      ctx.save();
      ctx.rotate(-time * 1.1);
      ctx.strokeStyle = `rgba(116, 199, 92, ${(0.22 + prep * 0.28).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([10, 9]);
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.scale(visualScale, visualScale);
    drawJungleCentipede(ctx, boss, time, hitFlash, 0);
    ctx.restore();
  } else if (boss.kind === 'mumbaiTrain') {
    drawMumbaiLocalTrain(ctx, boss, time, hitFlash, 0);
  } else {
    const prep = Math.max(0, Math.min(1, (0.45 - boss.attackTimer) / 0.45));
    // Warm desert afternoon ground contact shadow (offset down-right matching Ancient Temple)
    ctx.fillStyle = 'rgba(26, 16, 8, 0.52)';
    ctx.beginPath();
    ctx.ellipse(6, 9, boss.radius * 0.84, boss.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle engraved temple seal pulse during attack preparation or <50% HP
    if (enraged || prep > 0.12) {
      ctx.save();
      ctx.rotate(time * 0.55);
      const ringAlpha = 0.16 + prep * 0.34 + (enraged ? 0.12 : 0);
      ctx.strokeStyle = `rgba(45, 212, 191, ${ringAlpha.toFixed(2)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (boss.radius - 2), Math.sin(a) * (boss.radius - 2));
        ctx.lineTo(Math.cos(a) * (boss.radius + 5), Math.sin(a) * (boss.radius + 5));
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.scale(visualScale, visualScale);
    drawPharaohGuardian(ctx, boss, time, hitFlash, 0);
    ctx.restore();
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

function traceChamferedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  chamfer: number,
): void {
  const c = Math.min(chamfer, w * 0.45, h * 0.45);
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function drawDreadnoughtHazardStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#D99A38';
  const step = 5;
  for (let sx = x - h; sx < x + w + h; sx += step * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + step, y + h);
    ctx.lineTo(sx + step + h, y);
    ctx.lineTo(sx + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawDreadnoughtLeg(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diagPhase: number,
  moveAngle: number,
  time: number,
  shutdownProgress: number,
): void {
  const alive = 1 - shutdownProgress;
  const strideWave = Math.sin(time * 6.2 + diagPhase) * alive;
  const lift = Math.max(0, strideWave) * alive;
  const stepDist = strideWave * 6.5;

  const dirX = Math.cos(moveAngle);
  const dirY = Math.sin(moveAngle);

  // Legs pull slightly inward and settle as the machine powers down
  const reach = 64 - shutdownProgress * 11;
  const hipX = cx * 27;
  const hipY = cy * 27;
  const kneeX = cx * (44 - shutdownProgress * 6) + dirX * stepDist * 0.45;
  const kneeY = cy * (44 - shutdownProgress * 6) + dirY * stepDist * 0.45;
  const footX = cx * reach + dirX * stepDist;
  const footY = cy * reach + dirY * stepDist;

  // Ground shadow beneath footpad and leg linkage
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 14, 0.5)';
  ctx.beginPath();
  ctx.ellipse(
    footX + 3 + lift * 2,
    footY + 4 + lift * 2,
    11 - lift * 1.4,
    9 - lift * 1.1,
    Math.atan2(cy, cx),
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Heavy machined stabilizer footpad
  ctx.save();
  ctx.translate(footX, footY);
  ctx.rotate(Math.atan2(cy, cx));
  const footScale = 1 + lift * 0.07;
  ctx.scale(footScale, footScale);

  ctx.fillStyle = '#182130';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.4;
  traceChamferedRect(ctx, -10, -8.5, 20, 17, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#334155';
  traceChamferedRect(ctx, -6, -5.5, 13, 11, 2.5);
  ctx.fill();
  ctx.stroke();

  // Subtle industrial yellow toe caution tab
  ctx.fillStyle = '#D99A38';
  ctx.fillRect(7, -4, 2.2, 8);
  ctx.restore();

  // Exposed hydraulic actuator piston parallel to upper femur
  const perpX = -cy * 0.707;
  const perpY = cx * 0.707;
  const cylStartX = hipX + perpX * 5.5;
  const cylStartY = hipY + perpY * 5.5;
  const cylEndX = kneeX + perpX * 4.5;
  const cylEndY = kneeY + perpY * 4.5;
  const midPistonX = cylStartX + (cylEndX - cylStartX) * 0.56;
  const midPistonY = cylStartY + (cylEndY - cylStartY) * 0.56;

  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#0B111C';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cylStartX, cylStartY);
  ctx.lineTo(midPistonX, midPistonY);
  ctx.stroke();

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(midPistonX, midPistonY);
  ctx.lineTo(cylEndX, cylEndY);
  ctx.stroke();

  // Primary articulated femur + tibia armor struts
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 10.5;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();

  ctx.strokeStyle = '#2B364B';
  ctx.lineWidth = 7.2;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();

  // Machined knee clevis housing
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(kneeX, kneeY, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.arc(kneeX, kneeY, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Hip ball-joint collar
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(hipX, hipY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDreadnoughtMissilePod(
  ctx: CanvasRenderingContext2D,
  side: number,
  podRecoilX: number,
  shutterOpen: number,
  recoil: number,
  power: number,
): void {
  const py = side * 40;
  const px = -22 + podRecoilX;
  const pw = 46;
  const ph = 22;

  ctx.save();
  ctx.translate(px, py - ph * 0.5);

  // Rear launch exhaust flare when firing salvo
  if (recoil > 0.08 && power > 0.1) {
    const exhaustAlpha = Math.min(1, recoil * 1.1) * power;
    ctx.fillStyle = `rgba(251, 146, 60, ${(exhaustAlpha * 0.75).toFixed(2)})`;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-14 - recoil * 10, ph * 0.5);
    ctx.lineTo(0, ph - 4);
    ctx.closePath();
    ctx.fill();
  }

  // Armored pod outer shell
  ctx.fillStyle = '#253042';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.5;
  traceChamferedRect(ctx, 0, 0, pw, ph, 4);
  ctx.fill();
  ctx.stroke();

  // Recessed launch bay cavity
  ctx.fillStyle = '#080D16';
  ctx.fillRect(6, 3.5, pw - 12, ph - 7);

  // 2x3 tactical missile warheads inside launch tubes
  for (let col = 0; col < 3; col += 1) {
    for (const rowOffset of [7, 15]) {
      const mx = 12 + col * 11;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(mx, rowOffset, 3.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = power > 0.2 ? '#EA580C' : '#475569';
      ctx.beginPath();
      ctx.arc(mx, rowOffset, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sliding armored blast shutters (open wide during attack preparation & salvo)
  const slideOffset = shutterOpen * 7.5;
  const doorH = 7.8;
  ctx.fillStyle = '#3B495E';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.1;

  // Outer shutter leaf
  ctx.fillRect(5, 2.5 - slideOffset * 0.45, pw - 10, doorH);
  ctx.strokeRect(5, 2.5 - slideOffset * 0.45, pw - 10, doorH);

  // Inner shutter leaf
  ctx.fillRect(5, ph - 2.5 - doorH + slideOffset * 0.45, pw - 10, doorH);
  ctx.strokeRect(5, ph - 2.5 - doorH + slideOffset * 0.45, pw - 10, doorH);

  // Hazard stripe along pod flank
  drawDreadnoughtHazardStrip(ctx, 8, side < 0 ? 1 : ph - 4, pw - 16, 3);
  ctx.restore();
}

function drawDreadnoughtReactor(
  ctx: CanvasRenderingContext2D,
  time: number,
  prep: number,
  recoil: number,
  enraged: boolean,
  power: number,
): void {
  const cx = -7;
  const cy = 0;
  const coreRadius = 14;
  const spinRate = 1.6 + prep * 5.2 + (enraged ? 2.1 : 0);

  ctx.save();
  ctx.translate(cx, cy);

  // Heavy machined containment collar
  ctx.fillStyle = '#090E17';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius + 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Internal red-orange reactor plasma glow
  const intensity = power * (0.65 + 0.15 * Math.sin(time * 3.4) + prep * 0.45 + recoil * 0.25);
  if (intensity > 0.02) {
    const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, coreRadius);
    coreGrad.addColorStop(0, `rgba(254, 215, 170, ${Math.min(1, intensity * 1.15).toFixed(2)})`);
    coreGrad.addColorStop(0.4, `rgba(249, 115, 22, ${Math.min(1, intensity * 0.95).toFixed(2)})`);
    coreGrad.addColorStop(0.78, `rgba(185, 28, 28, ${Math.min(1, intensity * 0.78).toFixed(2)})`);
    coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = coreGrad;
  } else {
    ctx.fillStyle = '#141923';
  }
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius - 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Rotating titanium containment vanes (dilate outward during attack preparation)
  ctx.save();
  ctx.rotate(time * spinRate * Math.max(0.15, power));
  const vanePull = prep * 2.8;
  ctx.fillStyle = '#2B364B';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i += 1) {
    ctx.rotate(Math.PI * 0.5);
    ctx.beginPath();
    ctx.moveTo(3 + vanePull, -3);
    ctx.lineTo(coreRadius - 1, -4.5);
    ctx.lineTo(coreRadius - 1, 2.2);
    ctx.lineTo(3 + vanePull, 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Central reactor retaining ring
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A. Sci-Fi Arena Boss: OMEGA SIEGE DREADNOUGHT — industrial autonomous quad-walker combat unit */
function drawRocketSiegeBot(
  ctx: CanvasRenderingContext2D,
  boss: HellcellBoss,
  time: number,
  hitFlash = 0,
  shutdownProgress = 0,
): void {
  const enraged = boss.hp < boss.maxHp * 0.5 && shutdownProgress === 0;
  const prep =
    shutdownProgress > 0 ? 0 : Math.max(0, Math.min(1, (0.48 - boss.attackTimer) / 0.48));
  const recoil = shutdownProgress > 0 ? 0 : boss.attackAnim;

  // Power flicker and fade during mechanical shutdown
  const flicker =
    shutdownProgress > 0 && shutdownProgress < 0.35
      ? Math.sin(shutdownProgress * 75) > -0.2
        ? 0.6
        : 0.1
      : 1;
  const power =
    shutdownProgress > 0
      ? Math.max(0, (1 - shutdownProgress * 1.55) * flicker)
      : 1;
  const hullAlpha =
    shutdownProgress > 0.72 ? Math.max(0, 1 - (shutdownProgress - 0.72) / 0.28) : 1;

  ctx.save();
  ctx.globalAlpha = hullAlpha;
  ctx.lineJoin = 'round';

  // 1. Four articulated quad-walker mechanical legs with coordinated diagonal gait
  const moveAngle = boss.moveAngle ?? boss.angle;
  const legs: ReadonlyArray<[number, number, number]> = [
    [-1, -1, 0],
    [1, -1, Math.PI],
    [-1, 1, Math.PI],
    [1, 1, 0],
  ];
  for (const [cx, cy, diagPhase] of legs) {
    drawDreadnoughtLeg(ctx, cx, cy, diagPhase, moveAngle, time, shutdownProgress);
  }

  // 2. Compact, heavily armored octagonal lower chassis
  ctx.fillStyle = '#182232';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.8;
  traceChamferedRect(ctx, -44, -44, 88, 88, 16);
  ctx.fill();
  ctx.stroke();

  // Mid beveled steel deck
  ctx.fillStyle = '#283548';
  ctx.strokeStyle = '#0B111C';
  ctx.lineWidth = 1.4;
  traceChamferedRect(ctx, -37, -37, 74, 74, 12);
  ctx.fill();
  ctx.stroke();

  // Top armor ridge highlight along north/west edge
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-25, -36);
  ctx.lineTo(25, -36);
  ctx.moveTo(-36, -25);
  ctx.lineTo(-36, 25);
  ctx.stroke();

  // Industrial yellow hazard chevron strips on front/aft deck edges
  drawDreadnoughtHazardStrip(ctx, -18, -41, 36, 4.5);
  drawDreadnoughtHazardStrip(ctx, -18, 36.5, 36, 4.5);

  // Recessed side thermal radiator vents with red-orange heat glow
  const ventHeat = power * (0.45 + prep * 0.45 + (enraged ? 0.2 : 0));
  for (const vx of [-40, 32]) {
    ctx.fillStyle = '#080D16';
    ctx.fillRect(vx, -12, 8, 24);
    if (ventHeat > 0.04) {
      ctx.fillStyle = `rgba(234, 88, 12, ${Math.min(0.9, ventHeat).toFixed(2)})`;
      ctx.fillRect(vx + 1.5, -10, 5, 20);
    }
    ctx.fillStyle = '#2B364B';
    for (let fy = -9; fy <= 8; fy += 4.5) {
      ctx.fillRect(vx + 0.5, fy, 7, 2);
    }
  }

  // Small cyan telemetry status indicators on the deck corners
  if (power > 0.15) {
    ctx.fillStyle = '#22D3EE';
    ctx.globalAlpha = hullAlpha * power * (0.75 + 0.25 * Math.sin(time * 4));
    for (const [ix, iy] of [
      [-28, -28],
      [25, -28],
      [-28, 25],
      [25, 25],
    ] as const) {
      ctx.fillRect(ix, iy, 3, 3);
    }
    ctx.globalAlpha = hullAlpha;
  }

  // 3. Rotating armored turret superstructure
  ctx.save();
  ctx.rotate(boss.angle);

  // Turret recoil kick + subtle preparation lock
  const recoilShift = -recoil * 6.5;
  const podRecoilX = -recoil * 8;
  ctx.translate(recoilShift, 0);

  // Circular turret ring collar
  ctx.fillStyle = '#131B28';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Twin forward coaxial stabilizer / targeting barrels
  for (const side of [-1, 1]) {
    const by = side * 15;
    ctx.fillStyle = '#273244';
    ctx.strokeStyle = '#090E17';
    ctx.lineWidth = 1.4;
    ctx.fillRect(16 + podRecoilX * 0.45, by - 4, 28, 8);
    ctx.strokeRect(16 + podRecoilX * 0.45, by - 4, 28, 8);

    // Fluted steel muzzle shroud
    ctx.fillStyle = '#64748B';
    ctx.fillRect(38 + podRecoilX * 0.45, by - 4.5, 7, 9);
    ctx.strokeRect(38 + podRecoilX * 0.45, by - 4.5, 7, 9);

    // Small cyan barrel cooling indicator slit
    if (power > 0.2) {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(24 + podRecoilX * 0.45, by - 1.2, 8, 2.4);
    }
  }

  // Twin articulated shoulder missile pods with animated blast shutters
  const shutterOpen = Math.max(prep, recoil * 0.85);
  for (const side of [-1, 1]) {
    drawDreadnoughtMissilePod(ctx, side, podRecoilX, shutterOpen, recoil, power);
  }

  // Broad chamfered main turret carapace
  ctx.fillStyle = '#2F3C50';
  ctx.strokeStyle = '#090E17';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-26, -24);
  ctx.lineTo(14, -27);
  ctx.lineTo(27, -15);
  ctx.lineTo(27, 15);
  ctx.lineTo(14, 27);
  ctx.lineTo(-26, 24);
  ctx.lineTo(-32, 13);
  ctx.lineTo(-32, -13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Secondary raised dorsal armor plating with subtle bevel highlight
  ctx.fillStyle = '#3D4C63';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-21, -18);
  ctx.lineTo(11, -20);
  ctx.lineTo(20, -10);
  ctx.lineTo(20, 10);
  ctx.lineTo(11, 20);
  ctx.lineTo(-21, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.24)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-18, -17);
  ctx.lineTo(10, -19);
  ctx.lineTo(18, -10);
  ctx.stroke();

  // Panel rivets
  ctx.fillStyle = '#64748B';
  for (const [rx, ry] of [
    [-16, -13],
    [-16, 13],
    [8, -15],
    [8, 15],
  ] as const) {
    ctx.beginPath();
    ctx.arc(rx, ry, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Visible central reactor core
  drawDreadnoughtReactor(ctx, time, prep, recoil, enraged, power);

  // Forward autonomous optical sensor pod (replaces cartoonish Cylon visor)
  ctx.fillStyle = '#0B111C';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.2;
  traceChamferedRect(ctx, 13, -10, 11, 20, 3);
  ctx.fill();
  ctx.stroke();

  if (power > 0.15) {
    // Crisp cyan optical sensor bar + subtle tracking micro-lens
    ctx.fillStyle = '#22D3EE';
    ctx.fillRect(17, -6.5, 3.2, 13);

    const trackY = Math.sin(time * 2.8) * 3.5;
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(17.6, trackY - 2, 2.2, 4);

    // Pinpoint red-orange laser designator aperture
    ctx.fillStyle = prep > 0.25 ? '#FB923C' : '#EA580C';
    ctx.beginPath();
    ctx.arc(22, 0, 1.8 + prep * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Metallic damage flash across turret armor when hit
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(226, 232, 240, ${Math.min(0.45, hitFlash * 0.45).toFixed(2)})`;
    traceChamferedRect(ctx, -28, -26, 56, 52, 10);
    ctx.fill();

    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 1.4;
    for (let s = 0; s < 4; s += 1) {
      const sa = time * 19 + s * 1.6;
      const sx = Math.cos(sa) * 26;
      const sy = Math.sin(sa) * 26;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(sa + 0.4) * 8, sy + Math.sin(sa + 0.4) * 8);
      ctx.stroke();
    }
  }

  ctx.restore();

  // Cooling smoke / ember wisps rising during mechanical shutdown
  if (shutdownProgress > 0) {
    for (let w = 0; w < 3; w += 1) {
      const wp = Math.max(0, Math.min(1, shutdownProgress * 1.2 - w * 0.14));
      if (wp <= 0) continue;
      const wx = -6 + Math.sin(w * 2.4 + shutdownProgress * 4) * 14;
      const wy = -wp * 34 - w * 6;
      const wr = 7 + wp * 14;
      ctx.fillStyle = `rgba(148, 163, 184, ${((1 - wp) * 0.34).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(wx, wy, wr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

const CENTIPEDE_SEGMENTS = 11;
const CENTIPEDE_SPACING = [17, 15, 15, 14.5, 14.5, 14, 13.5, 13, 12.5, 11.5];
const CENTIPEDE_WIDTHS = [18, 22, 24, 24.5, 24, 22.5, 20.5, 18.5, 16, 13, 9.5];

interface CentipedeChainState {
  nodes: Vec2[];
  lastHead: Vec2;
  crawlPhase: number;
}

const centipedeChains = new Map<string, CentipedeChainState>();

function updateCentipedeChain(
  boss: HellcellBoss,
  time: number,
  paused: boolean,
): CentipedeChainState {
  let state = centipedeChains.get(boss.id);
  const initNodes = (): Vec2[] => {
    const out: Vec2[] = [{ x: boss.pos.x, y: boss.pos.y }];
    const backX = -Math.cos(boss.angle);
    const backY = -Math.sin(boss.angle);
    const perpX = -backY;
    const perpY = backX;
    let accum = 0;
    for (let i = 1; i < CENTIPEDE_SEGMENTS; i += 1) {
      accum += CENTIPEDE_SPACING[i - 1];
      const curve = Math.sin(i * 0.55) * 10;
      out.push({
        x: boss.pos.x + backX * accum + perpX * curve,
        y: boss.pos.y + backY * accum + perpY * curve,
      });
    }
    return out;
  };

  if (!state) {
    state = {
      nodes: initNodes(),
      lastHead: { x: boss.pos.x, y: boss.pos.y },
      crawlPhase: time * 7.5,
    };
    centipedeChains.set(boss.id, state);
    return state;
  }

  if (paused) {
    return state;
  }

  const headDx = boss.pos.x - state.lastHead.x;
  const headDy = boss.pos.y - state.lastHead.y;
  const movedDist = Math.hypot(headDx, headDy);

  if (movedDist > 130) {
    state.nodes = initNodes();
    state.lastHead.x = boss.pos.x;
    state.lastHead.y = boss.pos.y;
    return state;
  }

  state.nodes[0].x = boss.pos.x;
  state.nodes[0].y = boss.pos.y;
  state.lastHead.x = boss.pos.x;
  state.lastHead.y = boss.pos.y;

  if (movedDist > 0.2) {
    state.crawlPhase += Math.min(0.45, movedDist * 0.095);
    for (let i = 1; i < CENTIPEDE_SEGMENTS; i += 1) {
      const prev = state.nodes[i - 1];
      const cur = state.nodes[i];
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spacing = CENTIPEDE_SPACING[i - 1];
      const nx = dx / dist;
      const ny = dy / dist;
      const sway = Math.sin(state.crawlPhase - i * 0.65) * 0.65;
      cur.x = prev.x + nx * spacing - ny * sway;
      cur.y = prev.y + ny * spacing + nx * sway;
    }
  }

  return state;
}

function drawCentipedeLegPair(
  ctx: CanvasRenderingContext2D,
  segWidth: number,
  segIndex: number,
  crawlPhase: number,
  isMoving: boolean,
  time: number,
  shutdownProgress: number,
): void {
  const waveSpeed = isMoving ? crawlPhase : time * 1.6;
  const aliveAmp = 1 - shutdownProgress;

  for (const side of [-1, 1]) {
    const legPhase = waveSpeed - segIndex * 0.72 + (side > 0 ? Math.PI : 0);
    const swing = Math.sin(legPhase) * (isMoving ? 0.36 : 0.08) * aliveAmp;
    const lift = Math.max(0, Math.cos(legPhase)) * (isMoving ? 1 : 0) * aliveAmp;
    const curlIn = shutdownProgress * 0.32;

    const baseX = 0;
    const baseY = side * (segWidth * 0.66);

    // Joint 1 (femur) angled slightly backward & outward
    const femurAng = side * (Math.PI * 0.56 - curlIn) + swing * 0.6;
    const femurLen = (10 + segWidth * 0.25) * (1 - shutdownProgress * 0.15);
    const kneeX = baseX + Math.cos(femurAng) * femurLen;
    const kneeY = baseY + Math.sin(femurAng) * femurLen;

    // Joint 2 (tibia/tarsus) curving backward into sharp claw tip
    const tibiaAng = femurAng + side * (0.48 + curlIn * 0.6) + swing * 0.4;
    const tibiaLen = 10 + segWidth * 0.22;
    const tipX = kneeX + Math.cos(tibiaAng) * tibiaLen;
    const tipY = kneeY + Math.sin(tibiaAng) * tibiaLen;

    // Subtle ground contact shadow beneath leg
    ctx.strokeStyle = 'rgba(6, 12, 8, 0.38)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX + 2, baseY + 3);
    ctx.lineTo(kneeX + 2 + lift, kneeY + 3);
    ctx.lineTo(tipX + 2 + lift, tipY + 3);
    ctx.stroke();

    // Femur chitin segment
    ctx.strokeStyle = '#111511';
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();

    ctx.strokeStyle = '#3A2B1E';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Knee articulation dot + tarsal claw
    ctx.strokeStyle = '#111511';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.strokeStyle = '#57402B';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#4A3624';
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCentipedeSegment(
  ctx: CanvasRenderingContext2D,
  localX: number,
  localY: number,
  angle: number,
  segIndex: number,
  width: number,
  crawlPhase: number,
  isMoving: boolean,
  time: number,
  prep: number,
  hitFlash: number,
  shutdownProgress: number,
  venomPower: number,
): void {
  const isTail = segIndex === CENTIPEDE_SEGMENTS - 1;
  const halfLen = isTail ? 11 : 10.5;
  const halfW = width * 0.5;

  ctx.save();
  ctx.translate(localX, localY);
  ctx.rotate(angle);

  // Articulated legs underneath trunk segments
  if (!isTail) {
    drawCentipedeLegPair(ctx, halfW, segIndex, crawlPhase, isMoving, time, shutdownProgress);
  } else {
    // Terminal rear cerci (curved dark chitin tail pincers)
    for (const side of [-1, 1]) {
      ctx.strokeStyle = '#0D120F';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, side * 3.5);
      ctx.quadraticCurveTo(-18, side * 9, -27, side * 6);
      ctx.stroke();

      ctx.strokeStyle = '#3B2C1E';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  }

  // Ground contact shadow beneath segment
  ctx.fillStyle = 'rgba(6, 12, 8, 0.45)';
  ctx.beginPath();
  ctx.ellipse(2, 4, halfLen + 2, halfW + 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark flexible inter-segment joint collar (ambient occlusion)
  ctx.fillStyle = '#101511';
  ctx.beginPath();
  ctx.ellipse(halfLen * 0.55, 0, halfLen * 0.72, halfW * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();

  // Curved overlapping arthropod tergite armor plate
  const even = segIndex % 2 === 0;
  const baseFill = even ? '#263622' : '#2E3B25';
  const ridgeFill = even ? '#394D2D' : '#435531';
  const rimFill = '#3B2B1D';

  ctx.fillStyle = rimFill;
  ctx.strokeStyle = '#0B100C';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-halfLen, -halfW * 0.52);
  ctx.quadraticCurveTo(-halfLen * 0.25, -halfW, halfLen * 0.45, -halfW * 0.94);
  ctx.quadraticCurveTo(halfLen * 1.05, -halfW * 0.55, halfLen * 0.92, 0);
  ctx.quadraticCurveTo(halfLen * 1.05, halfW * 0.55, halfLen * 0.45, halfW * 0.94);
  ctx.quadraticCurveTo(-halfLen * 0.25, halfW, -halfLen, halfW * 0.52);
  ctx.quadraticCurveTo(-halfLen * 0.65, 0, -halfLen, -halfW * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Central olive-green dorsal chitin carapace
  ctx.fillStyle = baseFill;
  ctx.beginPath();
  ctx.ellipse(0.5, 0, halfLen * 0.78, halfW * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();

  // Raised dorsal spine keel + subtle wet chitin highlight
  ctx.fillStyle = ridgeFill;
  ctx.beginPath();
  ctx.ellipse(1.5, -halfW * 0.08, halfLen * 0.55, halfW * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(205, 224, 184, 0.16)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-halfLen * 0.4, -halfW * 0.34);
  ctx.quadraticCurveTo(halfLen * 0.15, -halfW * 0.48, halfLen * 0.55, -halfW * 0.22);
  ctx.stroke();

  // Deterministic organic scratch / plate variation
  if (segIndex % 3 === 1) {
    ctx.strokeStyle = 'rgba(15, 20, 14, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, halfW * 0.2);
    ctx.lineTo(4, halfW * 0.44);
    ctx.stroke();
  }

  // Subtle bioluminescent venom gland pores tucked along lateral plate seam
  if (venomPower > 0.05 && !isTail) {
    const poreAlpha = venomPower * (0.42 + prep * 0.38 + 0.12 * Math.sin(time * 4 + segIndex));
    ctx.fillStyle = `rgba(116, 199, 92, ${Math.min(0.85, poreAlpha).toFixed(2)})`;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-1, side * (halfW * 0.68), 2.8, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Damage reaction chitin highlight
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(218, 232, 198, ${Math.min(0.36, hitFlash * 0.36).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0.5, 0, halfLen * 0.78, halfW * 0.76, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCentipedeHead(
  ctx: CanvasRenderingContext2D,
  time: number,
  prep: number,
  lunge: number,
  hitFlash: number,
  shutdownProgress: number,
  venomPower: number,
): void {
  const headScale = (1 + prep * 0.08) * (1 - shutdownProgress * 0.07);
  const headOffset = lunge * 14 - prep * 4.5;

  ctx.save();
  ctx.translate(headOffset, 0);
  ctx.scale(headScale, headScale);

  // Ground contact shadow beneath head & mandibles
  ctx.fillStyle = 'rgba(6, 12, 8, 0.52)';
  ctx.beginPath();
  ctx.ellipse(4, 5, 24, 21, 0, 0, Math.PI * 2);
  ctx.fill();

  // Segmented sensory antennae (sweeping forward, quivering during prep, drooping on defeat)
  const antAlive = 1 - shutdownProgress;
  for (const side of [-1, 1]) {
    const sway = Math.sin(time * (4.5 + prep * 9) + side) * (3 + prep * 3) * antAlive;
    const droop = shutdownProgress * 6;
    ctx.strokeStyle = '#0D120F';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(15, side * 9);
    ctx.quadraticCurveTo(28, side * (16 - droop) + sway * 0.5, 40 - droop, side * (21 - droop) + sway);
    ctx.stroke();

    ctx.strokeStyle = '#53412E';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // Prominent articulated venomous forcipules (mandibles)
  const mandibleSpread = 0.14 + prep * 0.44 - lunge * 0.24 - shutdownProgress * 0.12;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(15, side * 11);
    ctx.rotate(side * mandibleSpread);

    // Outer dark chitin mandible blade
    ctx.fillStyle = '#1E1A15';
    ctx.strokeStyle = '#0A0D0A';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -side * 3.5);
    ctx.quadraticCurveTo(14, side * 4.5, 25, -side * 4.5);
    ctx.quadraticCurveTo(13, -side * 2.5, 0, side * 3.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Amber-brown chitinous edge & fang tip
    ctx.fillStyle = '#8F5F34';
    ctx.beginPath();
    ctx.moveTo(13, side * 0.5);
    ctx.lineTo(24.5, -side * 4.2);
    ctx.lineTo(15, -side * 2);
    ctx.closePath();
    ctx.fill();

    // Subtle venom pore droplet near mandible inner curve during prep/attack
    if (venomPower > 0.1 && (prep > 0.15 || lunge > 0.1)) {
      ctx.fillStyle = `rgba(140, 224, 108, ${(venomPower * (0.45 + prep * 0.4)).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(16, -side * 1.6, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Hardened cephalic head shield (layered dark earthy-brown & olive plates)
  ctx.fillStyle = '#2A2219';
  ctx.strokeStyle = '#0B100C';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-16, -15);
  ctx.quadraticCurveTo(4, -21, 18, -12);
  ctx.quadraticCurveTo(23, 0, 18, 12);
  ctx.quadraticCurveTo(4, 21, -16, 15);
  ctx.quadraticCurveTo(-20, 0, -16, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Secondary overlapping dorsal cranial plate
  ctx.fillStyle = '#2E3D26';
  ctx.beginPath();
  ctx.moveTo(-11, -11);
  ctx.quadraticCurveTo(3, -15, 13, -7);
  ctx.quadraticCurveTo(16, 0, 13, 7);
  ctx.quadraticCurveTo(3, 15, -11, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Organic wet chitin highlight on head crest
  ctx.strokeStyle = 'rgba(205, 224, 184, 0.2)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -9);
  ctx.quadraticCurveTo(4, -11, 11, -5);
  ctx.stroke();

  // Subtle arthropod ocelli eye clusters (3 tiny amber-ochre simple eyes per side)
  const eyeColor = venomPower > 0.2 ? '#C48B3B' : '#3A3228';
  ctx.fillStyle = eyeColor;
  for (const side of [-1, 1]) {
    for (const [ex, ey, er] of [
      [11, side * 9.5, 1.8],
      [7.5, side * 11, 1.5],
      [13.5, side * 7.2, 1.3],
    ] as const) {
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Brief damage highlight on head plate
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(218, 232, 198, ${Math.min(0.38, hitFlash * 0.38).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(2, 0, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** B. Jungle Outpost Boss: JUNGLE CENTIPEDE — segmented predatory arthropod */
function drawJungleCentipede(
  ctx: CanvasRenderingContext2D,
  boss: HellcellBoss,
  time: number,
  hitFlash = 0,
  shutdownProgress = 0,
): void {
  const paused = shutdownProgress > 0;
  const chain = updateCentipedeChain(boss, time, paused);
  const prep = paused ? 0 : Math.max(0, Math.min(1, (0.45 - boss.attackTimer) / 0.45));
  const lunge = paused ? 0 : boss.attackAnim;
  const venomPower =
    shutdownProgress > 0 ? Math.max(0, 1 - shutdownProgress * 1.4) : 1;
  const bodyAlpha =
    shutdownProgress > 0.72 ? Math.max(0, 1 - (shutdownProgress - 0.72) / 0.28) : 1;

  const isMoving = !paused && boss.moveAngle !== undefined;
  const twitch = hitFlash > 0 ? Math.sin(time * 42) * hitFlash * 2.2 : 0;

  ctx.save();
  ctx.globalAlpha = bodyAlpha;

  // Draw rear-to-front so anterior exoskeleton plates naturally overlap posterior ones
  for (let i = CENTIPEDE_SEGMENTS - 1; i >= 1; i -= 1) {
    const cur = chain.nodes[i];
    const prev = chain.nodes[i - 1];
    const segAngle = Math.atan2(prev.y - cur.y, prev.x - cur.x);
    const breath = paused ? 0 : Math.sin(time * 2.4 + i * 0.6) * 0.6;
    const compressFactor = i <= 3 ? 1 - prep * 0.14 : 1;

    const localX = (cur.x - boss.pos.x) * compressFactor - Math.sin(segAngle) * (breath + twitch * 0.4);
    const localY = (cur.y - boss.pos.y) * compressFactor + Math.cos(segAngle) * (breath + twitch * 0.4);

    drawCentipedeSegment(
      ctx,
      localX,
      localY,
      segAngle,
      i,
      CENTIPEDE_WIDTHS[i],
      chain.crawlPhase,
      isMoving,
      time,
      prep,
      hitFlash,
      shutdownProgress,
      venomPower,
    );
  }

  // Predatory head aligned to boss facing angle
  ctx.save();
  ctx.rotate(boss.angle);
  drawCentipedeHead(ctx, time, prep, lunge, hitFlash, shutdownProgress, venomPower);
  ctx.restore();

  // Subtle settling soil dust puffs during defeat animation
  if (shutdownProgress > 0) {
    for (let d = 0; d < 3; d += 1) {
      const dp = Math.max(0, Math.min(1, shutdownProgress * 1.15 - d * 0.15));
      if (dp <= 0) continue;
      const dx = Math.sin(d * 2.1 + 0.6) * (16 + dp * 14);
      const dy = Math.cos(d * 1.9) * 12 - dp * 14;
      ctx.fillStyle = `rgba(92, 82, 62, ${((1 - dp) * 0.28).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 6 + dp * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawPharaohShoulderPauldron(
  ctx: CanvasRenderingContext2D,
  side: number,
  swayY: number,
  prep: number,
  hitFlash: number,
): void {
  ctx.save();
  ctx.translate(-5, side * 36 + swayY);

  // Outer antique-gold & weathered-bronze layered pauldron
  ctx.fillStyle = '#8E6D2F';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18, -side * 10);
  ctx.quadraticCurveTo(-20, side * 14, 0, side * 16);
  ctx.quadraticCurveTo(18, side * 14, 18, -side * 6);
  ctx.quadraticCurveTo(4, -side * 14, -18, -side * 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Mid burnished antique-gold plate
  ctx.fillStyle = '#B58D3D';
  ctx.beginPath();
  ctx.ellipse(0, side * 3, 13, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Deep royal lapis-blue decorative inlay panel
  ctx.fillStyle = '#1B3B6E';
  ctx.strokeStyle = '#59421B';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(0, side * 3, 8.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Engraved geometric gold motif & weathered scratch mark
  ctx.strokeStyle = prep > 0.2 ? '#2DD4BF' : '#CFA752';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-5, side * 3);
  ctx.lineTo(5, side * 3);
  ctx.moveTo(0, side * 3 - 3);
  ctx.lineTo(0, side * 3 + 3);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(26, 18, 11, 0.5)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-10, side * 7);
  ctx.lineTo(-4, side * 10);
  ctx.stroke();

  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(232, 212, 168, ${Math.min(0.4, hitFlash * 0.4).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, side * 3, 13, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPharaohArmAndGauntlet(
  ctx: CanvasRenderingContext2D,
  side: number,
  armSwing: number,
  prep: number,
  attackAnim: number,
  time: number,
  energyPower: number,
  shutdownProgress: number,
): void {
  // Heavy forearm extends forward, draws inward during attack prep, thrusts outward on release
  const elbowX = 8 + armSwing * 4 - prep * 5 + attackAnim * 10;
  const elbowY = side * (46 - prep * 5 - shutdownProgress * 6);
  const handX = 27 + armSwing * 6 - prep * 7 + attackAnim * 20 - shutdownProgress * 8;
  const handY = side * (40 - prep * 12 - shutdownProgress * 10);

  // Ground shadow under forearm & gauntlet
  ctx.save();
  ctx.strokeStyle = 'rgba(26, 16, 8, 0.42)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1, side * 38 + 4);
  ctx.lineTo(elbowX + 3, elbowY + 5);
  ctx.lineTo(handX + 4, handY + 6);
  ctx.stroke();

  // Upper sandstone & bronze arm
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 11.5;
  ctx.beginPath();
  ctx.moveTo(-2, side * 36);
  ctx.lineTo(elbowX, elbowY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.strokeStyle = '#7E6546';
  ctx.lineWidth = 8.2;
  ctx.stroke();

  // Reinforced bronze-gold vambrace cuff along forearm
  const wristAngle = Math.atan2(handY - elbowY, handX - elbowX);
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(wristAngle);

  // Subtle turquoise ritual energy around palms (only restrained accent, brighter during prep)
  if (energyPower > 0.1) {
    const auraAlpha = energyPower * (0.14 + prep * 0.28 + attackAnim * 0.24);
    const handGrad = ctx.createRadialGradient(8, 0, 2, 8, 0, 18);
    handGrad.addColorStop(0, `rgba(153, 246, 228, ${auraAlpha.toFixed(2)})`);
    handGrad.addColorStop(0.55, `rgba(45, 212, 191, ${(auraAlpha * 0.6).toFixed(2)})`);
    handGrad.addColorStop(1, 'rgba(13, 148, 136, 0)');
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.arc(8, 0, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ornate gold-and-lapis forearm guard
  ctx.fillStyle = '#B58D3D';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.4;
  traceChamferedRect(ctx, -15, -7.5, 13, 15, 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1B3B6E';
  ctx.fillRect(-12, -4.5, 7, 9);

  // Large articulated carved-stone & antique-gold gauntlet hand
  ctx.fillStyle = '#8C704D';
  traceChamferedRect(ctx, -2, -8, 13, 16, 3);
  ctx.fill();
  ctx.stroke();

  // Gold knuckle bar
  ctx.fillStyle = '#CFA752';
  ctx.fillRect(6, -6.5, 3.5, 13);

  // Articulated armoured fingers & opposable thumb
  const fingerCurl = shutdownProgress * 0.35 - prep * 0.15;
  ctx.fillStyle = '#6E583D';
  for (const fy of [-5.5, -1.8, 1.8, 5.5]) {
    ctx.save();
    ctx.translate(10.5, fy);
    ctx.rotate(-side * fingerCurl);
    ctx.fillRect(0, -1.4, 7.5, 2.8);
    ctx.strokeRect(0, -1.4, 7.5, 2.8);
    ctx.restore();
  }

  // Subtle geometric energy arc during attack prep
  if (prep > 0.2 && energyPower > 0.2) {
    ctx.strokeStyle = `rgba(45, 212, 191, ${(prep * 0.72 * energyPower).toFixed(2)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(10, 0, 9 + Math.sin(time * 8) * 1.5, -1.1, 1.1);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

/** C. Ancient Temple Boss: PHARAOH — awakened ancient Egyptian royal guardian */
function drawPharaohGuardian(
  ctx: CanvasRenderingContext2D,
  boss: HellcellBoss,
  time: number,
  hitFlash = 0,
  shutdownProgress = 0,
): void {
  const paused = shutdownProgress > 0;
  const prep = paused ? 0 : Math.max(0, Math.min(1, (0.45 - boss.attackTimer) / 0.45));
  const release = paused ? 0 : boss.attackAnim;
  const isMoving = !paused && boss.moveAngle !== undefined;
  const energyPower =
    shutdownProgress > 0 ? Math.max(0, 1 - shutdownProgress * 1.45) : 1;
  const bodyAlpha =
    shutdownProgress > 0.75 ? Math.max(0, 1 - (shutdownProgress - 0.75) / 0.25) : 1;

  // Heavy, deliberate guardian gait cycle
  const strideWave = isMoving ? Math.sin(time * 4.5) : 0;
  const idleBreath = paused ? 0 : Math.sin(time * 2.1) * 0.8;
  const collapseScale = 1 - shutdownProgress * 0.09;

  ctx.save();
  ctx.globalAlpha = bodyAlpha;
  ctx.rotate(boss.angle);
  ctx.scale(collapseScale, collapseScale);

  // Brief impact recoil when damaged
  if (hitFlash > 0) {
    ctx.translate(-hitFlash * 2.5, Math.sin(time * 40) * hitFlash * 1.8);
  }

  // 1. Sturdy Lower-Body Greaves & Ceremonial Waist Apron (alternating heavy stride)
  for (const side of [-1, 1]) {
    const legStride = strideWave * side * 9 * (1 - shutdownProgress);
    const footX = -19 + legStride;
    const footY = side * 14;

    ctx.fillStyle = 'rgba(26, 16, 8, 0.42)';
    ctx.beginPath();
    ctx.ellipse(footX + 2, footY + 4, 11, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sandstone-and-bronze armored greave
    ctx.fillStyle = '#5C4832';
    ctx.strokeStyle = '#1A120B';
    ctx.lineWidth = 1.4;
    traceChamferedRect(ctx, footX - 10, footY - 6.5, 20, 13, 3.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8E6D2F';
    ctx.fillRect(footX + 2, footY - 5, 5, 10);
  }

  // Pleated Royal Lapis & Antique-Gold Waist Shendyt Apron
  ctx.fillStyle = '#17325C';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.5;
  traceChamferedRect(ctx, -26, -22, 24, 44, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#B58D3D';
  ctx.fillRect(-16, -6, 14, 12);
  ctx.strokeRect(-16, -6, 14, 12);

  // 2. Heavy Upper Torso, Decorated Chest Plate & Usekh Collar
  const torsoShift = release * 6 - prep * 3;
  ctx.save();
  ctx.translate(torsoShift, 0);

  // Broad weathered-sandstone & bronze upper torso base
  ctx.fillStyle = '#755D40';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-22, -32);
  ctx.lineTo(12, -35);
  ctx.lineTo(25, -18);
  ctx.lineTo(25, 18);
  ctx.lineTo(12, 35);
  ctx.lineTo(-22, 32);
  ctx.lineTo(-28, 16);
  ctx.lineTo(-28, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Carved sandstone dorsal & chest armor plate with surface wear
  ctx.fillStyle = '#9C7F58';
  ctx.strokeStyle = '#3F2E1B';
  ctx.lineWidth = 1.2;
  traceChamferedRect(ctx, -16, -24, 37, 48, 8);
  ctx.fill();
  ctx.stroke();

  // Royal Usekh broad collar (banded lapis & antique gold radiating forward)
  ctx.fillStyle = '#1B3B6E';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(4, 0, 22, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.arc(2, 0, 14, Math.PI * 0.45, -Math.PI * 0.45, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#B58D3D';
  ctx.lineWidth = 1.4;
  for (let a = -0.35; a <= 0.36; a += 0.175) {
    ctx.beginPath();
    ctx.moveTo(2 + Math.cos(a) * 14, Math.sin(a) * 14);
    ctx.lineTo(4 + Math.cos(a) * 22, Math.sin(a) * 22);
    ctx.stroke();
  }

  // Ancient engraved geometric lines on torso armor (illuminate subtly on attack prep)
  ctx.strokeStyle =
    prep > 0.25 && energyPower > 0.2
      ? `rgba(45, 212, 191, ${(0.35 + prep * 0.55).toFixed(2)})`
      : '#59421B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.lineTo(10, -21);
  ctx.moveTo(-10, 18);
  ctx.lineTo(10, 21);
  ctx.stroke();

  // 3. Central Turquoise Energy Core (distinctive, restrained, framed in engraved gold)
  const coreX = 16;
  const coreY = 0;
  const coreRadius = 8.5;
  const corePulse = 0.65 + 0.16 * Math.sin(time * 2.8) + prep * 0.42 + release * 0.25;

  // Engraved octagonal gold & bronze core bezel
  ctx.fillStyle = '#8E6D2F';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.4;
  traceChamferedRect(ctx, coreX - 11, coreY - 11, 22, 22, 5);
  ctx.fill();
  ctx.stroke();

  // Dark socket
  ctx.fillStyle = '#0D171A';
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  if (energyPower > 0.03) {
    const glowAlpha = Math.min(1, energyPower * corePulse);
    const coreGrad = ctx.createRadialGradient(coreX, coreY, 1, coreX, coreY, coreRadius + 4);
    coreGrad.addColorStop(0, `rgba(204, 251, 241, ${glowAlpha.toFixed(2)})`);
    coreGrad.addColorStop(0.45, `rgba(45, 212, 191, ${(glowAlpha * 0.92).toFixed(2)})`);
    coreGrad.addColorStop(0.85, `rgba(13, 148, 136, ${(glowAlpha * 0.45).toFixed(2)})`);
    coreGrad.addColorStop(1, 'rgba(13, 148, 136, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(coreX, coreY, coreRadius + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Carved sandstone protective prongs gripping the core bezel
  ctx.fillStyle = '#B58D3D';
  for (const [px, py] of [
    [coreX - 9, coreY],
    [coreX + 9, coreY],
    [coreX, coreY - 9],
    [coreX, coreY + 9],
  ] as const) {
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }

  // 4. Articulated Reinforced Arms & Hands
  for (const side of [-1, 1]) {
    const armSwing = strideWave * -side;
    drawPharaohArmAndGauntlet(
      ctx,
      side,
      armSwing,
      prep,
      release,
      time,
      energyPower,
      shutdownProgress,
    );
  }

  // 5. Layered Gold & Lapis Shoulder Pauldrons
  for (const side of [-1, 1]) {
    drawPharaohShoulderPauldron(ctx, side, idleBreath * side * 0.5, prep, hitFlash);
  }

  // Attack release shock-pulse & ancient geometric star glyph
  if (release > 0.08 && energyPower > 0.1) {
    const burstR = 26 + (1 - release) * 34;
    ctx.save();
    ctx.translate(22, 0);
    ctx.strokeStyle = `rgba(45, 212, 191, ${(release * 0.62 * energyPower).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, burstR, -0.95, 0.95);
    ctx.stroke();

    ctx.strokeStyle = `rgba(207, 167, 82, ${(release * 0.5 * energyPower).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, burstR * 0.72, -0.75, 0.75);
    ctx.stroke();
    ctx.restore();
  }

  // 6. Iconic Royal Nemes Headdress & Stern Guardian Head (centered at (-5, 0) for clear top-down read)
  const headBobX = idleBreath * 0.6 + prep * -2 + release * 3;
  const headYaw = paused ? 0 : Math.sin(time * 1.4) * 0.04;
  ctx.save();
  ctx.translate(-5 + headBobX, 0);
  ctx.rotate(headYaw);

  // Subtle head cast shadow onto shoulder collar
  ctx.fillStyle = 'rgba(26, 16, 8, 0.44)';
  ctx.beginPath();
  ctx.ellipse(-2, 3, 21, 27, 0, 0, Math.PI * 2);
  ctx.fill();

  // Swept Royal Nemes Headdress Wings (antique gold + royal lapis blue bands)
  ctx.fillStyle = '#B58D3D';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-22, -18);
  ctx.quadraticCurveTo(-18, -32, 2, -28);
  ctx.quadraticCurveTo(14, -22, 13, 0);
  ctx.quadraticCurveTo(14, 22, 2, 28);
  ctx.quadraticCurveTo(-18, 32, -22, 18);
  ctx.quadraticCurveTo(-25, 0, -22, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Royal Lapis Blue Nemes Stripes
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#1B3B6E';
  for (const sy of [-23, -15, -7, 7, 15, 23]) {
    ctx.fillRect(-25, sy - 2.2, 40, 4.4);
  }
  ctx.restore();

  // Re-stroke weathered metallic headdress rim + bevel highlight
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(235, 206, 140, 0.32)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-18, -21);
  ctx.quadraticCurveTo(-8, -28, 3, -24);
  ctx.stroke();

  // Sculpted Guardian Head / Bronze-Sandstone Mask
  ctx.fillStyle = '#8C6F4B';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(2, 0, 15.5, 14.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Chiseled brow ridge & stone surface cracks
  ctx.fillStyle = '#A6875D';
  ctx.beginPath();
  ctx.ellipse(3, 0, 11.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(26, 18, 11, 0.55)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(-1, -4);
  ctx.lineTo(-4, 1);
  ctx.stroke();

  // Dignified ceremonial braided royal chin beard finial (antique bronze-gold)
  ctx.fillStyle = '#9E7933';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.2;
  traceChamferedRect(ctx, 13, -3.5, 8, 7, 1.5);
  ctx.fill();
  ctx.stroke();

  // Central Royal Uraeus Brow Emblem with small restrained turquoise accent
  ctx.fillStyle = '#CFA752';
  ctx.strokeStyle = '#1A120B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(7, -4.5);
  ctx.lineTo(15, 0);
  ctx.lineTo(7, 4.5);
  ctx.lineTo(4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = energyPower > 0.2 ? '#2DD4BF' : '#2C4240';
  ctx.beginPath();
  ctx.arc(9.5, 0, 1.9, 0, Math.PI * 2);
  ctx.fill();

  // Stern Narrow Glowing Turquoise Eye Slits (proportional, non-cartoonish)
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#1A120B';
    ctx.fillRect(8.5, side * 6.5 - 2, 4.5, 4);

    if (energyPower > 0.15) {
      ctx.fillStyle = prep > 0.25 ? '#99F6E4' : '#2DD4BF';
      ctx.globalAlpha = bodyAlpha * energyPower;
      ctx.fillRect(9.5, side * 6.5 - 1.2, 3, 2.4);
      ctx.globalAlpha = bodyAlpha;
    }
  }

  // Damage flash on headdress/mask
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(232, 212, 168, ${Math.min(0.38, hitFlash * 0.38).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(2, 0, 15.5, 14.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();

  // Sandstone dust wisps settling during dormancy defeat animation
  if (shutdownProgress > 0) {
    for (let s = 0; s < 3; s += 1) {
      const sp = Math.max(0, Math.min(1, shutdownProgress * 1.15 - s * 0.14));
      if (sp <= 0) continue;
      const sx = Math.cos(s * 2.2 + 0.5) * (14 + sp * 18);
      const sy = Math.sin(s * 2.0) * 12 - sp * 16;
      ctx.fillStyle = `rgba(180, 152, 110, ${((1 - sp) * 0.3).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 6 + sp * 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draw Slumside Boss: "THE LAST LOCAL" — an articulated 3-coach Mumbai suburban local train
 * (~85% authentic Western/Central weathered blue-white-yellow EMU local, ~15% supernatural
 * electrical & amber-orange mechanical corruption) built natively for the top-down camera.
 */
function drawMumbaiLocalTrain(
  ctx: CanvasRenderingContext2D,
  boss: HellcellBoss,
  time: number,
  hitFlash: number,
  shutdownProgress: number,
): void {
  const train = boss.trainState;
  const coaches = getTrainCoachesForRender(boss);
  const previewScale = train ? 1 : Math.max(0.45, Math.min(1.15, boss.radius / 68.8));
  const power = Math.max(0, 1 - shutdownProgress * 1.15);
  const bodyAlpha = shutdownProgress > 0 ? Math.max(0.28, 1 - shutdownProgress * 0.55) : 1;
  const speed = train?.speed ?? 180;
  const behavior = train?.behavior ?? 'cruise';
  const isCharging = behavior === 'chargeWindup' || behavior === 'chargeDash';
  const isElectric = behavior === 'electricWindup' || behavior === 'electricPulse';
  const enraged = boss.hp < boss.maxHp * 0.5;
  const corruptPulse =
    power * (0.45 + 0.25 * Math.sin(time * 5.2) + (isElectric ? 0.45 : enraged ? 0.2 : 0));

  ctx.save();
  ctx.translate(-boss.pos.x, -boss.pos.y);
  ctx.globalAlpha = bodyAlpha;

  // 1. Directional ground cast shadows (top-left afternoon sun -> down-right offset matching Slumside)
  for (const coach of coaches) {
    ctx.save();
    ctx.translate(coach.pos.x + 6, coach.pos.y + 8);
    ctx.rotate(coach.angle);
    ctx.scale(previewScale, previewScale);
    ctx.fillStyle = `rgba(14, 11, 16, ${(0.44 * bodyAlpha).toFixed(2)})`;
    traceChamferedRect(ctx, -44, -25, 88, 50, 5);
    ctx.fill();
    ctx.restore();
  }

  // 2. Articulated mechanical couplings & accordion rubber gangways connecting coaches
  for (let i = 0; i < coaches.length - 1; i += 1) {
    const frontCoach = coaches[i];
    const rearCoach = coaches[i + 1];
    const rearOffset = 41 * previewScale;
    const fCos = Math.cos(frontCoach.angle);
    const fSin = Math.sin(frontCoach.angle);
    const rCos = Math.cos(rearCoach.angle);
    const rSin = Math.sin(rearCoach.angle);

    // Back center of frontCoach and front center of rearCoach
    const p1x = frontCoach.pos.x - fCos * rearOffset;
    const p1y = frontCoach.pos.y - fSin * rearOffset;
    const p2x = rearCoach.pos.x + rCos * rearOffset;
    const p2y = rearCoach.pos.y + rSin * rearOffset;

    const gwHalf = 13 * previewScale;
    ctx.save();
    // Heavy forged steel drawbar + buffer struts
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4.5 * previewScale;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    // Ribbed dark accordion gangway diaphragm bridging the bend seamlessly
    ctx.fillStyle = '#1E242B';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p1x - fSin * gwHalf, p1y + fCos * gwHalf);
    ctx.lineTo(p1x + fSin * gwHalf, p1y - fCos * gwHalf);
    ctx.lineTo(p2x + rSin * gwHalf, p2y - rCos * gwHalf);
    ctx.lineTo(p2x - rSin * gwHalf, p2y + rCos * gwHalf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Corrupted orange HV jumper cable bridging across the coupling gap
    if (power > 0.1) {
      const mx = (p1x + p2x) * 0.5;
      const my = (p1y + p2y) * 0.5;
      ctx.strokeStyle = `rgba(234, 88, 12, ${(0.4 + corruptPulse * 0.45).toFixed(2)})`;
      ctx.lineWidth = 1.6 * previewScale;
      ctx.beginPath();
      ctx.moveTo(p1x - fSin * (gwHalf * 0.55), p1y + fCos * (gwHalf * 0.55));
      ctx.quadraticCurveTo(mx, my, p2x - rSin * (gwHalf * 0.55), p2y + rCos * (gwHalf * 0.55));
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Render Coach 3 -> Coach 2 -> Coach 1 (front locomotive overlaps gangway cleanly)
  for (let i = coaches.length - 1; i >= 0; i -= 1) {
    const coach = coaches[i];
    drawMumbaiTrainCoach(
      ctx,
      coach,
      i,
      previewScale,
      time,
      speed,
      power,
      corruptPulse,
      isCharging,
      isElectric,
      behavior,
      hitFlash,
      shutdownProgress,
    );
  }

  // 4. Shutdown charred smoke wisps drifting off extinguished train
  if (shutdownProgress > 0) {
    for (const coach of coaches) {
      for (let s = 0; s < 3; s += 1) {
        const sp = Math.max(0, Math.min(1, shutdownProgress * 1.1 - s * 0.14));
        if (sp <= 0) continue;
        const sx = coach.pos.x + Math.cos(s * 2.1 + coach.angle) * (10 + sp * 18);
        const sy = coach.pos.y + Math.sin(s * 1.9 + coach.angle) * 12 - sp * 16;
        ctx.fillStyle = `rgba(71, 85, 105, ${((1 - sp) * 0.34).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (6 + sp * 12) * previewScale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawMumbaiTrainCoach(
  ctx: CanvasRenderingContext2D,
  coach: { pos: Vec2; angle: number },
  coachIndex: number,
  scale: number,
  time: number,
  speed: number,
  power: number,
  corruptPulse: number,
  isCharging: boolean,
  isElectric: boolean,
  behavior: string,
  hitFlash: number,
  shutdownProgress: number,
): void {
  const isFront = coachIndex === 0;
  const isRear = coachIndex === 2;
  const vibY =
    shutdownProgress > 0
      ? 0
      : Math.sin(time * 42 + coachIndex * 1.9) * (0.28 + Math.min(0.6, speed / 700));
  const wheelCycle = Math.sin(time * Math.max(2, speed * 0.09) + coachIndex * 1.3);

  ctx.save();
  ctx.translate(coach.pos.x, coach.pos.y);
  ctx.rotate(coach.angle);
  ctx.scale(scale, scale);
  ctx.translate(0, vibY);

  // A. Undercarriage iron bogie assemblies & protruding steel wheels (visible on left/right track lines)
  ctx.fillStyle = '#14181F';
  ctx.strokeStyle = '#090B0E';
  ctx.lineWidth = 1.2;
  for (const bogieX of [-24, 24]) {
    ctx.fillRect(bogieX - 11, -24.8, 22, 49.6);
    // Steel wheel flanges & axle bolts subtly oscillating with travel
    for (const side of [-1, 1]) {
      for (const wx of [bogieX - 7, bogieX + 7]) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(wx - 3.2 + wheelCycle * 0.7, side * 23.2 - 1.5, 6.4, 3);
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(wx - 1.4 + wheelCycle * 0.7, side * 24 - 0.7, 2.8, 1.4);
      }
    }
  }

  // B. Lower chassis frame & beveled deep Mumbai Railway Blue exterior skirt (-43..+43, -24..+24)
  const hullGrad = ctx.createLinearGradient(0, -24, 0, 24);
  hullGrad.addColorStop(0, '#234B8E');
  hullGrad.addColorStop(0.5, '#193568');
  hullGrad.addColorStop(1, '#102347');
  ctx.fillStyle = hullGrad;
  ctx.strokeStyle = '#0E131B';
  ctx.lineWidth = 1.8;
  traceChamferedRect(ctx, -43, -24, 86, 48, isFront ? 4 : 2.5);
  ctx.fill();
  ctx.stroke();

  // Cream-white upper passenger band & thin crimson/ochre livery beltline visible along both beveled sides
  for (const side of [-1, 1]) {
    const sy = side === -1 ? -22.2 : 16.2;
    ctx.fillStyle = side === -1 ? '#D5DCE4' : '#B7C0CA';
    ctx.fillRect(-40, sy, isFront ? 73 : 80, 6);

    // Classic crimson/amber belt stripe
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(-40, side === -1 ? -23.1 : 21.8, isFront ? 74 : 80, 1.4);

    // Rectangular barred passenger windows & metallic sliding doors along both beveled shoulders
    const doorXs = isFront ? [-30, -6] : [-28, -2, 24];
    for (const dx of doorXs) {
      ctx.fillStyle = '#64748B';
      ctx.fillRect(dx - 4, sy + 0.7, 8, 4.6);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(dx - 0.5, sy + 0.7, 1, 4.6);
    }

    const winXs = isFront ? [-38, -20, -13, 4, 12, 20] : [-38, -18, -10, 8, 16, 33];
    for (let w = 0; w < winXs.length; w += 1) {
      const wx = winXs[w];
      const corruptedPane = power > 0.1 && (w + coachIndex) % 3 === 1;
      ctx.fillStyle = '#0B111E';
      ctx.fillRect(wx - 2.6, sy + 1, 5.2, 3.8);
      if (corruptedPane) {
        ctx.fillStyle = `rgba(234, 88, 12, ${(0.28 + corruptPulse * 0.38).toFixed(2)})`;
        ctx.fillRect(wx - 2.1, sy + 1.4, 4.2, 3);
      }
      // Window security grill bars
      ctx.fillStyle = '#475569';
      ctx.fillRect(wx - 0.6, sy + 1, 0.7, 3.8);
    }
  }

  // C. Coach 0 Front Locomotive Nose (Yellow face, windshields, headlights, cowcatcher)
  if (isFront) {
    // Heavy black ribbed steel cowcatcher & central coupler knuckle
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#07090D';
    ctx.lineWidth = 1.2;
    ctx.fillRect(42, -16, 4.5, 32);
    ctx.fillRect(45.5, -5.5, 3.5, 11);

    // Unmistakable weathered Mumbai Local Golden-Yellow front cab bevel
    const cabGrad = ctx.createLinearGradient(32, -22, 43, 22);
    cabGrad.addColorStop(0, '#EAB308');
    cabGrad.addColorStop(0.55, '#CA8A04');
    cabGrad.addColorStop(1, '#A16207');
    ctx.fillStyle = cabGrad;
    ctx.strokeStyle = '#1C1917';
    ctx.lineWidth = 1.3;
    traceChamferedRect(ctx, 32, -22.5, 11.2, 45, 3);
    ctx.fill();
    ctx.stroke();

    // Diagonal warning chevrons & grime smudges on yellow front apron
    ctx.fillStyle = '#18181B';
    for (let cy = -18; cy <= 14; cy += 8) {
      ctx.fillRect(39.5, cy, 3, 3.5);
    }

    // Twin darkened cab windshields
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(32.8, -16, 4.8, 12);
    ctx.fillRect(32.8, 4, 4.8, 12);
    // Subtle unnatural orange glare deep behind cab glass
    if (power > 0.1) {
      ctx.fillStyle = `rgba(234, 88, 12, ${(0.18 + corruptPulse * 0.25).toFixed(2)})`;
      ctx.fillRect(33.5, -14.5, 3.2, 9);
      ctx.fillRect(33.5, 5.5, 3.2, 9);
    }

    // Destination board crest at nose center
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(33, -3.5, 4.5, 7);

    // Twin round lower headlights + top cab marker lamp
    const headIntensity =
      power <= 0.05
        ? 0.08
        : isCharging
          ? 1
          : 0.72 + 0.28 * Math.sin(time * 23 + Math.sin(time * 7.3) * 2);
    for (const ly of [-12, 12]) {
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.arc(41.5, ly, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle =
        headIntensity > 0.2
          ? `rgba(254, 240, 138, ${headIntensity.toFixed(2)})`
          : '#334155';
      ctx.beginPath();
      ctx.arc(41.8, ly, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Upper marker lamp
    ctx.fillStyle = headIntensity > 0.2 ? '#F59E0B' : '#334155';
    ctx.beginPath();
    ctx.arc(36.2, 0, 1.9, 0, Math.PI * 2);
    ctx.fill();
  } else if (isRear) {
    // Coach 3 rear weathered yellow endwall + twin red tail marker lamps
    ctx.fillStyle = '#A16207';
    ctx.fillRect(-43.2, -19, 4.5, 38);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-45, -7, 2.5, 14);
    for (const ly of [-13, 13]) {
      ctx.fillStyle = power > 0.15 ? '#DC2626' : '#3F1D1D';
      ctx.beginPath();
      ctx.arc(-41.8, ly, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // D. Corrugated Roof Deck with weathered grime, rust patches, and late-afternoon crown highlight
  const roofStart = -40;
  const roofLen = isFront ? 72 : 79;
  const roofGrad = ctx.createLinearGradient(0, -16.5, 0, 16.5);
  roofGrad.addColorStop(0, '#BCC4CE');
  roofGrad.addColorStop(0.32, '#CBD2DA');
  roofGrad.addColorStop(0.7, '#9CA5B0');
  roofGrad.addColorStop(1, '#79828D');
  ctx.fillStyle = roofGrad;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  traceChamferedRect(ctx, roofStart, -16.5, roofLen, 33, 2);
  ctx.fill();
  ctx.stroke();

  // Corrugated steel roof ribs & rainwater channels
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.28)';
  ctx.lineWidth = 0.9;
  for (const ry of [-12, -7.5, -3, 3, 7.5, 12]) {
    ctx.beginPath();
    ctx.moveTo(roofStart + 3, ry);
    ctx.lineTo(roofStart + roofLen - 3, ry);
    ctx.stroke();
  }

  // Asymmetric monsoon rust stains, soot streaks & battle scratches per coach
  ctx.fillStyle = 'rgba(124, 45, 18, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-18 + coachIndex * 7, -8 + coachIndex * 4, 11, 4.5, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(24, 24, 27, 0.24)';
  ctx.beginPath();
  ctx.ellipse(8 - coachIndex * 8, 7 - coachIndex * 3, 13, 5, -0.18, 0, Math.PI * 2);
  ctx.fill();
  if (isRear) {
    // Distinct rear coach heavy scrape & structural dent patch
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-30, -10);
    ctx.lineTo(-10, 6);
    ctx.moveTo(-26, -12);
    ctx.lineTo(-6, 4);
    ctx.stroke();
  }

  // Rooftop corroded mechanical gaps & hairline amber corruption seams
  if (power > 0.08) {
    ctx.strokeStyle = `rgba(234, 88, 12, ${(0.22 + corruptPulse * 0.45).toFixed(2)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-24, -15);
    ctx.lineTo(-20, -4);
    ctx.moveTo(14, 4);
    ctx.lineTo(20, 15);
    ctx.stroke();
  }

  // Dome rooftop ventilators
  const ventXs = isFront ? [-28, -14] : [-26, 0, 26];
  for (const vx of ventXs) {
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(vx, 0, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(vx - 0.8, -0.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Heavy HV rooftop busbar & ceramic insulators linking electrical equipment
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(roofStart + 2, -5.5);
  ctx.lineTo(roofStart + roofLen - 4, -5.5);
  ctx.stroke();

  // E. Coach 0 Front Electrical Assembly (Pantograph, Resistor Grid, Insulators — Identifiable Weak Point!)
  if (isFront) {
    // Vented braking resistor bank
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.1;
    ctx.fillRect(0, -11.5, 13, 23);
    ctx.strokeRect(0, -11.5, 13, 23);
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 0.8;
    for (let lx = 2; lx <= 11; lx += 3) {
      ctx.beginPath();
      ctx.moveTo(lx, -9.5);
      ctx.lineTo(lx, 9.5);
      ctx.stroke();
    }

    // Subtle industrial amber hazard framing marks identifying the front electrical weak point
    ctx.strokeStyle = `rgba(245, 158, 11, ${(0.42 + corruptPulse * 0.4).toFixed(2)})`;
    ctx.lineWidth = 1.4;
    for (const [cx, cy, sx, sy] of [
      [14, -14, 1, 1],
      [30, -14, -1, 1],
      [14, 14, 1, -1],
      [30, 14, -1, -1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * 4, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * 4);
      ctx.stroke();
    }

    // Ceramic brown ribbed insulator base + exposed orange HV core glow
    for (const iy of [-8, 8]) {
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(21, iy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (power > 0.08) {
      const coreR = isElectric ? 13 : 8.5;
      const coreAlpha = isElectric ? 0.55 : 0.24 + corruptPulse * 0.22;
      const coreGrad = ctx.createRadialGradient(22, 0, 1, 22, 0, coreR);
      coreGrad.addColorStop(0, `rgba(251, 191, 36, ${coreAlpha.toFixed(2)})`);
      coreGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(22, 0, coreR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Diamond / scissor steel pantograph arm assembly + copper contact collector head
    ctx.strokeStyle = isElectric && power > 0.1 ? '#FDE047' : '#CBD5E1';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(15, -7);
    ctx.lineTo(22, 0);
    ctx.lineTo(15, 7);
    ctx.moveTo(28, -9);
    ctx.lineTo(22, 0);
    ctx.lineTo(28, 9);
    ctx.stroke();

    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(28, -12.5);
    ctx.lineTo(28, 12.5);
    ctx.stroke();

    // Occasional electrical sparks around pantograph (frequent & bright during Electrical Attack!)
    const sparkRate = isElectric ? 34 : behavior === 'chargeWindup' ? 18 : 6;
    if (power > 0.1 && (isElectric || Math.sin(time * sparkRate) > 0.72)) {
      ctx.strokeStyle = isElectric ? '#FEF08A' : '#FB923C';
      ctx.lineWidth = isElectric ? 1.8 : 1.2;
      for (let sp = 0; sp < (isElectric ? 4 : 2); sp += 1) {
        const a = time * 19 + sp * 2.1;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(22 + Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(22 + Math.cos(a + 0.5) * 14, Math.sin(a + 0.5) * 14);
        ctx.stroke();
      }
    }
  } else {
    // Coach 2 & Coach 3 rooftop transformer & HV splitter boxes
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1;
    ctx.fillRect(-13, -10.5, 9, 9);
    ctx.strokeRect(-13, -10.5, 9, 9);
    ctx.fillRect(10, 2, 10, 9);
    ctx.strokeRect(10, 2, 10, 9);

    if (isElectric && power > 0.1) {
      ctx.strokeStyle = '#FDBA74';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.lineTo(2, -1 + Math.sin(time * 38 + coachIndex) * 4);
      ctx.lineTo(14, 6);
      ctx.stroke();
    }
  }

  // F. Metallic hit flash feedback on damage
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(241, 245, 249, ${Math.min(0.45, hitFlash * 0.45).toFixed(2)})`;
    traceChamferedRect(ctx, -43, -24, 86, 48, 3);
    ctx.fill();
  }

  ctx.restore();
}
