import type { Rarity, Team } from '../shared/types';

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
