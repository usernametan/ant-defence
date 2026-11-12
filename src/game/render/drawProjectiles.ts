import type {
  ActiveProjectile,
  ProjectileSystem,
} from "../combat/ProjectileSystem";

export function drawProjectiles(
  context: CanvasRenderingContext2D,
  projectiles: ProjectileSystem,
): void {
  projectiles.forEachActive((projectile) => {
    drawProjectile(context, projectile);
  });
}

function drawProjectile(
  context: CanvasRenderingContext2D,
  projectile: ActiveProjectile,
): void {
  const speed = Math.hypot(
    projectile.velocityX,
    projectile.velocityY,
  );

  if (speed < 1e-6) {
    return;
  }

  const directionX = projectile.velocityX / speed;
  const directionY = projectile.velocityY / speed;
  const trailLength = Math.min(30, speed * 0.032);
  const tailX = projectile.x - directionX * trailLength;
  const tailY = projectile.y - directionY * trailLength;

  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";

  context.strokeStyle = projectile.color;
  context.globalAlpha = 0.34;
  context.lineWidth = projectile.radius * 1.9;
  context.beginPath();
  context.moveTo(tailX, tailY);
  context.lineTo(projectile.x, projectile.y);
  context.stroke();

  context.globalAlpha = 0.9;
  context.strokeStyle = projectile.coreColor;
  context.lineWidth = Math.max(1, projectile.radius * 0.62);
  context.beginPath();
  context.moveTo(
    projectile.x - directionX * trailLength * 0.55,
    projectile.y - directionY * trailLength * 0.55,
  );
  context.lineTo(projectile.x, projectile.y);
  context.stroke();

  context.globalAlpha = 1;
  context.fillStyle = projectile.coreColor;
  context.beginPath();
  context.arc(
    projectile.x,
    projectile.y,
    projectile.radius,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}
