import Phaser from 'phaser';
import {
  characterTextureKey,
  FX,
  idleAnimationKey,
  walkAnimationKey,
  type Facing,
} from '../art/generateArt';
import type { CollisionWorld } from '../maps/collision';

export interface AttackSwing {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  reach: number;
  damage: number;
}

export interface BodyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BODY_WIDTH = 10;
const BODY_HEIGHT = 6;
const MAX_SPEED = 82;
const ACCELERATION = 440;
const FRICTION = 760;
const ATTACK_COOLDOWN_MS = 360;

/** The father. 8-direction movement, acceleration, sliding collision, sword arc. */
export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  hp = 100;
  readonly maxHp = 100;

  private readonly scene: Phaser.Scene;
  private readonly shadow: Phaser.GameObjects.Image;
  private velocityX = 0;
  private velocityY = 0;
  private facing: Facing = 'down';
  private aimX = 0;
  private aimY = 1;
  private attackReadyAt = 0;
  private fallen = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.shadow = scene.add
      .image(x, y - 1, FX.shadow)
      .setDepth(y - 2)
      .setAlpha(0.9);

    this.sprite = scene.add
      .sprite(x, y, characterTextureKey('player', 'down', 0))
      .setOrigin(0.5, 1)
      .setDepth(y);
    this.sprite.play(idleAnimationKey('player', 'down'));
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get facingVector(): { x: number; y: number } {
    return { x: this.aimX, y: this.aimY };
  }

  get bodyRect(): BodyRect {
    return {
      x: this.sprite.x - BODY_WIDTH / 2,
      y: this.sprite.y - BODY_HEIGHT,
      width: BODY_WIDTH,
      height: BODY_HEIGHT,
    };
  }

  update(
    deltaMs: number,
    moveX: number,
    moveY: number,
    collision: CollisionWorld,
  ): void {
    const dt = Math.min(deltaMs, 50) / 1000;

    if (this.fallen) {
      this.velocityX = 0;
      this.velocityY = 0;
      return;
    }

    const inputLength = Math.hypot(moveX, moveY);
    if (inputLength > 0) {
      const nx = moveX / inputLength;
      const ny = moveY / inputLength;
      this.velocityX += nx * ACCELERATION * dt;
      this.velocityY += ny * ACCELERATION * dt;
      this.aimX = nx;
      this.aimY = ny;
      this.facing = this.facingFromVector(nx, ny);
    } else {
      this.velocityX = this.approach(this.velocityX, FRICTION * dt);
      this.velocityY = this.approach(this.velocityY, FRICTION * dt);
    }

    const speed = Math.hypot(this.velocityX, this.velocityY);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      this.velocityX *= scale;
      this.velocityY *= scale;
    }

    const moved = collision.moveRect(
      this.sprite.x - BODY_WIDTH / 2,
      this.sprite.y - BODY_HEIGHT,
      BODY_WIDTH,
      BODY_HEIGHT,
      this.velocityX * dt,
      this.velocityY * dt,
    );

    if (moved.hitX) this.velocityX = 0;
    if (moved.hitY) this.velocityY = 0;

    const nextX = moved.x + BODY_WIDTH / 2;
    const nextY = moved.y + BODY_HEIGHT;
    this.sprite.setPosition(nextX, nextY);
    this.sprite.setDepth(nextY);
    this.shadow.setPosition(nextX, nextY - 1);
    this.shadow.setDepth(nextY - 2);

    const moving = Math.hypot(this.velocityX, this.velocityY) > 8;
    const animKey = moving
      ? walkAnimationKey('player', this.facing)
      : idleAnimationKey('player', this.facing);
    if (this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey, true);
    }
  }

  attack(nowMs: number): AttackSwing | null {
    if (this.fallen || nowMs < this.attackReadyAt) return null;
    this.attackReadyAt = nowMs + ATTACK_COOLDOWN_MS;

    const dirX = this.aimX;
    const dirY = this.aimY;
    const slashX = this.x + dirX * 15;
    const slashY = this.y - 11 + dirY * 14;

    const slash = this.scene.add
      .image(slashX, slashY, FX.slash)
      .setDepth(this.y + 2)
      .setRotation(Math.atan2(dirY, dirX) + Math.PI * 0.25)
      .setScale(0.85)
      .setAlpha(0.95);

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      angle: slash.angle + 40,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });

    this.velocityX += dirX * 26;
    this.velocityY += dirY * 26;

    return {
      x: this.x + dirX * 10,
      y: this.y - 10 + dirY * 10,
      dirX,
      dirY,
      reach: 26,
      damage: 8,
    };
  }

  takeDamage(amount: number, floor = 0): number {
    this.hp = Math.max(floor, this.hp - Math.max(0, amount));
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(90, () => {
      if (!this.fallen) this.sprite.clearTint();
    });
    return this.hp;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, amount));
  }

  push(dx: number, dy: number): void {
    this.velocityX += dx;
    this.velocityY += dy;
  }

  /**
   * Scripted knockdown: disables control-facing animation and tweens the body
   * away from the blast while keeping the shadow glued to the ground.
   */
  knockDown(dx: number, dy: number): void {
    this.setFallen();
    const targetX = this.sprite.x + dx;
    const targetY = this.sprite.y + dy;
    this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      angle: dx >= 0 ? 10 : -10,
      duration: 460,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.sprite.setDepth(this.sprite.y);
        this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
        this.shadow.setDepth(this.sprite.y - 2);
      },
    });
  }

  flashHurt(): void {
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(90, () => {
      if (!this.fallen) this.sprite.clearTint();
    });
  }

  setFallen(): void {
    this.fallen = true;
    this.velocityX = 0;
    this.velocityY = 0;
    this.sprite.anims.stop();
    this.sprite.setTexture(characterTextureKey('player', this.facing, 0));
    this.sprite.setTint(0x8f7f7a);
    this.sprite.setAlpha(0.92);
    this.sprite.setScale(1, 0.72);
    this.sprite.setPosition(this.sprite.x, this.sprite.y + 2);
    this.sprite.setDepth(this.sprite.y);
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
    const vectors: Record<Facing, { x: number; y: number }> = {
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    this.aimX = vectors[facing].x;
    this.aimY = vectors[facing].y;
    this.sprite.play(idleAnimationKey('player', facing), true);
  }

  private facingFromVector(x: number, y: number): Facing {
    if (Math.abs(x) > Math.abs(y) * 0.85) {
      return x >= 0 ? 'right' : 'left';
    }
    return y >= 0 ? 'down' : 'up';
  }

  private approach(value: number, delta: number): number {
    if (value > 0) return Math.max(0, value - delta);
    if (value < 0) return Math.min(0, value + delta);
    return 0;
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
