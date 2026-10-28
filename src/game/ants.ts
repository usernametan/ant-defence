import { ANT_TYPES, COLOR, LANES, VIEW_WIDTH } from './config';
import type { Ant, AntKind } from './types';

const LABEL_FONT = '600 20px "Barlow Condensed", "Trebuchet MS", sans-serif';
const LABEL_FONT_BOSS = '700 22px "Barlow Condensed", "Trebuchet MS", sans-serif';

export function antScale(ant: Ant): number {
  return ant.scale;
}

export function antBodyCenter(ant: Ant): { x: number; y: number } {
  return {
    x: ant.x - 4 * ant.scale,
    y: ant.y - 30 * ant.scale,
  };
}

export function laneSpawnY(lane: number): { y: number; scale: number } {
  return LANES[lane];
}

export function makeAnt(
  id: number,
  kind: AntKind,
  lane: number,
  x: number,
  y: number,
  scale: number,
  word: string,
  speedMultiplier: number,
  wave: number,
): Ant {
  const config = ANT_TYPES[kind];
  let hp = config.hp;
  if (kind === 'armored') hp += Math.floor(wave / 6);
  if (kind === 'giant') hp += Math.floor(wave / 5);
  if (kind === 'queen') hp = ANT_TYPES.queen.hp + Math.floor(wave / 3);

  return {
    id,
    kind,
    x,
    y,
    lane,
    scale: scale * config.scale,
    speed: config.speed * speedMultiplier,
    hp,
    maxHp: hp,
    word,
    alive: true,
    deathTimer: 0,
    spawnTimer: 0.45,
    legPhase: Math.random() * Math.PI * 2,
    hitFlash: 0,
    boss: kind === 'queen',
    nextMinionAt: 0,
  };
}

export function updateAnt(ant: Ant, dt: number, speedScale: number): void {
  ant.spawnTimer = Math.max(0, ant.spawnTimer - dt);
  ant.hitFlash = Math.max(0, ant.hitFlash - dt);
  ant.legPhase += dt * (2.6 + ant.speed * 0.08);
  ant.x -= ant.speed * speedScale * dt;
}

function bodyColor(ant: Ant): string {
  if (ant.hitFlash > 0) return '#dfc7a6';
  switch (ant.kind) {
    case 'fast':
      return '#19100e';
    case 'armored':
      return '#241710';
    case 'giant':
      return '#170f0a';
    case 'queen':
      return '#1b0c0d';
    default:
      return '#17100b';
  }
}

function rimColor(ant: Ant): string {
  if (ant.hitFlash > 0) return '#fff3da';
  switch (ant.kind) {
    case 'fast':
      return 'rgba(255, 144, 92, 0.36)';
    case 'armored':
      return 'rgba(228, 163, 91, 0.44)';
    case 'giant':
      return 'rgba(255, 120, 78, 0.34)';
    case 'queen':
      return 'rgba(255, 92, 104, 0.58)';
    default:
      return 'rgba(247, 184, 120, 0.3)';
  }
}

export function drawAnt(
  ctx: CanvasRenderingContext2D,
  ant: Ant,
  time: number,
  targeted: boolean,
): void {
  const spawnAlpha = 1 - Math.max(0, ant.spawnTimer) / 0.45;
  if (ant.x > VIEW_WIDTH + 40) return;

  const scale = ant.scale;
  const gait = Math.sin(ant.legPhase);
  const gait2 = Math.sin(ant.legPhase + Math.PI);
  const body = bodyColor(ant);
  const rim = rimColor(ant);
  const boss = ant.kind === 'queen';

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, spawnAlpha));
  ctx.translate(ant.x, ant.y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(4, 0, boss ? 54 : 40, boss ? 8 : 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (ant.kind === 'fast') {
    ctx.strokeStyle = 'rgba(255, 221, 190, 0.14)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(48 + i * 7, -34 + i * 11);
      ctx.lineTo(79 + i * 9, -34 + i * 11);
      ctx.stroke();
    }
  }

  if (boss) {
    const aura = ctx.createRadialGradient(0, -34, 8, 0, -34, 84);
    aura.addColorStop(0, 'rgba(255, 92, 97, 0.16)');
    aura.addColorStop(0.55, 'rgba(255, 77, 84, 0.07)');
    aura.addColorStop(1, 'rgba(255, 60, 70, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, -34, 88, 62, 0, 0, Math.PI * 2);
    ctx.fill();

    const flap = Math.sin(time * 12 + ant.legPhase) * 0.16;
    ctx.save();
    ctx.translate(6, -52);
    ctx.rotate(-0.32 + flap);
    ctx.fillStyle = 'rgba(228, 208, 196, 0.12)';
    ctx.strokeStyle = 'rgba(255, 223, 202, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-4, 0, 45, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(4, 8, 38, 11, 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(8, -52);
    ctx.rotate(0.35 - flap);
    ctx.fillStyle = 'rgba(228, 208, 196, 0.1)';
    ctx.strokeStyle = 'rgba(255, 223, 202, 0.18)';
    ctx.beginPath();
    ctx.ellipse(2, 2, 43, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const legPairs = [
    { hipX: -9, hipY: -30, spread: -17, lift: 5 },
    { hipX: -1, hipY: -27, spread: 2, lift: 3 },
    { hipX: 8, hipY: -27, spread: 18, lift: 4 },
  ];

  ctx.strokeStyle = ant.kind === 'armored' ? '#382415' : '#0a0705';
  ctx.lineWidth = 2.35;
  for (let side = 0; side < 2; side += 1) {
    const dir = side === 0 ? 1 : -1;
    for (let i = 0; i < legPairs.length; i += 1) {
      const pair = legPairs[i];
      const phase = side === 0 ? gait : gait2;
      const hipX = pair.hipX - 1;
      const hipY = pair.hipY + 3;
      const kneeX = hipX + pair.spread * (0.6 + i * 0.08) + phase * 4.5 * dir;
      const kneeY = hipY + 10 + pair.lift;
      const footX = kneeX + pair.spread * 0.55 + phase * 7 * dir;
      const footY = 0 - (phase > 0 ? 2.5 : 0);
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  }

  ctx.fillStyle = body;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.55;

  ctx.beginPath();
  ctx.ellipse(32, -27, boss ? 26 : 22, boss ? 17.5 : 14.5, -0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(32, -27, boss ? 23 : 19, boss ? 14.5 : 11.5, -0.16, Math.PI * 1.06, Math.PI * 1.72);
  ctx.stroke();

  if (ant.kind === 'armored') {
    ctx.strokeStyle = 'rgba(224, 160, 85, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(30, -28, 18 - i * 4.5, 9 - i * 1.6, -0.18, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(122, 82, 44, 0.34)';
    ctx.beginPath();
    ctx.ellipse(39, -30, 7, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (ant.kind === 'giant') {
    ctx.fillStyle = 'rgba(255, 132, 80, 0.28)';
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(19 + i * 9, -39);
      ctx.lineTo(23 + i * 9, -51 - (i % 2) * 4);
      ctx.lineTo(27 + i * 9, -38);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = body;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.55;
  ctx.beginPath();
  ctx.ellipse(2, -30, 12.5, 9.5, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(13, -29, 5, 5.8, -0.1, 0, Math.PI * 2);
  ctx.fill();

  if (ant.kind === 'armored') {
    ctx.fillStyle = 'rgba(151, 101, 55, 0.48)';
    ctx.beginPath();
    ctx.ellipse(-1, -34, 10.5, 5, -0.05, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = body;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.55;
  ctx.beginPath();
  ctx.ellipse(-19, -30, boss ? 12.5 : 11.5, boss ? 11 : 9.8, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = body;
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(-27, -35);
  ctx.bezierCurveTo(-37, -43, -41, -52, -50, -58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-25, -33);
  ctx.bezierCurveTo(-35, -37, -43, -45, -51, -46);
  ctx.stroke();

  ctx.strokeStyle = '#3a2417';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-29, -27);
  ctx.lineTo(-37, -24);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-29, -24);
  ctx.lineTo(-37, -21);
  ctx.stroke();

  const eyeColor = ant.kind === 'queen' ? '#ff6b73' : '#ff6b47';
  ctx.fillStyle = eyeColor;
  ctx.shadowColor = eyeColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-22, -33, 2.3, 0, Math.PI * 2);
  ctx.fill();
  if (boss) {
    ctx.beginPath();
    ctx.arc(-18, -34, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  if (boss) {
    ctx.fillStyle = COLOR.gold;
    ctx.strokeStyle = '#7b4a18';
    ctx.lineWidth = 0.8;
    const crown = new Path2D();
    crown.moveTo(-29, -42);
    crown.lineTo(-26, -51);
    crown.lineTo(-22, -44);
    crown.lineTo(-18, -53);
    crown.lineTo(-14, -44);
    crown.lineTo(-10, -50);
    crown.lineTo(-9, -41);
    crown.closePath();
    ctx.fill(crown);
    ctx.stroke(crown);
  }

  ctx.restore();

  if (targeted) {
    drawTargetReticle(ctx, ant, time);
  }
}

function drawTargetReticle(
  ctx: CanvasRenderingContext2D,
  ant: Ant,
  time: number,
): void {
  const cx = ant.x;
  const cy = ant.y - 34 * ant.scale;
  const radius = 48 * ant.scale + 10;
  const pulse = 0.6 + Math.sin(time * 6) * 0.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(time * 1.8) * 0.04);
  ctx.strokeStyle = `rgba(242, 195, 100, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const bracket = 13;
  const r = radius + 7;
  ctx.strokeStyle = COLOR.goldBright;
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 4; i += 1) {
    const angle = i * (Math.PI / 2) + time * 0.35;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(r - bracket, -r);
    ctx.lineTo(r, -r);
    ctx.lineTo(r, -r + bracket);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255, 235, 189, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-radius - 16, 0);
  ctx.lineTo(-radius - 7, 0);
  ctx.moveTo(radius + 7, 0);
  ctx.lineTo(radius + 16, 0);
  ctx.stroke();
  ctx.restore();
}

type LabelPlacement = {
  ant: Ant;
  x: number;
  y: number;
  width: number;
  height: number;
  shifted: boolean;
};

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function drawAntLabels(
  ctx: CanvasRenderingContext2D,
  ants: Ant[],
  typed: string,
  targetId: number | null,
): void {
  ctx.save();
  ctx.textBaseline = 'middle';

  const ordered = ants
    .filter((ant) => ant.x < VIEW_WIDTH + 20 && ant.x > -100)
    .slice()
    .sort((a, b) => {
      if (a.id === targetId) return -1;
      if (b.id === targetId) return 1;
      return a.x - b.x;
    });

  const placed: LabelPlacement[] = [];
  for (const ant of ordered) {
    const boss = ant.boss;
    const font = boss ? LABEL_FONT_BOSS : LABEL_FONT;
    ctx.font = font;
    const metrics = ctx.measureText(ant.word);
    const padX = boss ? 15 : 13;
    const width = Math.max(boss ? 96 : 66, metrics.width + padX * 2);
    const height = boss ? 36 : 31;
    const bottom = ant.y - 53 * ant.scale - 8;
    let x = ant.x - width / 2;
    x = Math.max(12, Math.min(VIEW_WIDTH - width - 12, x));
    let y = bottom - height;
    let shifted = false;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = { x, y, width, height };
      const conflict = placed.some((item) =>
        overlaps(candidate, {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        }),
      );
      if (!conflict) break;
      y -= height + 5;
      shifted = true;
    }

    placed.push({ ant, x, y, width, height, shifted });

    const isTarget = ant.id === targetId;
    const centerX = x + width / 2;
    const anchorX = ant.x;
    const anchorY = ant.y - 46 * ant.scale;

    if (shifted) {
      ctx.strokeStyle = isTarget
        ? 'rgba(242, 195, 100, 0.5)'
        : 'rgba(232, 224, 205, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, y + height);
      ctx.lineTo(anchorX, anchorY);
      ctx.stroke();
    } else {
      ctx.fillStyle = isTarget
        ? 'rgba(242, 195, 100, 0.75)'
        : 'rgba(232, 224, 205, 0.32)';
      ctx.beginPath();
      ctx.moveTo(centerX - 4, y + height - 1);
      ctx.lineTo(centerX + 4, y + height - 1);
      ctx.lineTo(centerX, y + height + 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    if (isTarget) {
      ctx.shadowColor = 'rgba(255, 196, 82, 0.85)';
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = isTarget
      ? 'rgba(23, 17, 9, 0.94)'
      : 'rgba(8, 12, 17, 0.84)';
    roundRect(ctx, x, y, width, height, boss ? 9 : 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isTarget
      ? 'rgba(255, 211, 118, 0.95)'
      : boss
        ? 'rgba(255, 118, 104, 0.5)'
        : 'rgba(255, 249, 232, 0.2)';
    ctx.lineWidth = isTarget ? 1.8 : 1;
    roundRect(ctx, x, y, width, height, boss ? 9 : 7);
    ctx.stroke();
    ctx.restore();

    const textY = y + height / 2 + (ant.maxHp > 1 ? -3 : 0);
    let cursor = x + padX;
    for (let i = 0; i < ant.word.length; i += 1) {
      const char = ant.word[i];
      const isTyped = isTarget && i < typed.length;
      const isNext = isTarget && i === typed.length;
      ctx.fillStyle = isTyped
        ? COLOR.green
        : isNext
          ? COLOR.goldBright
          : COLOR.cream;
      ctx.font = font;
      ctx.fillText(char, cursor, textY);
      cursor += ctx.measureText(char).width;
      if (isNext) {
        ctx.strokeStyle = 'rgba(255, 220, 132, 0.86)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cursor - ctx.measureText(char).width, textY + 11);
        ctx.lineTo(cursor + 1, textY + 11);
        ctx.stroke();
      }
    }

    if (ant.maxHp > 1) {
      const barWidth = width - padX * 2;
      const ratio = Math.max(0, ant.hp / ant.maxHp);
      const barY = y + height - 5.5;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      roundRect(ctx, x + padX, barY, barWidth, 3.2, 1.6);
      ctx.fill();
      ctx.fillStyle =
        ratio > 0.55 ? '#e0b45a' : ratio > 0.25 ? '#e4874a' : '#e05252';
      roundRect(ctx, x + padX, barY, barWidth * ratio, 3.2, 1.6);
      ctx.fill();
    }

    if (boss) {
      ctx.font = '600 9px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(255, 178, 156, 0.92)';
      ctx.textAlign = 'left';
      ctx.fillText('QUEEN', x + padX, y - 7);
      ctx.textAlign = 'left';
    }
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
