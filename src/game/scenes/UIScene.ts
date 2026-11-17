import Phaser from 'phaser';
import type { DialogueNode } from '../../shared/types';
import { FX } from '../art/generateArt';
import { PALETTE } from '../art/palette';
import type { DialogueView } from '../dialogue/DialogueController';
import { isDebugEnabled } from '../systems/debug';

const UI_WIDTH = 480;
const UI_HEIGHT = 270;
const MONO = 'monospace';
const SERIF = 'Georgia, "Times New Roman", serif';

/**
 * Screen-space UI and cinematic overlays. Lives in its own scene so the world
 * camera can use an integer zoom without scaling the HUD.
 */
export class UIScene extends Phaser.Scene implements DialogueView {
  private ready = false;

  private lighting!: Phaser.GameObjects.Rectangle;
  private lightingTween: Phaser.Tweens.Tween | null = null;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private fadeRect!: Phaser.GameObjects.Rectangle;
  private letterboxTop!: Phaser.GameObjects.Rectangle;
  private letterboxBottom!: Phaser.GameObjects.Rectangle;

  private panel!: Phaser.GameObjects.Container;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private dialogueHint!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];

  private promptText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private flavorText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;

  private bossGroup!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private bossName!: Phaser.GameObjects.Text;
  private bossValue!: Phaser.GameObjects.Text;

  private hpGroup!: Phaser.GameObjects.Container;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpValue!: Phaser.GameObjects.Text;

  private debugText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.lighting = this.add
      .rectangle(0, 0, UI_WIDTH, UI_HEIGHT, PALETTE.warmLight, 0.08)
      .setOrigin(0)
      .setDepth(100);

    this.add
      .image(0, 0, FX.vignette)
      .setOrigin(0)
      .setDepth(110)
      .setAlpha(0.9);

    this.flashRect = this.add
      .rectangle(0, 0, UI_WIDTH, UI_HEIGHT, PALETTE.white, 1)
      .setOrigin(0)
      .setDepth(200)
      .setAlpha(0);

    this.letterboxTop = this.add
      .rectangle(0, -30, UI_WIDTH, 30, 0x000000, 1)
      .setOrigin(0)
      .setDepth(300);
    this.letterboxBottom = this.add
      .rectangle(0, UI_HEIGHT, UI_WIDTH, 30, 0x000000, 1)
      .setOrigin(0)
      .setDepth(300);

    this.controlsText = this.add
      .text(12, 10, 'WASD / ARROWS  MOVE      E  TALK      J  SWING', {
        fontFamily: MONO,
        fontSize: '8px',
        color: '#f1e2c4',
        stroke: '#241612',
        strokeThickness: 2,
      })
      .setDepth(400)
      .setAlpha(0.85);

    this.promptText = this.add
      .text(UI_WIDTH / 2, 252, '', {
        fontFamily: MONO,
        fontSize: '10px',
        color: '#ffe0a0',
        backgroundColor: 'rgba(26, 16, 20, 0.82)',
        padding: { x: 8, y: 4 },
        stroke: '#241612',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(400)
      .setVisible(false);

    this.flavorText = this.add
      .text(UI_WIDTH / 2, 56, '', {
        fontFamily: SERIF,
        fontSize: '12px',
        fontStyle: 'italic',
        color: '#f5e4c0',
        stroke: '#241612',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(1050)
      .setAlpha(0)
      .setVisible(false);

    this.titleText = this.add
      .text(UI_WIDTH / 2, 110, '', {
        fontFamily: SERIF,
        fontSize: '26px',
        color: '#f0c06a',
        stroke: '#241612',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(1060)
      .setAlpha(0)
      .setVisible(false);

    this.subtitleText = this.add
      .text(UI_WIDTH / 2, 138, '', {
        fontFamily: MONO,
        fontSize: '9px',
        color: '#e9dcc0',
        stroke: '#241612',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(1060)
      .setAlpha(0)
      .setVisible(false);

    this.buildDialoguePanel();
    this.buildBossBar();
    this.buildPlayerHp();

    this.debugText = this.add
      .text(UI_WIDTH - 10, 8, '', {
        fontFamily: MONO,
        fontSize: '7px',
        color: '#ffd27a',
        stroke: '#120c10',
        strokeThickness: 2,
        align: 'right',
        lineSpacing: 2,
      })
      .setOrigin(1, 0)
      .setDepth(450)
      .setVisible(isDebugEnabled());

    this.fadeRect = this.add
      .rectangle(0, 0, UI_WIDTH, UI_HEIGHT, 0x000000, 1)
      .setOrigin(0)
      .setDepth(1000)
      .setAlpha(0);

    this.ready = true;
    this.showControlsHint();
  }

  private buildDialoguePanel(): void {
    const width = 448;
    const height = 94;
    this.panel = this.add
      .container(16, 166)
      .setDepth(500)
      .setVisible(false);

    const background = this.add.graphics();
    background.fillStyle(0x1a1014, 0.94);
    background.fillRoundedRect(0, 0, width, height, 4);
    background.lineStyle(2, PALETTE.gold, 0.85);
    background.strokeRoundedRect(0, 0, width, height, 4);
    background.lineStyle(1, 0x7a5a34, 0.6);
    background.strokeRoundedRect(3, 3, width - 6, height - 6, 3);
    background.fillStyle(PALETTE.gold, 0.85);
    background.fillRect(12, 0, 36, 2);
    background.fillRect(width - 48, height - 2, 36, 2);
    this.panel.add(background);

    this.speakerText = this.add
      .text(12, 8, '', {
        fontFamily: MONO,
        fontSize: '9px',
        color: '#f0c06a',
        stroke: '#120c10',
        strokeThickness: 2,
      })
      .setOrigin(0, 0);
    this.panel.add(this.speakerText);

    this.bodyText = this.add
      .text(12, 24, '', {
        fontFamily: SERIF,
        fontSize: '12px',
        color: '#f5ead2',
        align: 'left',
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    this.bodyText.setWordWrapWidth(424, true);
    this.panel.add(this.bodyText);

    for (let index = 0; index < 4; index += 1) {
      const choice = this.add
        .text(14, 52 + index * 13, '', {
          fontFamily: SERIF,
          fontSize: '11px',
          color: '#e9dcc0',
        })
        .setOrigin(0, 0)
        .setVisible(false);
      this.choiceTexts.push(choice);
      this.panel.add(choice);
    }

    this.dialogueHint = this.add
      .text(width - 12, height - 12, 'E  continue', {
        fontFamily: MONO,
        fontSize: '8px',
        color: '#b8a888',
      })
      .setOrigin(1, 1);
    this.panel.add(this.dialogueHint);
  }

  private buildBossBar(): void {
    this.bossGroup = this.add
      .container(UI_WIDTH / 2, 14)
      .setDepth(460)
      .setVisible(false);

    const background = this.add.graphics();
    background.fillStyle(0x120c10, 0.8);
    background.fillRect(-90, -2, 180, 10);
    background.lineStyle(1, 0x8a6a44, 0.9);
    background.strokeRect(-90, -2, 180, 10);
    this.bossGroup.add(background);

    this.bossFill = this.add
      .rectangle(-88, 0, 176, 6, PALETTE.danger, 1)
      .setOrigin(0, 0.5);
    this.bossGroup.add(this.bossFill);

    this.bossName = this.add
      .text(0, -8, 'MASKED MAN', {
        fontFamily: MONO,
        fontSize: '8px',
        color: '#f0c06a',
        stroke: '#120c10',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1);
    this.bossGroup.add(this.bossName);

    this.bossValue = this.add
      .text(92, 0, '', {
        fontFamily: MONO,
        fontSize: '7px',
        color: '#e9dcc0',
      })
      .setOrigin(0, 0.5);
    this.bossGroup.add(this.bossValue);
  }

  private buildPlayerHp(): void {
    this.hpGroup = this.add
      .container(14, 248)
      .setDepth(460)
      .setVisible(false);

    const label = this.add
      .text(0, -1, 'VITALITY', {
        fontFamily: MONO,
        fontSize: '7px',
        color: '#e9dcc0',
        stroke: '#120c10',
        strokeThickness: 2,
      })
      .setOrigin(0, 1);
    this.hpGroup.add(label);

    const background = this.add.graphics();
    background.fillStyle(0x120c10, 0.8);
    background.fillRect(0, 0, 94, 8);
    background.lineStyle(1, 0x8a6a44, 0.8);
    background.strokeRect(0, 0, 94, 8);
    this.hpGroup.add(background);

    this.hpFill = this.add
      .rectangle(2, 4, 90, 4, 0x7fbf5f, 1)
      .setOrigin(0, 0.5);
    this.hpGroup.add(this.hpFill);

    this.hpValue = this.add
      .text(100, 4, '', {
        fontFamily: MONO,
        fontSize: '7px',
        color: '#f5e4c0',
      })
      .setOrigin(0, 0.5);
    this.hpGroup.add(this.hpValue);
  }

  // ---------------------------------------------------------------- dialogue

  showDialogue(node: DialogueNode, selectedIndex: number): void {
    if (!this.ready) return;
    this.panel.setVisible(true);
    this.promptText.setVisible(false);
    this.speakerText.setText(node.speaker.toUpperCase());
    this.bodyText.setText(node.text);

    const choices = node.choices ?? [];
    for (let index = 0; index < this.choiceTexts.length; index += 1) {
      const text = this.choiceTexts[index];
      const choice = choices[index];
      if (!choice) {
        text.setVisible(false);
        continue;
      }
      const selected = index === selectedIndex;
      text.setVisible(true);
      text.setText(`${selected ? '\u25B8' : ' '} ${index + 1}. ${choice.text}`);
      text.setColor(selected ? '#ffd27a' : '#e9dcc0');
    }

    if (choices.length > 0) {
      this.bodyText.setY(22);
      this.dialogueHint.setText('\u2191 \u2193  choose      E  confirm');
    } else {
      this.bodyText.setY(24);
      this.dialogueHint.setText('E  continue');
    }
  }

  hideDialogue(): void {
    if (!this.ready) return;
    this.panel.setVisible(false);
    this.promptText.setVisible(false);
  }

  // ------------------------------------------------------------------- HUD

  showPrompt(text: string): void {
    if (!this.ready) return;
    if (!this.panel.visible) {
      this.promptText.setText(text).setVisible(true);
    }
  }

  hidePrompt(): void {
    this.promptText.setVisible(false);
  }

  showControlsHint(): void {
    this.controlsText.setAlpha(0.85).setVisible(true);
    this.tweens.killTweensOf(this.controlsText);
    this.tweens.add({
      targets: this.controlsText,
      alpha: 0,
      delay: 7000,
      duration: 1200,
      onComplete: () => this.controlsText.setVisible(false),
    });
  }

  showTitle(title: string, subtitle: string): void {
    if (!this.ready) return;
    this.titleText.setText(title).setVisible(true);
    this.subtitleText.setText(subtitle).setVisible(true);
    this.tweens.killTweensOf([this.titleText, this.subtitleText]);
    this.titleText.setAlpha(0);
    this.subtitleText.setAlpha(0);
    this.tweens.add({
      targets: [this.titleText, this.subtitleText],
      alpha: 1,
      duration: 900,
      ease: 'Quad.easeOut',
    });
    this.time.delayedCall(3300, () => {
      this.tweens.add({
        targets: [this.titleText, this.subtitleText],
        alpha: 0,
        duration: 1100,
        onComplete: () => {
          this.titleText.setVisible(false);
          this.subtitleText.setVisible(false);
        },
      });
    });
  }

  showFlavor(text: string, holdMs = 2600): void {
    if (!this.ready) return;
    this.flavorText.setText(text).setVisible(true);
    this.tweens.killTweensOf(this.flavorText);
    this.flavorText.setAlpha(0);
    this.tweens.add({
      targets: this.flavorText,
      alpha: 1,
      duration: 500,
    });
    this.time.delayedCall(holdMs, () => {
      this.tweens.add({
        targets: this.flavorText,
        alpha: 0,
        duration: 700,
        onComplete: () => this.flavorText.setVisible(false),
      });
    });
  }

  showBoss(name: string, hp: number, maxHp: number): void {
    this.bossName.setText(name.toUpperCase());
    this.bossGroup.setVisible(true);
    this.updateBoss(hp, maxHp);
  }

  updateBoss(hp: number, maxHp: number): void {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.bossFill.setDisplaySize(176 * ratio, 6);
    this.bossFill.setFillStyle(ratio > 0.35 ? PALETTE.danger : 0xe8a24a, 1);
    this.bossValue.setText(`${Math.ceil(hp)}`);
  }

  hideBoss(): void {
    this.bossGroup.setVisible(false);
  }

  showPlayerHp(hp: number, maxHp: number): void {
    this.hpGroup.setVisible(true);
    this.updatePlayerHp(hp, maxHp);
  }

  updatePlayerHp(hp: number, maxHp: number): void {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpFill.setDisplaySize(90 * ratio, 4);
    this.hpFill.setFillStyle(ratio > 0.4 ? 0x7fbf5f : PALETTE.danger, 1);
    this.hpValue.setText(`${Math.ceil(hp)}`);
  }

  hidePlayerHp(): void {
    this.hpGroup.setVisible(false);
  }

  // -------------------------------------------------------------- lighting

  setLighting(color: number, alpha: number, duration = 1200): void {
    if (!this.ready) return;
    const from = Phaser.Display.Color.IntegerToColor(this.lighting.fillColor);
    const to = Phaser.Display.Color.IntegerToColor(color);
    const fromAlpha = this.lighting.alpha;
    const state = { t: 0 };

    if (this.lightingTween) {
      this.lightingTween.stop();
      this.lightingTween = null;
    }

    this.lightingTween = this.tweens.add({
      targets: state,
      t: 1,
      duration: Math.max(1, duration),
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const r = Math.round(from.red + (to.red - from.red) * state.t);
        const g = Math.round(from.green + (to.green - from.green) * state.t);
        const b = Math.round(from.blue + (to.blue - from.blue) * state.t);
        this.lighting.setFillStyle((r << 16) | (g << 8) | b, 1);
        this.lighting.setAlpha(fromAlpha + (alpha - fromAlpha) * state.t);
      },
      onComplete: () => {
        this.lightingTween = null;
      },
    });
  }

  flashWhite(duration = 260, alpha = 0.9): void {
    this.tweens.killTweensOf(this.flashRect);
    this.flashRect.setAlpha(alpha);
    this.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
    });
  }

  fadeToBlack(duration = 1200, onComplete?: () => void): void {
    this.tweens.killTweensOf(this.fadeRect);
    this.fadeRect.setFillStyle(0x000000, 1).setAlpha(0);
    this.tweens.add({
      targets: this.fadeRect,
      alpha: 1,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => onComplete?.(),
    });
  }

  fadeFromBlack(duration = 900): void {
    this.tweens.killTweensOf(this.fadeRect);
    this.tweens.add({
      targets: this.fadeRect,
      alpha: 0,
      duration,
      ease: 'Sine.easeOut',
    });
  }

  openLetterbox(duration = 700): void {
    this.tweens.add({
      targets: this.letterboxTop,
      y: 0,
      duration,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: this.letterboxBottom,
      y: UI_HEIGHT - 30,
      duration,
      ease: 'Sine.easeOut',
    });
  }

  closeLetterbox(duration = 700): void {
    this.tweens.add({
      targets: this.letterboxTop,
      y: -30,
      duration,
      ease: 'Sine.easeIn',
    });
    this.tweens.add({
      targets: this.letterboxBottom,
      y: UI_HEIGHT,
      duration,
      ease: 'Sine.easeIn',
    });
  }

  setDebugText(text: string): void {
    this.debugText.setText(text);
  }
}
