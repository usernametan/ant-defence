import type { CreatureRenderState } from "../entities/Creature";

export function drawCreature(
  context: CanvasRenderingContext2D,
  creature: CreatureRenderState,
  timeSeconds: number,
): void {
  const radius = creature.radius;

  context.save();
  context.translate(creature.x, creature.y);

  context.fillStyle = "rgba(0, 0, 0, 0.38)";
  context.beginPath();
  context.ellipse(
    3,
    radius * 0.58,
    radius * 1.08,
    radius * 0.52,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (creature.attackCharge > 0) {
    const charge = creature.attackCharge;

    context.strokeStyle = `rgba(255, 113, 92, ${0.35 + charge * 0.6})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(
      0,
      0,
      radius + 10 + charge * 7,
      -Math.PI / 2,
      -Math.PI / 2 + charge * Math.PI * 2,
    );
    context.stroke();

    context.globalAlpha = 0.18 + charge * 0.22;
    context.fillStyle = "#ff715c";
    context.beginPath();
    context.arc(0, 0, radius + 16, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  drawHealthBar(context, creature, radius);

  context.rotate(creature.facing);
  const bob = Math.sin(timeSeconds * 7 + radius) * radius * 0.05;
  context.translate(0, bob);

  switch (creature.archetypeId) {
    case "crawler":
      drawCrawler(context, creature, radius, timeSeconds);
      break;
    case "stalker":
      drawStalker(context, creature, radius, timeSeconds);
      break;
    case "spitter":
      drawSpitter(context, creature, radius, timeSeconds);
      break;
  }

  if (creature.hitFlash > 0) {
    context.globalAlpha = creature.hitFlash * 0.7;
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawCrawler(
  context: CanvasRenderingContext2D,
  creature: CreatureRenderState,
  radius: number,
  timeSeconds: number,
): void {
  context.strokeStyle = creature.accentColor;
  context.lineWidth = 2;
  context.globalAlpha = 0.78;

  for (let index = -1; index <= 1; index += 1) {
    const legPhase = Math.sin(timeSeconds * 12 + index * 1.7) * radius * 0.22;

    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(index * radius * 0.38, side * radius * 0.45);
      context.lineTo(
        index * radius * 0.55 + legPhase,
        side * (radius * 1.15 + Math.abs(index) * 2),
      );
      context.lineTo(
        index * radius * 0.35 - legPhase * 0.4,
        side * radius * 1.38,
      );
      context.stroke();
    }
  }

  context.globalAlpha = 1;
  context.fillStyle = creature.bodyColor;
  context.beginPath();
  context.ellipse(0, 0, radius * 1.08, radius * 0.72, 0, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = creature.accentColor;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-radius * 0.7, 0);
  context.lineTo(radius * 0.55, 0);
  context.stroke();

  context.fillStyle = creature.coreColor;
  context.beginPath();
  context.arc(radius * 0.58, 0, radius * 0.2, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = creature.accentColor;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(radius * 0.72, -radius * 0.18);
  context.lineTo(radius * 1.1, -radius * 0.45);
  context.moveTo(radius * 0.72, radius * 0.18);
  context.lineTo(radius * 1.1, radius * 0.45);
  context.stroke();
}

function drawStalker(
  context: CanvasRenderingContext2D,
  creature: CreatureRenderState,
  radius: number,
  timeSeconds: number,
): void {
  const sway = Math.sin(timeSeconds * 4.2 + radius) * 0.18;

  context.strokeStyle = creature.accentColor;
  context.lineWidth = 2.4;
  context.beginPath();
  context.moveTo(-radius * 0.25, -radius * 0.3);
  context.lineTo(-radius * 1.15, -radius * (1.2 + sway));
  context.moveTo(-radius * 0.25, radius * 0.3);
  context.lineTo(-radius * 1.15, radius * (1.2 + sway));
  context.stroke();

  context.fillStyle = creature.bodyColor;
  context.beginPath();
  context.moveTo(radius * 1.08, 0);
  context.lineTo(-radius * 0.2, -radius * 0.88);
  context.lineTo(-radius * 0.82, 0);
  context.lineTo(-radius * 0.2, radius * 0.88);
  context.closePath();
  context.fill();

  context.strokeStyle = creature.accentColor;
  context.lineWidth = 1.6;
  context.beginPath();
  context.moveTo(radius * 0.78, 0);
  context.lineTo(-radius * 0.55, 0);
  context.stroke();

  context.fillStyle = creature.coreColor;
  context.beginPath();
  context.arc(radius * 0.34, 0, radius * 0.17, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(236, 255, 240, 0.58)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(-radius * 0.4, -radius * 0.5);
  context.lineTo(radius * 0.5, radius * 0.5);
  context.stroke();
}

function drawSpitter(
  context: CanvasRenderingContext2D,
  creature: CreatureRenderState,
  radius: number,
  timeSeconds: number,
): void {
  const pulse = 0.85 + Math.sin(timeSeconds * 3.4 + radius) * 0.15;

  context.fillStyle = creature.bodyColor;
  context.beginPath();
  context.arc(-radius * 0.28, 0, radius * 0.95, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = creature.accentColor;
  context.globalAlpha = 0.42;
  context.beginPath();
  context.arc(
    -radius * 0.4,
    0,
    radius * 0.58 * pulse,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = creature.bodyColor;
  context.beginPath();
  context.arc(radius * 0.42, 0, radius * 0.62, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = creature.accentColor;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(radius * 0.65, -radius * 0.26);
  context.lineTo(radius * 1.25, -radius * 0.34);
  context.moveTo(radius * 0.65, radius * 0.26);
  context.lineTo(radius * 1.25, radius * 0.34);
  context.stroke();

  context.fillStyle = creature.coreColor;
  context.beginPath();
  context.arc(radius * 0.7, 0, radius * 0.18, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(243, 236, 255, 0.48)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(-radius * 0.28, 0, radius * 0.72, 0, Math.PI * 2);
  context.stroke();
}

function drawHealthBar(
  context: CanvasRenderingContext2D,
  creature: CreatureRenderState,
  radius: number,
): void {
  if (!creature.alive) {
    return;
  }

  const ratio = Math.max(0, creature.health / creature.maxHealth);
  const width = radius * 2.5;
  const height = 3;

  context.fillStyle = "rgba(2, 12, 9, 0.78)";
  context.fillRect(-width / 2, -radius - 14, width, height);
  context.fillStyle =
    ratio > 0.5
      ? "rgba(117, 245, 203, 0.9)"
      : ratio > 0.25
        ? "rgba(247, 191, 91, 0.92)"
        : "rgba(255, 113, 92, 0.95)";
  context.fillRect(-width / 2, -radius - 14, width * ratio, height);
}
