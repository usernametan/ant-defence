type AudioContextCtor = typeof AudioContext;

export class AudioEngine {
  private context: AudioContext | null = null;

  private master: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;

  muted = false;

  constructor() {
    try {
      this.muted = window.localStorage.getItem('ant-defense:muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  ensure(): void {
    if (!this.context) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextCtor })
          .webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.42;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 24;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;
      this.master.connect(compressor);
      compressor.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      window.localStorage.setItem('ant-defense:muted', muted ? '1' : '0');
    } catch {
      // Storage may be unavailable in private mode; audio still works.
    }
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.42,
        this.context.currentTime,
        0.02,
      );
    }
  }

  toggle(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ready(): AudioContext | null {
    if (this.muted) return null;
    this.ensure();
    if (!this.context || !this.master) return null;
    return this.context;
  }

  private route(node: AudioNode, ctx: AudioContext, pan?: number): void {
    if (pan !== undefined && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(panner);
      panner.connect(this.master!);
      return;
    }
    node.connect(this.master!);
  }

  private tone(
    ctx: AudioContext,
    opts: {
      from: number;
      to: number;
      duration: number;
      type?: OscillatorType;
      gain?: number;
      delay?: number;
      pan?: number;
    },
  ): void {
    const start = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.from, start);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, opts.to),
      start + opts.duration,
    );
    const peak = opts.gain ?? 0.12;
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
    osc.connect(amp);
    this.route(amp, ctx, opts.pan);
    osc.start(start);
    osc.stop(start + opts.duration + 0.02);
  }

  private noise(
    ctx: AudioContext,
    opts: {
      duration: number;
      gain?: number;
      frequency?: number;
      delay?: number;
      q?: number;
      pan?: number;
    },
  ): void {
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 1.2);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    const start = ctx.currentTime + (opts.delay ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = opts.frequency ?? 1200;
    filter.Q.value = opts.q ?? 0.9;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(opts.gain ?? 0.12, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
    source.connect(filter);
    filter.connect(amp);
    this.route(amp, ctx, opts.pan);
    source.start(start);
    source.stop(start + opts.duration + 0.02);
  }

  shoot(powered = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.noise(ctx, { duration: 0.09, gain: powered ? 0.3 : 0.19, frequency: 1900, q: 0.6 });
    this.tone(ctx, {
      from: powered ? 420 : 300,
      to: 80,
      duration: 0.11,
      type: 'square',
      gain: powered ? 0.14 : 0.08,
    });
    if (powered) {
      this.tone(ctx, { from: 880, to: 180, duration: 0.2, type: 'sawtooth', gain: 0.05 });
    }
  }

  hit(pan?: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.noise(ctx, { duration: 0.06, gain: 0.14, frequency: 900, q: 1.4, pan });
    this.tone(ctx, { from: 180, to: 90, duration: 0.08, type: 'triangle', gain: 0.08, pan });
  }

  kill(scale = 1, pan?: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    const base = 240 / Math.max(0.6, scale);
    this.tone(ctx, { from: base, to: 60, duration: 0.16, type: 'triangle', gain: 0.1, pan });
    this.noise(ctx, { duration: 0.16, gain: 0.1, frequency: 500, q: 0.7, delay: 0.02, pan });
  }

  typingTick(progress: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, {
      from: 320 + 300 * Math.max(0, Math.min(1, progress)),
      to: 300,
      duration: 0.035,
      type: 'sine',
      gain: 0.03,
    });
  }

  comboStreak(level: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    const base = 440 + Math.min(6, level / 5) * 60;
    this.tone(ctx, { from: base, to: base, duration: 0.12, type: 'triangle', gain: 0.07 });
    this.tone(ctx, {
      from: base * 1.5,
      to: base * 1.5,
      duration: 0.16,
      type: 'triangle',
      gain: 0.05,
      delay: 0.07,
    });
  }

  pickupDrop(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 520, to: 660, duration: 0.14, type: 'sine', gain: 0.05 });
    this.tone(ctx, { from: 660, to: 880, duration: 0.16, type: 'sine', gain: 0.04, delay: 0.09 });
    this.tone(ctx, { from: 880, to: 1100, duration: 0.2, type: 'sine', gain: 0.03, delay: 0.17 });
  }

  pickupCollect(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 261.6, to: 261.6, duration: 0.16, type: 'triangle', gain: 0.09 });
    this.tone(ctx, { from: 329.6, to: 329.6, duration: 0.18, type: 'triangle', gain: 0.075, delay: 0.06 });
    this.tone(ctx, { from: 392, to: 392, duration: 0.3, type: 'triangle', gain: 0.07, delay: 0.12 });
    this.tone(ctx, { from: 523.3, to: 523.3, duration: 0.34, type: 'sine', gain: 0.05, delay: 0.2 });
  }

  drainTick(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 220, to: 150, duration: 0.18, type: 'square', gain: 0.045 });
    this.tone(ctx, { from: 110, to: 70, duration: 0.24, type: 'sine', gain: 0.07 });
  }

  split(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.noise(ctx, { duration: 0.12, gain: 0.16, frequency: 700, q: 1.1 });
    this.tone(ctx, { from: 320, to: 90, duration: 0.18, type: 'square', gain: 0.06 });
    this.tone(ctx, { from: 240, to: 60, duration: 0.22, type: 'triangle', gain: 0.08, delay: 0.05 });
  }

  heartbeat(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 58, to: 40, duration: 0.16, type: 'sine', gain: 0.12 });
    this.tone(ctx, { from: 52, to: 36, duration: 0.14, type: 'sine', gain: 0.09, delay: 0.16 });
  }

  error(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 130, to: 120, duration: 0.07, type: 'square', gain: 0.045 });
    this.tone(ctx, { from: 116, to: 104, duration: 0.1, type: 'square', gain: 0.035, delay: 0.06 });
  }

  breach(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.noise(ctx, { duration: 0.34, gain: 0.28, frequency: 220, q: 0.5 });
    this.tone(ctx, { from: 110, to: 38, duration: 0.42, type: 'sawtooth', gain: 0.12 });
  }

  wave(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 392, to: 392, duration: 0.26, type: 'sine', gain: 0.07 });
    this.tone(ctx, { from: 587, to: 587, duration: 0.4, type: 'sine', gain: 0.06, delay: 0.12 });
    this.tone(ctx, { from: 784, to: 784, duration: 0.55, type: 'sine', gain: 0.045, delay: 0.25 });
  }

  boss(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 82, to: 55, duration: 1.2, type: 'sawtooth', gain: 0.1 });
    this.tone(ctx, { from: 165, to: 110, duration: 1.1, type: 'square', gain: 0.035, delay: 0.15 });
    this.noise(ctx, { duration: 0.8, gain: 0.1, frequency: 160, q: 0.4 });
  }

  ability(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 220, to: 760, duration: 0.28, type: 'sine', gain: 0.08 });
    this.tone(ctx, { from: 440, to: 1200, duration: 0.2, type: 'triangle', gain: 0.035, delay: 0.04 });
  }

  gameover(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 220, to: 180, duration: 0.45, type: 'triangle', gain: 0.09 });
    this.tone(ctx, { from: 174, to: 140, duration: 0.55, type: 'triangle', gain: 0.08, delay: 0.28 });
    this.tone(ctx, { from: 130, to: 65, duration: 1.2, type: 'sawtooth', gain: 0.06, delay: 0.62 });
  }

  click(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(ctx, { from: 540, to: 420, duration: 0.05, type: 'sine', gain: 0.045 });
  }
}
