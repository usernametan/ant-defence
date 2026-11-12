import type { TargetDummy } from "../entities/TargetDummy";

export function drawTargetDummy(
  context: CanvasRenderingContext2D,
  dummy: TargetDummy,
): void {
  const radius = dummy.radius;

  context.save();
  context.translate(dummy.x, dummy.y);

  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.beginPath();
  context.ellipse(
    3,
    radius * 0.58,
    radius * 1.05,
    radius * 0.5,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.strokeStyle = dummy.alive
    ? "rgba(247, 191, 91, 0.62)"
    : "rgba(159, 211, 255, 0.3)";
  context.lineWidth = 1.5;
  context.setLineDash(dummy.alive ? [] : [4, 5]);
  context.beginPath();
  context.arc(0, 0, radius + 6, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  if (!dummy.alive) {
    const recharge =
      1 - dummy.respawnRemaining / Math.max(0.001, dummy.respawnDelay);
    context.strokeStyle = "rgba(159, 211, 255, 0.62)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(
      0,
      0,
      radius + 10,
      -Math.PI / 2,
      -Math.PI / 2 + recharge * Math.PI * 2,
    );
    context.stroke();
  }

  context.fillStyle = dummy.alive ? "#3a2f21" : "#1a2928";
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = dummy.alive
    ? "rgba(247, 191, 91, 0.82)"
    : "rgba(117, 245, 203, 0.2)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "rgba(226, 255, 245, 0.52)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-radius * 0.52, 0);
  context.lineTo(radius * 0.52, 0);
  context.moveTo(0, -radius * 0.52);
  context.lineTo(0, radius * 0.52);
  context.stroke();

  if (dummy.alive) {
    const healthRatio = Math.max(0, dummy.health / dummy.maxHealth);
    context.strokeStyle = "rgba(117, 245, 203, 0.86)";
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(
      0,
      0,
      radius + 3,
      -Math.PI / 2,
      -Math.PI / 2 + healthRatio * Math.PI * 2,
    );
    context.stroke();
  }

  if (dummy.hitFlash > 0) {
    context.globalAlpha = dummy.hitFlash * 0.56;
    context.fillStyle = "#e9fff8";
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}
