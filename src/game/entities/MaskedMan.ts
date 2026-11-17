import Phaser from 'phaser';
import {
  characterTextureKey,
  FX,
  idleAnimationKey,
  type Facing,
} from '../art/generateArt';

export interface MaskedManHooks {
  onPlayerHit: (damage: number, sourceX: number, sourceY: number) => void;
  onBurst: () => void;
  onHpChanged: (hp: number, maxHp: number) => void;
}

const HP_FLOOR = 20;

/**
 * Act 1 antagonist. He telegraphs a ground burst, drifts toward the player,
 * and can be hit — but his HP is scripted to bottom out at 20%, at which
 * point the fight is cut short by his magic burst.
 */
export class MaskedMan {
  readonly sprite: Phaser.GameObjects.Sprite;
  hp = 100;
  readonly maxHp = 100;

  private readonly scene: Phaser.Scene;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly hooks: MaskedManHooks;
  private active = false;
  private paused = true;
  private burstRequested = false;
  private nextAttackAt = 0;
  private warning: Phaser.GameObjects.Image | null = null;
  private pendingAttack: Phaser.Time.TimerEvent | null = null;
  private facing: Facing = 'down';
  private destroyed = false;
  private lastPlayerX = 0;
  private lastPlayerY = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hooks: MaskedManHooks,
  ) {
    this.scene = scene;
    this.hooks = hooks;

    this.shadow = scene.add
      .image(x, y - 1, FX.shadow)
      .setDepth(y - 2)
      .setAlpha(0)
      .setScale(1.3);

    this.sprite = scene.add
      .sprite(x, y, characterTextureKey('masked', 'down', 0))
      .setOrigin(0.5, 1)
      .setDepth(y)
      .setVisible(false)
      .setAlpha(0);
    this.sprite.play(idleAnimationKey('masked', 'down'));
  }

  get isActive(): boolean {
    return this.active;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  appear(x: number, y: number): void {
    if (this.destroyed) return;
    this.sprite
      .setPosition(x, y)
      .setVisible(true)
      .setAlpha(0)
      .setScale(0.65)
      .setDepth(y);
    this.shadow
      .setPosition(x, y - 1)
      .setAlpha(0)
      .setDepth(y - 2);
    this.active = true;
    this.paused = false;
    this.burstRequested = false;
    this.hp = this.maxHp;
    this.nextAttackAt = this.scene.time.now + 1500;
    this.hooks.onHpChanged(this.hp, this.maxHp);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 550,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0.9,
      duration: 550,
    });

    const glow = this.scene.add
      .image(x, y - 12, FX.magic)
      .setDepth(y - 3)
      .setScale(0.4)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: glow,
      scale: 2.2,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => glow.destroy(),
    });
    this.scene.add
      .image(x, y - 12, FX.ring)
      .setDepth(y - 3)
      .setScale(0.3)
      .setAlpha(0.9)
      .setTint(0xb98cff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 2);
  }

  update(
    nowMs: number,
    deltaMs: number,
    playerX: number,
    playerY: number,
  ): void {
    if (this.destroyed || !this.active || this.paused) return;

    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;

    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
    this.shadow.setDepth(this.sprite.y - 2);
    this.sprite.setDepth(this.sprite.y);

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.hypot(dx, dy);
    this.facing =
      Math.abs(dx) > Math.abs(dy)
        ? dx >= 0
          ? 'right'
          : 'left'
        : dy >= 0
          ? 'down'
          : 'up';
    const idleKey = idleAnimationKey('masked', this.facing);
    if (this.sprite.anims.currentAnim?.key !== idleKey) {
      this.sprite.play(idleKey, true);
    }

    if (distance > 72 && distance > 0.001) {
      const drift = (Math.min(deltaMs, 50) / 1000) * 30;
      this.sprite.x += (dx / distance) * drift;
      this.sprite.y += (dy / distance) * drift;
    }

    if (nowMs >= this.nextAttackAt && !this.warning) {
      this.telegraph(playerX, playerY);
    }
  }

  damage(amount: number): boolean {
    if (this.destroyed || !this.active || this.burstRequested) return false;
    this.hp = Math.max(HP_FLOOR, this.hp - Math.max(0, amount));
    this.hooks.onHpChanged(this.hp, this.maxHp);

    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(80, () => {
      if (!this.destroyed) this.sprite.clearTint();
    });

    if (this.hp <= HP_FLOOR) {
      this.requestBurst();
    }
    return true;
  }

  requestBurst(): void {
    if (this.burstRequested) return;
    this.burstRequested = true;
    this.active = false;
    this.paused = true;
    this.clearWarning();
    this.hooks.onBurst();
  }

  stopAttacks(): void {
    this.paused = true;
    this.active = false;
    this.clearWarning();
  }

  beginCombat(): void {
    if (this.destroyed || this.burstRequested) return;
    this.active = true;
    this.paused = false;
    this.nextAttackAt = this.scene.time.now + 1400;
  }

  vanish(): void {
    if (this.destroyed) return;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      y: this.sprite.y - 22,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 600,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.sprite.setVisible(false);
        this.sprite.setAlpha(1);
      },
    });
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0,
      duration: 400,
    });
  }

  private telegraph(targetX: number, targetY: number): void {
    this.clearWarning();
    const marker = this.scene.add
      .image(targetX, targetY - 5, FX.warning)
      .setDepth(8000)
      .setScale(0.55)
      .setAlpha(0.95);

    this.scene.tweens.add({
      targets: marker,
      scale: 0.95,
      alpha: 0.6,
      duration: 700,
      ease: 'Quad.easeIn',
    });

    this.warning = marker;
    this.pendingAttack = this.scene.time.delayedCall(760, () => {
      this.pendingAttack = null;
      if (this.destroyed) return;

      marker.destroy();
      this.warning = null;

      const pulse = this.scene.add
        .image(targetX, targetY - 5, FX.ring)
        .setDepth(8001)
        .setTint(0xff7a5c)
        .setScale(0.2)
        .setAlpha(0.95)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: pulse,
        scale: 1.6,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => pulse.destroy(),
      });

      const playerDistance = Phaser.Math.Distance.Between(
        targetX,
        targetY,
        this.lastPlayerX,
        this.lastPlayerY,
      );
      if (playerDistance <= 30) {
        this.hooks.onPlayerHit(9, targetX, targetY);
      }

      this.nextAttackAt = this.scene.time.now + 2200 + Math.random() * 800;
    });
  }

  private clearWarning(): void {
    if (this.pendingAttack) {
      this.pendingAttack.remove(false);
      this.pendingAttack = null;
    }
    if (this.warning) {
      this.warning.destroy();
      this.warning = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearWarning();
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
