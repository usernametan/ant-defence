import type { MissionMarkerSnapshot } from "../systems/MissionSystem";

export function drawMissionMarker(
  context: CanvasRenderingContext2D,
  marker: MissionMarkerSnapshot,
  timeSeconds: number,
): void {
  const pulse = 0.5 + Math.sin(timeSeconds * 2.2) * 0.5;
  const radius = Math.max(48, marker.radius);

  context.save();
  context.translate(marker.x, marker.y);

  context.strokeStyle = `rgba(117, 245, 203, ${0.16 + pulse * 0.16})`;
  context.lineWidth = 2;
  context.setLineDash([10, 12]);
  context.beginPath();
  context.arc(0, 0, radius * (0.86 + pulse * 0.08), 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  context.rotate(Math.PI / 4);
  context.fillStyle = "rgba(117, 245, 203, 0.16)";
  context.strokeStyle = "rgba(233, 255, 248, 0.8)";
  context.lineWidth = 1.5;
  context.fillRect(-7, -7, 14, 14);
  context.strokeRect(-7, -7, 14, 14);
  context.rotate(-Math.PI / 4);

  context.fillStyle = "rgba(226, 255, 245, 0.72)";
  context.font = "500 9px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText(marker.label.toUpperCase(), 0, -radius - 12);
  context.restore();
}
