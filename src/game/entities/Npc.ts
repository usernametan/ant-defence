import Phaser from 'phaser';
import {
  characterTextureKey,
  idleAnimationKey,
  walkAnimationKey,
  type CharacterKind,
  type Facing,
} from '../art/generateArt';
import { PALETTE } from '../art/palette';
import type { CollisionWorld } from '../maps/collision';

export interface NpcOptions {
  name: string;
  dialogueId: string;
  kind: CharacterKind;
  x: number;
  y: number;
  facing?: Facing;
  wanderRadius?: number;
  collision?: CollisionWorld;
}

/**
 * Reusable ambient villager / story NPC. Carries a name, a dialogue id and a
 * floating "!" prompt that appears when the player is close enough to talk.
 */
export class Npc {
  readonly name: string;
  readonly dialogueId: string;
  readonly kind: CharacterKind;
  readonly sprite: Phaser.GameObjects.Sprite;

  private readonly scene: Phaser.Scene;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly prompt: Phaser.GameObjects.Text;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly homeX: number;
  private readonly homeY: number;
  private readonly wanderRadius: number;
  private readonly collision: CollisionWorld | null;
  private facing: Facing;
  private nextWanderAt = 0;
  private paused = false;
  private destroyed = false;

  constructor(scene: Phaser.Scene, options: NpcOptions) {
    this.scene = scene;
    this.name = options.name;
    this.dialogueId = options.dialogueId;
    this.kind = options.kind;
    this.homeX = options.x;
    this.homeY = options.y;
    this.wanderRadius = options.wanderRadius ?? 0;
    this.collision = options.collision ?? null;
    this.facing = options.facing ?? 'down';

    this.shadow = scene.add
      .image(options.x, options.y - 1, 'fx:shadow')
      .setDepth(options.y - 2)
      .setAlpha(0.75);

    this.sprite = scene.add
      .sprite(
        options.x,
        options.y,
        characterTextureKey(options.kind, this.facing, 0),
      )
      .setOrigin(0.5, 1)
      .setDepth(options.y);
    this.sprite.play(idleAnimationKey(options.kind, this.facing));

    this.prompt = scene.add
      .text(options.x, options.y - 27, '!', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffd27a',
        stroke: '#241612',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(9000)
      .setVisible(false);

    this.nameLabel = scene.add
      .text(options.x, options.y - 37, options.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#f5e7c8',
        stroke: '#241612',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(9000)
      .setAlpha(0.9)
      .setVisible(false);

    scene.tweens.add({
      targets: this.prompt,
      y: options.y - 30,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  isNear(x: number, y: number, radius = 30): boolean {
    return this.distanceTo(x, y) <= radius;
  }

  update(nowMs: number, playerX: number, playerY: number): boolean {
    if (this.destroyed) return false;

    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
    this.shadow.setDepth(this.sprite.y - 2);
    this.sprite.setDepth(this.sprite.y);

    const near = this.isNear(playerX, playerY);
    this.prompt.setVisible(near).setPosition(this.sprite.x, this.sprite.y - 27);
    this.nameLabel
      .setVisible(near)
      .setPosition(this.sprite.x, this.sprite.y - 37);

    if (
      !this.paused &&
      this.wanderRadius > 0 &&
      nowMs >= this.nextWanderAt &&
      !this.scene.tweens.isTweening(this.sprite)
    ) {
      this.startWander(nowMs);
    }

    return near;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.play(idleAnimationKey(this.kind, this.facing), true);
    }
  }

  setPromptVisible(visible: boolean): void {
    this.prompt.setVisible(visible);
    this.nameLabel.setVisible(visible);
  }

  private startWander(nowMs: number): void {
    this.nextWanderAt = nowMs + 2200 + Math.random() * 3200;
    const target = this.pickWanderTarget();
    if (!target) return;

    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    this.facing =
      Math.abs(dx) > Math.abs(dy)
        ? dx >= 0
          ? 'right'
          : 'left'
        : dy >= 0
          ? 'down'
          : 'up';
    this.sprite.play(walkAnimationKey(this.kind, this.facing), true);

    this.scene.tweens.add({
      targets: this.sprite,
      x: target.x,
      y: target.y,
      duration: 700 + Math.random() * 500,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.destroyed) return;
        this.sprite.play(idleAnimationKey(this.kind, this.facing), true);
      },
    });
  }

  private pickWanderTarget(): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 8 + Math.random() * this.wanderRadius;
      const x = this.homeX + Math.cos(angle) * distance;
      const y = this.homeY + Math.sin(angle) * distance * 0.7;
      if (!this.collision || !this.collision.isSolidAt(x, y - 1)) {
        return { x, y };
      }
    }
    return null;
  }

  /** Used by the scripted ending: tint the son as the magic takes him. */
  setMagicalTint(): void {
    this.sprite.setTint(PALETTE.magicLight);
  }

  hideShadow(): void {
    this.shadow.setVisible(false);
  }

  destroy(): void {
    this.destroyed = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
    this.shadow.destroy();
    this.prompt.destroy();
    this.nameLabel.destroy();
  }
}
