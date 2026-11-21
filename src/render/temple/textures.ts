export type TempleTextureKey =
  | 'groundSandstoneSlabs'
  | 'groundRoyalCourtyard'
  | 'groundDesertSand'
  | 'wallEgyptianSandstone'
  | 'waterSacredOasis'
  | 'egyptianAtlas';

const TEXTURE_URLS: Record<TempleTextureKey, string> = {
  groundSandstoneSlabs: '/assets/temple/ground_sandstone_slabs.png',
  groundRoyalCourtyard: '/assets/temple/ground_royal_courtyard.png',
  groundDesertSand: '/assets/temple/ground_desert_sand.png',
  wallEgyptianSandstone: '/assets/temple/wall_egyptian_sandstone.png',
  waterSacredOasis: '/assets/temple/water_sacred_oasis.png',
  egyptianAtlas: '/assets/temple/egyptian_atlas.png',
};

function noiseHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Build a procedural 128x128 tileable sandstone/water fallback while PNG textures load. */
function buildProceduralFallback(key: TempleTextureKey): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (key === 'groundSandstoneSlabs' || key === 'groundRoyalCourtyard') {
    ctx.fillStyle = key === 'groundRoyalCourtyard' ? '#B9925B' : '#A98451';
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const x = (c * 32 + (r % 2) * 14) % size;
        const y = r * 32;
        const h = noiseHash(c, r, 41);
        ctx.fillStyle = h < 0.5 ? '#C49F68' : '#AD8854';
        ctx.fillRect(x + 1, y + 1, 29, 29);
        ctx.strokeStyle = '#8B6B3D';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, 29, 29);
      }
    }
  } else if (key === 'groundDesertSand') {
    ctx.fillStyle = '#CCA668';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 320; i += 1) {
      const h = noiseHash(i, 7, 17);
      ctx.fillStyle = h < 0.5 ? 'rgba(222, 186, 124, 0.35)' : 'rgba(156, 118, 66, 0.25)';
      ctx.fillRect((i * 37) % size, (i * 53) % size, 3, 2);
    }
  } else if (key === 'wallEgyptianSandstone') {
    ctx.fillStyle = '#B48D56';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#6D522D';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        ctx.strokeRect(c * 32 + 0.5, r * 32 + 0.5, 31, 31);
      }
    }
  } else if (key === 'waterSacredOasis') {
    ctx.fillStyle = '#116B76';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(103, 232, 249, 0.22)';
    for (let y = 12; y < size; y += 24) {
      ctx.fillRect(8, y, size - 16, 3);
    }
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  return canvas;
}

/**
 * Lazily loads painted Egyptian sandstone PNG textures and the `egyptian_atlas.png`
 * architectural/statue sprite sheet with seamless procedural fallbacks.
 */
export class TempleTextureAtlas {
  private images = new Map<TempleTextureKey, HTMLImageElement>();
  private fallbacks = new Map<TempleTextureKey, HTMLCanvasElement>();
  private loadingStarted = false;
  private revision = 0;

  ensureLoading(): void {
    if (this.loadingStarted || typeof Image === 'undefined') return;
    this.loadingStarted = true;

    const keys = Object.keys(TEXTURE_URLS) as TempleTextureKey[];
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

  getImage(key: TempleTextureKey): HTMLImageElement | null {
    this.ensureLoading();
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getPattern(
    ctx: CanvasRenderingContext2D,
    key: TempleTextureKey,
    scale = 0.36,
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
