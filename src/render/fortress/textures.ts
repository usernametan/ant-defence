export type FortressTextureKey =
  | 'floorGunmetalDeck'
  | 'floorLabPlating'
  | 'floorDarkGrating'
  | 'wallArmoredHull'
  | 'waterCryoCoolant'
  | 'scifiAtlas';

const TEXTURE_URLS: Record<FortressTextureKey, string> = {
  floorGunmetalDeck: '/assets/fortress/floor_gunmetal_deck.png',
  floorLabPlating: '/assets/fortress/floor_lab_plating.png',
  floorDarkGrating: '/assets/fortress/floor_dark_grating.png',
  wallArmoredHull: '/assets/fortress/wall_armored_hull.png',
  waterCryoCoolant: '/assets/fortress/water_cryo_coolant.png',
  scifiAtlas: '/assets/fortress/scifi_atlas.png',
};

/** Build a procedural 128x128 gunmetal/water fallback while PNG textures load. */
function buildProceduralFallback(key: FortressTextureKey): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (key === 'floorGunmetalDeck' || key === 'floorLabPlating') {
    ctx.fillStyle = key === 'floorLabPlating' ? '#232E42' : '#182030';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#0D131E';
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 64) {
      for (let x = 0; x < size; x += 64) {
        ctx.strokeRect(x + 1, y + 1, 62, 62);
      }
    }
  } else if (key === 'floorDarkGrating') {
    ctx.fillStyle = '#0D131E';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1B2538';
    for (let x = 0; x < size; x += 8) ctx.fillRect(x, 0, 2, size);
    for (let y = 0; y < size; y += 16) ctx.fillRect(0, y, size, 2);
  } else if (key === 'wallArmoredHull') {
    ctx.fillStyle = '#2B364B';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#101622';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  } else if (key === 'waterCryoCoolant') {
    ctx.fillStyle = '#0B3E6E';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.fillRect(10, 24, size - 20, 4);
    ctx.fillRect(18, 76, size - 36, 4);
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  return canvas;
}

/**
 * Lazily loads painted futuristic research facility PNG textures and the
 * `scifi_atlas.png` machinery/lab sprite sheet with revision-tracked caching.
 */
export class FortressTextureAtlas {
  private images = new Map<FortressTextureKey, HTMLImageElement>();
  private fallbacks = new Map<FortressTextureKey, HTMLCanvasElement>();
  private loadingStarted = false;
  private revision = 0;

  ensureLoading(): void {
    if (this.loadingStarted || typeof Image === 'undefined') return;
    this.loadingStarted = true;

    const keys = Object.keys(TEXTURE_URLS) as FortressTextureKey[];
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

  getImage(key: FortressTextureKey): HTMLImageElement | null {
    this.ensureLoading();
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getPattern(
    ctx: CanvasRenderingContext2D,
    key: FortressTextureKey,
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
