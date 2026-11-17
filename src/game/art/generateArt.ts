import type Phaser from 'phaser';
import { SPRITE_ASSETS } from '../../assets/manifest';
import { PALETTE as P, css, rgba } from './palette';
import { TILE, TILE_COUNT } from '../maps/tiles';

export type Facing = 'down' | 'up' | 'left' | 'right';
export const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

export type CharacterKind =
  | 'player'
  | 'son'
  | 'villager1'
  | 'villager2'
  | 'villager3'
  | 'masked';

export const CHARACTER_KINDS: readonly CharacterKind[] = [
  'player',
  'son',
  'villager1',
  'villager2',
  'villager3',
  'masked',
];

export const FX = {
  white: 'fx:white',
  shadow: 'fx:shadow',
  glow: 'fx:glow',
  magic: 'fx:magic',
  ring: 'fx:ring',
  warning: 'fx:warning',
  slash: 'fx:slash',
  spark: 'fx:spark',
  dust: 'fx:dust',
  leaf: 'fx:leaf',
  waterShimmer: 'fx:water-shimmer',
  vignette: 'fx:vignette',
} as const;

export const PROP = {
  hut0: 'prop:hut0',
  hut1: 'prop:hut1',
  hut2: 'prop:hut2',
  well: 'prop:well',
  tree: 'prop:tree',
  treeLarge: 'prop:tree-large',
  rock: 'prop:rock',
  lamp: 'prop:lamp',
} as const;

export const BG = {
  sky: 'bg:sky',
} as const;

export const TILESET_KEY = 'tileset:village';

export function characterTextureKey(
  kind: CharacterKind,
  facing: Facing,
  frame: number,
): string {
  return `char:${kind}:${facing}:${frame}`;
}

export function walkAnimationKey(kind: CharacterKind, facing: Facing): string {
  return `walk:${kind}:${facing}`;
}

export function idleAnimationKey(kind: CharacterKind, facing: Facing): string {
  return `idle:${kind}:${facing}`;
}

type Ctx = CanvasRenderingContext2D;

function drawTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx) => void,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  const ctx = texture.context;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  texture.refresh();
}

function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: number): void {
  ctx.fillStyle = css(color);
  ctx.fillRect(x, y, w, h);
}

function alphaRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha: number,
): void {
  ctx.fillStyle = rgba(color, alpha);
  ctx.fillRect(x, y, w, h);
}

function pixelEllipse(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
  alpha = 1,
): void {
  ctx.fillStyle = alpha === 1 ? css(color) : rgba(color, alpha);
  for (let y = -ry; y <= ry; y += 1) {
    const t = 1 - (y * y) / (ry * ry);
    if (t <= 0) continue;
    const half = Math.floor(rx * Math.sqrt(t));
    if (half <= 0) continue;
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
  }
}

interface CharacterPalette {
  skin: number;
  skinShade: number;
  turban: number;
  turbanShade: number;
  turbanLight: number;
  cloth: number;
  clothShade: number;
  clothLight: number;
  sash: number;
  shoe: number;
  hair: number;
  beard: number | null;
  mustache: boolean;
}

const PLAYER_PALETTE: CharacterPalette = {
  skin: P.skin,
  skinShade: P.skinShade,
  turban: SPRITE_ASSETS.player.color,
  turbanShade: 0xb26b32,
  turbanLight: P.saffronLight,
  cloth: P.cream,
  clothShade: P.creamShade,
  clothLight: 0xf5ead2,
  sash: P.saffron,
  shoe: P.inkSoft,
  hair: P.hair,
  beard: P.hair,
  mustache: true,
};

const VILLAGER_PALETTES: Record<'villager1' | 'villager2' | 'villager3', CharacterPalette> = {
  villager1: {
    skin: 0xa8643a,
    skinShade: 0x7f4728,
    turban: 0xc2823f,
    turbanShade: 0x8f5a29,
    turbanLight: 0xe0aa62,
    cloth: 0x708a4a,
    clothShade: 0x506631,
    clothLight: 0x8fa764,
    sash: 0xb6543c,
    shoe: P.inkSoft,
    hair: P.hair,
    beard: 0x3a2a22,
    mustache: true,
  },
  villager2: {
    skin: 0xa8643a,
    skinShade: 0x7f4728,
    turban: 0xd9ccb0,
    turbanShade: 0xa99b7e,
    turbanLight: 0xf1e6ca,
    cloth: 0xcfc3a5,
    clothShade: 0xa29478,
    clothLight: 0xe8dcc0,
    sash: 0x8c8475,
    shoe: P.inkSoft,
    hair: 0xbdb4a2,
    beard: 0xe1d8c4,
    mustache: true,
  },
  villager3: {
    skin: 0xb87342,
    skinShade: 0x8d512c,
    turban: 0xb94e3a,
    turbanShade: 0x8a3327,
    turbanLight: 0xe07a55,
    cloth: 0xd1a24e,
    clothShade: 0xa67b34,
    clothLight: 0xe5bd70,
    sash: 0x4f8a86,
    shoe: P.inkSoft,
    hair: P.hair,
    beard: null,
    mustache: false,
  },
};

const SON_PALETTE: CharacterPalette = {
  skin: 0xb87342,
  skinShade: 0x8d512c,
  turban: SPRITE_ASSETS.son.color,
  turbanShade: 0x4a8e99,
  turbanLight: 0xa6e0e6,
  cloth: SPRITE_ASSETS.son.color,
  clothShade: 0x4a8e99,
  clothLight: 0xa6e0e6,
  sash: P.saffron,
  shoe: P.inkSoft,
  hair: P.hair,
  beard: null,
  mustache: false,
};

function drawAdult(
  ctx: Ctx,
  facing: Facing,
  frame: number,
  p: CharacterPalette,
): void {
  if (facing === 'left') {
    ctx.save();
    ctx.translate(16, 0);
    ctx.scale(-1, 1);
    drawAdult(ctx, 'right', frame, p);
    ctx.restore();
    return;
  }

  const lift = frame === 1 || frame === 3 ? 1 : 0;
  const leftForward = frame === 1;
  const rightForward = frame === 3;

  // Turban / head-dress.
  px(ctx, 3, 0, 10, 2, p.turban);
  px(ctx, 2, 2, 12, 3, p.turban);
  px(ctx, 2, 5, 12, 1, p.turbanShade);
  px(ctx, 5, 0, 4, 1, p.turbanLight);
  px(ctx, 11, 1, 2, 2, p.turbanLight);
  px(ctx, 14, 3, 2, 2, p.turbanShade);

  if (facing === 'down') {
    px(ctx, 4, 6, 8, 4, p.skin);
    px(ctx, 4, 10, 8, 1, p.skinShade);
    px(ctx, 3, 7, 1, 2, p.skinShade);
    px(ctx, 12, 7, 1, 2, p.skinShade);
    px(ctx, 6, 7, 1, 1, P.ink);
    px(ctx, 9, 7, 1, 1, P.ink);
    px(ctx, 5, 6, 2, 1, p.hair);
    px(ctx, 9, 6, 2, 1, p.hair);
    px(ctx, 8, 8, 1, 1, p.skinShade);
    if (p.mustache) px(ctx, 6, 9, 4, 1, p.hair);
    if (p.beard) px(ctx, 5, 10, 6, 1, p.beard);
  } else if (facing === 'up') {
    px(ctx, 4, 6, 8, 4, p.hair);
    px(ctx, 4, 9, 8, 2, p.skinShade);
    px(ctx, 7, 10, 2, 1, p.skin);
    px(ctx, 4, 6, 3, 1, p.turbanShade);
    px(ctx, 9, 6, 3, 1, p.turbanShade);
  } else {
    // Right-facing profile.
    px(ctx, 6, 6, 6, 4, p.skin);
    px(ctx, 6, 10, 5, 1, p.skinShade);
    px(ctx, 12, 7, 1, 2, p.skinShade);
    px(ctx, 6, 7, 1, 2, p.skinShade);
    px(ctx, 9, 7, 1, 1, P.ink);
    px(ctx, 7, 6, 2, 1, p.hair);
    px(ctx, 8, 9, 4, 1, p.hair);
    if (p.beard) px(ctx, 7, 10, 4, 1, p.beard);
  }

  // Neck and torso.
  px(ctx, 7, 11, 2, 1, p.skin);
  px(ctx, 3, 11, 10, 6, p.cloth);
  px(ctx, 3, 11, 10, 1, p.clothLight);
  px(ctx, 3, 16, 10, 2, p.clothShade);
  px(ctx, 7, 11, 2, 1, P.gold);

  if (facing === 'up') {
    px(ctx, 4, 13, 3, 1, p.sash);
    px(ctx, 6, 14, 4, 1, p.sash);
    px(ctx, 9, 15, 2, 1, p.sash);
  } else if (facing === 'down') {
    px(ctx, 3, 13, 10, 2, p.sash);
    px(ctx, 4, 14, 8, 1, p.turbanShade);
    px(ctx, 10, 13, 2, 1, p.turbanLight);
  } else {
    px(ctx, 4, 13, 3, 1, p.sash);
    px(ctx, 6, 14, 4, 1, p.sash);
    px(ctx, 9, 15, 2, 1, p.sash);
  }

  if (facing === 'right') {
    px(ctx, 1, 12 + lift, 2, 5, p.clothShade);
    px(ctx, 12, 12 - lift, 2, 5, p.cloth);
    px(ctx, 1, 16 + lift, 2, 2, p.skin);
    px(ctx, 12, 16 - lift, 2, 2, p.skin);
  } else {
    px(ctx, 1, 12, 2, 5, p.clothShade);
    px(ctx, 13, 12, 2, 5, p.cloth);
    px(ctx, 1, 16, 2, 2, p.skin);
    px(ctx, 13, 16, 2, 2, p.skin);
  }

  // Dhoti and legs.
  px(ctx, 4, 18, 8, 3, p.clothLight);
  px(ctx, 4, 20, 8, 1, p.clothShade);

  if (leftForward) {
    px(ctx, 5, 21, 2, 3, p.skin);
    px(ctx, 9, 21, 2, 2, p.skinShade);
  } else if (rightForward) {
    px(ctx, 5, 21, 2, 2, p.skinShade);
    px(ctx, 9, 21, 2, 3, p.skin);
  } else {
    px(ctx, 5, 21, 2, 2, p.skin);
    px(ctx, 9, 21, 2, 2, p.skin);
  }

  px(ctx, 4, 23, 3, 1, p.shoe);
  px(ctx, 9, 23, 3, 1, p.shoe);
}

function drawChild(
  ctx: Ctx,
  facing: Facing,
  frame: number,
  p: CharacterPalette,
): void {
  if (facing === 'left') {
    ctx.save();
    ctx.translate(12, 0);
    ctx.scale(-1, 1);
    drawChild(ctx, 'right', frame, p);
    ctx.restore();
    return;
  }

  const leftForward = frame === 1;
  const rightForward = frame === 3;

  px(ctx, 2, 0, 8, 3, p.hair);
  px(ctx, 2, 0, 3, 1, P.hair);
  px(ctx, 1, 2, 1, 2, p.hair);
  px(ctx, 10, 2, 1, 2, p.hair);

  if (facing === 'down') {
    px(ctx, 2, 3, 8, 5, p.skin);
    px(ctx, 2, 7, 8, 1, p.skinShade);
    px(ctx, 4, 4, 1, 1, P.ink);
    px(ctx, 7, 4, 1, 1, P.ink);
    px(ctx, 3, 5, 1, 1, p.skinShade);
    px(ctx, 8, 5, 1, 1, p.skinShade);
    px(ctx, 5, 6, 2, 1, p.skinShade);
  } else if (facing === 'up') {
    px(ctx, 2, 3, 8, 3, p.hair);
    px(ctx, 2, 6, 8, 2, p.skinShade);
    px(ctx, 5, 7, 2, 1, p.skin);
  } else {
    px(ctx, 3, 3, 7, 5, p.skin);
    px(ctx, 9, 4, 1, 2, p.skinShade);
    px(ctx, 7, 4, 1, 1, P.ink);
    px(ctx, 3, 3, 5, 1, p.hair);
    px(ctx, 6, 6, 3, 1, p.skinShade);
  }

  px(ctx, 2, 8, 8, 5, p.cloth);
  px(ctx, 2, 8, 8, 1, p.clothLight);
  px(ctx, 2, 11, 8, 2, p.clothShade);
  px(ctx, 2, 9, 8, 1, p.sash);
  px(ctx, 1, 9, 1, 3, p.skin);
  px(ctx, 10, 9, 1, 3, p.skin);

  px(ctx, 2, 13, 8, 2, p.clothLight);
  if (leftForward) {
    px(ctx, 3, 15, 2, 2, p.skin);
    px(ctx, 7, 15, 2, 1, p.skinShade);
  } else if (rightForward) {
    px(ctx, 3, 15, 2, 1, p.skinShade);
    px(ctx, 7, 15, 2, 2, p.skin);
  } else {
    px(ctx, 3, 15, 2, 2, p.skin);
    px(ctx, 7, 15, 2, 2, p.skin);
  }
  px(ctx, 2, 17, 3, 1, p.shoe);
  px(ctx, 7, 17, 3, 1, p.shoe);
}

function drawMasked(ctx: Ctx, facing: Facing, frame: number): void {
  if (facing === 'left') {
    ctx.save();
    ctx.translate(18, 0);
    ctx.scale(-1, 1);
    drawMasked(ctx, 'right', frame);
    ctx.restore();
    return;
  }

  const sway = frame === 1 || frame === 3 ? 1 : 0;
  const dark = 0x2a1838;
  const mid = 0x412652;
  const trim = 0x8d6a3f;

  pixelEllipse(ctx, 9, 24, 7, 3, P.ink, 0.35);

  // Cloak body with a ragged hem.
  px(ctx, 3, 8, 12, 14, dark);
  px(ctx, 2 + sway, 22, 14, 3, dark);
  px(ctx, 1 + sway, 24, 3, 1, dark);
  px(ctx, 6, 24, 3, 2, dark);
  px(ctx, 12, 24, 4, 1, dark);
  px(ctx, 5, 9, 8, 11, mid);
  px(ctx, 6, 10, 1, 10, trim);
  px(ctx, 11, 10, 1, 10, trim);

  // Shoulders and arms.
  px(ctx, 1, 9, 3, 4, mid);
  px(ctx, 14, 9, 3, 4, mid);
  px(ctx, 0, 12 + sway, 2, 7, dark);
  px(ctx, 16, 12 - sway, 2, 7, dark);
  px(ctx, 0, 19 + sway, 2, 2, 0xd4c4a6);
  px(ctx, 16, 19 - sway, 2, 2, 0xd4c4a6);

  // Hood and bone mask.
  pixelEllipse(ctx, 9, 6, 7, 7, dark);
  px(ctx, 5, 1, 8, 2, mid);
  px(ctx, 5, 3, 8, 7, 0xd4c4a6);
  px(ctx, 5, 3, 8, 1, 0xefe2c8);
  px(ctx, 5, 9, 8, 1, 0xa89272);
  px(ctx, 6 + (facing === 'right' ? 2 : 0), 5, 2, 1, 0xc93b2b);
  px(ctx, 10 + (facing === 'right' ? 1 : 0), 5, 2, 1, 0xc93b2b);
  if (facing !== 'up') {
    px(ctx, 7, 7, 1, 2, 0x8f7a5c);
    px(ctx, 10, 7, 1, 2, 0x8f7a5c);
    px(ctx, 7, 10, 4, 1, 0x8f7a5c);
  } else {
    px(ctx, 5, 3, 8, 8, dark);
    px(ctx, 7, 4, 4, 1, mid);
  }

  // Gold clasps.
  px(ctx, 4, 10, 1, 1, trim);
  px(ctx, 13, 10, 1, 1, trim);
}

function drawTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists(TILESET_KEY)) {
    scene.textures.remove(TILESET_KEY);
  }

  drawTexture(scene, TILESET_KEY, 64, 64, (ctx) => {
    for (let index = 0; index < TILE_COUNT; index += 1) {
      const ox = (index % 4) * 16;
      const oy = Math.floor(index / 4) * 16;
      ctx.save();
      ctx.translate(ox, oy);
      drawTile(ctx, index);
      ctx.restore();
    }
  });
}

function drawTile(ctx: Ctx, index: number): void {
  switch (index) {
    case TILE.GRASS:
      px(ctx, 0, 0, 16, 16, P.grass);
      px(ctx, 2, 3, 1, 1, P.grassLight);
      px(ctx, 10, 5, 1, 1, P.grassDark);
      px(ctx, 5, 11, 1, 1, P.grassLight);
      px(ctx, 13, 13, 1, 1, P.grassDark);
      px(ctx, 8, 1, 1, 2, P.grassLight);
      px(ctx, 3, 14, 1, 1, P.grassShadow);
      break;
    case TILE.GRASS_FLOWERS:
      px(ctx, 0, 0, 16, 16, P.grass);
      px(ctx, 2, 4, 1, 1, P.grassLight);
      px(ctx, 9, 2, 1, 1, P.grassDark);
      px(ctx, 4, 9, 1, 1, 0xe9b84a);
      px(ctx, 12, 7, 1, 1, 0xf0d27a);
      px(ctx, 7, 13, 1, 1, 0xe9b84a);
      px(ctx, 11, 12, 1, 1, P.cream);
      px(ctx, 3, 11, 1, 2, P.grassLight);
      break;
    case TILE.PATH:
      px(ctx, 0, 0, 16, 16, P.path);
      px(ctx, 1, 2, 2, 1, P.pathLight);
      px(ctx, 9, 4, 1, 1, P.pathDark);
      px(ctx, 4, 8, 2, 1, P.pathLight);
      px(ctx, 12, 10, 1, 1, P.pathDark);
      px(ctx, 6, 13, 2, 1, P.pathLight);
      alphaRect(ctx, 0, 15, 16, 1, P.pathDark, 0.35);
      break;
    case TILE.PATH_PEBBLE:
      px(ctx, 0, 0, 16, 16, P.path);
      px(ctx, 3, 3, 2, 2, P.pathDark);
      px(ctx, 4, 3, 1, 1, P.pathLight);
      px(ctx, 10, 8, 2, 2, P.pathDark);
      px(ctx, 11, 8, 1, 1, P.pathLight);
      px(ctx, 6, 12, 1, 1, P.pathLight);
      px(ctx, 13, 2, 1, 1, P.pathDark);
      break;
    case TILE.WATER:
      px(ctx, 0, 0, 16, 16, P.water);
      px(ctx, 0, 4, 6, 1, P.waterDeep);
      px(ctx, 8, 5, 7, 1, P.waterLight);
      px(ctx, 2, 11, 5, 1, P.waterLight);
      px(ctx, 10, 13, 4, 1, P.waterDeep);
      px(ctx, 13, 2, 2, 1, P.waterLight);
      break;
    case TILE.WATER_DEEP:
      px(ctx, 0, 0, 16, 16, P.waterDeep);
      px(ctx, 1, 6, 6, 1, P.water);
      px(ctx, 9, 2, 4, 1, P.water);
      px(ctx, 10, 9, 5, 1, P.waterLight);
      px(ctx, 3, 14, 5, 1, P.water);
      break;
    case TILE.SHORE:
      px(ctx, 0, 0, 16, 16, P.shore);
      px(ctx, 2, 3, 1, 1, P.shoreLight);
      px(ctx, 8, 6, 1, 1, P.pathDark);
      px(ctx, 12, 12, 1, 1, P.shoreLight);
      px(ctx, 4, 10, 1, 1, P.shoreLight);
      alphaRect(ctx, 0, 14, 16, 2, P.water, 0.25);
      break;
    case TILE.PLAZA:
      px(ctx, 0, 0, 16, 16, P.plaza);
      px(ctx, 0, 7, 16, 1, P.plazaDark);
      px(ctx, 7, 0, 1, 16, P.plazaDark);
      px(ctx, 1, 1, 5, 1, P.plazaLight);
      px(ctx, 9, 9, 6, 1, P.plazaLight);
      px(ctx, 1, 10, 2, 1, P.plazaDark);
      break;
    case TILE.FIELD:
      px(ctx, 0, 0, 16, 16, 0x6a4a2e);
      px(ctx, 1, 0, 1, 16, 0x7b5a38);
      px(ctx, 5, 0, 1, 16, 0x7b5a38);
      px(ctx, 9, 0, 1, 16, 0x7b5a38);
      px(ctx, 13, 0, 1, 16, 0x7b5a38);
      px(ctx, 2, 2, 1, 2, P.grassMid);
      px(ctx, 6, 5, 1, 2, P.grassLight);
      px(ctx, 10, 9, 1, 2, P.grassMid);
      px(ctx, 14, 6, 1, 2, P.grassLight);
      px(ctx, 4, 13, 1, 2, P.grassMid);
      break;
    case TILE.CLIFF:
      px(ctx, 0, 0, 16, 16, P.rockDark);
      px(ctx, 1, 2, 7, 4, P.rock);
      px(ctx, 9, 5, 6, 5, P.rock);
      px(ctx, 2, 9, 6, 5, P.rock);
      px(ctx, 2, 2, 4, 1, P.rockLight);
      px(ctx, 10, 5, 3, 1, P.rockLight);
      px(ctx, 8, 9, 2, 1, P.rockDark);
      px(ctx, 1, 1, 1, 1, P.rockLight);
      break;
    case TILE.GRASS_DARK:
      px(ctx, 0, 0, 16, 16, P.grassDark);
      px(ctx, 3, 3, 1, 2, P.grassShadow);
      px(ctx, 9, 7, 1, 2, P.grass);
      px(ctx, 5, 12, 1, 2, P.grassShadow);
      px(ctx, 13, 3, 1, 1, P.grassLight);
      px(ctx, 11, 13, 1, 1, P.grassShadow);
      break;
    case TILE.PLAZA_CRACKED:
      px(ctx, 0, 0, 16, 16, P.plaza);
      px(ctx, 0, 7, 16, 1, P.plazaDark);
      px(ctx, 7, 0, 1, 16, P.plazaDark);
      px(ctx, 2, 2, 4, 1, P.plazaLight);
      px(ctx, 9, 3, 2, 1, P.plazaDark);
      px(ctx, 9, 4, 1, 3, P.plazaDark);
      px(ctx, 10, 7, 2, 1, P.plazaDark);
      px(ctx, 3, 10, 3, 1, P.plazaLight);
      px(ctx, 11, 12, 2, 1, P.plazaDark);
      break;
    case TILE.GRASS_PATH:
      px(ctx, 0, 0, 16, 16, P.grass);
      px(ctx, 0, 9, 16, 7, P.path);
      px(ctx, 1, 10, 2, 1, P.pathLight);
      px(ctx, 8, 13, 2, 1, P.pathDark);
      px(ctx, 3, 14, 1, 1, P.pathLight);
      px(ctx, 5, 7, 1, 1, P.grassLight);
      px(ctx, 12, 6, 1, 1, P.grassDark);
      break;
    case TILE.GRASS_TUFTS:
      px(ctx, 0, 0, 16, 16, P.grass);
      px(ctx, 3, 4, 1, 4, P.grassDark);
      px(ctx, 5, 2, 1, 4, P.grassLight);
      px(ctx, 9, 6, 1, 5, P.grassDark);
      px(ctx, 11, 3, 1, 3, P.grassLight);
      px(ctx, 6, 11, 1, 3, P.grassShadow);
      px(ctx, 12, 12, 1, 2, P.grassLight);
      break;
    case TILE.DIRT:
      px(ctx, 0, 0, 16, 16, P.pathDark);
      px(ctx, 2, 2, 3, 1, P.path);
      px(ctx, 9, 5, 4, 1, P.path);
      px(ctx, 4, 10, 3, 1, P.path);
      px(ctx, 11, 12, 3, 1, P.path);
      px(ctx, 7, 3, 1, 1, P.pathLight);
      px(ctx, 13, 8, 1, 1, P.pathLight);
      break;
    case TILE.FOREST_FLOOR:
      px(ctx, 0, 0, 16, 16, P.grassShadow);
      px(ctx, 2, 3, 2, 1, P.trunk);
      px(ctx, 9, 2, 1, 2, P.treeDark);
      px(ctx, 5, 8, 2, 1, P.treeDark);
      px(ctx, 12, 9, 1, 2, P.trunk);
      px(ctx, 3, 13, 2, 1, P.treeDark);
      px(ctx, 10, 14, 1, 1, P.trunkLight);
      break;
    default:
      px(ctx, 0, 0, 16, 16, P.grass);
      break;
  }
}

function drawHut(
  scene: Phaser.Scene,
  key: string,
  roof: number,
  roofLight: number,
  roofDark: number,
  mud: number,
  mudShade: number,
  variant: number,
): void {
  drawTexture(scene, key, 56, 52, (ctx) => {
    // Ground shadow.
    pixelEllipse(ctx, 28, 48, 25, 5, P.ink, 0.22);

    // Platform step.
    px(ctx, 9, 44, 38, 4, P.mudDark);
    px(ctx, 11, 43, 34, 2, mudShade);

    // Mud walls.
    px(ctx, 8, 22, 40, 23, mud);
    px(ctx, 8, 22, 40, 2, mudShade);
    px(ctx, 8, 43, 40, 2, mudShade);
    px(ctx, 8, 22, 2, 23, mudShade);
    px(ctx, 46, 22, 2, 23, mudShade);
    for (let row = 0; row < 6; row += 1) {
      px(ctx, 10, 26 + row * 3, 36, 1, mudShade);
      px(ctx, 13 + (row % 2) * 8, 26 + row * 3, 1, 3, mudShade);
    }

    // Door with warm inner light.
    px(ctx, 23, 32, 11, 16, P.door);
    px(ctx, 24, 34, 9, 13, 0xf2b25c);
    px(ctx, 24, 34, 9, 2, 0xffd88c);
    px(ctx, 28, 34, 1, 13, 0xc27b38);
    px(ctx, 24, 42, 9, 1, 0xc27b38);
    px(ctx, 22, 32, 1, 16, P.inkSoft);
    px(ctx, 34, 32, 1, 16, P.inkSoft);

    // Windows.
    const windowX = variant === 2 ? 12 : 13;
    px(ctx, windowX, 29, 7, 7, P.inkSoft);
    px(ctx, windowX + 1, 30, 5, 5, 0xe8a850);
    px(ctx, windowX + 3, 30, 1, 5, P.door);
    px(ctx, windowX + 1, 32, 5, 1, P.door);
    px(ctx, 36, 29, 7, 7, P.inkSoft);
    px(ctx, 37, 30, 5, 5, 0xe8a850);
    px(ctx, 39, 30, 1, 5, P.door);
    px(ctx, 37, 32, 5, 1, P.door);

    // Hanging diya beside the door.
    px(ctx, 20, 28, 1, 4, P.inkSoft);
    px(ctx, 19, 32, 3, 2, P.gold);
    px(ctx, 20, 31, 1, 1, 0xffe5a0);

    // Thatched roof, layered for depth.
    ctx.fillStyle = css(roofDark);
    ctx.beginPath();
    ctx.moveTo(1, 25);
    ctx.lineTo(28, 1);
    ctx.lineTo(55, 25);
    ctx.lineTo(51, 28);
    ctx.lineTo(28, 7);
    ctx.lineTo(5, 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = css(roof);
    ctx.beginPath();
    ctx.moveTo(3, 24);
    ctx.lineTo(28, 3);
    ctx.lineTo(53, 24);
    ctx.lineTo(49, 26);
    ctx.lineTo(28, 9);
    ctx.lineTo(7, 26);
    ctx.closePath();
    ctx.fill();

    // Thatch bands.
    for (let i = 0; i < 5; i += 1) {
      const y = 10 + i * 3;
      const inset = Math.max(6, 24 - i * 4);
      ctx.strokeStyle = css(i % 2 === 0 ? roofLight : roofDark);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(inset, y + 6);
      ctx.lineTo(28, y);
      ctx.lineTo(56 - inset, y + 6);
      ctx.stroke();
    }

    // Straw highlights.
    px(ctx, 22, 6, 1, 5, roofLight);
    px(ctx, 33, 8, 1, 6, roofLight);
    px(ctx, 15, 15, 1, 4, roofDark);
    px(ctx, 42, 17, 1, 4, roofDark);
    px(ctx, 9, 24, 38, 2, roofDark);

    // Finial.
    px(ctx, 27, 0, 3, 2, P.gold);
    px(ctx, 28, 0, 1, 1, 0xffe5a0);
  });
}

function drawWell(scene: Phaser.Scene): void {
  drawTexture(scene, PROP.well, 28, 32, (ctx) => {
    pixelEllipse(ctx, 14, 28, 12, 3, P.ink, 0.25);

    // Stone ring.
    pixelEllipse(ctx, 14, 23, 11, 5, P.plazaDark);
    pixelEllipse(ctx, 14, 22, 10, 4, P.plaza);
    pixelEllipse(ctx, 14, 22, 7, 3, P.waterDeep);
    px(ctx, 8, 18, 3, 2, P.plazaLight);
    px(ctx, 16, 17, 4, 2, P.plazaLight);
    px(ctx, 10, 24, 3, 1, P.plazaDark);
    px(ctx, 16, 25, 4, 1, P.plazaDark);

    // Posts and pulley.
    px(ctx, 6, 9, 2, 12, P.trunk);
    px(ctx, 20, 9, 2, 12, P.trunk);
    px(ctx, 7, 9, 1, 12, P.trunkLight);
    px(ctx, 21, 9, 1, 12, P.trunkLight);
    px(ctx, 7, 11, 14, 1, P.trunk);
    px(ctx, 13, 12, 2, 2, P.gold);

    // Rope and bucket.
    px(ctx, 13, 14, 1, 5, P.creamShade);
    px(ctx, 12, 19, 5, 3, P.pathDark);
    px(ctx, 13, 19, 3, 1, P.pathLight);

    // Small thatched cap.
    ctx.fillStyle = css(P.roofDark);
    ctx.beginPath();
    ctx.moveTo(2, 10);
    ctx.lineTo(14, 1);
    ctx.lineTo(26, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(P.roofLight);
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(6 + i, 9);
      ctx.lineTo(14, 3 + i);
      ctx.lineTo(22 - i, 9);
      ctx.stroke();
    }
    px(ctx, 13, 0, 3, 1, P.gold);
  });
}

function drawTree(scene: Phaser.Scene, key: string, scale: number): void {
  const width = Math.round(30 * scale);
  const height = Math.round(42 * scale);
  drawTexture(scene, key, width, height, (ctx) => {
    const cx = Math.round(width / 2);
    const baseY = height - 1;
    pixelEllipse(ctx, cx, baseY - 1, Math.round(12 * scale), Math.round(3 * scale), P.ink, 0.24);

    // Trunk and roots.
    const trunkW = Math.max(3, Math.round(4 * scale));
    px(ctx, cx - Math.floor(trunkW / 2), Math.round(26 * scale), trunkW, Math.round(15 * scale), P.trunk);
    px(ctx, cx - Math.floor(trunkW / 2), Math.round(26 * scale), 1, Math.round(15 * scale), P.trunkLight);
    px(ctx, cx - Math.round(7 * scale), baseY, Math.round(6 * scale), 1, P.trunk);
    px(ctx, cx + 1, baseY, Math.round(7 * scale), 1, P.trunk);
    px(ctx, cx - Math.round(4 * scale), Math.round(22 * scale), Math.round(8 * scale), 2, P.trunk);

    // Layered canopy: dark base, mid mass, sunlit crown.
    pixelEllipse(ctx, cx, Math.round(16 * scale), Math.round(14 * scale), Math.round(12 * scale), P.treeDark);
    pixelEllipse(ctx, cx - Math.round(1 * scale), Math.round(14 * scale), Math.round(11 * scale), Math.round(10 * scale), P.tree);
    pixelEllipse(ctx, cx - Math.round(3 * scale), Math.round(11 * scale), Math.round(7 * scale), Math.round(6 * scale), P.treeMid);
    pixelEllipse(ctx, cx + Math.round(5 * scale), Math.round(16 * scale), Math.round(5 * scale), Math.round(4 * scale), P.treeMid);
    pixelEllipse(ctx, cx - Math.round(5 * scale), Math.round(9 * scale), Math.round(4 * scale), Math.round(3 * scale), P.treeLight);
    pixelEllipse(ctx, cx + Math.round(2 * scale), Math.round(8 * scale), Math.round(3 * scale), Math.round(2 * scale), P.treeVivid);
    pixelEllipse(ctx, cx - Math.round(8 * scale), Math.round(18 * scale), Math.round(3 * scale), Math.round(2 * scale), P.treeDark);

    // Leaf glints.
    px(ctx, cx - Math.round(6 * scale), Math.round(7 * scale), 1, 1, P.grassLight);
    px(ctx, cx + Math.round(6 * scale), Math.round(13 * scale), 1, 1, P.treeVivid);
    px(ctx, cx - Math.round(2 * scale), Math.round(19 * scale), 1, 1, P.treeDark);
    px(ctx, cx - Math.round(11 * scale), Math.round(13 * scale), 1, 1, P.treeLight);
    px(ctx, cx + Math.round(9 * scale), Math.round(9 * scale), 1, 1, P.grassLight);

    // Leaf litter.
    px(ctx, cx - Math.round(9 * scale), baseY - 1, 1, 1, P.treeDark);
    px(ctx, cx + Math.round(10 * scale), baseY, 1, 1, P.tree);
  });
}

function drawRock(scene: Phaser.Scene): void {
  drawTexture(scene, PROP.rock, 18, 14, (ctx) => {
    pixelEllipse(ctx, 9, 12, 8, 2, P.ink, 0.2);
    px(ctx, 2, 6, 14, 7, P.rockDark);
    px(ctx, 4, 3, 10, 7, P.rock);
    px(ctx, 5, 2, 5, 2, P.rockLight);
    px(ctx, 11, 4, 2, 4, P.rockDark);
    px(ctx, 6, 8, 3, 1, P.rockLight);
    px(ctx, 3, 10, 4, 1, P.rockDark);
  });
}

function drawLamp(scene: Phaser.Scene): void {
  drawTexture(scene, PROP.lamp, 10, 24, (ctx) => {
    px(ctx, 4, 8, 2, 15, P.trunk);
    px(ctx, 4, 8, 1, 15, P.trunkLight);
    px(ctx, 2, 6, 6, 3, P.inkSoft);
    px(ctx, 2, 6, 6, 1, P.gold);
    px(ctx, 4, 8, 2, 2, P.inkSoft);
    px(ctx, 4, 3, 2, 3, 0xffd27a);
    px(ctx, 4, 2, 1, 1, 0xfff0b8);
    pixelEllipse(ctx, 5, 23, 4, 1, P.ink, 0.2);
  });
}

function drawEffects(scene: Phaser.Scene): void {
  drawTexture(scene, FX.white, 4, 4, (ctx) => {
    px(ctx, 0, 0, 4, 4, P.white);
  });

  drawTexture(scene, FX.dust, 3, 3, (ctx) => {
    alphaRect(ctx, 0, 0, 3, 3, P.cream, 0.8);
    alphaRect(ctx, 1, 1, 1, 1, P.white, 1);
  });

  drawTexture(scene, FX.leaf, 5, 4, (ctx) => {
    px(ctx, 1, 1, 3, 1, P.grassLight);
    px(ctx, 2, 2, 2, 1, P.saffron);
    px(ctx, 0, 2, 1, 1, P.grass);
  });

  drawTexture(scene, FX.waterShimmer, 32, 8, (ctx) => {
    alphaRect(ctx, 2, 2, 6, 1, P.waterLight, 0.65);
    alphaRect(ctx, 12, 5, 8, 1, P.waterLight, 0.5);
    alphaRect(ctx, 22, 1, 4, 1, P.white, 0.45);
    alphaRect(ctx, 26, 6, 3, 1, P.waterLight, 0.55);
  });

  drawTexture(scene, FX.spark, 5, 5, (ctx) => {
    px(ctx, 2, 0, 1, 5, P.gold);
    px(ctx, 0, 2, 5, 1, P.gold);
    px(ctx, 2, 2, 1, 1, P.white);
  });

  drawTexture(scene, FX.shadow, 20, 8, (ctx) => {
    for (let y = 0; y < 8; y += 1) {
      const width = Math.round(20 * Math.sqrt(1 - ((y - 4) * (y - 4)) / 16));
      alphaRect(ctx, 10 - width / 2, y, width, 1, P.ink, 0.22);
    }
  });

  drawTexture(scene, FX.glow, 64, 64, (ctx) => {
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, rgba(0xffe0a0, 0.85));
    gradient.addColorStop(0.35, rgba(0xffb066, 0.38));
    gradient.addColorStop(1, rgba(0xffb066, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  });

  drawTexture(scene, FX.magic, 64, 64, (ctx) => {
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, rgba(0xf2e4ff, 0.95));
    gradient.addColorStop(0.28, rgba(P.magic, 0.65));
    gradient.addColorStop(1, rgba(P.magic, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  });

  drawTexture(scene, FX.ring, 64, 64, (ctx) => {
    for (let i = 0; i < 3; i += 1) {
      ctx.strokeStyle = rgba(P.magicLight, 0.55 - i * 0.14);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(32, 32, 20 + i * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(P.white, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(32, 32, 18, 0, Math.PI * 2);
    ctx.stroke();
  });

  drawTexture(scene, FX.warning, 64, 64, (ctx) => {
    ctx.strokeStyle = rgba(P.dangerLight, 0.9);
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(32, 32, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(P.danger, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(32, 32, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  drawTexture(scene, FX.slash, 32, 32, (ctx) => {
    ctx.strokeStyle = rgba(P.gold, 0.9);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(6, 6, 22, 0.18, 1.38);
    ctx.stroke();
    ctx.strokeStyle = rgba(P.white, 0.95);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(6, 6, 22, 0.25, 1.3);
    ctx.stroke();
  });

  drawTexture(scene, FX.vignette, 480, 270, (ctx) => {
    const gradient = ctx.createRadialGradient(240, 135, 80, 240, 135, 285);
    gradient.addColorStop(0, 'rgba(20, 10, 20, 0)');
    gradient.addColorStop(0.72, 'rgba(20, 10, 20, 0.08)');
    gradient.addColorStop(1, 'rgba(20, 10, 20, 0.52)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 480, 270);
  });
}

function drawSky(scene: Phaser.Scene): void {
  drawTexture(scene, BG.sky, 1024, 240, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, '#2b2440');
    sky.addColorStop(0.32, '#584058');
    sky.addColorStop(0.58, '#a86055');
    sky.addColorStop(0.78, '#e2955c');
    sky.addColorStop(1, '#f3c07a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 240);

    // Hazy golden sun.
    const sunGlow = ctx.createRadialGradient(760, 104, 4, 760, 104, 60);
    sunGlow.addColorStop(0, 'rgba(255, 235, 190, 0.95)');
    sunGlow.addColorStop(0.28, 'rgba(255, 200, 130, 0.55)');
    sunGlow.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(690, 34, 140, 140);
    ctx.fillStyle = 'rgba(255, 240, 205, 0.9)';
    ctx.beginPath();
    ctx.arc(760, 104, 12, 0, Math.PI * 2);
    ctx.fill();

    // Distant ridge.
    ctx.fillStyle = 'rgba(58, 51, 85, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 178);
    ctx.lineTo(90, 124);
    ctx.lineTo(152, 152);
    ctx.lineTo(240, 96);
    ctx.lineTo(338, 156);
    ctx.lineTo(430, 118);
    ctx.lineTo(530, 164);
    ctx.lineTo(640, 110);
    ctx.lineTo(760, 158);
    ctx.lineTo(860, 128);
    ctx.lineTo(1024, 176);
    ctx.lineTo(1024, 240);
    ctx.lineTo(0, 240);
    ctx.closePath();
    ctx.fill();

    // Mid ridge with warm rim light.
    ctx.fillStyle = '#4a3a52';
    ctx.beginPath();
    ctx.moveTo(0, 202);
    ctx.lineTo(112, 158);
    ctx.lineTo(206, 190);
    ctx.lineTo(310, 142);
    ctx.lineTo(420, 196);
    ctx.lineTo(548, 154);
    ctx.lineTo(660, 198);
    ctx.lineTo(792, 150);
    ctx.lineTo(910, 194);
    ctx.lineTo(1024, 166);
    ctx.lineTo(1024, 240);
    ctx.lineTo(0, 240);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(224, 148, 96, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(112, 158);
    ctx.lineTo(206, 190);
    ctx.lineTo(310, 142);
    ctx.moveTo(548, 154);
    ctx.lineTo(660, 198);
    ctx.lineTo(792, 150);
    ctx.stroke();

    // Near ridge.
    ctx.fillStyle = '#3f3038';
    ctx.beginPath();
    ctx.moveTo(0, 226);
    ctx.lineTo(130, 194);
    ctx.lineTo(238, 218);
    ctx.lineTo(360, 186);
    ctx.lineTo(486, 222);
    ctx.lineTo(614, 190);
    ctx.lineTo(744, 224);
    ctx.lineTo(868, 196);
    ctx.lineTo(1024, 220);
    ctx.lineTo(1024, 240);
    ctx.lineTo(0, 240);
    ctx.closePath();
    ctx.fill();

    // Treeline fuzz along the horizon.
    ctx.fillStyle = '#332b30';
    for (let x = 0; x < 1024; x += 7) {
      const h = 3 + ((x * 13) % 9);
      ctx.fillRect(x, 236 - h, 5, h);
    }
  });
}

/** Generates every placeholder texture the Act 1 village needs. */
export function generateVillageTextures(scene: Phaser.Scene): void {
  drawTileset(scene);
  drawSky(scene);
  drawEffects(scene);

  for (const facing of FACINGS) {
    for (let frame = 0; frame < 4; frame += 1) {
      drawTexture(
        scene,
        characterTextureKey('player', facing, frame),
        16,
        24,
        (ctx) => drawAdult(ctx, facing, frame, PLAYER_PALETTE),
      );
      drawTexture(
        scene,
        characterTextureKey('son', facing, frame),
        12,
        18,
        (ctx) => drawChild(ctx, facing, frame, SON_PALETTE),
      );
      for (const kind of ['villager1', 'villager2', 'villager3'] as const) {
        drawTexture(
          scene,
          characterTextureKey(kind, facing, frame),
          16,
          24,
          (ctx) => drawAdult(ctx, facing, frame, VILLAGER_PALETTES[kind]),
        );
      }
      drawTexture(
        scene,
        characterTextureKey('masked', facing, frame),
        18,
        26,
        (ctx) => drawMasked(ctx, facing, frame),
      );
    }
  }

  drawHut(scene, PROP.hut0, P.roof, P.roofLight, P.roofDark, P.mud, P.mudDark, 0);
  drawHut(scene, PROP.hut1, 0x8a4c3a, 0xb3684a, 0x5f3227, 0xbb8557, 0x8f6138, 1);
  drawHut(scene, PROP.hut2, 0xb0834a, 0xd2a867, 0x85602f, P.mudLight, P.mudDark, 2);
  drawWell(scene);
  drawTree(scene, PROP.tree, 1);
  drawTree(scene, PROP.treeLarge, 1.55);
  drawRock(scene);
  drawLamp(scene);
}

/** Registers looping walk/idle animations for every generated character. */
export function createCharacterAnimations(scene: Phaser.Scene): void {
  for (const kind of CHARACTER_KINDS) {
    for (const facing of FACINGS) {
      const walkKey = walkAnimationKey(kind, facing);
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: [0, 1, 2, 3].map((frame) => ({
            key: characterTextureKey(kind, facing, frame),
          })),
          frameRate: kind === 'masked' ? 5 : 9,
          repeat: -1,
        });
      }

      const idleKey = idleAnimationKey(kind, facing);
      if (!scene.anims.exists(idleKey)) {
        scene.anims.create({
          key: idleKey,
          frames: [0, 2].map((frame) => ({
            key: characterTextureKey(kind, facing, frame),
          })),
          frameRate: 2,
          repeat: -1,
        });
      }
    }
  }
}
