export type MissionObjectiveType =
  | "kill"
  | "collect"
  | "reach"
  | "interact"
  | "clear-area";

export interface MissionObjectiveDef {
  id: string;
  type: MissionObjectiveType;
  title: string;
  description?: string;
  targetId?: string;
  count?: number;
  radius?: number;
  optional?: boolean;
  requires?: readonly string[];
}

export interface MissionRewardDef {
  armor?: number;
  energy?: number;
  summary: string;
}

export interface MissionFailureDef {
  description: string;
}

export interface MissionCompletionDef {
  objectiveIds: readonly string[];
}

export interface MissionDef {
  id: string;
  regionId: string;
  title: string;
  description: string;
  briefing: string;
  prerequisites?: readonly string[];
  objectives: readonly MissionObjectiveDef[];
  completion: MissionCompletionDef;
  rewards?: MissionRewardDef;
  failure?: MissionFailureDef;
}

export const RECLAIM_GREENREACH_ID = "reclaim-the-greenreach";

export const GREENREACH_MISSIONS: readonly MissionDef[] = [
  {
    id: RECLAIM_GREENREACH_ID,
    regionId: "greenreach-wilds",
    title: "Reclaim the Greenreach",
    description:
      "Break the creature pressure around the old road and bring the watchpost relay back online.",
    briefing:
      "Waystation Echo still holds, but the Moss-Eaten Watchpost has gone dark and creatures are spilling across the western road. Push east, thin the pack, recover what supplies you can, and restore the watchpost relay so the waystation can see the frontier again.",
    objectives: [
      {
        id: "break-the-pack",
        type: "kill",
        title: "Break the creature hold",
        description: "Eliminate creatures across the Greenreach roads.",
        targetId: "*",
        count: 8,
      },
      {
        id: "reach-watchpost",
        type: "reach",
        title: "Reach the Moss-Eaten Watchpost",
        description: "Follow the old road east into the watchpost ruins.",
        targetId: "poi-watchpost",
      },
      {
        id: "recover-supplies",
        type: "collect",
        title: "Recover field supplies",
        description: "Collect three recovery caches or equipment modules.",
        targetId: "*",
        count: 3,
        optional: true,
      },
      {
        id: "clear-watchpost",
        type: "clear-area",
        title: "Clear the watchpost grounds",
        description: "Defeat two creatures inside the watchpost perimeter.",
        targetId: "poi-watchpost",
        count: 2,
        optional: true,
      },
      {
        id: "restore-relay",
        type: "interact",
        title: "Restore the watchpost relay",
        description: "Get close to the field relay and activate it with E.",
        targetId: "relay-watchpost",
        requires: ["reach-watchpost"],
      },
    ],
    completion: {
      objectiveIds: ["break-the-pack", "reach-watchpost", "restore-relay"],
    },
    rewards: {
      armor: 20,
      energy: 25,
      summary: "Waystation uplink secured · +20 plating · +25 cell",
    },
  },
];

export const MISSION_BY_ID: ReadonlyMap<string, MissionDef> = new Map(
  GREENREACH_MISSIONS.map((mission) => [mission.id, mission]),
);

export function getMissionDef(id: string): MissionDef | undefined {
  return MISSION_BY_ID.get(id);
}
