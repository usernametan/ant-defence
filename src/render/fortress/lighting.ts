import type { MapData } from '../../shared/types';
import {
  drawStructureShadowsAndAoRegion,
  filterStructuresInRegion,
  type ChunkRect,
  type ShadowStrokeOptions,
} from '../groundCache';
import { hash2, type FortressStructure } from './architecture';
import {
  drawEnergyConduitChannel,
  drawHazardChevronStrip,
  drawRecessedVentGrille,
  drawTechFloorLabel,
} from './props';
import type { FortressTextureAtlas } from './textures';

function drawMaskedTextureLayer(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  worldH: number,
  pattern: CanvasPattern | null,
  drawMask: (mctx: CanvasRenderingContext2D) => void,
): void {
  if (!pattern || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = worldW;
  canvas.height = worldH;
  const mctx = canvas.getContext('2d');
  if (!mctx) return;

  mctx.globalCompositeOperation = 'source-over';
  drawMask(mctx);

  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = pattern;
  mctx.fillRect(0, 0, worldW, worldH);

  ctx.drawImage(canvas, 0, 0);
}

function drawCryoCoolantBasins(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  textures: FortressTextureAtlas,
): void {
  const ts = map.tileSize;
  const waterPat = textures.getPattern(ctx, 'waterCryoCoolant', 0.36);

  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      if (map.tiles[r][c] !== 'water') continue;
      const x = c * ts;
      const y = r * ts;
      const padT = map.tiles[r - 1]?.[c] === 'water' ? 0 : 4;
      const padB = map.tiles[r + 1]?.[c] === 'water' ? 0 : 3;
      const padL = map.tiles[r]?.[c - 1] === 'water' ? 0 : 4;
      const padR = map.tiles[r]?.[c + 1] === 'water' ? 0 : 3;

      // Armored containment basin rim with yellow/cyan trim
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(x, y, ts, ts);
      ctx.fillStyle = '#0F172A';
      if (padT > 0) ctx.fillRect(x, y, ts, 2);
      if (padL > 0) ctx.fillRect(x, y, 2, ts);
      ctx.fillStyle = '#EAB308';
      if (padT > 0 && c % 2 === 0) ctx.fillRect(x + 4, y + 1, ts - 8, 2);

      // Glowing cryo-coolant fluid
      ctx.fillStyle = waterPat ?? '#0B3E6E';
      ctx.fillRect(x + padL, y + padT, ts - padL - padR, ts - padT - padB);

      // Subtle inner cyan rim highlight along wall
      ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
      if (padT > 0) ctx.fillRect(x + padL, y + padT, ts - padL - padR, 2);
      if (padL > 0) ctx.fillRect(x + padL, y + padT, 2, ts - padT - padB);
    }
  }
}

function drawFacilityFloorEngineering(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  textures: FortressTextureAtlas,
): void {
  const ts = map.tileSize;
  const worldW = map.width * ts;

  // 1. Continuous horizontal maintenance conduit tracks along crate lanes (row = 8, 20, 31)
  for (const laneRow of [8, 20, 31]) {
    const cy = laneRow * ts + ts * 0.5;
    const isCenterLane = laneRow === 20;
    drawEnergyConduitChannel(
      ctx,
      ts * 5,
      cy,
      worldW - ts * 5,
      cy,
      isCenterLane ? '#22D3EE' : '#38BDF8',
      isCenterLane ? 8 : 5,
    );

    // Periodic junction vents & hazard strips along lane track
    for (let c = 8; c < map.width - 8; c += 8) {
      const gx = c * ts + 6;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(gx, cy - 6, 20, 12);
      ctx.strokeStyle = '#070B14';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(gx, cy - 6, 20, 12);
      ctx.fillStyle = c % 16 === 0 ? '#A855F7' : '#22D3EE';
      ctx.fillRect(gx + 8, cy - 2, 4, 4);
    }
  }

  // 2. Vertical cross-facility coolant/power trunks connecting Zones A/B/C
  for (const z of map.zones) {
    drawEnergyConduitChannel(ctx, z.center.x, ts * 3, z.center.x, (map.height - 3) * ts, '#22D3EE', 5);
  }

  // 3. Octagonal Deployment Base Frames around Player & Enemy Spawn Pads
  for (const b of map.bases) {
    const bx = b.center.x;
    const by = b.center.y;
    const teamHex = b.team === 'player' ? '#22D3EE' : '#FF5A3C';
    ctx.save();
    ctx.translate(bx, by);

    // Recessed octagonal bunker skirt
    ctx.fillStyle = '#0B111E';
    ctx.beginPath();
    const r = 68;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Subtle energy accent brackets
    ctx.strokeStyle = teamHex;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    drawHazardChevronStrip(ctx, -26, -64, 52, 4);
    drawHazardChevronStrip(ctx, -26, 60, 52, 4);
    ctx.restore();
  }

  // 4. Landmark Circular Reactor Sub-Deck in Upper-Left & Accelerator Deck in Lower-Right
  const deckCoords = [
    { x: 9.5 * ts, y: 6.5 * ts, r: 78, color: '#22D3EE', label: 'REACTOR-01' },
    { x: (map.width - 9.5) * ts, y: (map.height - 6.5) * ts, r: 78, color: '#A855F7', label: 'TURBINE-02' },
  ];
  for (const d of deckCoords) {
    ctx.save();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = d.color;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawTechFloorLabel(ctx, d.x - 28, d.y + d.r + 6, d.label);
    ctx.restore();
  }

  // 5. Capture Zone Architectural Sub-Floors (matches concept art circular hubs)
  for (let i = 0; i < map.zones.length; i += 1) {
    const z = map.zones[i];
    const platPat = textures.getPattern(ctx, 'floorLabPlating', 0.32);
    ctx.save();
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 128, 0, Math.PI * 2);
    ctx.fillStyle = platPat ?? '#222D40';
    ctx.fill();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(z.center.x, z.center.y, 124, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 6. Recessed floor ventilation grilles & stencil labels on open metal bays
  const labels = ['SEC-A1', 'LAB-02', 'CORE-B', 'CRYO-3', 'BAY-04'];
  for (let r = 2; r < map.height - 2; r += 1) {
    for (let c = 2; c < map.width - 2; c += 1) {
      if (map.tiles[r][c] !== 'floor') continue;
      const h = hash2(c, r, map.seed + 911);
      const x = c * ts;
      const y = r * ts;

      const nearZone = map.zones.some((z) => Math.hypot(x + 16 - z.center.x, y + 16 - z.center.y) < z.radius + 18);
      if (nearZone) continue;

      if (h < 0.045) {
        drawRecessedVentGrille(ctx, x + 4, y + 6, ts - 8, ts - 12);
      } else if (h > 0.968 && map.tiles[r]?.[c + 1] === 'floor') {
        drawTechFloorLabel(ctx, x + 2, y + 12, labels[(c + r) % labels.length]);
      }
    }
  }
}

const FORTRESS_SHADOW_OPTS: ShadowStrokeOptions = {
  shadowColor: '#03060E',
  shadowAlpha: 0.56,
  shadowOffsetXFactor: 0.76,
  shadowOffsetYFactor: 0.58,
  blurPx: 5,
  aoOuterColor: 'rgba(4, 7, 16, 0.34)',
  aoOuterWidth: 14,
  aoInnerColor: 'rgba(3, 5, 12, 0.62)',
  aoInnerWidth: 5,
};

export function drawFortressShadowsForRect(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  structures: readonly FortressStructure[],
  rect?: ChunkRect,
  scratchCanvas?: HTMLCanvasElement | null,
): void {
  drawStructureShadowsAndAoRegion(ctx, map, structures, FORTRESS_SHADOW_OPTS, rect, scratchCanvas);

  const ts = map.tileSize;
  const list = rect ? filterStructuresInRegion(structures, ts, rect, 72) : structures;

  // Localized emissive light pools (cyan on reactors/labs, subtle violet on capacitor hubs)
  ctx.save();
  for (const s of list) {
    if (s.isBorder) continue;
    const cx = (s.col + s.w * 0.5) * ts;
    const cy = (s.row + s.h * 0.5) * ts;
    if (s.kind === 'reactorTower' || s.kind === 'glassLabBay' || s.kind === 'acceleratorCradle') {
      const rad = Math.max(s.w, s.h) * ts * 0.95 + 48;
      const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, rad);
      const isViolet = s.accentTone === 'violet' || s.kind === 'acceleratorCradle';
      g.addColorStop(0, isViolet ? 'rgba(168, 85, 247, 0.22)' : 'rgba(34, 211, 238, 0.24)');
      g.addColorStop(0.55, isViolet ? 'rgba(168, 85, 247, 0.08)' : 'rgba(56, 189, 248, 0.09)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'techPillar' && s.accentTone === 'violet') {
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
      g.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 46, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFortressOuterEdgeShade(ctx: CanvasRenderingContext2D, map: MapData): void {
  const ts = map.tileSize;
  const worldW = map.width * ts;
  const worldH = map.height * ts;
  ctx.save();
  const shadeEdge = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(4, 7, 15, 0.5)');
    g.addColorStop(1, 'rgba(4, 7, 15, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  shadeEdge(0, 0, 0, ts * 3, 0, 0, worldW, ts * 3);
  shadeEdge(0, worldH, 0, worldH - ts * 3, 0, worldH - ts * 3, worldW, ts * 3);
  shadeEdge(0, 0, ts * 3, 0, 0, 0, ts * 3, worldH);
  shadeEdge(worldW, 0, worldW - ts * 3, 0, worldW - ts * 3, 0, ts * 3, worldH);
  ctx.restore();
}

/**
 * Bakes the static Futuristic Research Facility floor layer: modular gunmetal deck plates,
 * dark perimeter industrial grating, lighter lab plating corridors, illuminated conduit tracks,
 * cryo-coolant basins, recessed ventilation grilles, octagonal spawn decks, and localized lighting.
 */
export function bakeFortressGroundLayer(
  map: MapData,
  structures: readonly FortressStructure[],
  textures: FortressTextureAtlas,
  existingCanvas?: HTMLCanvasElement | null,
  skipDynamicShadows = false,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const ts = map.tileSize;
  const worldW = map.width * ts;
  const worldH = map.height * ts;
  const canvas = existingCanvas ?? document.createElement('canvas');
  canvas.width = worldW;
  canvas.height = worldH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Dark gunmetal modular base floor
  const deckPat = textures.getPattern(ctx, 'floorGunmetalDeck', 0.36);
  ctx.fillStyle = deckPat ?? '#182030';
  ctx.fillRect(0, 0, worldW, worldH);

  // 2. Dark steel catwalk grating under perimeter machinery zones & bays
  const gratePat = textures.getPattern(ctx, 'floorDarkGrating', 0.42);
  drawMaskedTextureLayer(ctx, worldW, worldH, gratePat, (mctx) => {
    for (const s of structures) {
      if (s.isBorder) continue;
      const cx = (s.col + s.w * 0.5) * ts;
      const cy = (s.row + s.h * 0.5) * ts;
      const rad = Math.max(s.w, s.h) * ts * 0.72 + 34;
      const g = mctx.createRadialGradient(cx, cy, rad * 0.3, cx, cy, rad);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = g;
      mctx.beginPath();
      mctx.arc(cx, cy, rad, 0, Math.PI * 2);
      mctx.fill();
    }
  });

  // 3. Lighter slate research plating along main transit avenues & capture plazas
  const labPat = textures.getPattern(ctx, 'floorLabPlating', 0.36);
  const [zA, zB, zC] = map.zones;
  const [bP, bE] = map.bases;
  if (bP && bE && zA && zB && zC) {
    drawMaskedTextureLayer(ctx, worldW, worldH, labPat, (mctx) => {
      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';
      for (const pass of [
        { width: 108, alpha: 0.42 },
        { width: 78, alpha: 0.76 },
        { width: 52, alpha: 0.94 },
      ]) {
        mctx.strokeStyle = `rgba(0, 0, 0, ${pass.alpha})`;
        mctx.lineWidth = pass.width;
        mctx.beginPath();
        mctx.moveTo(bP.center.x, bP.center.y);
        mctx.lineTo(zA.center.x, zA.center.y);
        mctx.lineTo(zB.center.x, zB.center.y);
        mctx.lineTo(zC.center.x, zC.center.y);
        mctx.lineTo(bE.center.x, bE.center.y);
        mctx.moveTo(bP.center.x, bP.center.y);
        mctx.lineTo(zB.center.x, zB.center.y);
        mctx.lineTo(bE.center.x, bE.center.y);
        mctx.moveTo(zA.center.x, zA.center.y);
        mctx.lineTo(zC.center.x, zC.center.y);
        mctx.stroke();
      }
    });
  }

  // 4. Conduit channels, octagonal base decks, circular hub plates, recessed vents & labels
  drawFacilityFloorEngineering(ctx, map, textures);

  // 5. Cryo-coolant containment basins
  drawCryoCoolantBasins(ctx, map, textures);

  // 6. Spawn pads inside octagonal frames
  for (let r = 0; r < map.height; r += 1) {
    for (let c = 0; c < map.width; c += 1) {
      const kind = map.tiles[r][c];
      if (kind !== 'spawnPlayer' && kind !== 'spawnEnemy') continue;
      const x = c * ts;
      const y = r * ts;
      ctx.fillStyle = kind === 'spawnPlayer' ? 'rgba(34, 211, 238, 0.16)' : 'rgba(255, 90, 60, 0.16)';
      ctx.fillRect(x, y, ts, ts);
      ctx.strokeStyle = kind === 'spawnPlayer' ? 'rgba(34, 211, 238, 0.42)' : 'rgba(255, 90, 60, 0.42)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
    }
  }

  drawFortressOuterEdgeShade(ctx, map);

  // 7. Directional cast shadows, AO & localized cyan/violet emissive lighting
  if (!skipDynamicShadows) {
    drawFortressShadowsForRect(ctx, map, structures);
  }

  return canvas;
}

export function drawFortressAnimatedWater(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ts: number,
  time: number,
  c: number,
  r: number,
): void {
  const wave = Math.sin(time * 2.4 + c * 0.8 + r * 0.6);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
  ctx.globalAlpha = 0.24 + (wave + 1) * 0.12;
  ctx.fillRect(x + 5, y + 8 + wave * 2.2, ts - 10, 2);
  ctx.fillRect(x + 9, y + 20 - wave * 2.2, ts - 16, 1.8);
  ctx.globalAlpha = 1;
}

/** Cool steel-navy research facility atmosphere with subtle directional lighting depth. */
export function drawFortressAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Subtle cool top-left overhead facility ambient + deeper navy edge vignette
  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, 'rgba(56, 189, 248, 0.045)');
  wash.addColorStop(0.55, 'rgba(15, 23, 42, 0)');
  wash.addColorStop(1, 'rgba(4, 8, 20, 0.14)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  if (!reducedMotion) {
    const pulse = 0.032 + 0.01 * Math.sin(time * 0.85);
    const beam = ctx.createRadialGradient(
      width * 0.22,
      height * 0.2,
      20,
      width * 0.25,
      height * 0.24,
      Math.max(width, height) * 0.55,
    );
    beam.addColorStop(0, `rgba(103, 232, 249, ${pulse.toFixed(3)})`);
    beam.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}
