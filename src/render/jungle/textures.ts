export type JungleTextureKey =
  | 'groundStoneMoss'
  | 'groundJungleEarth'
  | 'groundOvergrownRuins'
  | 'wallRuinStone'
  | 'waterJungleRiver'
  | 'woodAncientPlank'
  | 'foliageAtlas';

const TEXTURE_URLS: Record<JungleTextureKey, string> = {
  groundStoneMoss: '/assets/jungle/ground_stone_moss.png',
  groundJungleEarth: '/assets/jungle/ground_jungle_earth.png',
  groundOvergrownRuins: '/assets/jungle/ground_overgrown_ruins.png',
  wallRuinStone: '/assets/jungle/wall_ruin_stone.png',
  waterJungleRiver: '/assets/jungle/water_jungle_river.png',
  woodAncientPlank: '/assets/jungle/wood_ancient_plank.png',
  foliageAtlas: '/assets/jungle/foliage_atlas.png',
};

function noiseHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Build a procedural 128x128 tileable fallback texture while high-res PNGs load. */
function buildProceduralFallback(key: JungleTextureKey): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (key === 'groundStoneMoss') {
    ctx.fillStyle = '#4B5246';
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const x = (c * 32 + (r % 2) * 14) % size;
        const y = r * 32;
        const h = noiseHash(c, r, 13);
        ctx.fillStyle = h < 0.5 ? '#586153' : '#454C41';
        ctx.fillRect(x + 1, y + 1, 29, 29);
        ctx.strokeStyle = '#2B3A26';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, 29, 29);
      }
    }
    ctx.fillStyle = 'rgba(54, 118, 56, 0.35)';
    ctx.beginPath();
    ctx.arc(32, 32, 11, 0, Math.PI * 2);
    ctx.arc(96, 88, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'groundJungleEarth') {
    ctx.fillStyle = '#332C21';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i += 1) {
      const h = noiseHash(i, 3, 29);
      ctx.fillStyle =
        h < 0.35
          ? 'rgba(24, 19, 13, 0.32)'
          : h < 0.7
            ? 'rgba(72, 58, 38, 0.25)'
            : 'rgba(56, 98, 44, 0.24)';
      ctx.fillRect((i * 37) % size, (i * 53) % size, 3, 2);
    }
  } else if (key === 'groundOvergrownRuins') {
    ctx.fillStyle = '#384632';
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        if (noiseHash(c, r, 55) < 0.32) continue;
        ctx.fillStyle = '#535A4D';
        ctx.fillRect(c * 32 + 3, r * 32 + 3, 26, 26);
      }
    }
    for (let i = 0; i < 160; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(62, 128, 58, 0.3)' : 'rgba(98, 72, 42, 0.25)';
      ctx.fillRect((i * 41) % size, (i * 61) % size, 4, 3);
    }
  } else if (key === 'wallRuinStone') {
    ctx.fillStyle = '#535D4D';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#2B3227';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        ctx.strokeRect(c * 32 + 0.5, r * 32 + 0.5, 31, 31);
      }
    }
    ctx.fillStyle = 'rgba(54, 120, 58, 0.38)';
    ctx.fillRect(14, 12, 34, 24);
    ctx.fillRect(72, 68, 36, 28);
  } else if (key === 'waterJungleRiver') {
    ctx.fillStyle = '#0F3E46';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 180; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(20, 92, 102, 0.28)' : 'rgba(9, 44, 52, 0.34)';
      ctx.beginPath();
      ctx.arc((i * 47) % size, (i * 67) % size, 4 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === 'woodAncientPlank') {
    ctx.fillStyle = '#5C4026';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 16) {
      ctx.fillStyle = (x / 16) % 2 === 0 ? '#694A2D' : '#563B22';
      ctx.fillRect(x, 0, 14, size);
      ctx.fillStyle = '#25180D';
      ctx.fillRect(x + 14, 0, 2, size);
    }
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  return canvas;
}

/**
 * Lazily loads high-resolution painted Jungle Outpost PNG textures with seamless
 * procedural fallbacks and revision-tracked pattern & sprite lookup.
 */
export class JungleTextureAtlas {
  private images = new Map<JungleTextureKey, HTMLImageElement>();
  private fallbacks = new Map<JungleTextureKey, HTMLCanvasElement>();
  private loadingStarted = false;
  private revision = 0;

  ensureLoading(): void {
    if (this.loadingStarted || typeof Image === 'undefined') return;
    this.loadingStarted = true;

    const keys = Object.keys(TEXTURE_URLS) as JungleTextureKey[];
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

  getImage(key: JungleTextureKey): HTMLImageElement | null {
    this.ensureLoading();
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getPattern(
    ctx: CanvasRenderingContext2D,
    key: JungleTextureKey,
    scale = 0.4,
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
