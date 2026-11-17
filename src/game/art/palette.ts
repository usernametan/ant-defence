/**
 * Warm, limited palette for the Act 1 village at golden hour.
 * Base character colours are mirrored from the asset manifest so the
 * generated placeholder art stays aligned with the shared asset contract.
 */
export const PALETTE = {
  ink: 0x241612,
  inkSoft: 0x3a2620,

  skin: 0xb06a3b,
  skinLight: 0xc98552,
  skinShade: 0x8a4d2b,
  hair: 0x2a1712,

  saffron: 0xe09a45,
  saffronLight: 0xf3bd6b,
  gold: 0xf0c06a,
  cream: 0xe9dcc0,
  creamShade: 0xcbbd9d,

  grass: 0x6f8a43,
  grassLight: 0x86a052,
  grassMid: 0x62853f,
  grassDark: 0x546a34,
  grassShadow: 0x43522a,
  path: 0xa9794a,
  pathLight: 0xbd8d58,
  pathDark: 0x845c37,
  plaza: 0x8b8174,
  plazaLight: 0xa29786,
  plazaDark: 0x6b6257,

  water: 0x3f7f8a,
  waterDeep: 0x2f6674,
  waterLight: 0x7cc4c0,
  shore: 0xc2a06a,
  shoreLight: 0xd8b97f,

  roof: 0x9a6435,
  roofLight: 0xc08a4a,
  roofDark: 0x6f4624,
  mud: 0xc0925f,
  mudLight: 0xd3a774,
  mudDark: 0x946a42,
  door: 0x3c2618,

  treeDark: 0x35502f,
  tree: 0x4d7038,
  treeMid: 0x628b43,
  treeLight: 0x83a552,
  treeVivid: 0x9bbd5f,
  trunk: 0x5a3b25,
  trunkLight: 0x7a5232,

  rock: 0x7a7167,
  rockLight: 0x9a9083,
  rockDark: 0x544c46,

  magic: 0x9b6bd6,
  magicLight: 0xe0c2ff,
  danger: 0xd2543c,
  dangerLight: 0xf08a68,

  night: 0x1d1730,
  dusk: 0x3a2b4e,
  warmLight: 0xffb066,
  white: 0xf7f1e3,
} as const;

export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function rgba(color: number, alpha: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
