import type { InteractableState } from "../world/Triggers";

export function drawInteractable(
  context: CanvasRenderingContext2D,
  interactable: InteractableState,
  timeSeconds: number,
): void {
  const pulse = 0.5 + Math.sin(timeSeconds * 2.6) * 0.5;
  const color = interactable.activated ? "#75f5cb" : "#f7bf5b";
  const core = interactable.activated ? "#e9fff8" : "#ffe4ae";

  context.save();
  context.translate(interactable.x, interactable.y);

  context.strokeStyle = interactable.activated
    ? `rgba(117, 245, 203, ${0.2 + pulse * 0.14})`
    : `rgba(247, 191, 91, ${0.25 + pulse * 0.25})`;
  context.lineWidth = 1.5;
  context.setLineDash([6, 7]);
  context.beginPath();
  context.arc(0, 0, 34 + pulse * 4, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = "rgba(3, 17, 14, 0.92)";
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -16);
  context.lineTo(14, -8);
  context.lineTo(14, 8);
  context.lineTo(0, 16);
  context.lineTo(-14, 8);
  context.lineTo(-14, -8);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = core;
  context.globalAlpha = interactable.activated ? 1 : 0.55 + pulse * 0.45;
  context.beginPath();
  context.arc(0, 0, 4.5, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  if (interactable.activated) {
    context.strokeStyle = "rgba(233, 255, 248, 0.8)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-6, 0);
    context.lineTo(-1, 6);
    context.lineTo(8, -7);
    context.stroke();
  }

  context.fillStyle = "rgba(226, 255, 245, 0.72)";
  context.font = "500 9px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText(interactable.name.toUpperCase(), 0, 30);
  context.restore();
}
