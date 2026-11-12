export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 6 — Survival & Damage Systems",
  version: "0.6.0",
  tagline:
    "Greenreach Wilds is hostile. Track armor and health, recover from field caches, and survive the roads beyond Waystation Echo.",
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
  { label: "Health", detail: "Clamped vitals · hit feedback" },
  { label: "Armor", detail: "Absorbs impacts first" },
  { label: "Recovery", detail: "12 authored caches" },
  { label: "Respawn", detail: "Waystation relink shield" },
  { label: "Feedback", detail: "Damage · recovery · death" },
  { label: "Balance", detail: "Fair creature pressure" },
] as const;
