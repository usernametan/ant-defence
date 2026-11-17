import Phaser from 'phaser';
import { registerPlaceholderTextures } from '../../assets/manifest';
import { createCharacterAnimations, generateVillageTextures } from '../art/generateArt';
import { PALETTE, css } from '../art/palette';

const MIN_DISPLAY_MS = 420;

/**
 * Generates every placeholder texture/animation the village needs, shows a
 * short title card, then hands off to `VillageScene`. Nothing is loaded from
 * disk, so there is no preload phase to wait on.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    registerPlaceholderTextures(this);
    generateVillageTextures(this);
    createCharacterAnimations(this);

    this.cameras.main.setBackgroundColor(css(PALETTE.ink));

    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 12, 'THE ART OF ALCHEMY', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        color: css(PALETTE.gold),
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, 'ACT I  \u00B7  THE QUIET WELL', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: css(PALETTE.creamShade),
        align: 'center',
      })
      .setOrigin(0.5);

    this.cameras.main.fadeIn(220, 14, 9, 16);
    this.time.delayedCall(MIN_DISPLAY_MS, () => {
      this.cameras.main.fadeOut(260, 14, 9, 16);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('VillageScene');
      });
    });
  }
}
