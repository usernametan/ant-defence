interface WordLevel {
  minWave: number;
  pools: Record<number, string[]>;
}

const WORD_LEVELS: WordLevel[] = [
  {
    minWave: 1,
    pools: {
      3: ['ANT', 'BUG', 'RUN', 'LEG', 'EGG', 'DIG', 'MUD', 'WEB', 'FIT', 'JAW'],
      4: [
        'BITE', 'FANG', 'JUMP', 'SNAP', 'GRIP', 'HIVE', 'DUST', 'RUSH',
        'PATH', 'RAGE', 'WING', 'CLAW', 'EDGE', 'IRON', 'SOIL', 'TRAP',
      ],
      5: [
        'SWARM', 'STING', 'CREEP', 'CRAWL', 'CHASE', 'DRONE', 'SCOUT',
        'BURST', 'CLIMB', 'HURRY', 'SHELL', 'TRAIL',
      ],
      6: ['ATTACK', 'DEFEND', 'HUNTER', 'STRIKE', 'AMBUSH'],
      7: ['SHELTER'],
    },
  },
  {
    minWave: 4,
    pools: {
      3: ['JAB', 'NIP', 'SAP', 'HEX', 'PIT', 'TAR'],
      4: [
        'PEST', 'DRIP', 'MOSS', 'SILK', 'DART', 'FOAM', 'LURE', 'PLUG',
        'REEF',
      ],
      5: [
        'PINCH', 'QUEEN', 'MOUND', 'BROOD', 'STOMP', 'VENOM', 'SIEGE',
        'WRATH',
      ],
      6: [
        'POISON', 'COLONY', 'BURROW', 'TUNNEL', 'LEGION', 'DAGGER',
        'HORNET', 'MANTIS', 'RAVAGE',
      ],
      7: [
        'SOLDIER', 'FORAGER', 'WARRIOR', 'CHARGER', 'SWARMED', 'DEFIANT',
        'CRAWLER', 'HUNTERS', 'NESTING', 'STALKER', 'STINGER',
      ],
      8: [
        'DEFENDER', 'SENTINEL', 'INVASION', 'PREDATOR', 'VANGUARD',
        'SCOUTING', 'COLONIES', 'SWARMING', 'AMBUSHED',
      ],
      9: ['BATTALION'],
    },
  },
  {
    minWave: 7,
    pools: {
      5: ['GNASH', 'SPINE', 'STALK', 'TALON'],
      6: ['INFEST', 'BITING'],
      7: [
        'CRIMSON', 'PIERCER', 'SCUTTLE', 'CAVERNS', 'TUNNELS', 'VENOMED',
        'BRUTISH', 'DIGGERS', 'MANDATE', 'SCOURGE',
      ],
      8: [
        'MANDIBLE', 'CARAPACE', 'STINGERS', 'RAVAGERS', 'SHELTERS',
        'STALKERS', 'SKIRMISH', 'FORAGERS',
      ],
      9: ['SENTINELS', 'DEVASTATE'],
    },
  },
  {
    minWave: 10,
    pools: {
      6: ['CHITIN', 'CARVEN', 'FERVID', 'GNAWED', 'NESTED'],
      7: ['FLAYING', 'SAPPERS', 'SCOURER', 'WARLOCK'],
      8: ['OUTFLANK'],
      9: ['OVERWHELM', 'INFESTING', 'TUNNELLED'],
    },
  },
  {
    minWave: 13,
    pools: {
      7: ['GNASHER', 'SKITTER'],
      9: ['BARRICADE', 'PHEROMONE'],
      10: [
        'PHEROMONES', 'FORTRESSES', 'RELENTLESS', 'INCURSIONS',
        'STRONGHOLD', 'SKITTERING', 'DEVASTATOR', 'SKIRMISHER',
      ],
      12: ['EXTERMINATOR', 'OVERWHELMING', 'RELENTLESSLY'],
    },
  },
];

const ALL_WORDS = WORD_LEVELS.flatMap((level) =>
  Object.values(level.pools).flat(),
);

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

function unlockedLevels(wave: number): WordLevel[] {
  return WORD_LEVELS.filter((level) => wave >= level.minWave);
}

export function pickWord(
  wave: number,
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
    if (length >= 3 && length <= 12) lengths.push(length);
  }

  const unlocked = unlockedLevels(wave);
  for (let index = unlocked.length - 1; index >= 0; index -= 1) {
    const preferred = lengths.flatMap(
      (length) => unlocked[index].pools[length] ?? [],
    );
    const available = preferred.filter(
      (word) => !conflicts(word, targetWords),
    );
    if (available.length > 0) return randomOf(available, rng);
  }

  const relaxed = unlocked
    .flatMap((level) => Object.values(level.pools).flat())
    .filter((word) => !conflicts(word, targetWords));
  if (relaxed.length > 0) return randomOf(relaxed, rng);

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
