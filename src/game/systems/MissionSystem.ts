import {
  GREENREACH_MISSIONS,
  type MissionDef,
  type MissionObjectiveDef,
  type MissionObjectiveType,
  type MissionRewardDef,
} from "../content/missions";

export type MissionStatus =
  | "locked"
  | "available"
  | "active"
  | "completed"
  | "failed";

export type MissionObjectiveStatus =
  | "locked"
  | "active"
  | "completed"
  | "failed";

export interface MissionAreaDef {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface MissionInteractableDef {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
}

export interface MissionSystemOptions {
  pointsOfInterest?: readonly MissionAreaDef[];
  interactables?: readonly MissionInteractableDef[];
  nests?: readonly MissionAreaDef[];
  territories?: readonly MissionAreaDef[];
  completedMissionIds?: readonly string[];
  autoActivate?: boolean;
}

export interface MissionObjectiveSnapshot {
  id: string;
  title: string;
  description: string;
  type: MissionObjectiveType;
  optional: boolean;
  status: MissionObjectiveStatus;
  progress: number;
  count: number;
  targetId: string | null;
  requires: readonly string[];
}

export interface MissionSnapshot {
  id: string;
  regionId: string;
  title: string;
  description: string;
  briefing: string;
  status: MissionStatus;
  objectives: readonly MissionObjectiveSnapshot[];
  completionObjectiveIds: readonly string[];
  rewards: MissionRewardDef | null;
  failureReason: string | null;
}

export interface MissionMarkerSnapshot {
  objectiveId: string;
  x: number;
  y: number;
  radius: number;
  label: string;
}

export interface MissionsSnapshot {
  active: MissionSnapshot | null;
  missions: readonly MissionSnapshot[];
  markers: readonly MissionMarkerSnapshot[];
  completedCount: number;
}

export type MissionEvent =
  | {
      type: "mission-activated";
      missionId: string;
      title: string;
    }
  | {
      type: "objective-completed";
      missionId: string;
      missionTitle: string;
      objectiveId: string;
      title: string;
      optional: boolean;
    }
  | {
      type: "mission-completed";
      missionId: string;
      title: string;
      rewards: MissionRewardDef | null;
    }
  | {
      type: "mission-failed";
      missionId: string;
      title: string;
      reason: string;
    };

interface MissionObjectiveRuntime {
  def: MissionObjectiveDef;
  status: MissionObjectiveStatus;
  progress: number;
}

interface MissionRuntime {
  def: MissionDef;
  status: MissionStatus;
  objectives: Map<string, MissionObjectiveRuntime>;
  failureReason: string | null;
}

interface MissionEdge {
  id: string;
  requires: readonly string[];
}

export class MissionSystem {
  private readonly definitions: readonly MissionDef[];
  private readonly pointsOfInterest: ReadonlyMap<string, MissionAreaDef>;
  private readonly interactables: ReadonlyMap<string, MissionInteractableDef>;
  private readonly nests: ReadonlyMap<string, MissionAreaDef>;
  private readonly territories: ReadonlyMap<string, MissionAreaDef>;
  private readonly initialCompletedIds: readonly string[];
  private readonly autoActivate: boolean;
  private readonly states = new Map<string, MissionRuntime>();
  private readonly completed = new Set<string>();
  private events: MissionEvent[] = [];

  constructor(
    definitions: readonly MissionDef[] = GREENREACH_MISSIONS,
    options: MissionSystemOptions = {},
  ) {
    validateMissionDefinitions(definitions);

    this.definitions = definitions;
    this.pointsOfInterest = new Map(
      (options.pointsOfInterest ?? []).map((area) => [area.id, area]),
    );
    this.interactables = new Map(
      (options.interactables ?? []).map((entry) => [entry.id, entry]),
    );
    this.nests = new Map(
      (options.nests ?? []).map((entry) => [entry.id, entry]),
    );
    this.territories = new Map(
      (options.territories ?? []).map((entry) => [entry.id, entry]),
    );
    this.initialCompletedIds = options.completedMissionIds ?? [];
    this.autoActivate = options.autoActivate ?? true;
    this.reset();
  }

  get activeMission(): MissionSnapshot | null {
    return this.snapshot().active;
  }

  reset(): void {
    this.states.clear();
    this.completed.clear();
    this.events = [];

    for (const id of this.initialCompletedIds) {
      if (this.definitions.some((mission) => mission.id === id)) {
        this.completed.add(id);
      }
    }

    for (const definition of this.definitions) {
      this.states.set(definition.id, {
        def: definition,
        status: "locked",
        objectives: new Map(
          definition.objectives.map((objective) => [
            objective.id,
            {
              def: objective,
              status: "locked" as MissionObjectiveStatus,
              progress: 0,
            },
          ]),
        ),
        failureReason: null,
      });
    }

    this.refreshAvailability();

    if (this.autoActivate) {
      const first = this.definitions.find(
        (definition) => this.states.get(definition.id)?.status === "available",
      );

      if (first) {
        this.activate(first.id);
      }
    }
  }

  activate(missionId: string): boolean {
    const runtime = this.states.get(missionId);

    if (!runtime) {
      return false;
    }

    this.refreshAvailability();

    if (runtime.status !== "available") {
      return false;
    }

    runtime.status = "active";
    runtime.failureReason = null;

    for (const objective of runtime.objectives.values()) {
      objective.status =
        (objective.def.requires ?? []).length === 0 ? "active" : "locked";
      objective.progress = 0;
    }

    this.events.push({
      type: "mission-activated",
      missionId,
      title: runtime.def.title,
    });

    return true;
  }

  failMission(missionId: string, reason = "Mission failed"): boolean {
    const runtime = this.states.get(missionId);

    if (!runtime || runtime.status !== "active") {
      return false;
    }

    runtime.status = "failed";
    runtime.failureReason = reason;

    for (const objective of runtime.objectives.values()) {
      if (objective.status === "active") {
        objective.status = "failed";
      }
    }

    this.events.push({
      type: "mission-failed",
      missionId,
      title: runtime.def.title,
      reason,
    });

    return true;
  }

  recordCreatureKill(
    archetypeId: string,
    x: number,
    y: number,
  ): void {
    for (const runtime of this.states.values()) {
      if (runtime.status !== "active") {
        continue;
      }

      for (const objective of runtime.objectives.values()) {
        if (objective.status !== "active") {
          continue;
        }

        if (
          objective.def.type === "kill" &&
          this.matchesTarget(objective.def, archetypeId)
        ) {
          this.addProgress(runtime, objective);
          continue;
        }

        if (
          objective.def.type === "clear-area" &&
          this.isInsideObjectiveArea(objective.def, x, y)
        ) {
          this.addProgress(runtime, objective);
        }
      }
    }
  }

  recordCollect(itemId: string, amount = 1): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    for (const runtime of this.states.values()) {
      if (runtime.status !== "active") {
        continue;
      }

      for (const objective of runtime.objectives.values()) {
        if (
          objective.status === "active" &&
          objective.def.type === "collect" &&
          this.matchesTarget(objective.def, itemId)
        ) {
          this.addProgress(runtime, objective, amount);
        }
      }
    }
  }

  recordReach(pointOfInterestId: string): void {
    this.recordTargetEvent("reach", pointOfInterestId);
  }

  recordInteract(interactableId: string): void {
    this.recordTargetEvent("interact", interactableId);
  }

  recordDestroy(targetId: string): void {
    this.recordTargetEvent("destroy", targetId);
  }

  recordSecure(territoryId: string): void {
    this.recordTargetEvent("secure", territoryId);
  }

  canInteract(interactableId: string): boolean {
    for (const runtime of this.states.values()) {
      if (runtime.status !== "active") {
        continue;
      }

      for (const objective of runtime.objectives.values()) {
        if (
          objective.status === "active" &&
          objective.def.type === "interact" &&
          objective.def.targetId === interactableId
        ) {
          return true;
        }
      }
    }

    return false;
  }

  drainEvents(): MissionEvent[] {
    const events = this.events;
    this.events = [];

    return events;
  }

  snapshot(): MissionsSnapshot {
    const missions = this.definitions.map((definition) =>
      this.createSnapshot(definition.id),
    );
    const active = missions.find((mission) => mission.status === "active");

    return {
      active: active ?? null,
      missions,
      markers: this.createMarkers(),
      completedCount: missions.filter(
        (mission) => mission.status === "completed",
      ).length,
    };
  }

  private recordTargetEvent(
    type: "reach" | "interact" | "destroy" | "secure",
    targetId: string,
  ): void {
    for (const runtime of this.states.values()) {
      if (runtime.status !== "active") {
        continue;
      }

      for (const objective of runtime.objectives.values()) {
        if (
          objective.status === "active" &&
          objective.def.type === type &&
          objective.def.targetId === targetId
        ) {
          this.addProgress(runtime, objective);
        }
      }
    }
  }

  private addProgress(
    runtime: MissionRuntime,
    objective: MissionObjectiveRuntime,
    amount = 1,
  ): void {
    if (objective.status !== "active") {
      return;
    }

    const count = this.objectiveCount(objective.def);
    objective.progress = Math.min(count, objective.progress + amount);

    if (objective.progress < count) {
      return;
    }

    objective.status = "completed";
    this.events.push({
      type: "objective-completed",
      missionId: runtime.def.id,
      missionTitle: runtime.def.title,
      objectiveId: objective.def.id,
      title: objective.def.title,
      optional: objective.def.optional ?? false,
    });

    this.activateObjectivePrerequisites(runtime);
    this.checkMissionCompletion(runtime);
  }

  private activateObjectivePrerequisites(runtime: MissionRuntime): void {
    let changed = true;

    while (changed) {
      changed = false;

      for (const objective of runtime.objectives.values()) {
        if (objective.status !== "locked") {
          continue;
        }

        const requires = objective.def.requires ?? [];

        if (
          requires.every(
            (id) => runtime.objectives.get(id)?.status === "completed",
          )
        ) {
          objective.status = "active";
          changed = true;
        }
      }
    }
  }

  private checkMissionCompletion(runtime: MissionRuntime): void {
    if (runtime.status !== "active") {
      return;
    }

    const complete = runtime.def.completion.objectiveIds.every(
      (id) => runtime.objectives.get(id)?.status === "completed",
    );

    if (!complete) {
      return;
    }

    runtime.status = "completed";
    this.completed.add(runtime.def.id);
    this.events.push({
      type: "mission-completed",
      missionId: runtime.def.id,
      title: runtime.def.title,
      rewards: runtime.def.rewards ?? null,
    });
    this.refreshAvailability();
  }

  private refreshAvailability(): void {
    for (const runtime of this.states.values()) {
      if (
        runtime.status === "active" ||
        runtime.status === "completed" ||
        runtime.status === "failed"
      ) {
        continue;
      }

      const prerequisites = runtime.def.prerequisites ?? [];
      runtime.status = prerequisites.every((id) => this.completed.has(id))
        ? "available"
        : "locked";
    }
  }

  private createSnapshot(missionId: string): MissionSnapshot {
    const runtime = this.states.get(missionId);

    if (!runtime) {
      throw new Error(`Mission "${missionId}" is not registered`);
    }

    return {
      id: runtime.def.id,
      regionId: runtime.def.regionId,
      title: runtime.def.title,
      description: runtime.def.description,
      briefing: runtime.def.briefing,
      status: runtime.status,
      objectives: runtime.def.objectives.map((objective) => {
        const state = runtime.objectives.get(objective.id);

        return {
          id: objective.id,
          title: objective.title,
          description: objective.description ?? "",
          type: objective.type,
          optional: objective.optional ?? false,
          status: state?.status ?? "locked",
          progress: state?.progress ?? 0,
          count: this.objectiveCount(objective),
          targetId: objective.targetId ?? null,
          requires: [...(objective.requires ?? [])],
        };
      }),
      completionObjectiveIds: [...runtime.def.completion.objectiveIds],
      rewards: runtime.def.rewards ?? null,
      failureReason: runtime.failureReason,
    };
  }

  private createMarkers(): MissionMarkerSnapshot[] {
    const markers: MissionMarkerSnapshot[] = [];
    const seenTargets = new Set<string>();

    for (const runtime of this.states.values()) {
      if (runtime.status !== "active") {
        continue;
      }

      for (const objective of runtime.objectives.values()) {
        if (objective.status !== "active") {
          continue;
        }

        const target = this.findObjectiveTarget(objective.def);

        if (!target) {
          continue;
        }

        const targetKey =
          objective.def.targetId ?? `${target.x}:${target.y}`;

        if (seenTargets.has(targetKey)) {
          continue;
        }

        seenTargets.add(targetKey);
        markers.push({
          objectiveId: objective.def.id,
          x: target.x,
          y: target.y,
          radius: target.radius,
          label: objective.def.title,
        });
      }
    }

    return markers;
  }

  private findObjectiveTarget(
    objective: MissionObjectiveDef,
  ): { x: number; y: number; radius: number } | null {
    if (!objective.targetId) {
      return null;
    }

    if (objective.type === "reach" || objective.type === "clear-area") {
      const area = this.pointsOfInterest.get(objective.targetId);

      return area
        ? { x: area.x, y: area.y, radius: objective.radius ?? area.radius }
        : null;
    }

    if (objective.type === "interact") {
      const interactable = this.interactables.get(objective.targetId);

      return interactable
        ? {
            x: interactable.x,
            y: interactable.y,
            radius: interactable.radius,
          }
        : null;
    }

    if (objective.type === "destroy" || objective.type === "secure") {
      const area =
        objective.type === "destroy"
          ? this.nests.get(objective.targetId)
          : this.territories.get(objective.targetId);

      return area
        ? { x: area.x, y: area.y, radius: objective.radius ?? area.radius }
        : null;
    }

    return null;
  }

  private isInsideObjectiveArea(
    objective: MissionObjectiveDef,
    x: number,
    y: number,
  ): boolean {
    const area = this.findObjectiveTarget(objective);

    if (!area) {
      return false;
    }

    return Math.hypot(x - area.x, y - area.y) <= area.radius;
  }

  private matchesTarget(
    objective: MissionObjectiveDef,
    target: string,
  ): boolean {
    return (
      !objective.targetId ||
      objective.targetId === "*" ||
      objective.targetId === target
    );
  }

  private objectiveCount(objective: MissionObjectiveDef): number {
    return Math.max(1, Math.floor(objective.count ?? 1));
  }
}

export function validateMissionDefinitions(
  definitions: readonly MissionDef[],
): void {
  if (definitions.length === 0) {
    throw new Error("At least one mission definition is required");
  }

  const missionIds = new Set<string>();

  for (const mission of definitions) {
    if (!mission.id || !mission.title || !mission.description) {
      throw new Error("Missions require an id, title, and description");
    }

    if (missionIds.has(mission.id)) {
      throw new Error(`Duplicate mission id "${mission.id}"`);
    }

    missionIds.add(mission.id);

    if (mission.objectives.length === 0) {
      throw new Error(`Mission "${mission.id}" requires objectives`);
    }

    if (mission.completion.objectiveIds.length === 0) {
      throw new Error(`Mission "${mission.id}" requires completion objectives`);
    }

    const objectiveIds = new Set<string>();
    const objectiveEdges: MissionEdge[] = [];

    for (const objective of mission.objectives) {
      if (!objective.id || !objective.title) {
        throw new Error(
          `Mission "${mission.id}" has an objective without an id or title`,
        );
      }

      if (objectiveIds.has(objective.id)) {
        throw new Error(
          `Mission "${mission.id}" has duplicate objective id "${objective.id}"`,
        );
      }

      objectiveIds.add(objective.id);

      if (
        objective.count !== undefined &&
        (!Number.isFinite(objective.count) ||
          !Number.isInteger(objective.count) ||
          objective.count <= 0)
      ) {
        throw new Error(
          `Objective "${objective.id}" has an invalid count`,
        );
      }

      if (
        (objective.type === "reach" ||
          objective.type === "interact" ||
          objective.type === "destroy" ||
          objective.type === "secure" ||
          objective.type === "clear-area") &&
        !objective.targetId
      ) {
        throw new Error(
          `Objective "${objective.id}" requires a target id`,
        );
      }

      objectiveEdges.push({
        id: objective.id,
        requires: objective.requires ?? [],
      });
    }

    for (const objective of mission.objectives) {
      for (const requiredId of objective.requires ?? []) {
        if (requiredId === objective.id) {
          throw new Error(
            `Objective "${objective.id}" cannot require itself`,
          );
        }

        if (!objectiveIds.has(requiredId)) {
          throw new Error(
            `Objective "${objective.id}" requires unknown objective "${requiredId}"`,
          );
        }
      }
    }

    assertNoCycles(objectiveEdges, `Mission "${mission.id}" objectives`);

    const completionIds = new Set<string>();

    for (const objectiveId of mission.completion.objectiveIds) {
      if (!objectiveIds.has(objectiveId)) {
        throw new Error(
          `Mission "${mission.id}" completion references unknown objective "${objectiveId}"`,
        );
      }

      if (completionIds.has(objectiveId)) {
        throw new Error(
          `Mission "${mission.id}" repeats completion objective "${objectiveId}"`,
        );
      }

      completionIds.add(objectiveId);
    }

    validateReward(mission);

    if (
      mission.prerequisites?.some((id) => id === mission.id)
    ) {
      throw new Error(`Mission "${mission.id}" cannot require itself`);
    }
  }

  const missionEdges = definitions.map((mission) => ({
    id: mission.id,
    requires: mission.prerequisites ?? [],
  }));

  for (const mission of definitions) {
    for (const prerequisiteId of mission.prerequisites ?? []) {
      if (!missionIds.has(prerequisiteId)) {
        throw new Error(
          `Mission "${mission.id}" requires unknown mission "${prerequisiteId}"`,
        );
      }
    }
  }

  assertNoCycles(missionEdges, "Mission prerequisites");
}

function validateReward(mission: MissionDef): void {
  const reward = mission.rewards;

  if (!reward) {
    return;
  }

  if (!reward.summary) {
    throw new Error(`Mission "${mission.id}" reward requires a summary`);
  }

  for (const value of [reward.armor, reward.energy]) {
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < 0)
    ) {
      throw new Error(`Mission "${mission.id}" has an invalid reward`);
    }
  }
}

function assertNoCycles(edges: readonly MissionEdge[], label: string): void {
  const byId = new Map(edges.map((edge) => [edge.id, edge]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): void => {
    if (visited.has(id)) {
      return;
    }

    if (visiting.has(id)) {
      throw new Error(`${label} contain a dependency cycle`);
    }

    visiting.add(id);

    for (const requiredId of byId.get(id)?.requires ?? []) {
      if (byId.has(requiredId)) {
        visit(requiredId);
      }
    }

    visiting.delete(id);
    visited.add(id);
  };

  for (const edge of edges) {
    visit(edge.id);
  }
}
