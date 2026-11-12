import { hashString } from "../core/rng";
import type { MapPropDef } from "../world/MapDef";

export interface WorldView {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function drawWorldGroundProp(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  if (prop.kind !== "bridge") {
    return;
  }

  context.save();
  context.fillStyle = "rgba(2, 12, 9, 0.22)";
  context.fillRect(prop.x + 5, prop.y + 6, prop.width, prop.height);
  context.fillStyle = "#5b3d2a";
  context.fillRect(prop.x, prop.y, prop.width, prop.height);

  const plankHeight = 9;

  for (let y = prop.y + 2; y < prop.y + prop.height - 2; y += plankHeight) {
    const seed = hashString(`${prop.id}:${y}`);
    context.fillStyle =
      seed % 2 === 0 ? "rgba(196, 147, 93, 0.34)" : "rgba(42, 27, 22, 0.26)";
    context.fillRect(prop.x + 4, y, prop.width - 8, 5);
    context.fillStyle = "rgba(27, 17, 15, 0.52)";
    context.fillRect(prop.x + 10, y + 5, 2, 2);
    context.fillRect(prop.x + prop.width - 12, y + 5, 2, 2);
  }

  context.strokeStyle = "#34231b";
  context.lineWidth = 4;
  context.strokeRect(prop.x + 2, prop.y + 2, prop.width - 4, prop.height - 4);
  context.strokeStyle = "rgba(233, 183, 113, 0.25)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(prop.x + 7, prop.y + 6);
  context.lineTo(prop.x + 7, prop.y + prop.height - 6);
  context.moveTo(prop.x + prop.width - 7, prop.y + 6);
  context.lineTo(prop.x + prop.width - 7, prop.y + prop.height - 6);
  context.stroke();
  context.restore();
}

export function drawWorldPropBase(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  const centerX = prop.x + prop.width / 2;
  const seed = hashString(prop.id);

  context.save();
  drawShadow(context, centerX, prop.y + prop.height * 0.9, prop.width);

  switch (prop.kind) {
    case "tree":
      drawTreeTrunk(context, prop, seed);
      break;
    case "bush":
      drawBush(context, prop, seed);
      break;
    case "boulder":
    case "rock":
      drawRock(context, prop, seed);
      break;
    case "ruin-wall":
      drawRuinWall(context, prop, seed);
      break;
    case "ruin-pillar":
      drawRuinPillar(context, prop, seed);
      break;
    case "crate":
      drawCrate(context, prop);
      break;
    case "barrel":
      drawBarrel(context, prop);
      break;
    case "tent":
      drawTent(context, prop, seed);
      break;
    case "cart":
      drawCart(context, prop);
      break;
    case "sign":
      drawSign(context, prop);
      break;
    case "log":
      drawLog(context, prop, seed);
      break;
    case "fence":
      drawFence(context, prop);
      break;
    case "bridge":
      break;
    default:
      drawFallbackProp(context, prop);
  }

  context.restore();
}

export function drawWorldPropOverhead(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  time: number,
): void {
  if (prop.kind !== "tree") {
    return;
  }

  const seed = hashString(prop.id);
  const centerX = prop.x + prop.width / 2;
  const centerY = prop.y + prop.height / 2;
  const sway = Math.sin(time * 0.0011 + (seed % 17)) * 1.3;
  const canopyCount = 5 + (seed % 4);

  context.save();

  for (let index = 0; index < canopyCount; index += 1) {
    const local = hashString(`${seed}:canopy:${index}`);
    const angle = (local % 360) * (Math.PI / 180);
    const distance = 10 + ((local >>> 9) % 19);
    const radius = 19 + ((local >>> 17) % 15);
    const x = centerX + Math.cos(angle) * distance + sway;
    const y = centerY - 13 + Math.sin(angle) * distance * 0.55;
    const dark = index % 3 === 0;

    context.fillStyle = dark
      ? "rgba(9, 35, 27, 0.96)"
      : index % 2 === 0
        ? "rgba(20, 61, 44, 0.94)"
        : "rgba(29, 79, 54, 0.9)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (index % 2 === 0) {
      context.fillStyle = "rgba(115, 190, 119, 0.15)";
      context.beginPath();
      context.arc(x - radius * 0.28, y - radius * 0.3, radius * 0.45, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.fillStyle = "rgba(2, 12, 9, 0.2)";
  context.beginPath();
  context.ellipse(centerX + sway, centerY + 8, 42, 18, 0, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

export function isWorldPropVisible(
  prop: MapPropDef,
  view: WorldView,
  margin = 80,
): boolean {
  return (
    prop.x < view.right + margin &&
    prop.x + prop.width > view.left - margin &&
    prop.y < view.bottom + margin &&
    prop.y + prop.height > view.top - margin
  );
}

export function worldPropSortY(prop: MapPropDef): number {
  return prop.y + prop.height * 0.9;
}

function drawShadow(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
): void {
  context.fillStyle = "rgba(2, 12, 9, 0.32)";
  context.beginPath();
  context.ellipse(
    centerX + width * 0.08,
    centerY,
    width * 0.62,
    width * 0.24,
    -0.12,
    0,
    Math.PI * 2,
  );
  context.fill();
}

function drawTreeTrunk(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  seed: number,
): void {
  const centerX = prop.x + prop.width / 2;
  const trunkWidth = 8 + (seed % 4);
  const trunkTop = prop.y - 5;

  context.fillStyle = "#3a291f";
  context.beginPath();
  context.moveTo(centerX - trunkWidth / 2, prop.y + prop.height);
  context.lineTo(centerX - trunkWidth * 0.34, trunkTop);
  context.lineTo(centerX + trunkWidth * 0.36, trunkTop);
  context.lineTo(centerX + trunkWidth / 2, prop.y + prop.height);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(218, 161, 102, 0.34)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(centerX - 2, prop.y + prop.height - 2);
  context.lineTo(centerX - 1, prop.y + 2);
  context.stroke();

  context.strokeStyle = "#32251c";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(centerX, prop.y + prop.height);
  context.lineTo(centerX - 7, prop.y + prop.height + 4);
  context.moveTo(centerX, prop.y + prop.height);
  context.lineTo(centerX + 6, prop.y + prop.height + 3);
  context.stroke();
}

function drawBush(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  seed: number,
): void {
  const centerX = prop.x + prop.width / 2;
  const centerY = prop.y + prop.height * 0.62;

  for (let index = 0; index < 4; index += 1) {
    const local = hashString(`${seed}:bush:${index}`);
    context.fillStyle =
      index % 2 === 0
        ? "rgba(28, 84, 57, 0.88)"
        : "rgba(18, 62, 44, 0.9)";
    context.beginPath();
    context.arc(
      centerX + ((local % 20) - 10),
      centerY + (((local >>> 6) % 14) - 7),
      11 + (local % 8),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.fillStyle = "rgba(117, 245, 203, 0.14)";
  context.beginPath();
  context.arc(centerX - 6, centerY - 8, 8, 0, Math.PI * 2);
  context.fill();
}

function drawRock(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  seed: number,
): void {
  const centerX = prop.x + prop.width / 2;
  const centerY = prop.y + prop.height / 2;
  const points = 7;

  context.fillStyle = prop.kind === "boulder" ? "#49534d" : "#3e4944";
  context.beginPath();

  for (let index = 0; index < points; index += 1) {
    const local = hashString(`${seed}:rock:${index}`);
    const angle = (index / points) * Math.PI * 2;
    const x =
      centerX +
      Math.cos(angle) * prop.width * (0.37 + (local % 9) / 100);
    const y =
      centerY +
      Math.sin(angle) * prop.height * (0.34 + ((local >>> 6) % 9) / 100);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(2, 12, 9, 0.42)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "rgba(177, 202, 186, 0.2)";
  context.beginPath();
  context.ellipse(
    centerX - prop.width * 0.14,
    centerY - prop.height * 0.18,
    prop.width * 0.25,
    prop.height * 0.16,
    -0.3,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.strokeStyle = "rgba(2, 12, 9, 0.32)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX - prop.width * 0.12, centerY - prop.height * 0.1);
  context.lineTo(centerX + prop.width * 0.06, centerY + prop.height * 0.1);
  context.stroke();
}

function drawRuinWall(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  seed: number,
): void {
  context.fillStyle = "#4a514a";
  context.fillRect(prop.x, prop.y, prop.width, prop.height);
  context.fillStyle = "rgba(186, 195, 172, 0.2)";
  context.fillRect(prop.x + 2, prop.y + 2, prop.width - 4, 5);
  context.fillStyle = "rgba(2, 12, 9, 0.38)";
  context.fillRect(prop.x + 2, prop.y + prop.height - 5, prop.width - 4, 4);

  context.strokeStyle = "rgba(24, 29, 25, 0.44)";
  context.lineWidth = 1;

  for (let index = 1; index < Math.floor(prop.width / 24); index += 1) {
    const x = prop.x + index * 24 + (seed % 5);
    context.beginPath();
    context.moveTo(x, prop.y + 3);
    context.lineTo(x, prop.y + prop.height - 3);
    context.stroke();
  }

  context.strokeStyle = "rgba(93, 142, 91, 0.38)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(prop.x + 4, prop.y + prop.height * 0.65);
  context.quadraticCurveTo(
    prop.x + prop.width * 0.3,
    prop.y + prop.height * 0.35,
    prop.x + prop.width * 0.52,
    prop.y + prop.height * 0.7,
  );
  context.stroke();
}

function drawRuinPillar(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  seed: number,
): void {
  const inset = 4;
  context.fillStyle = "#3d4540";
  context.fillRect(prop.x + inset, prop.y, prop.width - inset * 2, prop.height);
  context.fillStyle = "#5a625a";
  context.fillRect(prop.x, prop.y, prop.width, 7);
  context.fillStyle = "rgba(190, 199, 178, 0.22)";
  context.fillRect(prop.x, prop.y, prop.width, 2);
  context.fillStyle = "#343b37";
  context.fillRect(prop.x, prop.y + prop.height - 6, prop.width, 6);
  context.strokeStyle = "rgba(2, 12, 9, 0.32)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(prop.x + prop.width * 0.35, prop.y + 8);
  context.lineTo(prop.x + prop.width * 0.55, prop.y + prop.height * 0.45);
  context.lineTo(prop.x + prop.width * 0.42, prop.y + prop.height - 8);
  context.stroke();

  if (seed % 2 === 0) {
    context.strokeStyle = "rgba(93, 142, 91, 0.46)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(prop.x + 6, prop.y + 10);
    context.lineTo(prop.x + prop.width - 7, prop.y + 14);
    context.stroke();
  }
}

function drawCrate(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  context.fillStyle = "#70502f";
  context.fillRect(prop.x, prop.y, prop.width, prop.height);
  context.strokeStyle = "#3a281b";
  context.lineWidth = 2;
  context.strokeRect(prop.x + 1, prop.y + 1, prop.width - 2, prop.height - 2);
  context.strokeStyle = "rgba(226, 177, 111, 0.34)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(prop.x + 4, prop.y + 4);
  context.lineTo(prop.x + prop.width - 4, prop.y + prop.height - 4);
  context.moveTo(prop.x + prop.width - 4, prop.y + 4);
  context.lineTo(prop.x + 4, prop.y + prop.height - 4);
  context.stroke();
  context.fillStyle = "rgba(238, 198, 129, 0.18)";
  context.fillRect(prop.x + 3, prop.y + 3, prop.width - 6, 3);
}

function drawBarrel(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  const centerX = prop.x + prop.width / 2;
  const centerY = prop.y + prop.height / 2;

  context.fillStyle = "#5d452b";
  context.beginPath();
  context.ellipse(
    centerX,
    centerY,
    prop.width * 0.42,
    prop.height * 0.46,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.strokeStyle = "#33241a";
  context.lineWidth = 2;
  context.stroke();
  context.strokeStyle = "rgba(188, 184, 154, 0.46)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(prop.x + prop.width * 0.17, centerY - 3);
  context.lineTo(prop.x + prop.width * 0.83, centerY - 3);
  context.moveTo(prop.x + prop.width * 0.17, centerY + 4);
  context.lineTo(prop.x + prop.width * 0.83, centerY + 4);
  context.stroke();
  context.fillStyle = "rgba(238, 198, 129, 0.3)";
  context.beginPath();
  context.ellipse(
    centerX,
    prop.y + prop.height * 0.12,
    prop.width * 0.28,
    prop.height * 0.08,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
}

function drawTent(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  seed: number,
): void {
  const peakX = prop.x + prop.width / 2;
  const peakY = prop.y + 3;

  context.fillStyle = "#5d6246";
  context.beginPath();
  context.moveTo(peakX, peakY);
  context.lineTo(prop.x + prop.width, prop.y + prop.height);
  context.lineTo(prop.x, prop.y + prop.height);
  context.closePath();
  context.fill();
  context.strokeStyle = "#2e3328";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "rgba(238, 218, 159, 0.18)";
  context.beginPath();
  context.moveTo(peakX, peakY + 4);
  context.lineTo(peakX + 14, prop.y + prop.height - 2);
  context.lineTo(peakX + 4, prop.y + prop.height - 2);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(21, 24, 20, 0.48)";
  context.beginPath();
  context.moveTo(peakX, peakY + 12);
  context.lineTo(peakX + 22, prop.y + prop.height);
  context.lineTo(peakX - 22, prop.y + prop.height);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(210, 203, 165, 0.26)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(peakX, peakY);
  context.lineTo(peakX + 8, prop.y + prop.height - 3);
  context.moveTo(peakX, peakY);
  context.lineTo(peakX - 9, prop.y + prop.height - 3);
  context.stroke();

  if (seed % 3 === 0) {
    context.fillStyle = "rgba(255, 113, 92, 0.26)";
    context.fillRect(prop.x + 12, prop.y + prop.height * 0.45, 8, 5);
  }
}

function drawCart(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  const wheelRadius = Math.max(7, prop.height * 0.22);

  context.fillStyle = "#684a2c";
  context.fillRect(
    prop.x + 6,
    prop.y + prop.height * 0.22,
    prop.width - 12,
    prop.height * 0.42,
  );
  context.strokeStyle = "#34231b";
  context.lineWidth = 2;
  context.strokeRect(
    prop.x + 6,
    prop.y + prop.height * 0.22,
    prop.width - 12,
    prop.height * 0.42,
  );

  for (const wheelX of [prop.x + 20, prop.x + prop.width - 20]) {
    context.fillStyle = "#2d2119";
    context.beginPath();
    context.arc(wheelX, prop.y + prop.height * 0.76, wheelRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(223, 177, 115, 0.38)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(wheelX, prop.y + prop.height * 0.76, wheelRadius - 2, 0, Math.PI * 2);
    context.stroke();
  }

  context.strokeStyle = "#3c2b1d";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(prop.x + prop.width - 8, prop.y + prop.height * 0.5);
  context.lineTo(prop.x + prop.width + 13, prop.y + prop.height * 0.82);
  context.stroke();
}

function drawSign(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  context.fillStyle = "#46301f";
  context.fillRect(
    prop.x + prop.width / 2 - 2,
    prop.y + 7,
    4,
    prop.height - 7,
  );
  context.fillStyle = "#6c4d2c";
  context.fillRect(prop.x - 5, prop.y + 2, prop.width + 10, 13);
  context.strokeStyle = "#312116";
  context.lineWidth = 1.5;
  context.strokeRect(prop.x - 5, prop.y + 2, prop.width + 10, 13);
  context.fillStyle = "rgba(244, 205, 132, 0.56)";
  context.fillRect(prop.x + 1, prop.y + 6, prop.width, 2);
}

function drawLog(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
  seed: number,
): void {
  context.fillStyle = "#4b3323";
  context.beginPath();
  context.roundRect(prop.x, prop.y + 3, prop.width, prop.height - 6, 6);
  context.fill();
  context.strokeStyle = "#2c1d14";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#8d6843";
  context.beginPath();
  context.ellipse(
    prop.x + 3,
    prop.y + prop.height / 2,
    4,
    prop.height * 0.34,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.strokeStyle = "rgba(240, 198, 137, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(prop.x + 8, prop.y + prop.height * 0.35);
  context.lineTo(prop.x + prop.width - 5, prop.y + prop.height * 0.3);
  context.moveTo(prop.x + 16 + (seed % 10), prop.y + prop.height * 0.68);
  context.lineTo(prop.x + prop.width - 9, prop.y + prop.height * 0.7);
  context.stroke();
  context.fillStyle = "rgba(109, 156, 92, 0.32)";
  context.beginPath();
  context.ellipse(
    prop.x + prop.width * 0.55,
    prop.y + 3,
    prop.width * 0.2,
    3,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
}

function drawFence(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  const postCount = Math.max(2, Math.floor(prop.width / 26));

  context.strokeStyle = "#5a3d26";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(prop.x, prop.y + 4);
  context.lineTo(prop.x + prop.width, prop.y + 4);
  context.moveTo(prop.x, prop.y + prop.height - 4);
  context.lineTo(prop.x + prop.width, prop.y + prop.height - 4);
  context.stroke();

  for (let index = 0; index < postCount; index += 1) {
    const x = prop.x + (index / (postCount - 1)) * prop.width;
    context.fillStyle = "#4c311f";
    context.fillRect(x - 2, prop.y - 1, 4, prop.height + 3);
    context.fillStyle = "rgba(220, 170, 103, 0.24)";
    context.fillRect(x - 1, prop.y, 1, prop.height);
  }
}

function drawFallbackProp(
  context: CanvasRenderingContext2D,
  prop: MapPropDef,
): void {
  context.fillStyle = "#4f554a";
  context.fillRect(prop.x, prop.y, prop.width, prop.height);
}
