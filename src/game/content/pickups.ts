import type {
  MapItemDef,
  MapItemKind,
  MapPickupDef,
  PickupKind,
} from "../world/MapDef";

export type PickupSymbol = "cross" | "shield";

export interface PickupTypeDef {
  kind: PickupKind;
  label: string;
  amount: number;
  radius: number;
  respawnSeconds: number;
  color: string;
  coreColor: string;
  symbol: PickupSymbol;
}

export const PICKUP_TYPES: Record<PickupKind, PickupTypeDef> = {
  health: {
    kind: "health",
    label: "Field Dressing",
    amount: 30,
    radius: 14,
    respawnSeconds: 18,
    color: "#ff715c",
    coreColor: "#fff0ec",
    symbol: "cross",
  },
  armor: {
    kind: "armor",
    label: "Plating Cache",
    amount: 30,
    radius: 15,
    respawnSeconds: 24,
    color: "#7fc7ff",
    coreColor: "#e8f5ff",
    symbol: "shield",
  },
};

export const GREENREACH_PICKUPS: readonly MapPickupDef[] = [
  { id: "pickup-health-waystation", kind: "health", x: 620, y: 640 },
  { id: "pickup-health-west-road", kind: "health", x: 820, y: 640 },
  { id: "pickup-health-watchpost", kind: "health", x: 1060, y: 745 },
  { id: "pickup-health-sunken-meadow", kind: "health", x: 1280, y: 330 },
  { id: "pickup-health-ford", kind: "health", x: 1390, y: 940 },
  { id: "pickup-health-east-road", kind: "health", x: 1790, y: 555 },
  { id: "pickup-armor-waystation", kind: "armor", x: 500, y: 780 },
  { id: "pickup-armor-ruins", kind: "armor", x: 1160, y: 760 },
  { id: "pickup-armor-north-trail", kind: "armor", x: 1470, y: 360 },
  { id: "pickup-armor-thornmaw", kind: "armor", x: 1830, y: 520 },
  { id: "pickup-armor-south-road", kind: "armor", x: 1340, y: 1060 },
  { id: "pickup-armor-quiet-glade", kind: "armor", x: 1460, y: 1150 },
];

export type WorldItemSymbol = "weapon" | "module";

export interface WorldItemTypeDef {
  kind: MapItemKind;
  label: string;
  radius: number;
  color: string;
  coreColor: string;
  symbol: WorldItemSymbol;
}

export const ITEM_TYPES: Record<MapItemKind, WorldItemTypeDef> = {
  weapon: {
    kind: "weapon",
    label: "Weapon Module",
    radius: 16,
    color: "#f7bf5b",
    coreColor: "#fff0c4",
    symbol: "weapon",
  },
  equipment: {
    kind: "equipment",
    label: "Equipment Module",
    radius: 16,
    color: "#8fb7ff",
    coreColor: "#eef4ff",
    symbol: "module",
  },
};

export const GREENREACH_ITEMS: readonly MapItemDef[] = [
  {
    id: "item-weapon-west-road",
    kind: "weapon",
    itemId: "rapid-blaster",
    x: 850,
    y: 700,
  },
  {
    id: "item-weapon-ruins",
    kind: "weapon",
    itemId: "heavy-blaster",
    x: 1220,
    y: 805,
  },
  {
    id: "item-equipment-waystation",
    kind: "equipment",
    itemId: "reinforced-plating",
    x: 545,
    y: 595,
  },
  {
    id: "item-equipment-north-trail",
    kind: "equipment",
    itemId: "mobility-module",
    x: 1440,
    y: 320,
  },
  {
    id: "item-equipment-ford",
    kind: "equipment",
    itemId: "energy-regulator",
    x: 1730,
    y: 710,
  },
];

export function getPickupType(kind: PickupKind): PickupTypeDef {
  return PICKUP_TYPES[kind];
}

export function getItemType(kind: MapItemKind): WorldItemTypeDef {
  return ITEM_TYPES[kind];
}
