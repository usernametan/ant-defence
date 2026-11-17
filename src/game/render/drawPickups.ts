import { PICKUP_TYPES } from "../content/pickups";
import type { PickupState } from "../systems/PickupSystem";

export function drawPickup(
  context: CanvasRenderingContext2D,
  pickup: PickupState,
  timeSeconds: number,
): void {
  if (!pickup.active) {
    return;
  }

  const type = PICKUP_TYPES[pickup.kind];
  const pulse = 0.5 + Math.sin(timeSeconds * 2.6 + pickup.phase) * 0.5;
  const bob = Math.sin(timeSeconds * 2.2 + pickup.phase) * 2.2;
  const radius = pickup.radius;

  context.save();
  context.translate(pickup.x, pickup.y);

  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.beginPath();
  context.ellipse(
    1,
    radius * 0.78,
    radius * 1.15,
    radius * 0.52,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.strokeStyle = `rgba(${pickup.kind === "health" ? "255, 113, 92" : "127, 199, 255"}, ${0.22 + pulse * 0.22})`;
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(0, 2, radius + 7 + pulse * 3, 0, Math.PI * 2);
  context.stroke();

  context.translate(0, -5 + bob);

  context.fillStyle = "rgba(3, 16, 13, 0.82)";
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
  gradient.addColorStop(1, "rgba(3, 16, 13, 0.92)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius - 2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#071914";
  context.strokeStyle = type.coreColor;
  context.lineWidth = 2;

  if (type.symbol === "cross") {
    const arm = radius * 0.48;
    const thickness = radius * 0.3;

    context.beginPath();
    context.roundRect(-thickness / 2, -arm, thickness, arm * 2, 2);
    context.roundRect(-arm, -thickness / 2, arm * 2, thickness, 2);
    context.fill();
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(0, -radius * 0.55);
    context.lineTo(radius * 0.5, -radius * 0.28);
    context.lineTo(radius * 0.42, radius * 0.22);
    context.lineTo(0, radius * 0.58);
    context.lineTo(-radius * 0.42, radius * 0.22);
    context.lineTo(-radius * 0.5, -radius * 0.28);
    context.closePath();
    context.fill();
    context.stroke();
  }

  context.fillStyle = type.coreColor;
  context.font = "500 7px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText(
    pickup.kind === "health" ? "BIO" : "PLATE",
    0,
    radius + 14,
  );

  context.restore();
}
