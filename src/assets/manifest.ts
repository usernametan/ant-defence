import type Phaser from 'phaser';

export interface SpriteAssetSpec {
  key: string;
  width: number;
  height: number;
  color: number;
  borderColor?: number;
  url?: string;
}

export interface TilesetAssetSpec {
  key: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  color: number;
  accentColor: number;
  url?: string;
}

export interface AudioAssetSpec {
  key: string;
  frequency: number;
  durationMs: number;
  url?: string;
}

export const SPRITE_ASSETS = {
  player: {
    key: 'sprite:player',
    width: 16,
    height: 24,
    color: 0xe6a15c,
    borderColor: 0x3b1f0e,
  },
  maskedMan: {
    key: 'sprite:masked_man',
    width: 16,
    height: 24,
    color: 0x5c3c6e,
    borderColor: 0x1b0f24,
  },
  saint: {
    key: 'sprite:saint',
    width: 16,
    height: 24,
    color: 0xd9c28f,
    borderColor: 0x5c4724,
  },
  son: {
    key: 'sprite:son',
    width: 12,
    height: 18,
    color: 0x7ec4cf,
    borderColor: 0x204852,
  },
  slime: {
    key: 'sprite:slime',
    width: 14,
    height: 12,
    color: 0x59c173,
    borderColor: 0x1c4f28,
  },
  dragon: {
    key: 'sprite:dragon',
    width: 48,
    height: 48,
    color: 0xc93b2b,
    borderColor: 0x450d07,
  },
  projectile: {
    key: 'sprite:projectile',
    width: 8,
    height: 8,
    color: 0xffd166,
    borderColor: 0xff6b35,
  },
  pickup: {
    key: 'sprite:pickup',
    width: 12,
    height: 12,
    color: 0x6ce5e8,
    borderColor: 0x1c4a4d,
  },
} as const satisfies Record<string, SpriteAssetSpec>;

export const TILESET_ASSETS = {
  village: {
    key: 'tileset:village',
    tileWidth: 16,
    tileHeight: 16,
    columns: 4,
    rows: 4,
    color: 0x5b7a47,
    accentColor: 0x8a6d46,
  },
  cave: {
    key: 'tileset:cave',
    tileWidth: 16,
    tileHeight: 16,
    columns: 4,
    rows: 4,
    color: 0x353445,
    accentColor: 0x575470,
  },
} as const satisfies Record<string, TilesetAssetSpec>;

export const AUDIO_ASSETS = {
  reaction: {
    key: 'sfx:reaction',
    frequency: 520,
    durationMs: 140,
  },
  hit: {
    key: 'sfx:hit',
    frequency: 180,
    durationMs: 90,
  },
  discover: {
    key: 'sfx:discover',
    frequency: 660,
    durationMs: 220,
  },
  dialogueTick: {
    key: 'sfx:dialogue_tick',
    frequency: 420,
    durationMs: 35,
  },
} as const satisfies Record<string, AudioAssetSpec>;

export const ASSET_MANIFEST = {
  sprites: SPRITE_ASSETS,
  tilesets: TILESET_ASSETS,
  audio: AUDIO_ASSETS,
} as const;

export type SpriteKey = (typeof SPRITE_ASSETS)[keyof typeof SPRITE_ASSETS]['key'];
export type TilesetKey = (typeof TILESET_ASSETS)[keyof typeof TILESET_ASSETS]['key'];
export type AudioKey = (typeof AUDIO_ASSETS)[keyof typeof AUDIO_ASSETS]['key'];

/**
 * Generates colored-rectangle placeholder textures for every sprite and tileset
 * entry in the manifest so Phaser scenes can run with zero external art files.
 */
export function registerPlaceholderTextures(scene: Phaser.Scene): void {
  const gfx = scene.add.graphics({ x: 0, y: 0 });
  gfx.setVisible(false);

  for (const spec of Object.values(SPRITE_ASSETS) as SpriteAssetSpec[]) {
    if (scene.textures.exists(spec.key)) continue;
    gfx.clear();
    gfx.fillStyle(spec.color, 1);
    gfx.fillRect(0, 0, spec.width, spec.height);
    if (spec.borderColor !== undefined) {
      gfx.lineStyle(1, spec.borderColor, 1);
      gfx.strokeRect(0, 0, spec.width, spec.height);
    }
    gfx.generateTexture(spec.key, spec.width, spec.height);
  }

  for (const spec of Object.values(TILESET_ASSETS) as TilesetAssetSpec[]) {
    if (scene.textures.exists(spec.key)) continue;
    const totalW = spec.tileWidth * spec.columns;
    const totalH = spec.tileHeight * spec.rows;
    gfx.clear();
    for (let row = 0; row < spec.rows; row += 1) {
      for (let col = 0; col < spec.columns; col += 1) {
        const useAccent = (row + col) % 2 === 1;
        gfx.fillStyle(useAccent ? spec.accentColor : spec.color, 1);
        gfx.fillRect(
          col * spec.tileWidth,
          row * spec.tileHeight,
          spec.tileWidth,
          spec.tileHeight,
        );
      }
    }
    gfx.generateTexture(spec.key, totalW, totalH);
  }

  gfx.destroy();
}
