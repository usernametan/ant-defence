import { bus } from '../shared/events';
import type { MapTheme, Vec2, WeaponId } from '../shared/types';

export interface AudioVolumes {
  master: number; // 0..1
  sfx: number; // 0..1
  music: number; // 0..1
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

  private volumes: AudioVolumes = { master: 0.8, sfx: 0.85, music: 0.45 };
  private listenerPos: Vec2 = { x: 960, y: 640 };
  private playerId = 'player';
  private mapTheme: MapTheme = 'fortress';
  private activeVoices = 0;
  private readonly maxVoices = 22;
  private lastShotAt = new Map<string, number>();
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
      this.musicGain.gain.setTargetAtTime(this.volumes.music * 0.28, now, 0.05);
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

  update(dt: number, playerHpRatio: number, combatActive: boolean): void {
    this.combatHeat = Math.max(
      0,
      Math.min(1, this.combatHeat + (combatActive ? 0.45 : -0.22) * dt),
    );
    if (this.ctx && this.ambientFilter && this.musicGain) {
      const now = this.ctx.currentTime;
      const baseCut = this.mapTheme === 'jungle' ? 300 : this.mapTheme === 'temple' ? 260 : 220;
      const cutoff = baseCut + this.combatHeat * 740;
      this.ambientFilter.frequency.setTargetAtTime(cutoff, now, 0.18);
      this.musicGain.gain.setTargetAtTime(
        this.volumes.music * (0.2 + this.combatHeat * 0.16),
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

  computePan(worldPos: Vec2): number {
    return computeStereoPan(worldPos.x, this.listenerPos.x);
  }

  destroy(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
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

  private bindBus(): void {
    this.unsubscribers.push(
      bus.on('match:start', ({ config }) => {
        this.setMapTheme(config.mapTheme ?? 'fortress');
      }),
      bus.on('shot', ({ unitId, weaponId, pos }) => {
        if (unitId === this.playerId) {
          this.listenerPos = pos;
          this.combatHeat = Math.min(1, this.combatHeat + 0.25);
        }
        this.playWeaponShot(weaponId, this.computePan(pos));
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
      bus.on('explosion', ({ pos }) => {
        const pan = this.computePan(pos);
        this.playNoiseBurst(0.45, 420, 0.42, pan);
        this.playTone(110, 32, 0.42, 'sawtooth', 0.36, pan);
        this.combatHeat = Math.min(1, this.combatHeat + 0.35);
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
