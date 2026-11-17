/**
 * Tiny procedural audio layer built on the Web Audio API. No external
 * assets and no dependencies: the village drone and combat blips are
 * synthesised at runtime. Every entry point degrades silently when audio
 * is unavailable or blocked by autoplay policy.
 */

let audioContext: AudioContext | null = null;

interface Ambient {
  master: GainNode;
  oscillators: OscillatorNode[];
  sources: AudioBufferSourceNode[];
}

let ambient: Ambient | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

/** Call from the first user gesture so the browser unlocks audio. */
export function ensureAudio(): void {
  getContext();
}

function makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.96 + white * 0.04;
    data[i] = last;
  }
  return buffer;
}

export function startAmbience(): void {
  const ctx = getContext();
  if (!ctx || ambient) return;

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 520;
  lowpass.Q.value = 0.7;
  lowpass.connect(master);

  const oscillators: OscillatorNode[] = [];
  const droneSpecs: Array<{ frequency: number; type: OscillatorType; gain: number }> = [
    { frequency: 98, type: 'sine', gain: 0.02 },
    { frequency: 147, type: 'triangle', gain: 0.008 },
    { frequency: 196.5, type: 'sine', gain: 0.004 },
  ];

  for (const spec of droneSpecs) {
    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.value = spec.frequency;
    const gain = ctx.createGain();
    gain.gain.value = spec.gain;
    osc.connect(gain);
    gain.connect(lowpass);
    osc.start();
    oscillators.push(osc);
  }

  const sources: AudioBufferSourceNode[] = [];
  const noise = ctx.createBufferSource();
  noise.buffer = makeNoise(ctx, 3);
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 780;
  noiseFilter.Q.value = 0.4;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start();
  sources.push(noise);

  const now = ctx.currentTime;
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.6, now + 4);

  ambient = { master, oscillators, sources };
}

export function setAmbientLevel(level: number, rampSeconds = 2.5): void {
  const ctx = audioContext;
  if (!ctx || !ambient) return;
  const clamped = Math.max(0, Math.min(1, level));
  const now = ctx.currentTime;
  const gain = ambient.master.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(clamped * 0.6, now + rampSeconds);
}

export function stopAmbience(fadeSeconds = 1.2): void {
  const ctx = audioContext;
  const current = ambient;
  if (!ctx || !current) return;

  const now = ctx.currentTime;
  current.master.gain.cancelScheduledValues(now);
  current.master.gain.setValueAtTime(current.master.gain.value, now);
  current.master.gain.linearRampToValueAtTime(0, now + fadeSeconds);
  ambient = null;

  window.setTimeout(() => {
    for (const osc of current.oscillators) {
      try {
        osc.stop();
      } catch {
        // Already stopped.
      }
    }
    for (const source of current.sources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    current.master.disconnect();
  }, Math.ceil(fadeSeconds * 1000) + 80);
}

export interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
}

export function playTone(
  frequency: number,
  durationMs: number,
  options: ToneOptions = {},
): void {
  const ctx = getContext();
  if (!ctx) return;

  const start = ctx.currentTime + (options.delay ?? 0);
  const end = start + Math.max(0.03, durationMs / 1000);
  const osc = ctx.createOscillator();
  osc.type = options.type ?? 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  if (options.slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, options.slideTo),
      end,
    );
  }

  const gain = ctx.createGain();
  const peak = Math.max(0.001, Math.min(0.2, options.gain ?? 0.045));
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

export function playNoiseBurst(durationMs = 220, gainValue = 0.05): void {
  const ctx = getContext();
  if (!ctx) return;

  const duration = Math.max(0.05, durationMs / 1000);
  const start = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = makeNoise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1600, start);
  filter.frequency.exponentialRampToValueAtTime(160, start + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

export function playSwing(): void {
  playNoiseBurst(130, 0.035);
  playTone(320, 90, { type: 'triangle', gain: 0.02, slideTo: 180 });
}

export function playHit(): void {
  playTone(150, 110, { type: 'square', gain: 0.03, slideTo: 90 });
  playNoiseBurst(90, 0.035);
}

export function playMagic(): void {
  playTone(220, 620, { type: 'sine', gain: 0.05, slideTo: 1320 });
  playTone(330, 520, { type: 'triangle', gain: 0.025, slideTo: 1760 });
  playNoiseBurst(500, 0.03);
}
