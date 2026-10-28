const WORD_POOLS: Record<number, string[]> = {
  3: [
    'ANT', 'BUG', 'JAB', 'RUN', 'LEG', 'EGG', 'NIP', 'DIG', 'MUD', 'WEB',
    'SAP', 'FIT', 'JAW', 'HEX', 'PIT', 'TAR',
  ],
  4: [
    'BITE', 'FANG', 'JUMP', 'SNAP', 'GRIP', 'HIVE', 'DUST', 'RUSH', 'PEST',
    'DRIP', 'MOSS', 'PATH', 'RAGE', 'SILK', 'WING', 'CLAW', 'DART', 'EDGE',
    'FOAM', 'IRON', 'LURE', 'PLUG', 'REEF', 'SOIL', 'TRAP',
  ],
  5: [
    'SWARM', 'STING', 'CREEP', 'CRAWL', 'CHASE', 'PINCH', 'QUEEN', 'TRAIL',
    'MOUND', 'BROOD', 'DRONE', 'SCOUT', 'STOMP', 'BURST', 'VENOM', 'CLIMB',
    'GNASH', 'HURRY', 'SIEGE', 'SHELL', 'SPINE', 'STALK', 'TALON', 'WRATH',
  ],
  6: [
    'POISON', 'COLONY', 'ATTACK', 'BURROW', 'LEGION', 'SCOURGE', 'INFEST',
    'TUNNEL', 'BITING', 'CHITIN', 'DEFEND', 'HUNTER', 'DAGGER', 'STRIKE',
    'AMBUSH', 'CARVEN', 'FERVID', 'GNAWED', 'HORNET', 'MANTIS', 'NESTED',
    'RAVAGE', 'SHELTER', 'STINGER', 'WARLOCK',
  ],
  7: [
    'SOLDIER', 'FORAGER', 'CRIMSON', 'SWARMED', 'DEFIANT', 'PIERCER',
    'SCUTTLE', 'CAVERNS', 'TUNNELS', 'WARRIOR', 'VENOMED', 'BRUTISH',
    'CHARGER', 'CRAWLER', 'DIGGERS', 'FLAYING', 'GNASHER', 'HUNTERS',
    'MANDATE', 'NESTING', 'SAPPERS', 'SCOURER', 'SKITTER', 'STALKER',
  ],
  8: [
    'MANDIBLE', 'CARAPACE', 'SCOUTING', 'DEFENDER', 'SWARMING', 'INVASION',
    'SENTINEL', 'COLONIES', 'STINGERS', 'AMBUSHED', 'OUTFLANK', 'PREDATOR',
    'RAVAGERS', 'SHELTERS', 'SKIRMISH', 'STALKERS', 'TUNNELLED', 'VANGUARD',
  ],
  9: [
    'BATTALION', 'OVERWHELM', 'BARRICADE', 'PHEROMONE', 'INFESTING',
    'RELENTLESS', 'FORAGERS', 'SENTINELS', 'SKIRMISHER', 'DEVASTATE',
  ],
  10: [
    'PHEROMONES', 'FORTRESSES', 'EXTERMINATOR', 'OVERWHELMING', 'RELENTLESSLY',
  ],
};

const ALL_WORDS = Object.values(WORD_POOLS).flat();

export interface WordSelection {
  word: string;
  active: string[];
}

function conflicts(candidate: string, active: string[]): boolean {
  return active.some(
    (word) =>
      word === candidate ||
      word.startsWith(candidate) ||
      candidate.startsWith(word),
  );
}

function randomOf<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

export function pickWord(
  minLength: number,
  maxLength: number,
  activeWords: string[],
  typedPrefix: string,
  rng: () => number,
): string {
  const targetWords = activeWords.concat(
    typedPrefix ? [typedPrefix] : [],
  );
  const lengths: number[] = [];
  for (let length = minLength; length <= maxLength; length += 1) {
    if (WORD_POOLS[length]) lengths.push(length);
  }

  const preferred = lengths.flatMap((length) => WORD_POOLS[length] ?? []);
  const available = preferred.filter((word) => !conflicts(word, targetWords));
  if (available.length > 0) return randomOf(available, rng);

  const fallback = ALL_WORDS.filter((word) => !conflicts(word, targetWords));
  if (fallback.length > 0) return randomOf(fallback, rng);

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const prefix of ['ANT', 'SWARM', 'HIVE']) {
    for (const first of letters) {
      for (const second of letters) {
        const candidate = `${prefix}${first}${second}`;
        if (!conflicts(candidate, targetWords)) return candidate;
      }
    }
  }
  return 'ANT';
}

export const WAVE_NAMES = [
  'THE COLONY STIRS',
  'SCOUTS ON THE WIND',
  'THE SWARM GATHERS',
  'SHELLS IN THE GRASS',
  'THE QUEEN AWAKENS',
  'A DARKER TIDE',
  'NO GROUND GIVEN',
  'THE LINE TREMBLES',
  'LEGION UNBOUND',
  'THE FINAL HOUR',
];

export function waveTitle(wave: number): string {
  if (wave % 5 === 0) return 'ROYAL ASSAULT';
  return WAVE_NAMES[(wave - 1) % WAVE_NAMES.length];
}
