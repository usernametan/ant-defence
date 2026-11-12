export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 3 — Combat Prototype",
  version: "0.3.0",
  tagline:
    "The frontier is waking. Weapons are online, and the range is live before the creatures arrive.",
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
  { label: "Weapons", detail: "LMB fire · 3 emitters" },
  { label: "Projectiles", detail: "Pooled · swept hits" },
  { label: "Targets", detail: "Dummies · respawn" },
  { label: "Energy", detail: "Shared cell · regen" },
  { label: "Movement", detail: "WASD · sprint · dodge" },
  { label: "Camera", detail: "Damped follow + bounds" },
] as const;
