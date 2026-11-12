export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 2 — Player Prototype",
  version: "0.2.0",
  tagline:
    "The frontier is waking. A new expedition is being assembled beyond the last safe light.",
  firstRegion: "Greenreach Wilds",
  regions: [
    "Greenreach Wilds",
    "Rustline City",
    "Verdant Jungle",
    "Frostfall Reach",
    "The Laboratory",
    "Homeland",
  ],
} as const;

export const PROTOTYPE_CHECKS = [
  { label: "Movement", detail: "WASD · 8-way · sprint" },
  { label: "Collision", detail: "Circle vs arena solids" },
  { label: "Camera", detail: "Damped follow + bounds" },
  { label: "Dodge", detail: "Space · cooldown" },
] as const;
