import type { MapTheme, Rarity, Team } from '../shared/types';

/** Mirrors src/ui/design/tokens.css plus arena surface tones. */
export const PALETTE = {
  bg0: '#070B14',
  bg1: '#0D1424',
  bg2: '#141D33',
  line: '#24304D',
  textHi: '#EAF2FF',
  textMid: '#9FB0CF',
  textLow: '#5C6C8C',
  player: '#22D3EE',
  playerGlow: '#67E8F9',
  playerArmor: '#1D8FE1',
  enemy: '#FF5A3C',
  enemyGlow: '#FF8A6B',
  enemyArmor: '#E04328',
  neutral: '#7C8BA8',
  gold: '#FACC15',
  common: '#B8C4DA',
  rare: '#4F8CFF',
  epic: '#C26BFF',
  success: '#34D399',
  danger: '#F43F5E',
  // Arena tactical stone & cover palette
  floorBase: '#20283B',
  floorAlt: '#242D42',
  floorSeam: '#151B2B',
  wallTop: '#515D78',
  wallTopAlt: '#47526B',
  wallSide: '#2A3347',
  wallEdge: '#7D8BA8',
  waterDeep: '#0B3C63',
  waterMid: '#136099',
  waterShimmer: '#38BDF8',
  crateBody: '#9A6D2E',
  crateTrim: '#D4A14B',
  sandbagBody: '#5E6B84',
  foliageDark: '#1E4D3B',
  foliageBright: '#2F7A57',
} as const;

export interface ThemePalette {
  id: MapTheme;
  name: string;
  subtitle: string;
  bgVoid: string;
  floorBase: string;
  floorAlt: string;
  floorSeam: string;
  wallTop: string;
  wallTopAlt: string;
  wallSide: string;
  wallEdge: string;
  waterDeep: string;
  waterMid: string;
  waterShimmer: string;
  waterRim: string;
  crateBody: string;
  crateTrim: string;
  barricadeBody: string;
  barricadeHighlight: string;
  foliageDark: string;
  foliageBright: string;
  accent: string;
}

export const MAP_THEME_PALETTES: Record<MapTheme, ThemePalette> = {
  fortress: {
    id: 'fortress',
    name: 'Sci-Fi Arena',
    subtitle: 'Dark slate-blue grid tiles, steel walls with hazard stripes & yellow crates',
    bgVoid: '#070B14',
    floorBase: '#1E273A',
    floorAlt: '#232E44',
    floorSeam: '#121826',
    wallTop: '#586680',
    wallTopAlt: '#4D5A73',
    wallSide: '#333D52',
    wallEdge: '#8494B2',
    waterDeep: '#0B3C63',
    waterMid: '#136099',
    waterShimmer: '#38BDF8',
    waterRim: '#2A3347',
    crateBody: '#EAB308',
    crateTrim: '#FDE047',
    barricadeBody: '#CA8A04',
    barricadeHighlight: '#FEF08A',
    foliageDark: '#1E4D3B',
    foliageBright: '#2F7A57',
    accent: '#22D3EE',
  },
  jungle: {
    id: 'jungle',
    name: 'Jungle Outpost',
    subtitle: 'Dark olive-green tiles with 2D grass tufts, mossy stone walls & brown crates',
    bgVoid: '#0B120D',
    floorBase: '#212A21',
    floorAlt: '#273226',
    floorSeam: '#141B15',
    wallTop: '#515E4D',
    wallTopAlt: '#445041',
    wallSide: '#2B362A',
    wallEdge: '#7F9179',
    waterDeep: '#0E4352',
    waterMid: '#176A7E',
    waterShimmer: '#67E8F9',
    waterRim: '#323E2B',
    crateBody: '#8C5C2A',
    crateTrim: '#C99346',
    barricadeBody: '#6E461F',
    barricadeHighlight: '#B07B40',
    foliageDark: '#1C472B',
    foliageBright: '#368247',
    accent: '#34D399',
  },
  temple: {
    id: 'temple',
    name: 'Ancient Temple',
    subtitle: 'Warm sandy-tan stone tiles with carved glyphs, sandstone walls & dark-brown crates',
    bgVoid: '#14100A',
    floorBase: '#7D6A4F',
    floorAlt: '#877357',
    floorSeam: '#584834',
    wallTop: '#BCA178',
    wallTopAlt: '#AD9269',
    wallSide: '#765F40',
    wallEdge: '#DFC79D',
    waterDeep: '#0F4D5E',
    waterMid: '#1A7B8D',
    waterShimmer: '#7DD3FC',
    waterRim: '#9C825A',
    crateBody: '#5C3A1E',
    crateTrim: '#946236',
    barricadeBody: '#4A2E17',
    barricadeHighlight: '#B88454',
    foliageDark: '#596336',
    foliageBright: '#7C8A4B',
    accent: '#FACC15',
  },
  slumside: {
    id: 'slumside',
    name: 'Slumside',
    subtitle: 'Corrugated tin roofs, blue tarps, crate alleys & railway flank',
    bgVoid: '#15120F',
    floorBase: '#746B5F',
    floorAlt: '#6B6256',
    floorSeam: '#4D463D',
    wallTop: '#8C857A',
    wallTopAlt: '#777168',
    wallSide: '#4B463F',
    wallEdge: '#B3AA9C',
    waterDeep: '#26383B',
    waterMid: '#375257',
    waterShimmer: '#7FA3A8',
    waterRim: '#524B42',
    crateBody: '#6E4726',
    crateTrim: '#B87B3B',
    barricadeBody: '#57371D',
    barricadeHighlight: '#D49A52',
    foliageDark: '#264F2C',
    foliageBright: '#4A823F',
    accent: '#F59E0B',
  },
};

export function getThemePalette(theme?: MapTheme): ThemePalette {
  return MAP_THEME_PALETTES[theme ?? 'fortress'];
}

export function teamColor(team: Team | 'neutral'): string {
  if (team === 'player') return PALETTE.player;
  if (team === 'enemy') return PALETTE.enemy;
  return PALETTE.neutral;
}

export function teamGlowColor(team: Team | 'neutral'): string {
  if (team === 'player') return PALETTE.playerGlow;
  if (team === 'enemy') return PALETTE.enemyGlow;
  return PALETTE.neutral;
}

export function rarityColor(rarity: Rarity): string {
  if (rarity === 'epic') return PALETTE.epic;
  if (rarity === 'rare') return PALETTE.rare;
  return PALETTE.common;
}
