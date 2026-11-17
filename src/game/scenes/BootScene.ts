import Phaser from 'phaser';
import { registerPlaceholderTextures } from '../../assets/manifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    registerPlaceholderTextures(this);

    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 8, 'THE ART OF ALCHEMY', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f2c364',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 12, 'RASASHASTRA • 480x270', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#b8b0a0',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
