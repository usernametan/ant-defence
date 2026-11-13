import type {
  NestNodeSnapshot,
  NestSnapshot,
} from "../systems/TerritorySystem";

export function drawNestNode(
  context: CanvasRenderingContext2D,
  node: NestNodeSnapshot,
  timeSeconds: number,
): void {
  const healthRatio =
    node.maxHealth > 0 ? Math.max(0, node.health / node.maxHealth) : 0;
  const pulse = 0.5 + Math.sin(timeSeconds * 3.4 + node.x * 0.01) * 0.5;

  context.save();
  context.translate(node.x, node.y);

  if (!node.alive) {
    context.fillStyle = "rgba(18, 16, 14, 0.68)";
    context.beginPath();
    context.arc(0, 0, node.radius * 0.7, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 148, 102, 0.26)";
    context.lineWidth = 1;
    context.setLineDash([3, 4]);
    context.beginPath();
    context.arc(0, 0, node.radius, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.restore();
    return;
  }

  const glow = context.createRadialGradient(
    0,
    0,
    node.radius * 0.25,
    0,
    0,
    node.radius * 1.9,
  );
  glow.addColorStop(0, `rgba(255, 96, 74, ${0.34 + pulse * 0.18})`);
  glow.addColorStop(0.55, "rgba(143, 43, 46, 0.16)");
  glow.addColorStop(1, "rgba(143, 43, 46, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(0, 0, node.radius * 1.9, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = node.hitFlash > 0 ? "#fff3d6" : "#5b2b2f";
  context.strokeStyle = "rgba(255, 148, 102, 0.9)";
  context.lineWidth = 2;
  context.beginPath();

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + timeSeconds * 0.18;
    const radius = node.radius * (index % 2 === 0 ? 1 : 0.72);

    if (index === 0) {
      context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    } else {
      context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }

  context.closePath();
  context.fill();
  context.stroke();

  context.strokeStyle = "rgba(12, 8, 8, 0.7)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(0, 0, node.radius + 5, -Math.PI / 2, Math.PI * 1.5);
  context.stroke();

  context.strokeStyle = healthRatio > 0.45 ? "#ff9466" : "#ff5f52";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(
    0,
    0,
    node.radius + 5,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * healthRatio,
  );
  context.stroke();

  context.fillStyle = "rgba(255, 226, 208, 0.78)";
  context.font = "600 8px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText("BLOOM NODE", 0, -node.radius - 12);
  context.restore();
}

export function drawNestGround(
  context: CanvasRenderingContext2D,
  nest: NestSnapshot,
  timeSeconds: number,
): void {
  if (nest.state === "inactive") {
    return;
  }

  const cleared = nest.state === "cleared";
  const pulse = 0.5 + Math.sin(timeSeconds * 2.8) * 0.5;
  const color = cleared ? "117, 245, 203" : "255, 113, 92";

  context.save();
  context.translate(nest.x, nest.y);

  const glow = context.createRadialGradient(
    0,
    0,
    6,
    0,
    0,
    nest.activationRadius * 0.55,
  );
  glow.addColorStop(
    0,
    `rgba(${color}, ${cleared ? 0.08 : 0.16 + pulse * 0.06})`,
  );
  glow.addColorStop(0.55, `rgba(${color}, ${cleared ? 0.03 : 0.07})`);
  glow.addColorStop(1, `rgba(${color}, 0)`);
  context.fillStyle = glow;
  context.beginPath();
  context.arc(0, 0, nest.activationRadius * 0.55, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(${color}, ${cleared ? 0.32 : 0.48 + pulse * 0.16})`;
  context.lineWidth = 2;
  context.setLineDash(cleared ? [4, 8] : [9, 7]);
  context.beginPath();
  context.arc(0, 0, nest.activationRadius * 0.55, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = `rgba(${color}, 0.88)`;
  context.font = "600 10px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText(
    `${nest.name.toUpperCase()} · ${nest.state.toUpperCase()}`,
    0,
    -nest.activationRadius * 0.55 - 12,
  );

  context.fillStyle = "rgba(8, 6, 6, 0.55)";
  context.beginPath();
  context.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = `rgba(${color}, 0.62)`;
  context.lineWidth = 1.5;
  context.stroke();

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + timeSeconds * 0.1;

    context.strokeStyle = `rgba(${color}, ${cleared ? 0.16 : 0.32})`;
    context.beginPath();
    context.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 8);
    context.lineTo(Math.cos(angle) * 32, Math.sin(angle) * 22);
    context.stroke();
  }

  context.restore();
}
