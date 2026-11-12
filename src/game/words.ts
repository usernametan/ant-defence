import type { WordPackId } from './settings';

interface WordLevel {
  minWave: number;
  pools: Record<number, string[]>;
}

const STANDARD_LEVELS: WordLevel[] = [
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

const CODE_LEVELS: WordLevel[] = [
  {
    minWave: 1,
    pools: {
      3: ['LET', 'VAR', 'INT', 'FOR', 'NEW', 'TRY', 'GIT', 'API', 'DOM', 'SQL'],
      4: [
        'VOID', 'NULL', 'TRUE', 'BYTE', 'CHAR', 'ENUM', 'HASH', 'LOOP',
        'NODE', 'PIPE', 'PORT', 'PUSH', 'RUST', 'SYNC', 'TYPE', 'UINT',
      ],
      5: [
        'ASYNC', 'AWAIT', 'BREAK', 'CATCH', 'CLASS', 'CONST', 'ARRAY',
        'EVENT', 'FETCH', 'FLOAT', 'FRAME', 'MUTEX', 'PARSE', 'QUEUE',
        'STATE', 'TUPLE', 'YIELD',
      ],
      6: [
        'BUFFER', 'CLIENT', 'DOCKER', 'EXPORT', 'IMPORT', 'KERNEL',
        'LAMBDA', 'MODULE', 'OBJECT', 'RETURN', 'SCHEMA', 'SOCKET',
        'STATIC', 'STREAM', 'STRING', 'SWITCH', 'THREAD', 'VECTOR',
      ],
      7: ['BOOLEAN', 'CLOSURE', 'COMPILE', 'DEFAULT', 'PACKAGE', 'PROMISE'],
    },
  },
  {
    minWave: 5,
    pools: {
      6: ['ATOMIC', 'BINARY', 'CRYPTO', 'DAEMON', 'MEMORY', 'ROUTER'],
      7: [
        'BACKEND', 'BITWISE', 'CHANNEL', 'CLUSTER', 'CONTEXT', 'FIREWALL',
        'GARBAGE', 'GATEWAY', 'GENERIC', 'HANDLER', 'POINTER', 'PROCESS',
        'RUNTIME', 'SYSCALL', 'VIRTUAL', 'WEBHOOK',
      ],
      8: [
        'ABSTRACT', 'CALLBACK', 'COMPILER', 'DATABASE', 'DEADLOCK',
        'DEBOUNCE', 'DISPATCH', 'ENDPOINT', 'FUNCTION', 'ITERATOR',
        'MUTATION', 'OVERFLOW', 'PIPELINE', 'PROTOCOL', 'SNAPSHOT',
        'THROTTLE', 'UNSIGNED', 'VOLATILE',
      ],
      9: [
        'ALGORITHM', 'BANDWIDTH', 'COMPONENT', 'COROUTINE', 'EXCEPTION',
        'INTERFACE', 'NAMESPACE', 'PARTITION', 'PREDICATE', 'RECURSION',
        'SINGLETON', 'TELEMETRY',
      ],
      10: [
        'CONCURRENT', 'DEPENDENCY', 'DESCRIPTOR', 'ENCRYPTION',
        'HYPERVISOR', 'IDEMPOTENT', 'KUBERNETES', 'MIDDLEWARE',
        'POLYMORPHIC', 'REPOSITORY', 'SERIALIZER', 'TYPESCRIPT',
      ],
      12: ['ASYNCHRONOUS', 'ENCAPSULATED', 'MICROSERVICE'],
    },
  },
];

const HARDCORE_LEVELS: WordLevel[] = [
  {
    minWave: 1,
    pools: {
      3: ['IRE', 'VEX', 'WRY', 'EON', 'ASH', 'PYX', 'ORB', 'RUE'],
      4: [
        'BANE', 'CRUX', 'DIRE', 'DOOM', 'FLUX', 'GRIM', 'OMEN', 'PYRE',
        'RIFT', 'RUIN', 'SCAR', 'VOID', 'WARD', 'ZEAL',
      ],
      5: [
        'ABYSS', 'AEGIS', 'ASHEN', 'BLIGHT', 'CHAOS', 'CHASM', 'CRYPT',
        'DREAD', 'EPOCH', 'FUROR', 'GHOUL', 'HAVOC', 'NEXUS', 'RELIC',
        'SCION', 'SMITE', 'TITAN', 'VIGIL',
      ],
      6: [
        'ARCANE', 'ASTRAL', 'BASTION', 'CHITIN', 'CIPHER', 'CINDER',
        'FAMINE', 'HERALD', 'MIASMA', 'MYRIAD', 'ORACLE', 'PARIAH',
        'PHALANX', 'PLAGUE', 'SCHISM', 'SHROUD', 'TEMPEST', 'TREMOR',
        'TYRANT', 'VORTEX', 'WRAITH', 'ZENITH',
      ],
      7: [
        'ARACHNID', 'BULWARK', 'CATACOMB', 'CHIMERA', 'CITADEL',
        'ECLIPSE', 'EMPYREAN', 'HARBINGER', 'INFERNO', 'MONOLITH',
        'NEMESIS', 'OBELISK', 'OBSIDIAN', 'OMINOUS', 'PANTHEON',
        'PHANTOM', 'REVENANT', 'SPECTER', 'TORMENT',
      ],
      8: [
        'ABATTOIR', 'ANATHEMA', 'BASILISK', 'BEHEMOTH', 'CALAMITY',
        'CATACLYSM', 'COLOSSUS', 'COVENANT', 'CRUCIBLE', 'DOMINION',
        'ETHEREAL', 'GARGOYLE', 'LABYRINTH', 'LEVIATHAN', 'MAELSTROM',
        'PARADIGM', 'PAROXYSM', 'SOVEREIGN', 'VALKYRIE',
      ],
      9: [
        'APOCRYPHA', 'CHITINOUS', 'CATACLYSM', 'EFFULGENT', 'EPHEMERAL',
        'HARBINGER', 'INEFFABLE', 'MALEFICENT', 'NIGHTMARE', 'ONSLAUGHT',
        'PRIMORDIAL', 'PURGATORY', 'SACRILEGE', 'SERAPHIM',
      ],
      10: [
        'APOCALYPSE', 'CATACOMBS', 'IMMOLATION', 'JUDGEMENT', 'LABYRINTHS',
        'MELANCHOLY', 'NECROPOLIS', 'OBLITERATE', 'OMNISCIENT', 'SUBTERFUGE',
      ],
      12: ['ANNIHILATION', 'CONFLAGRATION', 'OMNIPRESENCE'],
    },
  },
];

const ACID_WORDS = [
  'X', 'Z', 'Q', 'V', 'K', 'J', 'VX', 'ZX', 'QK', 'KV', 'XZ', 'JQ', 'TX', 'RZ',
];

function getPackLevels(pack: WordPackId): WordLevel[] {
  if (pack === 'code') return CODE_LEVELS;
  if (pack === 'hardcore') return HARDCORE_LEVELS;
  return STANDARD_LEVELS;
}

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

function unlockedLevels(wave: number, pack: WordPackId): WordLevel[] {
  const levels = getPackLevels(pack);
  return levels.filter((level) => wave >= level.minWave);
}

export function createDailyRng(): () => number {
  const now = new Date();
  const dateKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
  let seed = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) {
    seed ^= dateKey.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickAcidWord(
  activeWords: string[],
  typedPrefix: string,
  rng: () => number,
): string {
  const targetWords = activeWords.concat(typedPrefix ? [typedPrefix] : []);
  const available = ACID_WORDS.filter((word) => !conflicts(word, targetWords));
  if (available.length > 0) return randomOf(available, rng);
  const letters = 'XZQVKJWY';
  for (const a of letters) {
    for (const b of letters) {
      const candidate = `${a}${b}`;
      if (!conflicts(candidate, targetWords)) return candidate;
    }
  }
  return 'XZ';
}

export function pickWord(
  wave: number,
  minLength: number,
  maxLength: number,
  activeWords: string[],
  typedPrefix: string,
  rng: () => number,
  pack: WordPackId = 'standard',
): string {
  const targetWords = activeWords.concat(
    typedPrefix ? [typedPrefix] : [],
  );
  const lengths: number[] = [];
  for (let length = minLength; length <= maxLength; length += 1) {
    if (length >= 3 && length <= 12) lengths.push(length);
  }

  const unlocked = unlockedLevels(wave, pack);
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

  const allWords = getPackLevels(pack).flatMap((level) =>
    Object.values(level.pools).flat(),
  );
  const fallback = allWords.filter((word) => !conflicts(word, targetWords));
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
  'NIGHTFALL IN THE PINES',
  'SHADOWS BELOW THE MOSS',
  'THE LINE TREMBLES',
  'VENOM IN THE DARK',
  'THE QUEEN OF NIGHT',
  'ASH ON THE HORIZON',
  'THE EMBER WASTE',
  'CHITIN AND CINDER',
  'NO GROUND GIVEN',
  'THE FINAL HOUR',
];

export function waveTitle(wave: number): string {
  if (wave % 5 === 0) return 'ROYAL ASSAULT';
  return WAVE_NAMES[(wave - 1) % WAVE_NAMES.length];
}
