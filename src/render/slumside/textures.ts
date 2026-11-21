export type SlumsideTextureKey =
  | 'groundConcrete'
  | 'groundMarket'
  | 'roofTinRust'
  | 'roofConcrete'
  | 'roofTarpBlue'
  | 'roofTerracotta'
  | 'railwayBallast';

const TEXTURE_URLS: Record<SlumsideTextureKey, string> = {
  groundConcrete: '/assets/slumside/ground_concrete.png',
  groundMarket: '/assets/slumside/ground_market.png',
  roofTinRust: '/assets/slumside/roof_tin_rust.png',
  roofConcrete: '/assets/slumside/roof_concrete.png',
  roofTarpBlue: '/assets/slumside/roof_tarp_blue.png',
  roofTerracotta: '/assets/slumside/roof_terracotta.png',
  railwayBallast: '/assets/slumside/railway_ballast.png',
};

function noiseHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Build a procedural 128x128 tileable fallback texture while high-res PNGs load. */
function buildProceduralFallback(key: SlumsideTextureKey): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (key === 'groundConcrete') {
    ctx.fillStyle = '#736A5E';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i += 1) {
      const h = noiseHash(i, 1, 11);
      ctx.fillStyle = h < 0.5 ? 'rgba(42,36,30,0.16)' : 'rgba(210,194,170,0.14)';
      ctx.fillRect((i * 37) % size, (i * 53) % size, 2 + (i % 3), 2);
    }
    ctx.strokeStyle = 'rgba(40, 34, 28, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 24);
    ctx.lineTo(44, 38);
    ctx.lineTo(78, 30);
    ctx.moveTo(64, 82);
    ctx.lineTo(96, 102);
    ctx.stroke();
  } else if (key === 'groundMarket') {
    ctx.fillStyle = '#6B6155';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(40, 34, 28, 0.42)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const shift = (r % 2) * 16;
        const x = (c * 32 + shift) % size;
        const y = r * 32;
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(130, 118, 102, 0.25)' : 'rgba(84, 76, 66, 0.25)';
        ctx.fillRect(x, y, 31, 31);
        ctx.strokeRect(x + 0.5, y + 0.5, 31, 31);
      }
    }
  } else if (key === 'roofTinRust') {
    ctx.fillStyle = '#787066';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 6) {
      ctx.fillStyle = 'rgba(255, 248, 238, 0.12)';
      ctx.fillRect(0, y, size, 2);
      ctx.fillStyle = 'rgba(24, 20, 16, 0.28)';
      ctx.fillRect(0, y + 3, size, 2);
    }
    ctx.fillStyle = 'rgba(154, 74, 42, 0.34)';
    ctx.fillRect(18, 12, 42, 28);
    ctx.fillRect(72, 66, 38, 36);
  } else if (key === 'roofConcrete') {
    ctx.fillStyle = '#978F83';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 360; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(60, 54, 46, 0.14)' : 'rgba(220, 212, 198, 0.12)';
      ctx.fillRect((i * 41) % size, (i * 61) % size, 3, 2);
    }
  } else if (key === 'roofTarpBlue') {
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(128, 72);
    ctx.moveTo(18, 128);
    ctx.lineTo(114, 16);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.42)';
    ctx.beginPath();
    ctx.moveTo(0, 92);
    ctx.lineTo(128, 44);
    ctx.stroke();
  } else if (key === 'roofTerracotta') {
    ctx.fillStyle = '#B45230';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 7) {
      ctx.fillStyle = 'rgba(255, 224, 194, 0.14)';
      ctx.fillRect(x, 0, 2, size);
      ctx.fillStyle = 'rgba(66, 26, 14, 0.24)';
      ctx.fillRect(x + 4, 0, 2, size);
    }
  } else {
    ctx.fillStyle = '#4B443B';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i += 1) {
      const h = noiseHash(i, 7, 99);
      ctx.fillStyle = h < 0.33 ? '#342F28' : h < 0.66 ? '#675E53' : '#7D7367';
      ctx.fillRect((i * 29) % size, (i * 47) % size, 3, 3);
    }
  }

  return canvas;
}

/**
 * Manages asynchronous loading of high-resolution painted Slumside textures
 * with seamless procedural fallbacks and revision tracking for cache invalidation.
 */
export class SlumsideTextureAtlas {
  private images = new Map<SlumsideTextureKey, HTMLImageElement>();
  private fallbacks = new Map<SlumsideTextureKey, HTMLCanvasElement>();
  private loadingStarted = false;
  private revision = 0;

  ensureLoading(): void {
    if (this.loadingStarted || typeof Image === 'undefined') return;
    this.loadingStarted = true;

    const keys = Object.keys(TEXTURE_URLS) as SlumsideTextureKey[];
    for (const key of keys) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.revision += 1;
      };
      img.src = TEXTURE_URLS[key];
      this.images.set(key, img);
    }
  }

  getRevision(): number {
    return this.revision;
  }

  hasLoadedAny(): boolean {
    for (const img of this.images.values()) {
      if (img.complete && img.naturalWidth > 0) return true;
    }
    return false;
  }

  getImage(key: SlumsideTextureKey): HTMLImageElement | null {
    this.ensureLoading();
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getPattern(
    ctx: CanvasRenderingContext2D,
    key: SlumsideTextureKey,
    scale = 0.5,
  ): CanvasPattern | null {
    this.ensureLoading();
    const img = this.images.get(key);
    let source: CanvasImageSource | null = null;
    let effectiveScale = scale;

    if (img && img.complete && img.naturalWidth > 0) {
      source = img;
    } else {
      let fb = this.fallbacks.get(key);
      if (!fb) {
        const created = buildProceduralFallback(key);
        if (created) {
          this.fallbacks.set(key, created);
          fb = created;
        }
      }
      source = fb ?? null;
      effectiveScale = 1;
    }

    if (!source) return null;
    const pattern = ctx.createPattern(source, 'repeat');
    if (
      pattern &&
      effectiveScale !== 1 &&
      typeof DOMMatrix !== 'undefined' &&
      typeof pattern.setTransform === 'function'
    ) {
      pattern.setTransform(new DOMMatrix().scale(effectiveScale));
    }
    return pattern;
  }
}
