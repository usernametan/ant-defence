import type { WeaponCategory } from "../combat/WeaponDef";

type AudioContextCtor = typeof AudioContext;

export class CombatSfx {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  shoot(category: WeaponCategory): void {
    const context = this.ensure();

    if (!context) {
      return;
    }

    const profile =
      category === "heavy"
        ? { from: 220, to: 64, duration: 0.16, gain: 0.075 }
        : category === "repeater"
          ? { from: 460, to: 150, duration: 0.06, gain: 0.038 }
          : { from: 340, to: 100, duration: 0.09, gain: 0.05 };

    this.tone(
      context,
      profile.from,
      profile.to,
      profile.duration,
      "square",
      profile.gain,
    );
    this.noise(context, profile.duration * 0.8, profile.gain * 0.7, 1700);
  }

  hit(killed: boolean): void {
    const context = this.ensure();

    if (!context) {
      return;
    }

    this.tone(
      context,
      killed ? 170 : 240,
      killed ? 50 : 110,
      killed ? 0.18 : 0.07,
      "triangle",
      killed ? 0.06 : 0.035,
    );
    this.noise(context, killed ? 0.15 : 0.05, 0.035, 800);
  }

  enemyAttack(kind: "melee" | "projectile"): void {
    const context = this.ensure();

    if (!context) {
      return;
    }

    if (kind === "projectile") {
      this.tone(context, 300, 92, 0.14, "sawtooth", 0.04);
      this.noise(context, 0.1, 0.026, 1100);
      return;
    }

    this.tone(context, 150, 58, 0.11, "square", 0.032);
    this.noise(context, 0.08, 0.03, 620);
  }

  playerHit(): void {
    const context = this.ensure();

    if (!context) {
      return;
    }

    this.tone(context, 118, 42, 0.2, "sawtooth", 0.07);
    this.noise(context, 0.16, 0.055, 430);
  }

  creatureDeath(): void {
    const context = this.ensure();

    if (!context) {
      return;
    }

    this.tone(context, 190, 54, 0.22, "triangle", 0.045);
    this.noise(context, 0.18, 0.04, 720);
  }

  dispose(): void {
    const context = this.context;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;

    if (context) {
      void context.close();
    }
  }

  private ensure(): AudioContext | null {
    if (!this.context) {
      const holder = window as typeof window & {
        webkitAudioContext?: AudioContextCtor;
      };
      const Ctor = holder.AudioContext ?? holder.webkitAudioContext;

      if (!Ctor) {
        return null;
      }

      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }

    return this.context;
  }

  private tone(
    context: AudioContext,
    from: number,
    to: number,
    duration: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(30, to),
      start + duration,
    );
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master!);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(
    context: AudioContext,
    duration: number,
    gain: number,
    frequency: number,
  ): void {
    if (!this.noiseBuffer) {
      const length = Math.floor(context.sampleRate * 0.5);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);

      for (let index = 0; index < data.length; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }

      this.noiseBuffer = buffer;
    }

    const start = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.9;
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master!);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}
