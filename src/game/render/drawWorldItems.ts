import { ITEM_TYPES } from "../content/pickups";
import type { ItemPickupState } from "../systems/ItemPickupSystem";

export function drawWorldItem(
  context: CanvasRenderingContext2D,
  item: ItemPickupState,
  timeSeconds: number,
): void {
  if (!item.active) {
    return;
  }

  const type = ITEM_TYPES[item.kind];
  const pulse = 0.5 + Math.sin(timeSeconds * 2.8 + item.phase) * 0.5;
  const bob = Math.sin(timeSeconds * 2.1 + item.phase) * 2.4;
  const radius = item.radius;

  context.save();
  context.translate(item.x, item.y);

  context.fillStyle = "rgba(0, 0, 0, 0.36)";
  context.beginPath();
  context.ellipse(
    1,
    radius * 0.82,
    radius * 1.2,
    radius * 0.5,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.strokeStyle = `rgba(247, 191, 91, ${0.18 + pulse * 0.3})`;
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(0, 2, radius + 8 + pulse * 4, 0, Math.PI * 2);
  context.stroke();

  context.translate(0, -5 + bob);

  context.fillStyle = "rgba(3, 16, 13, 0.84)";
  context.beginPath();
  context.arc(0, 0, radius + 4, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = type.color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.stroke();

  const gradient = context.createRadialGradient(
    -radius * 0.3,
    -radius * 0.35,
    1,
    0,
    0,
    radius,
  );
  gradient.addColorStop(0, type.coreColor);
  gradient.addColorStop(0.55, type.color);
  gradient.addColorStop(1, "rgba(3, 16, 13, 0.94)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius - 2.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#071914";
  context.strokeStyle = type.coreColor;
  context.lineWidth = 2;

  if (type.symbol === "weapon") {
    context.beginPath();
    context.moveTo(-radius * 0.55, radius * 0.1);
    context.lineTo(radius * 0.55, -radius * 0.28);
    context.lineTo(radius * 0.2, radius * 0.02);
    context.lineTo(radius * 0.42, radius * 0.48);
    context.lineTo(-radius * 0.05, radius * 0.18);
    context.lineTo(-radius * 0.42, radius * 0.52);
    context.closePath();
    context.fill();
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(0, -radius * 0.58);
    context.lineTo(radius * 0.5, 0);
    context.lineTo(0, radius * 0.58);
    context.lineTo(-radius * 0.5, 0);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = type.coreColor;
    context.beginPath();
    context.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = type.coreColor;
  context.font = "500 7px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText(item.kind === "weapon" ? "WPN" : "MOD", 0, radius + 14);

  context.restore();
}
