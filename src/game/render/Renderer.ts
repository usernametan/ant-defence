import { clamp } from "../core/math";
import type { GameConfig } from "../core/types";
import type { Camera } from "./Camera";

export interface RenderState {
  timeSeconds: number;
  debug: boolean;
}

const GRID_COLOR = "rgba(117, 245, 203, 0.08)";
const MAJOR_GRID_COLOR = "rgba(117, 245, 203, 0.17)";
const WORLD_EDGE_COLOR = "rgba(247, 191, 91, 0.48)";

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver | null;
  private scaleX = 1;
  private scaleY = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly config: GameConfig,
    private readonly camera: Camera,
  ) {
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Canvas 2D is unavailable");
    }

    this.context = context;
    this.resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(canvas);
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width || this.config.viewportWidth;
    const cssHeight = rect.height || this.config.viewportHeight;
    const dpr = clamp(
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      1,
      this.config.dprCap,
    );
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.scaleX = width / this.config.viewportWidth;
    this.scaleY = height / this.config.viewportHeight;
  }

  render(state: RenderState): void {
    const context = this.context;
    const { viewportWidth, viewportHeight } = this.config;

    context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    this.drawBackdrop(state.timeSeconds);
    this.drawWorld(state.timeSeconds);

    if (state.debug) {
      this.drawDebug();
    }

    this.drawVignette();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
  }

  private drawBackdrop(timeSeconds: number): void {
    const context = this.context;
    const { viewportWidth, viewportHeight } = this.config;
    const gradient = context.createLinearGradient(0, 0, 0, viewportHeight);
    gradient.addColorStop(0, "#061210");
    gradient.addColorStop(0.46, "#09211c");
    gradient.addColorStop(1, "#0b2a23");
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewportWidth, viewportHeight);

    const pulse = 0.5 + Math.sin(timeSeconds * 0.35) * 0.08;
    const glow = context.createRadialGradient(
      viewportWidth * 0.68,
      viewportHeight * 0.36,
      12,
      viewportWidth * 0.68,
      viewportHeight * 0.36,
      viewportWidth * 0.72,
    );
    glow.addColorStop(0, `rgba(44, 172, 139, ${0.2 * pulse})`);
    glow.addColorStop(0.48, "rgba(21, 86, 73, 0.08)");
    glow.addColorStop(1, "rgba(3, 10, 9, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, viewportWidth, viewportHeight);
  }

  private drawWorld(timeSeconds: number): void {
    const context = this.context;
    const { worldWidth, worldHeight, tileSize } = this.config;
    const camera = this.camera;

    context.save();
    context.translate(-camera.left, -camera.top);

    context.fillStyle = "#0a241e";
    context.fillRect(0, 0, worldWidth, worldHeight);

    const viewLeft = clamp(camera.left, 0, worldWidth);
    const viewTop = clamp(camera.top, 0, worldHeight);
    const viewRight = clamp(camera.right, 0, worldWidth);
    const viewBottom = clamp(camera.bottom, 0, worldHeight);

    this.drawGrid(viewLeft, viewTop, viewRight, viewBottom, tileSize);
    this.drawContours(timeSeconds);
    this.drawWorldMarkers(timeSeconds);

    context.strokeStyle = WORLD_EDGE_COLOR;
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, worldWidth - 3, worldHeight - 3);

    context.restore();
  }

  private drawGrid(
    left: number,
    top: number,
    right: number,
    bottom: number,
    tileSize: number,
  ): void {
    const context = this.context;
    const startX = Math.floor(left / tileSize) * tileSize;
    const startY = Math.floor(top / tileSize) * tileSize;

    for (let x = startX; x <= right; x += tileSize) {
      const major = Math.round(x / tileSize) % 4 === 0;
      context.strokeStyle = major ? MAJOR_GRID_COLOR : GRID_COLOR;
      context.lineWidth = major ? 1.25 : 1;
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();
    }

    for (let y = startY; y <= bottom; y += tileSize) {
      const major = Math.round(y / tileSize) % 4 === 0;
      context.strokeStyle = major ? MAJOR_GRID_COLOR : GRID_COLOR;
      context.lineWidth = major ? 1.25 : 1;
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
    }
  }

  private drawContours(timeSeconds: number): void {
    const context = this.context;
    const { worldWidth, worldHeight } = this.config;
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const drift = Math.sin(timeSeconds * 0.12) * 8;

    context.save();
    context.strokeStyle = "rgba(117, 245, 203, 0.09)";
    context.lineWidth = 1;

    for (let radius = 180; radius <= 620; radius += 110) {
      context.beginPath();
      context.ellipse(
        centerX + drift,
        centerY,
        radius * 1.18,
        radius * 0.58,
        -0.18,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    context.restore();
  }

  private drawWorldMarkers(timeSeconds: number): void {
    const context = this.context;
    const { worldWidth, worldHeight, tileSize } = this.config;
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const pulse = 0.5 + Math.sin(timeSeconds * 1.4) * 0.5;

    context.save();
    context.strokeStyle = `rgba(247, 191, 91, ${0.45 + pulse * 0.25})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(centerX, centerY, 42 + pulse * 5, 0, Math.PI * 2);
    context.stroke();

    context.strokeStyle = "rgba(247, 191, 91, 0.32)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(centerX - 68, centerY);
    context.lineTo(centerX + 68, centerY);
    context.moveTo(centerX, centerY - 68);
    context.lineTo(centerX, centerY + 68);
    context.stroke();

    context.fillStyle = "rgba(202, 255, 236, 0.52)";
    context.font = "500 11px 'IBM Plex Mono', monospace";
    context.textAlign = "center";
    context.fillText("FOUNDATION GRID", centerX, centerY + 70);

    context.font = "400 10px 'IBM Plex Mono', monospace";
    context.fillStyle = "rgba(202, 255, 236, 0.28)";

    for (let x = tileSize * 4; x < worldWidth; x += tileSize * 8) {
      for (let y = tileSize * 4; y < worldHeight; y += tileSize * 8) {
        if (Math.abs(x - centerX) < 180 && Math.abs(y - centerY) < 180) {
          continue;
        }

        context.fillText(
          `${String(x).padStart(4, "0")}:${String(y).padStart(4, "0")}`,
          x,
          y,
        );
      }
    }

    context.restore();
  }

  private drawDebug(): void {
    const context = this.context;
    const { viewportWidth, viewportHeight, worldWidth, worldHeight } =
      this.config;
    const camera = this.camera;

    context.save();
    context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    context.strokeStyle = "rgba(247, 191, 91, 0.8)";
    context.lineWidth = 1;
    context.setLineDash([6, 5]);
    context.strokeRect(12.5, 12.5, viewportWidth - 25, viewportHeight - 25);
    context.setLineDash([]);

    context.fillStyle = "rgba(4, 14, 12, 0.78)";
    context.fillRect(18, viewportHeight - 92, 300, 72);
    context.strokeStyle = "rgba(117, 245, 203, 0.28)";
    context.strokeRect(18.5, viewportHeight - 91.5, 299, 71);

    context.fillStyle = "rgba(202, 255, 236, 0.86)";
    context.font = "500 11px 'IBM Plex Mono', monospace";
    context.textAlign = "left";
    context.fillText(
      `CAM ${Math.round(camera.x)} / ${Math.round(camera.y)}`,
      32,
      viewportHeight - 64,
    );
    context.fillText(
      `VIEW ${camera.width} x ${camera.height}`,
      32,
      viewportHeight - 46,
    );
    context.fillText(
      `WORLD ${worldWidth} x ${worldHeight}`,
      32,
      viewportHeight - 28,
    );
    context.restore();
  }

  private drawVignette(): void {
    const context = this.context;
    const { viewportWidth, viewportHeight } = this.config;
    const vignette = context.createRadialGradient(
      viewportWidth / 2,
      viewportHeight / 2,
      viewportHeight * 0.18,
      viewportWidth / 2,
      viewportHeight / 2,
      viewportWidth * 0.72,
    );
    vignette.addColorStop(0, "rgba(1, 8, 7, 0)");
    vignette.addColorStop(1, "rgba(1, 8, 7, 0.62)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, viewportWidth, viewportHeight);
  }
}
