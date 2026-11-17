import type { Reaction } from '../shared/types';

export const reactions: Reaction[] = [
  {
    id: 'kumkum_reveal',
    inputs: ['turmeric', 'lime'],
    effect: {
      kind: 'neutralize',
      targetTags: ['volatile', 'luminous'],
      radius: 96,
      bonusDamage: 18,
      tint: 0xc81d25,
    },
    discoveryText:
      'When golden turmeric meets alkaline lime, curcumin shifts structure and turns kumkum red—a true pH indicator revealing what was hidden.',
  },
  {
    id: 'camphor_flare',
    inputs: ['camphor', 'alum'],
    effect: {
      kind: 'projectile',
      damage: 28,
      speed: 280,
      radius: 14,
      element: 'flammable',
      tint: 0xffb703,
    },
    discoveryText:
      'Volatile camphor vapor needs only an oxidizer like alum to burst into rapid combustion, driving a focused jet of flame.',
  },
  {
    id: 'gandhaka_bolt',
    inputs: ['sulfur', 'suryakanti'],
    effect: {
      kind: 'projectile',
      damage: 34,
      speed: 250,
      radius: 16,
      element: 'flammable',
      tint: 0xfb8500,
    },
    discoveryText:
      'Sulfur ignites fiercely when paired with oxidizing suryakanti, converting stored solar energy into a searing alchemical bolt.',
  },
  {
    id: 'solar_lance',
    inputs: ['camphor', 'suryakanti'],
    effect: {
      kind: 'projectile',
      damage: 30,
      speed: 320,
      radius: 12,
      element: 'luminous',
      tint: 0xffe066,
    },
    discoveryText:
      'Sublimating camphor carries suryakanti dust aloft, releasing a blinding flash of light and heat in one swift arc.',
  },
  {
    id: 'copper_patina_wash',
    inputs: ['tamarind', 'copper'],
    effect: {
      kind: 'terrain',
      surface: 'acid_pool',
      radius: 64,
      durationMs: 5000,
      damagePerSecond: 12,
      tint: 0x2ec4b6,
    },
    discoveryText:
      'Tartaric acid in tamarind strips dull oxide from copper, leaving bright metal and a reactive blue-green salt pool.',
  },
  {
    id: 'bhasma_neutralizer',
    inputs: ['tamarind', 'ash'],
    effect: {
      kind: 'neutralize',
      targetTags: ['acidic', 'toxic'],
      radius: 88,
      bonusDamage: 20,
      tint: 0xa8dadc,
    },
    discoveryText:
      'Carbonates in sacred ash neutralize tamarind acid on contact, releasing carbon dioxide and calming corrosive residues.',
  },
  {
    id: 'lime_acid_quench',
    inputs: ['tamarind', 'lime'],
    effect: {
      kind: 'neutralize',
      targetTags: ['acidic', 'basic'],
      radius: 84,
      bonusDamage: 22,
      tint: 0xe9c46a,
    },
    discoveryText:
      'Acid and base cancel each other into harmless salt and water, liberating gentle warmth as their opposing charges balance.',
  },
  {
    id: 'parada_smoke_veil',
    inputs: ['mercury', 'sulfur'],
    effect: {
      kind: 'terrain',
      surface: 'smoke_cloud',
      radius: 76,
      durationMs: 6000,
      damagePerSecond: 8,
      tint: 0x9d4edd,
    },
    discoveryText:
      'Parada and gandhaka bind into cinnabar, and the heat of their union raises a dense alchemical mist that clouds the field.',
  },
  {
    id: 'camphor_smoke_screen',
    inputs: ['camphor', 'ash'],
    effect: {
      kind: 'terrain',
      surface: 'smoke_cloud',
      radius: 72,
      durationMs: 5500,
      damagePerSecond: 0,
      tint: 0xbdbdbd,
    },
    discoveryText:
      'Camphor sublimates straight from solid to gas over warm ash, billowing into a fragrant veil without leaving soot behind.',
  },
  {
    id: 'iron_alum_barrier',
    inputs: ['iron', 'alum'],
    effect: {
      kind: 'shield',
      absorb: 40,
      durationMs: 6000,
      reflectTag: 'acidic',
      tint: 0x8ecae6,
    },
    discoveryText:
      'An alum solution passivates iron with a thin oxide film, turning raw metal into a resilient, acid-resistant ward.',
  },
  {
    id: 'copper_salt_ward',
    inputs: ['copper', 'salt'],
    effect: {
      kind: 'shield',
      absorb: 35,
      durationMs: 5500,
      reflectTag: 'conductive',
      tint: 0x48cae4,
    },
    discoveryText:
      'Dissolved salt turns moisture into a conductive bridge across copper, dispersing incoming strikes around your gauntlet.',
  },
  {
    id: 'crystal_salt_wall',
    inputs: ['salt', 'alum'],
    catalyst: 'lime',
    effect: {
      kind: 'terrain',
      surface: 'crystal_wall',
      radius: 48,
      durationMs: 7000,
      damagePerSecond: 0,
      tint: 0xe0fbfc,
    },
    discoveryText:
      'With lime shifting the solution alkaline, dissolved alum and salt precipitate rapidly into an interlocking crystal barrier.',
  },
  {
    id: 'neem_honey_balm',
    inputs: ['neem', 'honey'],
    effect: {
      kind: 'heal',
      amount: 35,
      cleanseTags: ['toxic'],
      tint: 0x52b788,
    },
    discoveryText:
      'Honey draws out moisture and preserves neem’s active compounds, forming a soothing balm that purges lingering toxins.',
  },
  {
    id: 'turmeric_honey_elixir',
    inputs: ['turmeric', 'honey'],
    effect: {
      kind: 'heal',
      amount: 30,
      cleanseTags: ['toxic', 'acidic'],
      tint: 0xf4a261,
    },
    discoveryText:
      'Honey suspends turmeric’s curcuminoids so they absorb cleanly, calming inflammation and restoring spent vitality.',
  },
  {
    id: 'neem_sulfur_snare',
    inputs: ['neem', 'sulfur'],
    effect: {
      kind: 'trap',
      damage: 18,
      radius: 56,
      durationMs: 6500,
      slowFactor: 0.45,
      tint: 0x70e000,
    },
    discoveryText:
      'Bitter neem oil thickens fine sulfur into a clinging, pest-repelling mire that slows any creature stepping through it.',
  },
  {
    id: 'iron_mercury_amalgam',
    inputs: ['iron', 'mercury'],
    catalyst: 'salt',
    effect: {
      kind: 'trap',
      damage: 25,
      radius: 52,
      durationMs: 6000,
      slowFactor: 0.35,
      tint: 0xadb5bd,
    },
    discoveryText:
      'Salt strips surface oxides so liquid mercury wets iron filings, binding them into a heavy, clinging metallic snare.',
  },
];
