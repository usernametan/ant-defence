import { VIEW_HEIGHT, VIEW_WIDTH } from './config';

type RidgeOptions = {
  height: number;
  yOffset: number;
  baseY: number;
  amplitude: number;
  topColor: string;
  bottomColor: string;
  fogColor: string;
  fogStrength: number;
  snow: boolean;
  trees: number;
  treeColor: string;
};

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function buildRidge(options: RidgeOptions): HTMLCanvasElement {
  const rng = mulberry32(
    Math.floor(options.baseY * 31 + options.amplitude * 17 + options.trees * 7),
  );
  const canvas = makeCanvas(VIEW_WIDTH, options.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const controlCount = 14;
  const values: number[] = [];
  for (let i = 0; i < controlCount; i += 1) {
    const alternator = i % 2 === 0 ? 1 : 0.38;
    const jitter = 0.62 + rng() * 0.38;
    values.push(
      options.baseY -
        options.yOffset -
        options.amplitude * alternator * jitter,
    );
  }
  values[controlCount - 1] = values[0];

  const heightAt = (x: number): number => {
    const scaled = (x / VIEW_WIDTH) * (controlCount - 1);
    const index = Math.floor(scaled);
    const t = scaled - index;
    const eased = t * t * (3 - 2 * t);
    const a = values[Math.min(index, controlCount - 2)];
    const b = values[Math.min(index + 1, controlCount - 1)];
    const fine =
      Math.sin((x / VIEW_WIDTH) * Math.PI * 2 * 9 + 0.5) * 4 +
      Math.sin((x / VIEW_WIDTH) * Math.PI * 2 * 17 + 1.7) * 2.2;
    return a + (b - a) * eased + fine;
  };

  const path = new Path2D();
  path.moveTo(0, options.height);
  for (let x = 0; x <= VIEW_WIDTH; x += 4) {
    path.lineTo(x, heightAt(x));
  }
  path.lineTo(VIEW_WIDTH, options.height);
  path.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 0, options.height);
  gradient.addColorStop(0, options.topColor);
  gradient.addColorStop(1, options.bottomColor);
  ctx.fillStyle = gradient;
  ctx.fill(path);

  const rim = new Path2D();
  for (let x = 0; x <= VIEW_WIDTH; x += 4) {
    if (x === 0) rim.moveTo(x, heightAt(x));
    else rim.lineTo(x, heightAt(x));
  }
  ctx.strokeStyle = 'rgba(255, 205, 162, 0.16)';
  ctx.lineWidth = 2;
  ctx.stroke(rim);

  if (options.snow) {
    ctx.save();
    ctx.fillStyle = 'rgba(228, 236, 244, 0.42)';
    for (let i = 2; i < controlCount - 2; i += 2) {
      const peakX = (i / (controlCount - 1)) * VIEW_WIDTH;
      const peakY = heightAt(peakX);
      if (peakY > options.baseY - options.yOffset - options.amplitude * 0.55) {
        continue;
      }
      const half = 46 + rng() * 30;
      const snowPath = new Path2D();
      snowPath.moveTo(peakX - half, peakY + 30);
      snowPath.lineTo(peakX, peakY - 1);
      snowPath.lineTo(peakX + half, peakY + 30);
      for (let j = 4; j >= 0; j -= 1) {
        const px = peakX + (j / 4 - 0.5) * half * 2;
        snowPath.lineTo(px, peakY + 26 + rng() * 10);
      }
      snowPath.closePath();
      ctx.fill(snowPath);
    }
    ctx.restore();
  }

  if (options.trees > 0) {
    ctx.fillStyle = options.treeColor;
    for (let i = 0; i < options.trees; i += 1) {
      const x = rng() * VIEW_WIDTH;
      const base = heightAt(x) + 8 + rng() * 18;
      const size = 8 + rng() * 15;
      ctx.beginPath();
      ctx.moveTo(x, base - size);
      ctx.lineTo(x - size * 0.42, base);
      ctx.lineTo(x + size * 0.42, base);
      ctx.closePath();
      ctx.fill();
    }
  }

  const fog = ctx.createLinearGradient(
    0,
    options.height * 0.42,
    0,
    options.height,
  );
  fog.addColorStop(0, 'rgba(0,0,0,0)');
  fog.addColorStop(1, options.fogColor);
  ctx.globalAlpha = options.fogStrength;
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, VIEW_WIDTH, options.height);
  ctx.globalAlpha = 1;

  return canvas;
}

function buildForeground(): HTMLCanvasElement {
  const canvas = makeCanvas(VIEW_WIDTH, VIEW_HEIGHT);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const rng = mulberry32(90321);

  const bank = new Path2D();
  bank.moveTo(0, 622);
  bank.bezierCurveTo(200, 612, 360, 640, 560, 636);
  bank.bezierCurveTo(830, 626, 1040, 646, 1280, 630);
  bank.bezierCurveTo(1420, 620, 1520, 642, 1600, 632);
  bank.lineTo(1600, VIEW_HEIGHT);
  bank.lineTo(0, VIEW_HEIGHT);
  bank.closePath();

  const bankGradient = ctx.createLinearGradient(0, 620, 0, VIEW_HEIGHT);
  bankGradient.addColorStop(0, '#1e3728');
  bankGradient.addColorStop(0.26, '#16291d');
  bankGradient.addColorStop(1, '#07100c');
  ctx.fillStyle = bankGradient;
  ctx.fill(bank);

  ctx.save();
  ctx.clip(bank);

  const trail = new Path2D();
  trail.moveTo(-40, 734);
  trail.bezierCurveTo(320, 730, 520, 700, 760, 690);
  trail.bezierCurveTo(1040, 676, 1330, 690, 1650, 676);
  trail.lineTo(1650, 768);
  trail.bezierCurveTo(1300, 786, 1010, 770, 760, 770);
  trail.bezierCurveTo(480, 772, 260, 800, -40, 810);
  trail.closePath();

  const trailGradient = ctx.createLinearGradient(0, 660, 0, 820);
  trailGradient.addColorStop(0, '#2b2419');
  trailGradient.addColorStop(0.5, '#211b13');
  trailGradient.addColorStop(1, '#17130e');
  ctx.fillStyle = trailGradient;
  ctx.globalAlpha = 0.88;
  ctx.fill(trail);
  ctx.globalAlpha = 1;

  for (let i = 0; i < 220; i += 1) {
    const x = rng() * VIEW_WIDTH;
    const band = 662 + rng() * 132;
    const onTrail = band > 680 && band < 790;
    ctx.strokeStyle = onTrail
      ? `rgba(150, 124, 84, ${0.06 + rng() * 0.1})`
      : `rgba(94, 132, 86, ${0.05 + rng() * 0.12})`;
    ctx.lineWidth = 1 + rng() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, band);
    ctx.lineTo(x + 3 + rng() * 10, band - 2 + rng() * 4);
    ctx.stroke();
  }

  for (let i = 0; i < 18; i += 1) {
    const x = 520 + rng() * 1080;
    const y = 690 + rng() * 78;
    ctx.fillStyle = `rgba(123, 120, 110, ${0.25 + rng() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rng() * 9, 2 + rng() * 4, rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const leftRock = new Path2D();
  leftRock.moveTo(210, 762);
  leftRock.bezierCurveTo(260, 720, 380, 716, 445, 754);
  leftRock.bezierCurveTo(480, 776, 430, 808, 360, 806);
  leftRock.bezierCurveTo(290, 806, 220, 792, 210, 762);
  leftRock.closePath();
  const rockGradient = ctx.createLinearGradient(0, 710, 0, 810);
  rockGradient.addColorStop(0, '#2c2b28');
  rockGradient.addColorStop(1, '#111312');
  ctx.fillStyle = rockGradient;
  ctx.fill(leftRock);
  ctx.strokeStyle = 'rgba(168, 178, 160, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke(leftRock);

  for (let i = 0; i < 46; i += 1) {
    const x = rng() * VIEW_WIDTH;
    const y = 622 + rng() * 40;
    drawGrassTuft(ctx, x, y, 5 + rng() * 12, `rgba(${55 + rng() * 35}, ${88 + rng() * 45}, ${58 + rng() * 32}, 0.7)`);
  }

  for (let i = 0; i < 34; i += 1) {
    const x = 30 + rng() * (VIEW_WIDTH - 60);
    const y = 720 + rng() * 150;
    const colors = ['#e8bf72', '#d7d2b4', '#b58ab5', '#e1917b'];
    const color = colors[Math.floor(rng() * colors.length)];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55 + rng() * 0.3;
    for (let p = 0; p < 5; p += 1) {
      const angle = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2d48a';
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawBroadleafTree(ctx, 82, 744, 1.35, rng);
  drawBroadleafTree(ctx, 1512, 726, 1.05, rng);
  drawBroadleafTree(ctx, 1210, 650, 0.46, rng);
  drawBroadleafTree(ctx, 476, 644, 0.34, rng);
  drawPine(ctx, 640, 646, 0.5);
  drawPine(ctx, 1384, 636, 0.62);
  drawPine(ctx, 1010, 628, 0.36);

  ctx.restore();

  return canvas;
}

function drawGrassTuft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i += 1) {
    const lean = (i - 2) * 3.2;
    ctx.beginPath();
    ctx.moveTo(x + i * 1.2, y);
    ctx.quadraticCurveTo(x + lean, y - height * 0.6, x + lean * 1.5, y - height);
    ctx.stroke();
  }
}

function drawPine(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  scale: number,
): void {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#0b1712';
  ctx.fillRect(-3, -30, 6, 32);
  for (let i = 0; i < 5; i += 1) {
    const y = -18 - i * 17;
    const width = 32 - i * 4.6;
    ctx.beginPath();
    ctx.moveTo(0, y - 34);
    ctx.lineTo(-width, y);
    ctx.lineTo(width, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBroadleafTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  scale: number,
  rng: () => number,
): void {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);

  ctx.strokeStyle = '#0a0e0b';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-6, -60, 10, -110, -2, -176);
  ctx.stroke();

  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(1, -104);
  ctx.bezierCurveTo(-30, -132, -52, -146, -74, -178);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, -128);
  ctx.bezierCurveTo(32, -152, 50, -170, 72, -198);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-1, -78);
  ctx.bezierCurveTo(-38, -88, -58, -104, -84, -118);
  ctx.stroke();

  const clusters = [
    [-76, -186, 42], [-30, -214, 50], [24, -222, 46], [70, -198, 40],
    [-96, -150, 31], [94, -154, 30], [-6, -176, 47], [42, -174, 35],
    [-46, -142, 30],
  ];
  for (const [cx, cy, radius] of clusters) {
    const jittered = radius * (0.88 + rng() * 0.24);
    const gradient = ctx.createRadialGradient(
      cx - jittered * 0.3,
      cy - jittered * 0.4,
      2,
      cx,
      cy,
      jittered,
    );
    gradient.addColorStop(0, '#173121');
    gradient.addColorStop(0.72, '#0d1f16');
    gradient.addColorStop(1, '#08130e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, jittered, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

type Cloud = {
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
};

type Firefly = {
  x: number;
  y: number;
  phase: number;
  drift: number;
  size: number;
};

export class Scenery {
  private farRidge: HTMLCanvasElement;

  private midRidge: HTMLCanvasElement;

  private nearRidge: HTMLCanvasElement;

  private foreground: HTMLCanvasElement;

  private clouds: Cloud[];

  private fireflies: Firefly[];

  private scroll = 0;

  private time = 0;

  constructor() {
    this.farRidge = buildRidge({
      height: 470,
      yOffset: 262,
      baseY: 548,
      amplitude: 96,
      topColor: '#354161',
      bottomColor: '#202a43',
      fogColor: 'rgba(222, 151, 116, 1)',
      fogStrength: 0.26,
      snow: true,
      trees: 0,
      treeColor: '#1a2338',
    });
    this.midRidge = buildRidge({
      height: 430,
      yOffset: 342,
      baseY: 604,
      amplitude: 78,
      topColor: '#26324b',
      bottomColor: '#151d2e',
      fogColor: 'rgba(201, 133, 115, 1)',
      fogStrength: 0.16,
      snow: false,
      trees: 90,
      treeColor: '#101827',
    });
    this.nearRidge = buildRidge({
      height: 380,
      yOffset: 452,
      baseY: 650,
      amplitude: 46,
      topColor: '#1b2a2b',
      bottomColor: '#0b1515',
      fogColor: 'rgba(120, 152, 132, 1)',
      fogStrength: 0.08,
      snow: false,
      trees: 210,
      treeColor: '#081210',
    });
    this.foreground = buildForeground();

    const rng = mulberry32(7712);
    this.clouds = Array.from({ length: 8 }, (_, index) => ({
      x: rng() * VIEW_WIDTH,
      y: 90 + rng() * 250,
      scale: 0.55 + rng() * 1.15,
      speed: 2.5 + rng() * 5.5,
      alpha: 0.1 + rng() * 0.17 + (index > 5 ? 0.04 : 0),
    }));
    this.fireflies = Array.from({ length: 34 }, () => ({
      x: rng() * VIEW_WIDTH,
      y: 610 + rng() * 210,
      phase: rng() * Math.PI * 2,
      drift: 3 + rng() * 9,
      size: 0.8 + rng() * 1.7,
    }));
  }

  update(dt: number): void {
    this.time += dt;
    this.scroll += dt * 26;
  }

  drawBack(
    ctx: CanvasRenderingContext2D,
    shakeX: number,
    shakeY: number,
  ): void {
    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawSky(ctx);
    this.drawSun(ctx);
    this.drawClouds(ctx);
    this.drawBirds(ctx);

    this.tileLayer(ctx, this.farRidge, this.scroll * 0.035, 262);
    this.drawHaze(ctx);
    this.tileLayer(ctx, this.midRidge, this.scroll * 0.08, 342);
    this.drawWater(ctx);
    this.drawWaterfall(ctx);
    this.tileLayer(ctx, this.nearRidge, this.scroll * 0.155, 452);
    this.drawForeground(ctx);
    this.drawForegroundMotion(ctx);

    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#0b1526');
    sky.addColorStop(0.25, '#25304c');
    sky.addColorStop(0.48, '#5c5572');
    sky.addColorStop(0.63, '#a8737a');
    sky.addColorStop(0.76, '#e3a171');
    sky.addColorStop(0.87, '#ffd3a0');
    sky.addColorStop(1, '#ffe6be');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, 680);

    const bloom = ctx.createRadialGradient(1170, 468, 20, 1170, 468, 560);
    bloom.addColorStop(0, 'rgba(255, 207, 140, 0.34)');
    bloom.addColorStop(0.45, 'rgba(255, 160, 105, 0.1)');
    bloom.addColorStop(1, 'rgba(255, 130, 90, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(400, 0, 1400, 760);
  }

  private drawSun(ctx: CanvasRenderingContext2D): void {
    const x = 1170;
    const y = 464;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 210);
    glow.addColorStop(0, 'rgba(255, 246, 215, 0.95)');
    glow.addColorStop(0.16, 'rgba(255, 220, 154, 0.55)');
    glow.addColorStop(0.5, 'rgba(255, 171, 104, 0.16)');
    glow.addColorStop(1, 'rgba(255, 150, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 210, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 247, 220, 0.92)';
    ctx.beginPath();
    ctx.arc(x, y, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this.clouds) {
      const x = ((cloud.x - this.time * cloud.speed) % (VIEW_WIDTH + 420) + VIEW_WIDTH + 420) % (VIEW_WIDTH + 420);
      const y = cloud.y + Math.sin(this.time * 0.12 + cloud.x) * 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(cloud.scale, cloud.scale);
      const gradient = ctx.createLinearGradient(0, -40, 0, 60);
      gradient.addColorStop(0, `rgba(255, 226, 200, ${cloud.alpha + 0.12})`);
      gradient.addColorStop(1, `rgba(255, 196, 174, ${cloud.alpha * 0.4})`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, 96, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(-52, 4, 52, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(56, 2, 66, 17, 0, 0, Math.PI * 2);
      ctx.ellipse(-8, -13, 46, 21, 0, 0, Math.PI * 2);
      ctx.ellipse(34, -8, 36, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBirds(ctx: CanvasRenderingContext2D): void {
    const drift = (this.time * 9) % 1900;
    ctx.strokeStyle = 'rgba(28, 32, 44, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    const birds = [
      [1180, 190, 1], [1220, 206, 0.8], [1150, 216, 0.7], [1250, 180, 0.6],
    ];
    for (const [bx, by, size] of birds) {
      const x = bx - drift + 220;
      const y = by + Math.sin(this.time * 0.8 + bx) * 5;
      ctx.beginPath();
      ctx.moveTo(x - 9 * size, y);
      ctx.quadraticCurveTo(x - 4 * size, y - 5 * size, x, y);
      ctx.quadraticCurveTo(x + 4 * size, y - 5 * size, x + 9 * size, y);
      ctx.stroke();
    }
  }

  private drawHaze(ctx: CanvasRenderingContext2D): void {
    const haze = ctx.createLinearGradient(0, 380, 0, 680);
    haze.addColorStop(0, 'rgba(255, 198, 158, 0)');
    haze.addColorStop(0.52, 'rgba(255, 196, 156, 0.14)');
    haze.addColorStop(0.8, 'rgba(202, 173, 156, 0.2)');
    haze.addColorStop(1, 'rgba(167, 177, 167, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 360, VIEW_WIDTH, 340);
  }

  private drawWater(ctx: CanvasRenderingContext2D): void {
    const top = 536;
    const bottom = 666;
    const water = ctx.createLinearGradient(0, top, 0, bottom);
    water.addColorStop(0, 'rgba(103, 126, 143, 0.95)');
    water.addColorStop(0.38, 'rgba(82, 107, 125, 0.98)');
    water.addColorStop(1, 'rgba(39, 60, 68, 1)');
    ctx.fillStyle = water;
    ctx.fillRect(0, top, VIEW_WIDTH, bottom - top);

    const reflection = ctx.createRadialGradient(1170, top + 8, 4, 1170, top + 8, 280);
    reflection.addColorStop(0, 'rgba(255, 231, 177, 0.55)');
    reflection.addColorStop(0.35, 'rgba(255, 201, 130, 0.18)');
    reflection.addColorStop(1, 'rgba(255, 173, 106, 0)');
    ctx.fillStyle = reflection;
    ctx.fillRect(840, top, 660, bottom - top);

    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i += 1) {
      const y = top + 10 + i * 4.6;
      const offset = Math.sin(this.time * 0.8 + i * 0.75) * 24;
      const width = 26 + ((i * 37) % 110);
      const alpha = 0.05 + ((i * 13) % 10) / 130;
      ctx.strokeStyle = `rgba(228, 222, 202, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(160 + offset + ((i * 83) % 300), y);
      ctx.lineTo(160 + offset + ((i * 83) % 300) + width, y);
      ctx.stroke();
    }

    for (let i = 0; i < 20; i += 1) {
      const y = top + 8 + i * 6;
      const x = 1010 + Math.sin(this.time * 0.9 + i * 0.55) * 70 + ((i * 31) % 70);
      ctx.strokeStyle = `rgba(255, 214, 150, ${0.16 - i * 0.005})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30 + ((i * 17) % 40), y);
      ctx.stroke();
    }

    const shore = ctx.createLinearGradient(0, bottom - 24, 0, bottom);
    shore.addColorStop(0, 'rgba(26, 47, 37, 0)');
    shore.addColorStop(1, 'rgba(19, 38, 29, 0.75)');
    ctx.fillStyle = shore;
    ctx.fillRect(0, bottom - 24, VIEW_WIDTH, 24);
  }

  private drawWaterfall(ctx: CanvasRenderingContext2D): void {
    const x = 1038;
    const top = 558;
    const bottom = 620;
    const width = 12;

    ctx.save();

    const mist = ctx.createRadialGradient(x + 2, bottom, 4, x + 2, bottom, 64);
    mist.addColorStop(0, 'rgba(226, 239, 235, 0.2)');
    mist.addColorStop(1, 'rgba(226, 239, 235, 0)');
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.ellipse(x + 2, bottom - 2, 66, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    const flow = new Path2D();
    flow.moveTo(x - width * 0.62, top + 4);
    flow.bezierCurveTo(
      x - width * 1.12,
      top + 58,
      x - width * 0.9,
      bottom - 38,
      x - width * 1.24,
      bottom,
    );
    flow.lineTo(x + width * 0.82, bottom);
    flow.bezierCurveTo(
      x + width * 0.6,
      bottom - 54,
      x + width * 0.72,
      top + 72,
      x + width * 0.54,
      top + 4,
    );
    flow.closePath();

    const fall = ctx.createLinearGradient(x - width, top, x + width, bottom);
    fall.addColorStop(0, 'rgba(202, 224, 225, 0.08)');
    fall.addColorStop(0.18, 'rgba(222, 240, 239, 0.52)');
    fall.addColorStop(0.68, 'rgba(206, 232, 234, 0.42)');
    fall.addColorStop(1, 'rgba(238, 247, 241, 0.08)');
    ctx.fillStyle = fall;
    ctx.fill(flow);

    ctx.strokeStyle = 'rgba(255, 255, 252, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.stroke(flow);

    for (let i = 0; i < 9; i += 1) {
      const phase = (this.time * 0.64 + i * 0.23) % 1;
      const y = top + phase * (bottom - top);
      const jitter = Math.sin(this.time * 2.6 + i * 2.4) * 4;
      ctx.strokeStyle = `rgba(255, 255, 250, ${0.08 + (i % 4) * 0.06})`;
      ctx.lineWidth = 0.8 + (i % 3) * 0.7;
      ctx.beginPath();
      ctx.moveTo(x + jitter - width * 0.3, y);
      ctx.lineTo(x + jitter + 1, y + 16 + (i % 5) * 5);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i += 1) {
      const phase = (this.time * 0.45 + i * 0.17) % 1;
      const px = x + Math.sin(i * 5.7 + this.time * 0.8) * 26;
      const py = bottom - 12 - phase * 26;
      ctx.fillStyle = `rgba(226, 237, 231, ${0.13 * (1 - phase)})`;
      ctx.beginPath();
      ctx.arc(px, py, 3 + i * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawForeground(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.foreground, 0, 0);
  }

  private drawForegroundMotion(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < 70; i += 1) {
      const baseX = (i * 233) % VIEW_WIDTH;
      const baseY = 628 + ((i * 71) % 240);
      const sway = Math.sin(this.time * 1.1 + i * 1.7) * 3;
      const height = 7 + ((i * 13) % 15);
      const alpha = 0.12 + ((i * 7) % 12) / 90;
      ctx.strokeStyle = `rgba(98, 146, 98, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + sway, baseY - height * 0.6, baseX + sway * 1.8, baseY - height);
      ctx.stroke();
    }

    for (const firefly of this.fireflies) {
      const x = firefly.x + Math.sin(this.time * 0.28 + firefly.phase) * 34;
      const y = firefly.y + Math.cos(this.time * 0.21 + firefly.phase * 1.4) * 18;
      const pulse = 0.32 + 0.32 * Math.sin(this.time * 2.2 + firefly.phase);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, firefly.size * 9);
      glow.addColorStop(0, `rgba(255, 225, 148, ${pulse * 0.75})`);
      glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, firefly.size * 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 241, 193, ${pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, firefly.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private tileLayer(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    offset: number,
    y: number,
  ): void {
    const wrapped = ((offset % VIEW_WIDTH) + VIEW_WIDTH) % VIEW_WIDTH;
    ctx.drawImage(canvas, -wrapped, y);
    ctx.drawImage(canvas, -wrapped + VIEW_WIDTH, y);
  }
}
