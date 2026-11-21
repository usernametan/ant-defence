import { bus } from '../shared/events';
import type { BossKind, GameMode, HellcellBoss, MapTheme, MatchStatus, Vec2, WeaponId } from '../shared/types';

export interface AudioVolumes {
  master: number; // 0..1
  sfx: number; // 0..1
  music: number; // 0..1
}

export interface AudioUpdateContext {
  status?: MatchStatus;
  mode?: GameMode;
  score?: { player: number; enemy: number };
  scoreToWin?: number;
  boss?: Pick<HellcellBoss, 'kind' | 'pos' | 'hp' | 'maxHp'> | null;
}

export function computeBossProximity(
  bossPos: Vec2,
  listenerPos: Vec2,
  maxRange = 760,
): number {
  const dist = Math.hypot(bossPos.x - listenerPos.x, bossPos.y - listenerPos.y);
  const raw = clamp01(1 - dist / maxRange);
  return Math.pow(raw, 1.35);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ambientOscA: OscillatorNode | null = null;
  private ambientOscB: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientStarted = false;
  private landingMusicActive = false;

  // Continuous proximity-faded Hellcell monster audio nodes
  private bossLoopKind: BossKind | null = null;
  private bossLoopGain: GainNode | null = null;
  private bossLoopPanner: StereoPannerNode | null = null;
  private bossLoopOscA: OscillatorNode | null = null;
  private bossLoopOscB: OscillatorNode | null = null;
  private bossLoopLfo: OscillatorNode | null = null;
  private bossLoopLfoGain: GainNode | null = null;
  private bossLoopNoise: AudioBufferSourceNode | null = null;
  private bossLoopFilter: BiquadFilterNode | null = null;
  private lastBossVocalAt = 0;

  // Tactical score/lead alert tracking
  private lastAnnounceAt = 0;
  private lastLeader: 'player' | 'enemy' | 'tied' = 'tied';
  private endgameAnnounced = { player: false, enemy: false };
  private activeMode: GameMode = 'zoneControl';

  private volumes: AudioVolumes = { master: 0.8, sfx: 0.85, music: 0.45 };
  private listenerPos: Vec2 = { x: 960, y: 640 };
  private playerId = 'player';
  private mapTheme: MapTheme = 'fortress';
  private activeVoices = 0;
  private readonly maxVoices = 24;
  private lastShotAt = new Map<string, number>();
  private lastEventAt = new Map<string, number>();
  private lastHeartbeatAt = 0;
  private combatHeat = 0;
  private unsubscribers: Array<() => void> = [];
  private unlockHandler: (() => void) | null = null;

  init(playerId = 'player'): void {
    this.destroy();
    this.playerId = playerId;
    this.bindBus();
    this.bindUnlock();
  }

  setPlayerId(playerId: string): void {
    this.playerId = playerId;
  }

  setListenerPos(pos: Vec2): void {
    this.listenerPos = pos;
  }

  setMapTheme(theme: MapTheme): void {
    this.mapTheme = theme;
    this.applyAmbientTheme();
  }

  setVolumes(next: Partial<AudioVolumes>): void {
    this.volumes = {
      master: clamp01(next.master ?? this.volumes.master),
      sfx: clamp01(next.sfx ?? this.volumes.sfx),
      music: clamp01(next.music ?? this.volumes.music),
    };
    if (this.ctx && this.masterGain && this.sfxGain && this.musicGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.volumes.master, now, 0.03);
      this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, now, 0.03);
      this.musicGain.gain.setTargetAtTime(
        this.landingMusicActive ? 0 : this.volumes.music * 0.28,
        now,
        0.05,
      );
    }
  }

  setLandingMusicActive(active: boolean): void {
    this.landingMusicActive = active;
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      const target = active ? 0 : this.volumes.music * (0.2 + this.combatHeat * 0.16);
      this.musicGain.gain.setTargetAtTime(target, now, 0.05);
    }
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();

      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.16;

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(compressor);
      this.musicGain.connect(compressor);
      compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.setVolumes(this.volumes);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.ambientStarted) {
      this.startAmbientBed();
    }
  }

  update(
    dt: number,
    playerHpRatio: number,
    combatActive: boolean,
    context?: AudioUpdateContext,
  ): void {
    this.combatHeat = Math.max(
      0,
      Math.min(1, this.combatHeat + (combatActive ? 0.45 : -0.22) * dt),
    );
    if (this.ctx && this.ambientFilter && this.musicGain) {
      const now = this.ctx.currentTime;
      const baseCut =
        this.mapTheme === 'jungle'
          ? 300
          : this.mapTheme === 'temple'
            ? 260
            : this.mapTheme === 'slumside'
              ? 240
              : 220;
      const cutoff = baseCut + this.combatHeat * 740;
      this.ambientFilter.frequency.setTargetAtTime(cutoff, now, 0.18);
      this.musicGain.gain.setTargetAtTime(
        this.landingMusicActive ? 0 : this.volumes.music * (0.2 + this.combatHeat * 0.16),
        now,
        0.2,
      );
    }

    if (playerHpRatio > 0 && playerHpRatio < 0.3 && this.ctx) {
      const nowMs = performance.now();
      const interval = 520 + playerHpRatio * 900;
      if (nowMs - this.lastHeartbeatAt > interval) {
        this.lastHeartbeatAt = nowMs;
        this.playHeartbeat();
      }
    }

    if (!context) return;

    const isPlaying = context.status === undefined || context.status === 'playing';
    if (!isPlaying) {
      this.fadeOutBossLoop();
      return;
    }

    this.updateBossProximity(context.boss ?? null);
    if (context.score && context.scoreToWin) {
      this.updateMatchAlerts(
        context.mode ?? this.activeMode,
        context.score,
        context.scoreToWin,
      );
    }
  }

  playUiHover(): void {
    this.playTone(920, 1180, 0.04, 'sine', 0.06, 0);
  }

  playUiClick(): void {
    this.playTone(540, 360, 0.055, 'triangle', 0.11, 0);
  }

  playUiConfirm(): void {
    this.playTone(520, 780, 0.09, 'triangle', 0.14, 0);
    this.playTone(780, 1040, 0.11, 'sine', 0.1, 0, 0.045);
  }

  playUiBack(): void {
    this.playTone(460, 260, 0.08, 'triangle', 0.11, 0);
  }

  playCountdownTick(isGo = false): void {
    if (isGo) {
      this.playTone(587, 880, 0.24, 'sawtooth', 0.18, 0);
      this.playTone(880, 1174, 0.26, 'triangle', 0.16, 0, 0.04);
    } else {
      this.playTone(660, 440, 0.11, 'triangle', 0.15, 0);
    }
  }

  playDryFire(): void {
    this.playTone(1200, 700, 0.03, 'square', 0.08, 0);
  }

  playStreakStinger(streakCount: number): void {
    const base = 440 + Math.min(4, streakCount) * 65;
    this.playTone(base, base * 1.25, 0.14, 'triangle', 0.18, 0);
    this.playTone(base * 1.5, base * 2, 0.22, 'sine', 0.16, 0, 0.07);
  }

  playWeaponShot(weaponId: WeaponId, pan = 0): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = this.lastShotAt.get(weaponId) ?? 0;
    if (nowMs - prev < 38) return;
    this.lastShotAt.set(weaponId, nowMs);

    switch (weaponId) {
      case 'pistol':
        this.playNoiseBurst(0.08, 1900, 0.22, pan);
        this.playTone(340, 110, 0.09, 'triangle', 0.22, pan);
        break;
      case 'smg':
        this.playNoiseBurst(0.055, 2500, 0.16, pan);
        this.playTone(460, 170, 0.06, 'sawtooth', 0.14, pan);
        break;
      case 'shotgun':
        this.playNoiseBurst(0.18, 1250, 0.34, pan);
        this.playTone(190, 58, 0.18, 'sawtooth', 0.3, pan);
        break;
      case 'rifle':
        this.playNoiseBurst(0.095, 2200, 0.24, pan);
        this.playTone(290, 95, 0.1, 'sawtooth', 0.22, pan);
        break;
      case 'sniper':
        this.playNoiseBurst(0.22, 3200, 0.32, pan);
        this.playTone(780, 90, 0.24, 'sawtooth', 0.28, pan);
        break;
      case 'rocket':
        this.playNoiseBurst(0.28, 720, 0.32, pan);
        this.playTone(140, 52, 0.28, 'sawtooth', 0.32, pan);
        break;
    }
  }

  playGrenadeThrow(pan = 0): void {
    this.playNoiseBurst(0.11, 1400, 0.18, pan);
    this.playTone(420, 190, 0.12, 'triangle', 0.16, pan);
  }

  playHellcellWarning(): void {
    this.playTone(220, 440, 0.28, 'sawtooth', 0.16, 0);
    this.playTone(220, 440, 0.28, 'sawtooth', 0.16, 0, 0.34);
    this.playTone(110, 82, 0.45, 'triangle', 0.18, 0, 0.05);
  }

  playBossRoar(pan = 0): void {
    this.playNoiseBurst(0.5, 520, 0.34, pan);
    this.playTone(145, 48, 0.55, 'sawtooth', 0.26, pan);
    this.playTone(92, 38, 0.6, 'square', 0.14, pan, 0.06);
  }

  /** Play synthesized monster-specific audio scaled smoothly by proximity (0..1) and stereo pan. */
  playMonsterVocal(kind: BossKind, proximity: number, pan = 0): void {
    const level = clamp01(proximity);
    if (level <= 0.02) return;

    if (kind === 'rocketSiegeBot') {
      // Heavy mechanical servo pulses & robotic alarm cadence
      const vol = 0.15 * level;
      this.playTone(170, 125, 0.11, 'square', vol, pan);
      this.playTone(150, 92, 0.18, 'sawtooth', vol * 1.15, pan, 0.13);
      this.playTone(170, 125, 0.11, 'square', vol, pan, 0.42);
      this.playTone(150, 88, 0.2, 'sawtooth', vol * 1.2, pan, 0.55);
      this.playNoiseBurst(0.12, 1100, vol * 0.8, pan);
    } else if (kind === 'pharaohSkeleton') {
      // Deep ancient tomb resonance + eerie bone rattle chime
      const vol = 0.17 * level;
      this.playTone(76, 48, 0.48, 'triangle', vol, pan);
      this.playTone(108, 66, 0.44, 'sawtooth', vol * 0.65, pan, 0.08);
      this.playTone(540, 360, 0.16, 'sine', vol * 0.45, pan, 0.18);
      this.playTone(430, 290, 0.14, 'sine', vol * 0.35, pan, 0.3);
    } else if (kind === 'mumbaiTrain') {
      // Classic twin-tone Mumbai local air horn blast + overhead 25kV crackle
      const vol = 0.15 * level;
      this.playTone(277, 272, 0.42, 'sawtooth', vol, pan);
      this.playTone(349, 344, 0.42, 'sawtooth', vol * 0.85, pan, 0.02);
      this.playTone(138, 132, 0.44, 'triangle', vol * 0.7, pan);
      this.playNoiseBurst(0.14, 2400, vol * 0.55, pan);
    } else {
      // Giant Venom Cobra sibilant snake whisper ("sssss... sssss...")
      const vol = 0.2 * level;
      this.playNoiseSweep(0.28, 2800, 4900, vol, pan, 0);
      this.playNoiseSweep(0.36, 4400, 2300, vol * 0.9, pan, 0.32);
    }
  }

  playBossDefeated(): void {
    this.stopBossLoop();
    this.playNoiseBurst(0.45, 760, 0.34, 0);
    this.playTone(130, 42, 0.45, 'sawtooth', 0.24, 0);
    // Victory & refuel chime arpeggio
    this.playTone(523.25, 659.25, 0.16, 'triangle', 0.18, 0, 0.12);
    this.playTone(659.25, 783.99, 0.18, 'triangle', 0.18, 0, 0.22);
    this.playTone(783.99, 1046.5, 0.28, 'sine', 0.2, 0, 0.32);
  }

  playDash(): void {
    this.playNoiseBurst(0.09, 1900, 0.16, 0);
    this.playTone(320, 640, 0.09, 'sine', 0.12, 0);
  }

  computePan(worldPos: Vec2): number {
    return computeStereoPan(worldPos.x, this.listenerPos.x);
  }

  destroy(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    this.stopBossLoop();
    if (this.unlockHandler && typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.unlockHandler);
      window.removeEventListener('keydown', this.unlockHandler);
      this.unlockHandler = null;
    }
    if (this.ambientOscA) {
      try {
        this.ambientOscA.stop();
        this.ambientOscB?.stop();
      } catch {
        // Ignore already stopped oscillators
      }
      this.ambientOscA = null;
      this.ambientOscB = null;
      this.ambientStarted = false;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.activeVoices = 0;
  }

  private updateBossProximity(
    boss: Pick<HellcellBoss, 'kind' | 'pos' | 'hp' | 'maxHp'> | null,
  ): void {
    if (!boss || boss.hp <= 0) {
      this.stopBossLoop();
      return;
    }

    const proximity = computeBossProximity(boss.pos, this.listenerPos, 780);
    const pan = this.computePan(boss.pos);

    if (this.ctx && this.sfxGain) {
      if (this.bossLoopKind !== boss.kind) {
        this.startBossLoop(boss.kind);
      }
      const now = this.ctx.currentTime;
      if (this.bossLoopGain && this.bossLoopPanner) {
        const maxVol = boss.kind === 'venomCobra' ? 0.34 : 0.24;
        this.bossLoopGain.gain.setTargetAtTime(proximity * maxVol, now, 0.08);
        this.bossLoopPanner.pan.setTargetAtTime(pan, now, 0.06);
      }
      if (this.bossLoopFilter && boss.kind === 'venomCobra') {
        this.bossLoopFilter.frequency.setTargetAtTime(2200 + proximity * 2400, now, 0.1);
      }
    }

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const interval = boss.kind === 'venomCobra' ? 2800 : 3400;
    if (proximity > 0.1 && nowMs - this.lastBossVocalAt > interval) {
      this.lastBossVocalAt = nowMs;
      this.playMonsterVocal(boss.kind, proximity, pan);
    }
  }

  private startBossLoop(kind: BossKind): void {
    this.stopBossLoop();
    if (!this.ctx || !this.sfxGain) return;

    this.bossLoopKind = kind;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = 0;
    gain.connect(panner);
    panner.connect(this.sfxGain);

    this.bossLoopGain = gain;
    this.bossLoopPanner = panner;

    if (kind === 'venomCobra' && this.noiseBuffer) {
      // Continuous slithering snake whisper ("ssss... ssss...") modulated by LFO
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3400;
      filter.Q.value = 3.2;

      const modGain = this.ctx.createGain();
      modGain.gain.value = 0.55;

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5.5;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.4;

      src.connect(filter);
      filter.connect(modGain);
      lfo.connect(lfoGain);
      lfoGain.connect(modGain.gain);
      modGain.connect(gain);

      src.start();
      lfo.start();
      this.bossLoopNoise = src;
      this.bossLoopFilter = filter;
      this.bossLoopLfo = lfo;
      this.bossLoopLfoGain = lfoGain;
      return;
    }

    // Mechanical servo drone (Robo) or deep ancient tomb hum (Skeleton)
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    const lfoGain = this.ctx.createGain();

    if (kind === 'rocketSiegeBot') {
      oscA.type = 'sawtooth';
      oscA.frequency.value = 72;
      oscB.type = 'square';
      oscB.frequency.value = 108;
      filter.frequency.value = 460;
      lfo.frequency.value = 6.2;
      lfoGain.gain.value = 180;
    } else if (kind === 'mumbaiTrain') {
      // Heavy EMU traction motor hum + rhythmic steel track-joint cadence
      oscA.type = 'sawtooth';
      oscA.frequency.value = 54;
      oscB.type = 'triangle';
      oscB.frequency.value = 81;
      filter.frequency.value = 340;
      lfo.frequency.value = 4.6;
      lfoGain.gain.value = 150;
    } else {
      oscA.type = 'triangle';
      oscA.frequency.value = 58;
      oscB.type = 'sine';
      oscB.frequency.value = 87;
      filter.frequency.value = 300;
      lfo.frequency.value = 2.1;
      lfoGain.gain.value = 90;
    }

    oscA.connect(filter);
    oscB.connect(filter);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    filter.connect(gain);

    oscA.start();
    oscB.start();
    lfo.start();

    this.bossLoopOscA = oscA;
    this.bossLoopOscB = oscB;
    this.bossLoopFilter = filter;
    this.bossLoopLfo = lfo;
    this.bossLoopLfoGain = lfoGain;
  }

  private fadeOutBossLoop(): void {
    if (!this.ctx || !this.bossLoopGain) return;
    this.bossLoopGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
  }

  private stopBossLoop(): void {
    this.bossLoopKind = null;
    for (const node of [
      this.bossLoopOscA,
      this.bossLoopOscB,
      this.bossLoopLfo,
      this.bossLoopNoise,
    ]) {
      if (!node) continue;
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Ignore already stopped audio nodes
      }
    }
    for (const node of [this.bossLoopFilter, this.bossLoopLfoGain, this.bossLoopGain, this.bossLoopPanner]) {
      node?.disconnect();
    }
    this.bossLoopOscA = null;
    this.bossLoopOscB = null;
    this.bossLoopLfo = null;
    this.bossLoopLfoGain = null;
    this.bossLoopNoise = null;
    this.bossLoopFilter = null;
    this.bossLoopGain = null;
    this.bossLoopPanner = null;
  }

  private updateMatchAlerts(
    mode: GameMode,
    score: { player: number; enemy: number },
    scoreToWin: number,
  ): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const goal = Math.max(1, scoreToWin);

    if (mode === 'rampage') {
      if (score.enemy >= score.player + 2 && this.lastLeader !== 'enemy') {
        this.lastLeader = 'enemy';
        if (nowMs - this.lastAnnounceAt > 11000) {
          this.lastAnnounceAt = nowMs;
          this.playLeadAlert(false);
        }
      } else if (score.player > score.enemy && this.lastLeader === 'enemy') {
        this.lastLeader = 'player';
        if (nowMs - this.lastAnnounceAt > 11000) {
          this.lastAnnounceAt = nowMs;
          this.playLeadAlert(true);
        }
      }
      if (!this.endgameAnnounced.enemy && Math.max(score.player, score.enemy) >= goal * 0.8) {
        this.endgameAnnounced.enemy = true;
        this.lastAnnounceAt = nowMs;
        this.playEndgameAlert(score.player >= score.enemy);
      }
      return;
    }

    const leadThreshold = goal >= 500 ? 60 : Math.max(10, Math.round(goal * 0.1));
    if (score.enemy >= score.player + leadThreshold && this.lastLeader !== 'enemy') {
      this.lastLeader = 'enemy';
      if (nowMs - this.lastAnnounceAt > 12000) {
        this.lastAnnounceAt = nowMs;
        this.playLeadAlert(false);
      }
    } else if (score.player >= score.enemy + leadThreshold && this.lastLeader === 'enemy') {
      this.lastLeader = 'player';
      if (nowMs - this.lastAnnounceAt > 12000) {
        this.lastAnnounceAt = nowMs;
        this.playLeadAlert(true);
      }
    }

    if (!this.endgameAnnounced.enemy && score.enemy >= goal * 0.8) {
      this.endgameAnnounced.enemy = true;
      this.lastAnnounceAt = nowMs;
      this.playEndgameAlert(false);
    } else if (!this.endgameAnnounced.player && score.player >= goal * 0.8) {
      this.endgameAnnounced.player = true;
      this.lastAnnounceAt = nowMs;
      this.playEndgameAlert(true);
    }
  }

  private playLeadAlert(playerAhead: boolean): void {
    if (playerAhead) {
      this.playTone(523.25, 659.25, 0.1, 'triangle', 0.14, 0);
      this.playTone(659.25, 783.99, 0.14, 'sine', 0.14, 0, 0.09);
    } else {
      this.playTone(440, 330, 0.12, 'sawtooth', 0.12, 0);
      this.playTone(392, 293.66, 0.15, 'sawtooth', 0.12, 0, 0.13);
    }
  }

  private playEndgameAlert(playerAhead: boolean): void {
    if (playerAhead) {
      this.playTone(587.33, 880, 0.14, 'triangle', 0.16, 0);
      this.playTone(880, 1174.66, 0.2, 'sine', 0.16, 0, 0.12);
    } else {
      this.playTone(349.23, 261.63, 0.16, 'sawtooth', 0.14, 0);
      this.playTone(349.23, 261.63, 0.16, 'sawtooth', 0.14, 0, 0.2);
    }
  }

  private throttleEvent(key: string, minMs: number): boolean {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = this.lastEventAt.get(key) ?? 0;
    if (nowMs - prev < minMs) return false;
    this.lastEventAt.set(key, nowMs);
    return true;
  }

  private bindBus(): void {
    this.unsubscribers.push(
      bus.on('match:start', ({ config }) => {
        this.activeMode = config.mode ?? 'zoneControl';
        this.lastLeader = 'tied';
        this.endgameAnnounced = { player: false, enemy: false };
        this.lastAnnounceAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.stopBossLoop();
        this.setMapTheme(config.mapTheme ?? 'fortress');
      }),
      bus.on('shot', ({ unitId, weaponId, pos }) => {
        if (unitId === this.playerId) {
          this.listenerPos = pos;
          this.combatHeat = Math.min(1, this.combatHeat + 0.25);
        }
        this.playWeaponShot(weaponId, this.computePan(pos));
      }),
      bus.on('grenade:thrown', ({ pos }) => {
        this.playGrenadeThrow(this.computePan(pos));
      }),
      bus.on('hit', ({ pos, killed }) => {
        const pan = this.computePan(pos);
        if (killed) {
          this.playTone(720, 1080, 0.13, 'triangle', 0.2, pan);
        } else {
          this.playTone(980, 620, 0.045, 'sine', 0.14, pan);
        }
      }),
      bus.on('kill', ({ killerId }) => {
        if (killerId === this.playerId) {
          this.playTone(580, 1160, 0.16, 'triangle', 0.2, 0);
        }
      }),
      bus.on('explosion', ({ pos, radius }) => {
        const pan = this.computePan(pos);
        const dist = Math.hypot(pos.x - this.listenerPos.x, pos.y - this.listenerPos.y);
        const att = Math.max(0.28, 1 - dist / 950);
        const scale = Math.min(1.15, Math.max(0.75, radius / 130)) * att;
        this.playNoiseBurst(0.42, 480, 0.34 * scale, pan);
        this.playTone(105, 30, 0.4, 'sawtooth', 0.3 * scale, pan);
        this.playTone(65, 24, 0.36, 'sine', 0.28 * scale, pan);
        this.combatHeat = Math.min(1, this.combatHeat + 0.35);
      }),
      bus.on('cover:damaged', () => {
        if (!this.throttleEvent('cover:damaged', 90)) return;
        this.playNoiseBurst(0.045, 950, 0.11, 0);
        this.playTone(210, 120, 0.045, 'triangle', 0.09, 0);
      }),
      bus.on('cover:destroyed', () => {
        if (!this.throttleEvent('cover:destroyed', 75)) return;
        this.playNoiseBurst(0.14, 680, 0.22, 0);
        this.playTone(165, 58, 0.16, 'sawtooth', 0.16, 0);
      }),
      bus.on('pickup:spawned', ({ pickup }) => {
        if (!this.throttleEvent('pickup:spawned', 300)) return;
        const pan = this.computePan(pickup.pos);
        this.playTone(620, 940, 0.1, 'sine', 0.08, pan);
      }),
      bus.on('pickup:collected', ({ unitId }) => {
        const isMe = unitId === this.playerId;
        this.playTone(520, 880, 0.1, 'sine', isMe ? 0.18 : 0.06, 0);
        this.playTone(780, 1180, 0.12, 'triangle', isMe ? 0.14 : 0.05, 0, 0.05);
      }),
      bus.on('zone:captured', ({ team }) => {
        if (team === 'player') {
          this.playTone(440, 660, 0.15, 'triangle', 0.2, 0);
          this.playTone(660, 880, 0.22, 'sine', 0.18, 0, 0.1);
        } else {
          this.playTone(340, 220, 0.22, 'sawtooth', 0.16, 0);
        }
      }),
      bus.on('zone:contested', () => {
        if (!this.throttleEvent('zone:contested', 1800)) return;
        this.playTone(740, 560, 0.11, 'triangle', 0.12, 0);
        this.playTone(560, 740, 0.11, 'triangle', 0.1, 0, 0.12);
      }),
      bus.on('base:damaged', ({ team }) => {
        if (team !== 'player' || !this.throttleEvent('base:damaged', 1400)) return;
        this.playTone(320, 240, 0.16, 'sawtooth', 0.14, 0);
        this.playTone(320, 240, 0.16, 'sawtooth', 0.12, 0, 0.18);
      }),
      bus.on('unit:respawned', ({ unitId }) => {
        if (unitId !== this.playerId) return;
        this.playDash();
        this.playTone(440, 880, 0.16, 'triangle', 0.14, 0, 0.05);
      }),
      bus.on('ceasefire:spark', ({ pos }) => {
        if (!this.throttleEvent('ceasefire:spark', 120)) return;
        this.playTone(1350, 920, 0.04, 'sine', 0.07, this.computePan(pos));
      }),
      bus.on('hellcell:warning', () => {
        this.playHellcellWarning();
      }),
      bus.on('hellcell:start', ({ boss }) => {
        const pan = this.computePan(boss.pos);
        const prox = Math.max(0.45, computeBossProximity(boss.pos, this.listenerPos));
        this.playBossRoar(pan);
        this.lastBossVocalAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.playMonsterVocal(boss.kind, prox, pan);
        this.startBossLoop(boss.kind);
      }),
      bus.on('hellcell:defeated', () => {
        this.playBossDefeated();
      }),
      bus.on('hellcell:resumed', () => {
        this.playTone(523.25, 783.99, 0.16, 'triangle', 0.16, 0);
      }),
      bus.on('boss:action', ({ kind, action, pos }) => {
        if (kind !== 'mumbaiTrain') return;
        const prox = Math.max(0.22, computeBossProximity(pos, this.listenerPos, 920));
        const pan = this.computePan(pos);
        if (action === 'chargeWarning') {
          // Urgent double-blast Mumbai suburban train horn before charge
          this.playTone(277, 274, 0.24, 'sawtooth', 0.22 * prox, pan);
          this.playTone(349, 346, 0.24, 'sawtooth', 0.18 * prox, pan);
          this.playTone(277, 270, 0.34, 'sawtooth', 0.24 * prox, pan, 0.28);
          this.playTone(349, 342, 0.34, 'sawtooth', 0.2 * prox, pan, 0.28);
        } else if (action === 'chargeDash') {
          this.playNoiseBurst(0.32, 820, 0.28 * prox, pan);
          this.playTone(118, 62, 0.38, 'sawtooth', 0.22 * prox, pan);
        } else if (action === 'electricWarning') {
          // Rising 25kV catenary transformer buzz
          this.playTone(180, 420, 0.48, 'sawtooth', 0.12 * prox, pan);
          this.playNoiseBurst(0.22, 3200, 0.12 * prox, pan);
        } else if (action === 'electricPulse') {
          // High-voltage arc discharge snap & rumble
          this.playNoiseBurst(0.28, 3800, 0.28 * prox, pan);
          this.playTone(620, 140, 0.24, 'square', 0.18 * prox, pan);
          this.playTone(110, 48, 0.32, 'sawtooth', 0.2 * prox, pan);
        } else if (action === 'weakPointHit') {
          if (!this.throttleEvent('boss:weakpoint', 70)) return;
          this.playTone(1480, 760, 0.08, 'square', 0.12 * prox, pan);
          this.playNoiseBurst(0.06, 4200, 0.12 * prox, pan);
        }
      }),
      bus.on('match:end', ({ winner }) => {
        this.stopBossLoop();
        if (winner === 'player') {
          this.playTone(523.25, 659.25, 0.18, 'triangle', 0.2, 0);
          this.playTone(659.25, 783.99, 0.18, 'triangle', 0.2, 0, 0.14);
          this.playTone(783.99, 1046.5, 0.35, 'sine', 0.22, 0, 0.28);
        } else {
          this.playTone(330, 220, 0.24, 'sawtooth', 0.16, 0);
          this.playTone(220, 146.83, 0.4, 'sawtooth', 0.16, 0, 0.2);
        }
      }),
      bus.on('reload:start', () => {
        this.playTone(320, 480, 0.07, 'square', 0.1, 0);
      }),
      bus.on('reload:end', () => {
        this.playTone(520, 760, 0.08, 'triangle', 0.14, 0);
      }),
    );
  }

  private bindUnlock(): void {
    if (typeof window === 'undefined') return;
    this.unlockHandler = () => {
      this.unlock();
      if (this.unlockHandler) {
        window.removeEventListener('pointerdown', this.unlockHandler);
        window.removeEventListener('keydown', this.unlockHandler);
        this.unlockHandler = null;
      }
    };
    window.addEventListener('pointerdown', this.unlockHandler, { passive: true });
    window.addEventListener('keydown', this.unlockHandler, { passive: true });
  }

  private startAmbientBed(): void {
    if (!this.ctx || !this.musicGain || this.ambientStarted) return;
    this.ambientStarted = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;

    const oscA = this.ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 55;

    const oscB = this.ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = 82.41;

    const bedGain = this.ctx.createGain();
    bedGain.gain.value = 0.22;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(bedGain);
    bedGain.connect(this.musicGain);

    oscA.start();
    oscB.start();

    this.ambientFilter = filter;
    this.ambientOscA = oscA;
    this.ambientOscB = oscB;
    this.applyAmbientTheme();
  }

  private applyAmbientTheme(): void {
    if (!this.ctx || !this.ambientOscA || !this.ambientOscB) return;
    const now = this.ctx.currentTime;
    if (this.mapTheme === 'jungle') {
      this.ambientOscA.type = 'triangle';
      this.ambientOscB.type = 'sine';
      this.ambientOscA.frequency.setTargetAtTime(98.0, now, 0.25);
      this.ambientOscB.frequency.setTargetAtTime(146.83, now, 0.25);
    } else if (this.mapTheme === 'temple') {
      this.ambientOscA.type = 'triangle';
      this.ambientOscB.type = 'sine';
      this.ambientOscA.frequency.setTargetAtTime(73.42, now, 0.25);
      this.ambientOscB.frequency.setTargetAtTime(110.0, now, 0.25);
    } else if (this.mapTheme === 'slumside') {
      this.ambientOscA.type = 'triangle';
      this.ambientOscB.type = 'sine';
      this.ambientOscA.frequency.setTargetAtTime(65.41, now, 0.25);
      this.ambientOscB.frequency.setTargetAtTime(98.0, now, 0.25);
    } else {
      this.ambientOscA.type = 'sawtooth';
      this.ambientOscB.type = 'triangle';
      this.ambientOscA.frequency.setTargetAtTime(55.0, now, 0.25);
      this.ambientOscB.frequency.setTargetAtTime(82.41, now, 0.25);
    }
  }

  private playHeartbeat(): void {
    this.playTone(72, 42, 0.11, 'sine', 0.28, 0);
    this.playTone(66, 38, 0.13, 'sine', 0.22, 0, 0.16);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    pan: number,
    delay = 0,
  ): void {
    if (!this.ctx || !this.sfxGain || this.activeVoices >= this.maxVoices) return;
    this.activeVoices += 1;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    panner.pan.value = Math.max(-1, Math.min(1, pan));

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      osc.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private playNoiseBurst(
    duration: number,
    cutoff: number,
    volume: number,
    pan: number,
  ): void {
    if (
      !this.ctx ||
      !this.sfxGain ||
      !this.noiseBuffer ||
      this.activeVoices >= this.maxVoices
    ) {
      return;
    }
    this.activeVoices += 1;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    src.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    src.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    src.start(now);
    src.stop(now + duration + 0.01);
  }

  private playNoiseSweep(
    duration: number,
    freqStart: number,
    freqEnd: number,
    volume: number,
    pan: number,
    delay = 0,
  ): void {
    if (
      !this.ctx ||
      !this.sfxGain ||
      !this.noiseBuffer ||
      this.activeVoices >= this.maxVoices
    ) {
      return;
    }
    this.activeVoices += 1;

    const now = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, freqEnd), now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    src.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    src.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    src.start(now);
    src.stop(now + duration + 0.01);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }
}

export function computeStereoPan(
  sourceX: number,
  listenerX: number,
  spanPx = 560,
): number {
  return Math.max(-1, Math.min(1, (sourceX - listenerX) / spanPx));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
