import type {
  SafeZoneSnapshot,
  TerritorySnapshot,
  TerritoryState,
  TerritoriesSnapshot,
} from "../systems/TerritorySystem";
import { drawNestGround } from "./drawNest";

const TERRITORY_COLORS: Record<TerritoryState, string> = {
  hostile: "255, 113, 92",
  contested: "255, 154, 88",
  securing: "247, 191, 91",
  secured: "117, 245, 203",
};

export function drawTerritoryGround(
  context: CanvasRenderingContext2D,
  territories: TerritoriesSnapshot,
  timeSeconds: number,
): void {
  for (const territory of territories.territories) {
    drawTerritory(context, territory, timeSeconds);
  }

  for (const territory of territories.territories) {
    drawSafeZone(context, territory.safeZone, timeSeconds);
  }

  for (const nest of territories.nests) {
    drawNestGround(context, nest, timeSeconds);
  }
}

function drawTerritory(
  context: CanvasRenderingContext2D,
  territory: TerritorySnapshot,
  timeSeconds: number,
): void {
  const color = TERRITORY_COLORS[territory.state];
  const pulse = 0.5 + Math.sin(timeSeconds * 1.4) * 0.5;
  const active =
    territory.state === "contested" ||
    territory.state === "securing";

  context.save();
  context.translate(territory.x, territory.y);

  const fill = context.createRadialGradient(
    0,
    0,
    territory.radius * 0.18,
    0,
    0,
    territory.radius,
  );
  fill.addColorStop(
    0,
    `rgba(${color}, ${active ? 0.055 + pulse * 0.025 : 0.03})`,
  );
  fill.addColorStop(0.72, `rgba(${color}, ${active ? 0.035 : 0.018})`);
  fill.addColorStop(1, `rgba(${color}, 0)`);
  context.fillStyle = fill;
  context.beginPath();
  context.arc(0, 0, territory.radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(${color}, ${0.22 + pulse * 0.12})`;
  context.lineWidth = 1.5;
  context.setLineDash([12, 10]);
  context.beginPath();
  context.arc(0, 0, territory.radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  if (territory.state === "securing") {
    context.strokeStyle = "rgba(247, 191, 91, 0.82)";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(
      0,
      0,
      territory.radius - 8,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * territory.captureProgress,
    );
    context.stroke();
  }

  context.fillStyle = `rgba(${color}, 0.86)`;
  context.font = "600 11px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText(
    `${territory.name.toUpperCase()} · ${territory.state.toUpperCase()}`,
    0,
    -territory.radius - 14,
  );
  context.restore();
}

function drawSafeZone(
  context: CanvasRenderingContext2D,
  safeZone: SafeZoneSnapshot,
  timeSeconds: number,
): void {
  const pulse = 0.5 + Math.sin(timeSeconds * 2.6) * 0.5;

  context.save();
  context.translate(safeZone.x, safeZone.y);

  if (safeZone.active) {
    const glow = context.createRadialGradient(
      0,
      0,
      4,
      0,
      0,
      safeZone.radius * 2.4,
    );
    glow.addColorStop(0, `rgba(117, 245, 203, ${0.22 + pulse * 0.12})`);
    glow.addColorStop(0.6, "rgba(117, 245, 203, 0.08)");
    glow.addColorStop(1, "rgba(117, 245, 203, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, safeZone.radius * 2.4, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = safeZone.active
    ? `rgba(117, 245, 203, ${0.6 + pulse * 0.24})`
    : "rgba(226, 255, 245, 0.22)";
  context.lineWidth = safeZone.active ? 2 : 1;
  context.setLineDash(safeZone.active ? [6, 5] : [3, 7]);
  context.beginPath();
  context.arc(0, 0, safeZone.radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = safeZone.active
    ? "rgba(117, 245, 203, 0.9)"
    : "rgba(226, 255, 245, 0.4)";
  context.font = "600 8px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText(
    `${safeZone.name.toUpperCase()}${safeZone.active ? " · ONLINE" : ""}`,
    0,
    safeZone.radius + 14,
  );
  context.restore();
}
