import type { PlayerRenderState } from "../entities/Player";

export function drawPlayer(
  context: CanvasRenderingContext2D,
  player: PlayerRenderState,
  timeSeconds: number,
): void {
  const radius = player.radius;
  const speed = Math.hypot(player.velocityX, player.velocityY);

  context.save();
  context.translate(player.x, player.y);

  context.fillStyle = "rgba(0, 0, 0, 0.36)";
  context.beginPath();
  context.ellipse(3, radius * 0.55, radius * 1.08, radius * 0.58, 0, 0, Math.PI * 2);
  context.fill();

  if (player.dodging) {
    const trailAngle = Math.atan2(player.velocityY, player.velocityX);
    context.save();
    context.rotate(trailAngle);
    context.strokeStyle = "rgba(117, 245, 203, 0.28)";
    context.lineWidth = 2;

    for (let index = 1; index <= 3; index += 1) {
      context.beginPath();
      context.arc(-index * radius * 1.15, 0, radius * (1 - index * 0.16), 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();
  }

  if (player.invulnerable) {
    context.strokeStyle = "rgba(247, 191, 91, 0.82)";
    context.lineWidth = 2;
    context.setLineDash([5, 4]);
    context.beginPath();
    context.arc(0, 0, radius + 7, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }

  context.rotate(player.facing);

  if (player.sprinting && speed > 1) {
    const pulse = 0.55 + Math.sin(timeSeconds * 12) * 0.2;
    context.strokeStyle = `rgba(117, 245, 203, ${pulse})`;
    context.lineWidth = 2;

    for (const offset of [-0.55, 0.55]) {
      context.beginPath();
      context.moveTo(-radius * 1.65, offset * radius);
      context.lineTo(-radius * 0.95, offset * radius * 0.55);
      context.stroke();
    }
  }

  const bodyGradient = context.createRadialGradient(
    radius * 0.2,
    -radius * 0.25,
    radius * 0.15,
    0,
    0,
    radius,
  );
  bodyGradient.addColorStop(0, "#d8fff2");
  bodyGradient.addColorStop(0.42, "#58c9a8");
  bodyGradient.addColorStop(1, "#123f35");

  context.fillStyle = "#071914";
  context.beginPath();
  context.arc(0, 0, radius + 2.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = bodyGradient;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#0d2e27";
  context.beginPath();
  context.moveTo(-radius * 0.75, -radius * 0.7);
  context.lineTo(-radius * 1.18, 0);
  context.lineTo(-radius * 0.75, radius * 0.7);
  context.closePath();
  context.fill();

  context.fillStyle = "#f7bf5b";
  context.beginPath();
  context.moveTo(radius * 0.2, -radius * 0.18);
  context.lineTo(radius * 0.88, 0);
  context.lineTo(radius * 0.2, radius * 0.18);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(226, 255, 245, 0.7)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(0, 0, radius * 0.55, -1.1, 1.1);
  context.stroke();

  context.fillStyle = "#e2fff5";
  context.beginPath();
  context.arc(-radius * 0.42, -radius * 0.42, radius * 0.14, 0, Math.PI * 2);
  context.fill();

  if (player.hitFlash > 0) {
    context.globalAlpha = player.hitFlash * 0.62;
    context.fillStyle = "#fff0ec";
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  context.restore();
}
