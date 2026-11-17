import type { Rarity, Team } from '../shared/types';

/** Mirrors src/ui/design/tokens.css exactly. */
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
  enemy: '#FF5A3C',
  enemyGlow: '#FF8A6B',
  neutral: '#7C8BA8',
  gold: '#FACC15',
  common: '#B8C4DA',
  rare: '#4F8CFF',
  epic: '#C26BFF',
  success: '#34D399',
  danger: '#F43F5E',
  // Derived structural shades within the same ink/slate family
  wallTop: '#566788',
  wallSide: '#2B3752',
  wallEdge: '#889BBF',
  waterBase: '#0B1D33',
  waterShimmer: '#22D3EE',
  crateBody: '#4E5D78',
  sandbagBody: '#68748B',
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
