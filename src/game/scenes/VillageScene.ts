import Phaser from 'phaser';
import { bus } from '../../shared/events';
import type { QuestFlag, SaveData, Vec2 } from '../../shared/types';
import {
  BG,
  FX,
  PROP,
  TILESET_KEY,
} from '../art/generateArt';
import { PALETTE } from '../art/palette';
import { DialogueController } from '../dialogue/DialogueController';
import { GAME_DIALOGUE } from '../dialogue/dialogueSource';
import { MaskedMan } from '../entities/MaskedMan';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { CollisionWorld } from '../maps/collision';
import { TILE_SIZE, isSolidTile } from '../maps/tiles';
import {
  buildVillageMap,
  tileToWorld,
  type VillageMap,
} from '../maps/villageMap';
import {
  ensureAudio,
  playHit,
  playMagic,
  playSwing,
  setAmbientLevel,
  startAmbience,
  stopAmbience,
} from '../audio/audio';
import { isDebugEnabled, isResetRequested } from '../systems/debug';
import { gameState } from '../systems/gameState';
import {
  installDialogueInputLock,
  isInputLocked,
  resetInputLocks,
  setManualInputLock,
} from '../systems/inputLock';
import { clearSave, loadSave, writeSave } from '../systems/save';
import { UIScene } from './UIScene';

type ActPhase =
  | 'explore'
  | 'dusk'
  | 'silence'
  | 'confrontation'
  | 'fight'
  | 'finale'
  | 'aftermath';

const INTERACT_RADIUS = 32;

export class VillageScene extends Phaser.Scene {
  private mapData!: VillageMap;
  private collision!: CollisionWorld;
  private player!: Player;
  private son: Npc | null = null;
  private villagers: Npc[] = [];
  private masked!: MaskedMan;
  private ui!: UIScene;
  private dialogue!: DialogueController;

  private phase: ActPhase = 'explore';
  private nearestNpc: Npc | null = null;
  private restoredAftermath = false;
  private sonKidnapped = false;
  private finaleTriggered = false;
  private fightTimer: Phaser.Time.TimerEvent | null = null;
  private lowHpWarned = false;

  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyE?: Phaser.Input.Keyboard.Key;
  private keyJ?: Phaser.Input.Keyboard.Key;
  private keyOne?: Phaser.Input.Keyboard.Key;
  private keyTwo?: Phaser.Input.Keyboard.Key;
  private keyEnter?: Phaser.Input.Keyboard.Key;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private waterShimmer?: Phaser.GameObjects.TileSprite;
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private leaves?: Phaser.GameObjects.Particles.ParticleEmitter;
  private magic?: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambientParticlesActive = true;
  private nextDustAt = 0;
  private nextLeafAt = 0;

  private busCleanups: Array<() => void> = [];
  private debug = false;
  private debugStatic?: Phaser.GameObjects.Graphics;
  private debugDynamic?: Phaser.GameObjects.Graphics;
  private nextDebugAt = 0;

  constructor() {
    super({ key: 'VillageScene' });
  }

  create(): void {
    resetInputLocks();
    setManualInputLock(false);
    this.phase = 'explore';
    this.sonKidnapped = false;
    this.finaleTriggered = false;

    const save = this.prepareSave();

    this.mapData = buildVillageMap();
    this.collision = new CollisionWorld(this.mapData);

    this.scene.launch('UIScene');
    this.ui = this.scene.get('UIScene') as UIScene;
    this.dialogue = new DialogueController(
      GAME_DIALOGUE,
      this.ui,
      (scriptId) => this.handleDialogueEnd(scriptId),
    );

    this.buildTerrain();
    this.buildProps();
    this.spawnPlayer(save);
    this.spawnNpcs();
    this.spawnMaskedMan();
    this.createAmbientParticles();
    this.setupCamera();
    this.setupInput();
    this.setupStoryListeners();
    this.setupDebug();

    if (this.restoredAftermath) {
      this.enterAftermathFromSave();
    }

    this.time.delayedCall(180, () => {
      if (this.restoredAftermath) {
        this.ui.setLighting(PALETTE.night, 0.5, 10);
        this.ui.fadeToBlack(10);
        this.ui.showTitle('ACT I', 'THE FIRST DEFEAT');
        this.ui.showFlavor(
          'The village is silent. Beyond the hills, a cave breathes.',
          9000,
        );
      } else {
        this.ui.setLighting(PALETTE.warmLight, 0.1, 900);
        this.ui.showTitle('THE ART OF ALCHEMY', 'ACT I  \u00B7  THE QUIET WELL');
        this.ui.showFlavor(
          'Golden hour. The village is warm, and the old well is humming.',
          3600,
        );
      }
    });
  }

  // --------------------------------------------------------------- creation

  private prepareSave(): SaveData | null {
    if (isResetRequested()) {
      clearSave();
      gameState.reset();
      return null;
    }

    const save = loadSave();
    if (save) {
      gameState.applySaveData(save);
      this.restoredAftermath = gameState.hasFlag('first_defeat');
    }
    return save;
  }

  private buildTerrain(): void {
    this.add
      .image(0, -16, BG.sky)
      .setOrigin(0)
      .setDepth(-100)
      .setScrollFactor(0.35);

    const tilemap = this.make.tilemap({
      data: this.mapData.tiles,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = tilemap.addTilesetImage(
      'village',
      TILESET_KEY,
      TILE_SIZE,
      TILE_SIZE,
    );
    if (tileset) {
      const layer = tilemap.createLayer(0, tileset, 0, 0);
      layer?.setDepth(0);
    }

    const riverX = (this.mapData.width - 7) * TILE_SIZE;
    const riverY = 11 * TILE_SIZE;
    this.waterShimmer = this.add
      .tileSprite(
        riverX,
        riverY,
        7 * TILE_SIZE,
        (this.mapData.height - 11) * TILE_SIZE,
        FX.waterShimmer,
      )
      .setOrigin(0)
      .setDepth(1)
      .setAlpha(0.42);
  }

  private buildProps(): void {
    for (const prop of this.mapData.props) {
      const point = tileToWorld(prop.tileX, prop.tileY);

      switch (prop.kind) {
        case 'hut': {
          const variant = prop.variant ?? 0;
          const key =
            variant === 1 ? PROP.hut1 : variant === 2 ? PROP.hut2 : PROP.hut0;
          this.add
            .image(point.x, point.y, key)
            .setOrigin(0.5, 1)
            .setDepth(point.y);

          const glow = this.add
            .image(point.x + 1, point.y - 8, FX.glow)
            .setDepth(point.y + 1)
            .setScale(0.6)
            .setAlpha(0.22)
            .setTint(PALETTE.warmLight)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: glow,
            alpha: 0.34,
            duration: 1800 + Math.random() * 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          break;
        }
        case 'well':
          this.add
            .image(point.x, point.y, PROP.well)
            .setOrigin(0.5, 1)
            .setDepth(point.y);
          break;
        case 'tree':
        case 'treeLarge': {
          const key = prop.kind === 'tree' ? PROP.tree : PROP.treeLarge;
          const tree = this.add
            .image(point.x, point.y, key)
            .setOrigin(0.5, 1)
            .setDepth(point.y);
          this.tweens.add({
            targets: tree,
            angle: { from: -0.5, to: 0.5 },
            duration: 3200 + Math.random() * 2400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          break;
        }
        case 'rock':
          this.add
            .image(point.x, point.y, PROP.rock)
            .setOrigin(0.5, 1)
            .setDepth(point.y);
          break;
        case 'lamp': {
          this.add
            .image(point.x, point.y, PROP.lamp)
            .setOrigin(0.5, 1)
            .setDepth(point.y);
          const glow = this.add
            .image(point.x, point.y - 19, FX.glow)
            .setDepth(point.y + 1)
            .setScale(0.55)
            .setAlpha(0.28)
            .setTint(0xffc070)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: glow,
            alpha: 0.45,
            scale: 0.65,
            duration: 900 + Math.random() * 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          break;
        }
        default:
          break;
      }
    }
  }

  private spawnPlayer(save: SaveData | null): void {
    const fallback = this.mapData.playerSpawn;
    let spawn: Vec2 = { x: fallback.x, y: fallback.y };

    if (save) {
      const saved = save.playerPos;
      if (!this.isBodyBlocked(saved.x, saved.y)) {
        spawn = { x: saved.x, y: saved.y };
      }
    }

    this.player = new Player(this, spawn.x, spawn.y);
  }

  private spawnNpcs(): void {
    if (!this.restoredAftermath) {
      const sonPoint = this.mapData.sonSpawn;
      this.son = new Npc(this, {
        name: 'Aarav',
        dialogueId: 'son_intro',
        kind: 'son',
        x: sonPoint.x,
        y: sonPoint.y,
        facing: 'down',
        wanderRadius: 0,
      });
    }

    const villagers: Array<{
      name: string;
      dialogueId: string;
      kind: 'villager1' | 'villager2' | 'villager3';
      facing: 'down' | 'up' | 'left' | 'right';
    }> = [
      { name: 'Maya', dialogueId: 'villager_potter', kind: 'villager1', facing: 'left' },
      { name: 'Elder Rama', dialogueId: 'villager_elder', kind: 'villager2', facing: 'down' },
      { name: 'Meera', dialogueId: 'villager_child', kind: 'villager3', facing: 'right' },
    ];

    this.villagers = this.mapData.villagerSpawns.map((point, index) => {
      const config = villagers[index] ?? villagers[0];
      return new Npc(this, {
        name: config.name,
        dialogueId: config.dialogueId,
        kind: config.kind,
        x: point.x,
        y: point.y,
        facing: config.facing,
        wanderRadius: 22,
        collision: this.collision,
      });
    });
  }

  private spawnMaskedMan(): void {
    const spawn = this.mapData.maskedSpawn;
    this.masked = new MaskedMan(this, spawn.x, spawn.y, {
      onPlayerHit: (damage, sourceX, sourceY) =>
        this.hurtPlayer(damage, sourceX, sourceY),
      onBurst: () => this.beginFinale(),
      onHpChanged: (hp, maxHp) => this.ui.updateBoss(hp, maxHp),
    });
  }

  private createAmbientParticles(): void {
    this.dust = this.add
      .particles(0, 0, FX.dust, {
        lifespan: { min: 2400, max: 5200 },
        speedX: { min: -6, max: 12 },
        speedY: { min: -5, max: 4 },
        alpha: { start: 0.38, end: 0 },
        scale: { start: 0.8, end: 0.2 },
        frequency: -1,
        blendMode: Phaser.BlendModes.ADD,
        tint: 0xffd9a0,
      })
      .setDepth(8500);

    this.leaves = this.add
      .particles(0, 0, FX.leaf, {
        lifespan: { min: 4200, max: 7600 },
        speedX: { min: -14, max: 18 },
        speedY: { min: -4, max: 7 },
        gravityY: 3,
        rotate: { min: 0, max: 360 },
        alpha: { start: 0.85, end: 0 },
        scale: { start: 0.9, end: 0.5 },
        frequency: -1,
      })
      .setDepth(8500);

    this.magic = this.add
      .particles(0, 0, FX.spark, {
        lifespan: { min: 380, max: 900 },
        speed: { min: 18, max: 95 },
        angle: { min: 0, max: 360 },
        alpha: { start: 1, end: 0 },
        scale: { start: 1.2, end: 0.2 },
        frequency: -1,
        blendMode: Phaser.BlendModes.ADD,
        tint: [0xb98cff, 0xe0c2ff, 0xffd27a],
      })
      .setDepth(8600);

    if (this.restoredAftermath) {
      this.stopAmbientParticles();
    }
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(
      0,
      0,
      this.mapData.width * TILE_SIZE,
      this.mapData.height * TILE_SIZE,
    );
    camera.setZoom(2);
    camera.setRoundPixels(true);
    camera.startFollow(this.player.sprite, true, 0.14, 0.14);
    camera.setDeadzone(18, 10);
    camera.fadeIn(700, 14, 9, 16);
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyJ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      this.keyOne = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      this.keyTwo = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
      this.keyEnter = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.cursors = keyboard.createCursorKeys();
      keyboard.once('keydown', this.unlockAudio, this);
    }
    this.input.once('pointerdown', this.unlockAudio, this);
  }

  private setupStoryListeners(): void {
    this.busCleanups.push(installDialogueInputLock());
    this.busCleanups.push(
      bus.on('quest:flag', ({ flag, value }) => {
        gameState.setFlag(flag, value);
        this.persist();
      }),
    );
    this.busCleanups.push(
      bus.on('reaction:discovered', ({ reaction }) => {
        gameState.addDiscovered(reaction.id);
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private setupDebug(): void {
    this.debug = isDebugEnabled();
    if (!this.debug) return;

    this.debugStatic = this.add.graphics().setDepth(9500);
    this.debugDynamic = this.add.graphics().setDepth(9501);

    for (let y = 0; y < this.mapData.height; y += 1) {
      const row = this.mapData.tiles[y];
      if (!row) continue;
      for (let x = 0; x < this.mapData.width; x += 1) {
        const tile = row[x];
        if (tile === undefined) continue;
        if (isSolidTile(tile)) {
          this.debugStatic.lineStyle(1, 0xff5a4a, 0.28);
          this.debugStatic.strokeRect(
            x * TILE_SIZE + 0.5,
            y * TILE_SIZE + 0.5,
            TILE_SIZE - 1,
            TILE_SIZE - 1,
          );
        }
      }
    }

    this.debugStatic.lineStyle(1, 0x5ad1ff, 0.8);
    for (const rect of this.mapData.solids) {
      this.debugStatic.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  // ----------------------------------------------------------------- update

  update(time: number, delta: number): void {
    if (!this.player) return;

    if (this.waterShimmer) {
      this.waterShimmer.tilePositionX += delta * 0.012;
    }

    if (this.ambientParticlesActive) {
      this.emitAmbientParticles(time);
    }

    const playerX = this.player.x;
    const playerY = this.player.y;
    const canInteract = this.phase === 'explore' && !this.dialogue.isOpen;

    let nearest: Npc | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    if (this.son && !this.sonKidnapped) {
      const near = this.son.update(time, playerX, playerY);
      if (!canInteract) this.son.setPromptVisible(false);
      if (near) {
        nearest = this.son;
        nearestDistance = this.son.distanceTo(playerX, playerY);
      }
    }

    for (const villager of this.villagers) {
      const near = villager.update(time, playerX, playerY);
      if (!canInteract) villager.setPromptVisible(false);
      if (near) {
        const distance = villager.distanceTo(playerX, playerY);
        if (distance < nearestDistance) {
          nearest = villager;
          nearestDistance = distance;
        }
      }
    }

    this.nearestNpc =
      nearest && nearestDistance <= INTERACT_RADIUS ? nearest : null;

    let moveX = 0;
    let moveY = 0;
    if (!isInputLocked() && this.phase !== 'aftermath') {
      if (this.keyA?.isDown || this.cursors?.left.isDown) moveX -= 1;
      if (this.keyD?.isDown || this.cursors?.right.isDown) moveX += 1;
      if (this.keyW?.isDown || this.cursors?.up.isDown) moveY -= 1;
      if (this.keyS?.isDown || this.cursors?.down.isDown) moveY += 1;
    }

    this.player.update(delta, moveX, moveY, this.collision);
    this.masked.update(time, delta, this.player.x, this.player.y);

    if (this.nearestNpc && !this.dialogue.isOpen && this.phase === 'explore') {
      this.ui.showPrompt(`E  Speak with ${this.nearestNpc.name}`);
    } else {
      this.ui.hidePrompt();
    }

    this.handleActionKeys(time);
    this.updateDebug(time);
  }

  private emitAmbientParticles(time: number): void {
    if (!this.dust || !this.leaves) return;
    const view = this.cameras.main.worldView;

    if (time >= this.nextDustAt) {
      this.nextDustAt = time + 150 + Math.random() * 160;
      const x = view.x + Math.random() * view.width;
      const y = view.y + view.height * (0.3 + Math.random() * 0.7);
      this.dust.emitParticleAt(x, y, 1);
    }

    if (time >= this.nextLeafAt) {
      this.nextLeafAt = time + 700 + Math.random() * 900;
      const x = view.x + Math.random() * view.width;
      const y = view.y + Math.random() * view.height * 0.6;
      this.leaves.emitParticleAt(x, y, 1);
    }
  }

  private handleActionKeys(time: number): void {
    if (this.justDown(this.keyE) || this.justDown(this.keyEnter)) {
      this.onInteract();
    }

    if (this.dialogue.isOpen) {
      if (this.justDown(this.cursors?.up) || this.justDown(this.keyW)) {
        this.dialogue.moveSelection(-1);
      }
      if (this.justDown(this.cursors?.down) || this.justDown(this.keyS)) {
        this.dialogue.moveSelection(1);
      }
      if (this.justDown(this.keyOne)) this.dialogue.choose(0);
      if (this.justDown(this.keyTwo)) this.dialogue.choose(1);
      return;
    }

    if (this.justDown(this.keyJ)) {
      this.tryAttack(time);
    }
  }

  private onInteract(): void {
    if (this.dialogue.isOpen) {
      this.dialogue.advance();
      return;
    }

    if (this.phase !== 'explore' || !this.nearestNpc) return;

    const npc = this.nearestNpc;
    let scriptId = npc.dialogueId;
    if (npc === this.son && gameState.hasFlag('village_intro')) {
      scriptId = 'son_after';
    }

    if (this.dialogue.start(scriptId)) {
      this.pauseNpcs(true);
    }
  }

  private tryAttack(nowMs: number): void {
    if (isInputLocked() || this.phase === 'aftermath') return;
    const swing = this.player.attack(nowMs);
    if (!swing) return;
    playSwing();

    if (!this.masked.isActive) return;
    const centerY = this.masked.y - 12;
    const dx = this.masked.x - swing.x;
    const dy = centerY - swing.y;
    const distance = Math.hypot(dx, dy);
    if (distance > swing.reach + 12) return;

    const dot =
      distance > 0.001
        ? (dx * swing.dirX + dy * swing.dirY) / distance
        : 1;
    if (dot < 0.1) return;

    if (this.masked.damage(swing.damage)) {
      playHit();
      this.cameras.main.shake(70, 0.0022);
      this.spawnMagicBurst(this.masked.x, centerY, 4);
    }
  }

  // ------------------------------------------------------------------ story

  private handleDialogueEnd(scriptId: string): void {
    this.pauseNpcs(false);

    if (scriptId === 'son_intro' && gameState.hasFlag('village_intro')) {
      this.startDusk();
      return;
    }

    if (scriptId === 'masked') {
      this.startFight();
      return;
    }

    if (scriptId === 'first_defeat') {
      this.finishAct();
    }
  }

  private startDusk(): void {
    if (this.phase !== 'explore') return;
    this.phase = 'dusk';
    this.ui.hidePrompt();
    this.son?.setPaused(true);
    for (const villager of this.villagers) villager.setPaused(true);

    this.ui.showFlavor('The sun slips behind the mountains.', 2800);
    this.ui.setLighting(PALETTE.dusk, 0.36, 4200);
    this.time.delayedCall(3600, () => this.enterSilence());
  }

  private enterSilence(): void {
    if (this.phase !== 'dusk') return;
    this.phase = 'silence';
    this.stopAmbientParticles();
    setAmbientLevel(0.08, 3.2);
    this.ui.setLighting(PALETTE.night, 0.48, 3000);
    this.ui.showFlavor('Even the river seems to listen.', 2800);
    this.time.delayedCall(2800, () => this.summonMaskedMan());
  }

  private summonMaskedMan(): void {
    if (this.phase !== 'silence') return;
    this.phase = 'confrontation';

    const spawn = this.pickMaskedSpawn();
    this.masked.appear(spawn.x, spawn.y);
    this.masked.stopAttacks();
    this.ui.flashWhite(120, 0.18);
    this.ui.setLighting(0x6a2a3a, 0.32, 1200);
    playMagic();

    this.time.delayedCall(900, () => {
      if (this.phase !== 'confrontation') return;
      if (!this.dialogue.start('masked')) {
        this.startFight();
      }
    });
  }

  private startFight(): void {
    if (this.phase === 'fight' || this.phase === 'aftermath') return;
    this.phase = 'fight';
    this.masked.beginCombat();
    this.ui.showBoss('Masked Man', this.masked.hp, this.masked.maxHp);
    this.ui.showPlayerHp(this.player.hp, this.player.maxHp);
    this.ui.hidePrompt();
    this.ui.showFlavor('J  swing.  Step out of the red circle.', 3400);
    this.ui.setLighting(0x5a2436, 0.34, 900);
    setAmbientLevel(0.2, 1.2);
    this.fightTimer = this.time.delayedCall(22000, () => this.beginFinale());
  }

  private hurtPlayer(damage: number, sourceX: number, sourceY: number): void {
    if (this.phase !== 'fight') return;

    const hp = this.player.takeDamage(damage, 1);
    bus.emit('player:damaged', {
      amount: damage,
      currentHp: hp,
      maxHp: this.player.maxHp,
    });
    this.ui.updatePlayerHp(hp, this.player.maxHp);

    const dx = this.player.x - sourceX;
    const dy = this.player.y - sourceY;
    const length = Math.hypot(dx, dy) || 1;
    this.player.push((dx / length) * 85, (dy / length) * 85);

    this.cameras.main.shake(170, 0.006);
    playHit();

    if (hp <= 1 && !this.lowHpWarned) {
      this.lowHpWarned = true;
      this.ui.showFlavor('You cannot fall. Not while he has your son.', 2600);
    }
  }

  private beginFinale(): void {
    if (this.finaleTriggered || this.phase === 'aftermath') return;
    this.finaleTriggered = true;
    this.phase = 'finale';

    if (this.fightTimer) {
      this.fightTimer.remove(false);
      this.fightTimer = null;
    }

    this.masked.stopAttacks();
    this.ui.hideBoss();
    this.ui.openLetterbox(650);
    setManualInputLock(true);
    this.cameras.main.shake(540, 0.012);
    this.ui.flashWhite(340, 0.95);
    playMagic();

    this.time.delayedCall(180, () => {
      const direction = this.player.x < this.masked.x ? -1 : 1;
      this.player.knockDown(direction * 36, 20);
      this.spawnMagicBurst(this.player.x, this.player.y - 10, 22);
    });

    this.time.delayedCall(430, () => this.kidnapSon());

    this.time.delayedCall(960, () => {
      this.spawnMagicBurst(this.masked.x, this.masked.y - 12, 30);
      this.spawnMagicRing(this.masked.x, this.masked.y - 12);
      this.masked.vanish();
    });

    this.time.delayedCall(1560, () => {
      this.ui.showFlavor('A sound like a struck bell. Then nothing.', 2400);
    });

    this.time.delayedCall(2600, () => {
      if (this.phase === 'finale') {
        this.dialogue.start('first_defeat');
      }
    });
  }

  private kidnapSon(): void {
    const son = this.son;
    if (!son) return;

    this.sonKidnapped = true;
    son.setPaused(true);
    son.setPromptVisible(false);
    son.hideShadow();
    son.setMagicalTint();
    this.spawnMagicBurst(son.x, son.y - 10, 18);
    this.spawnMagicRing(son.x, son.y - 8);

    this.tweens.add({
      targets: son.sprite,
      y: son.y - 78,
      alpha: 0.08,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 1250,
      ease: 'Sine.easeIn',
      onComplete: () => {
        const x = son.x;
        const y = son.y - 10;
        this.spawnMagicBurst(x, y, 34);
        this.spawnMagicRing(x, y);
        son.destroy();
        this.son = null;
        this.emitFlag('son_kidnapped', true);
      },
    });
  }

  private finishAct(): void {
    if (this.phase === 'aftermath') return;
    this.phase = 'aftermath';
    setManualInputLock(true);
    this.ui.hideBoss();
    this.ui.hidePlayerHp();
    this.emitFlag('first_defeat', true);
    stopAmbience(2.2);
    this.ui.fadeToBlack(1700, () => {
      this.ui.showTitle('ACT I', 'THE FIRST DEFEAT');
      this.ui.showFlavor(
        'The village is silent. Beyond the hills, a cave breathes.',
        9000,
      );
    });
  }

  private enterAftermathFromSave(): void {
    this.phase = 'aftermath';
    setManualInputLock(true);
    this.stopAmbientParticles();
    this.sonKidnapped = true;
    this.ui.hidePlayerHp();
    this.ui.hideBoss();
  }

  private pickMaskedSpawn(): Vec2 {
    const px = this.player.x;
    const py = this.player.y;
    const dx = this.mapData.wellPoint.x - px;
    const dy = this.mapData.wellPoint.y - py;
    const length = Math.hypot(dx, dy) || 1;
    const candidate = {
      x: px + (dx / length) * 64,
      y: py + (dy / length) * 64,
    };
    if (!this.collision.isSolidAt(candidate.x, candidate.y - 1)) {
      return candidate;
    }
    return this.mapData.maskedSpawn;
  }

  // -------------------------------------------------------------- utilities

  private pauseNpcs(paused: boolean): void {
    this.son?.setPaused(paused);
    for (const villager of this.villagers) villager.setPaused(paused);
    if (!paused) {
      for (const villager of this.villagers) villager.setPromptVisible(false);
    }
  }

  private stopAmbientParticles(): void {
    this.ambientParticlesActive = false;
    this.dust?.stop();
    this.leaves?.stop();
  }

  private spawnMagicBurst(x: number, y: number, count: number): void {
    this.magic?.emitParticleAt(x, y, count);
  }

  private spawnMagicRing(x: number, y: number): void {
    const ring = this.add
      .image(x, y, FX.ring)
      .setDepth(8700)
      .setTint(0xb98cff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.25)
      .setAlpha(0.95);
    this.tweens.add({
      targets: ring,
      scale: 1.7,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private emitFlag(flag: QuestFlag, value = true): void {
    bus.emit('quest:flag', { flag, value });
  }

  private persist(): void {
    if (!this.player) return;
    writeSave(
      gameState.toSaveData(
        { x: this.player.x, y: this.player.y },
        'VillageScene',
      ),
    );
  }

  private isBodyBlocked(x: number, y: number): boolean {
    return this.collision.isSolidRect({
      x: x - 5,
      y: y - 6,
      width: 10,
      height: 6,
    });
  }

  private justDown(key?: Phaser.Input.Keyboard.Key): boolean {
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }

  private unlockAudio(): void {
    ensureAudio();
    if (this.phase !== 'aftermath') {
      startAmbience();
      setAmbientLevel(1, 2);
    }
  }

  private updateDebug(time: number): void {
    if (!this.debug || !this.debugDynamic) return;

    this.debugDynamic.clear();
    const body = this.player.bodyRect;
    this.debugDynamic.lineStyle(1, 0xffe066, 0.95);
    this.debugDynamic.strokeRect(body.x, body.y, body.width, body.height);
    this.debugDynamic.lineStyle(1, 0xff66cc, 0.6);
    this.debugDynamic.strokeCircle(
      this.player.x,
      this.player.y,
      INTERACT_RADIUS,
    );

    if (time >= this.nextDebugAt) {
      this.nextDebugAt = time + 200;
      const flags = gameState.allFlags();
      this.ui.setDebugText(
        [
          `PHASE  ${this.phase.toUpperCase()}`,
          `FLAGS  ${flags.length > 0 ? flags.join(', ') : '\u2014'}`,
          `POS    ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
          `LOCK   ${isInputLocked() ? 'YES' : 'NO'}`,
        ].join('\n'),
      );
    }
  }

  private handleShutdown(): void {
    this.persist();
    for (const cleanup of this.busCleanups) cleanup();
    this.busCleanups = [];
    setManualInputLock(false);
    resetInputLocks();
    stopAmbience(0.25);
  }
}
