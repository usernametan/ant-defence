import { randomRange, type RandomSource } from "../core/rng";

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;
}

const DEFAULT_CAPACITY = 192;

export class ImpactEffects {
  private readonly pool: Particle[] = [];
  private active = 0;

  constructor(
    private readonly capacity = DEFAULT_CAPACITY,
    private readonly random: RandomSource = Math.random,
  ) {}

  get activeCount(): number {
    return this.active;
  }

  spawnMuzzle(
    x: number,
    y: number,
    angle: number,
    color: string,
    coreColor: string,
  ): void {
    for (let index = 0; index < 4; index += 1) {
      const spreadAngle =
        angle + randomRange(this.random, -0.24, 0.24);
      const speed = randomRange(this.random, 40, 130);

      this.spawnParticle(
        x,
        y,
        Math.cos(spreadAngle) * speed,
        Math.sin(spreadAngle) * speed,
        randomRange(this.random, 0.06, 0.14),
        randomRange(this.random, 1.4, 3.4),
        index === 0 ? coreColor : color,
        9,
      );
    }
  }

  spawnImpact(
    x: number,
    y: number,
    color: string,
    coreColor: string,
    count = 9,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = randomRange(this.random, 0, Math.PI * 2);
      const speed = randomRange(this.random, 50, 210);

      this.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomRange(this.random, 0.18, 0.45),
        randomRange(this.random, 1.2, 3.8),
        index % 3 === 0 ? coreColor : color,
        5,
      );
    }
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    let index = 0;

    while (index < this.active) {
      const particle = this.pool[index];
      particle.life -= deltaSeconds;

      if (particle.life <= 0) {
        this.removeActive(index);
        continue;
      }

      const drag = Math.max(0, 1 - particle.drag * deltaSeconds);
      particle.velocityX *= drag;
      particle.velocityY *= drag;
      particle.x += particle.velocityX * deltaSeconds;
      particle.y += particle.velocityY * deltaSeconds;
      index += 1;
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    if (this.active === 0) {
      return;
    }

    context.save();
    context.globalCompositeOperation = "lighter";

    for (let index = 0; index < this.active; index += 1) {
      const particle = this.pool[index];
      const alpha = Math.max(0, particle.life / particle.maxLife);

      context.globalAlpha = alpha;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(
        particle.x,
        particle.y,
        Math.max(0.5, particle.size * alpha),
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    context.restore();
  }

  clear(): void {
    this.active = 0;
  }

  private spawnParticle(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    life: number,
    size: number,
    color: string,
    drag: number,
  ): void {
    if (this.active >= this.capacity) {
      return;
    }

    const particle = this.pool[this.active] ?? this.createParticle();

    particle.x = x;
    particle.y = y;
    particle.velocityX = velocityX;
    particle.velocityY = velocityY;
    particle.life = life;
    particle.maxLife = life;
    particle.size = size;
    particle.color = color;
    particle.drag = drag;
    this.active += 1;
  }

  private removeActive(index: number): void {
    const lastIndex = this.active - 1;

    if (index !== lastIndex) {
      const last = this.pool[lastIndex];
      this.pool[lastIndex] = this.pool[index];
      this.pool[index] = last;
    }

    this.active -= 1;
  }

  private createParticle(): Particle {
    const particle: Particle = {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      color: "#ffffff",
      drag: 0,
    };

    this.pool.push(particle);

    return particle;
  }
}
