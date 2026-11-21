import type { MapData } from '../shared/types';

export const CHUNK_TILES = 8;
export const CHUNK_MARGIN_PX = 38;
export const MAX_CHUNKS_PER_FRAME = 2;

export interface ChunkRect {
  x: number;
  y: number;
  w: number;
  h: number;
  margin: number;
}

export interface BakeableStructure {
  col: number;
  row: number;
  w: number;
  h: number;
  bottomRow: number;
  isBorder: boolean;
  elevation: number;
  canvas: HTMLCanvasElement | null;
}

export interface ShadowStrokeOptions {
  shadowColor: string;
  shadowAlpha: number;
  shadowOffsetXFactor: number;
  shadowOffsetYFactor: number;
  blurPx: number;
  aoOuterColor: string;
  aoOuterWidth: number;
  aoInnerColor: string;
  aoInnerWidth: number;
}

/**
 * Shared dirty-chunk ground cache and structure-diff controller used across all
 * four map themes so crushed Hellcell walls never force a full-map re-bake.
 */
export class ChunkedGroundCache<TStructure extends BakeableStructure> {
  baseFloorCanvas: HTMLCanvasElement | null = null;
  groundCanvas: HTMLCanvasElement | null = null;
  private shadowScratch: HTMLCanvasElement | null = null;

  private baseKey = '';
  private lastWallRevision = 0;
  private dirtyTiles = new Set<number>();
  private dirtyChunkQueue: number[] = [];
  private queuedChunks = new Set<number>();

  fullRebuilds = 0;
  chunkRebuilds = 0;
  structuresBaked = 0;
  structuresReused = 0;

  markDirtyTile(col: number, row: number, mapWidth: number): void {
    if (col < 0 || row < 0 || mapWidth <= 0) return;
    this.dirtyTiles.add(row * mapWidth + col);
  }

  markDirtyTileKey(tileKeyStr: string, mapWidth: number): void {
    const comma = tileKeyStr.indexOf(',');
    if (comma <= 0) return;
    const col = Number(tileKeyStr.slice(0, comma));
    const row = Number(tileKeyStr.slice(comma + 1));
    if (Number.isFinite(col) && Number.isFinite(row)) {
      this.markDirtyTile(col, row, mapWidth);
    }
  }

  hasPendingChunks(): boolean {
    return this.dirtyChunkQueue.length > 0;
  }

  pendingChunkCount(): number {
    return this.dirtyChunkQueue.length;
  }

  /**
   * Reconcile old vs. new decomposed structures by `(col, row, w, h, isBorder)`,
   * reusing existing baked canvases for untouched buildings.
   */
  reconcileStructures(
    prevList: readonly TStructure[],
    nextList: TStructure[],
    bakeFn: (structure: TStructure) => void,
    byBottomRow: Map<number, TStructure[]>,
  ): void {
    const prevByRect = new Map<string, TStructure>();
    for (const prev of prevList) {
      const key = `${prev.col},${prev.row},${prev.w},${prev.h},${prev.isBorder ? 1 : 0}`;
      prevByRect.set(key, prev);
    }

    byBottomRow.clear();
    for (const next of nextList) {
      const key = `${next.col},${next.row},${next.w},${next.h},${next.isBorder ? 1 : 0}`;
      const existing = prevByRect.get(key);
      if (existing && (existing.canvas !== null || typeof document === 'undefined')) {
        next.canvas = existing.canvas;
        this.structuresReused += 1;
      } else {
        bakeFn(next);
        this.structuresBaked += 1;
      }

      const rowList = byBottomRow.get(next.bottomRow);
      if (rowList) rowList.push(next);
      else byBottomRow.set(next.bottomRow, [next]);
    }
  }

  private getShadowScratch(width: number, height: number): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const sc = this.shadowScratch ?? document.createElement('canvas');
    const targetW = Math.max(1, width);
    const targetH = Math.max(1, height);
    if (sc.width !== targetW || sc.height !== targetH) {
      sc.width = targetW;
      sc.height = targetH;
    }
    this.shadowScratch = sc;
    return sc;
  }

  private enqueueChunk(chunkIdx: number): void {
    if (this.queuedChunks.has(chunkIdx)) return;
    this.queuedChunks.add(chunkIdx);
    this.dirtyChunkQueue.push(chunkIdx);
  }

  /**
   * Keep the cached ground canvas & structures synchronized with `map`:
   * - Full rebuild only on seed/size/texture changes
   * - Structure diff + dirty chunk queueing on `wallRevision` changes
   * - Amortized processing of at most `MAX_CHUNKS_PER_FRAME` dirty chunks
   */
  sync(
    map: MapData,
    textureRevision: number,
    fullBake: () => { baseFloor: HTMLCanvasElement | null; ground: HTMLCanvasElement | null },
    diffStructures: () => void,
    patchChunk: (
      rect: ChunkRect,
      groundCanvas: HTMLCanvasElement | null,
      baseFloorCanvas: HTMLCanvasElement | null,
      shadowScratch: HTMLCanvasElement | null,
    ) => void,
  ): void {
    const nextBaseKey = `${map.seed}:${map.width}x${map.height}:${map.tileSize}:t${textureRevision}`;
    const needsDomCanvas = typeof document !== 'undefined' && (!this.groundCanvas || !this.baseFloorCanvas);

    if (nextBaseKey !== this.baseKey || needsDomCanvas) {
      this.dirtyTiles.clear();
      this.dirtyChunkQueue.length = 0;
      this.queuedChunks.clear();
      const baked = fullBake();
      this.baseFloorCanvas = baked.baseFloor;
      this.groundCanvas = baked.ground;
      this.baseKey = nextBaseKey;
      this.lastWallRevision = map.wallRevision ?? 0;
      this.fullRebuilds += 1;
      return;
    }

    const ts = map.tileSize;
    const chunkPx = CHUNK_TILES * ts;
    const chunkCols = Math.max(1, Math.ceil(map.width / CHUNK_TILES));
    const chunkRows = Math.max(1, Math.ceil(map.height / CHUNK_TILES));

    const wallRev = map.wallRevision ?? 0;
    if (wallRev !== this.lastWallRevision) {
      this.lastWallRevision = wallRev;
      const hadDirty = this.dirtyTiles.size > 0;
      diffStructures();

      if (hadDirty) {
        for (const tileIdx of this.dirtyTiles) {
          const tx = tileIdx % map.width;
          const ty = (tileIdx / map.width) | 0;
          const minPxX = Math.max(0, tx * ts - CHUNK_MARGIN_PX);
          const minPxY = Math.max(0, ty * ts - CHUNK_MARGIN_PX);
          const maxPxX = Math.min(map.width * ts - 1, (tx + 1) * ts + CHUNK_MARGIN_PX);
          const maxPxY = Math.min(map.height * ts - 1, (ty + 1) * ts + CHUNK_MARGIN_PX);

          const c0 = Math.max(0, Math.floor(minPxX / chunkPx));
          const c1 = Math.min(chunkCols - 1, Math.floor(maxPxX / chunkPx));
          const r0 = Math.max(0, Math.floor(minPxY / chunkPx));
          const r1 = Math.min(chunkRows - 1, Math.floor(maxPxY / chunkPx));
          for (let cy = r0; cy <= r1; cy += 1) {
            for (let cx = c0; cx <= c1; cx += 1) {
              this.enqueueChunk(cy * chunkCols + cx);
            }
          }
        }
        this.dirtyTiles.clear();
      } else {
        // restoreCrushedObstacles bumps wallRevision without per-tile events: amortize full map restore
        for (let cy = 0; cy < chunkRows; cy += 1) {
          for (let cx = 0; cx < chunkCols; cx += 1) {
            this.enqueueChunk(cy * chunkCols + cx);
          }
        }
      }
    }

    if (this.dirtyChunkQueue.length === 0) return;

    const worldW = map.width * ts;
    const worldH = map.height * ts;
    let processed = 0;

    while (this.dirtyChunkQueue.length > 0 && processed < MAX_CHUNKS_PER_FRAME) {
      const chunkIdx = this.dirtyChunkQueue.shift()!;
      this.queuedChunks.delete(chunkIdx);
      const cx = chunkIdx % chunkCols;
      const cy = (chunkIdx / chunkCols) | 0;
      const x = cx * chunkPx;
      const y = cy * chunkPx;
      const w = Math.min(chunkPx, worldW - x);
      const h = Math.min(chunkPx, worldH - y);
      if (w <= 0 || h <= 0) continue;

      const scratchW = Math.max(1, Math.ceil((w + CHUNK_MARGIN_PX * 2) * 0.5));
      const scratchH = Math.max(1, Math.ceil((h + CHUNK_MARGIN_PX * 2) * 0.5));
      const scratch = this.getShadowScratch(scratchW, scratchH);

      patchChunk(
        { x, y, w, h, margin: CHUNK_MARGIN_PX },
        this.groundCanvas,
        this.baseFloorCanvas,
        scratch,
      );
      this.chunkRebuilds += 1;
      processed += 1;
    }
  }
}

/** Filter structures whose cast shadows or AO strokes overlap an expanded chunk region. */
export function filterStructuresInRegion<TStructure extends BakeableStructure>(
  structures: readonly TStructure[],
  ts: number,
  rect: ChunkRect,
  shadowReachPx = 40,
): TStructure[] {
  const rx0 = rect.x - rect.margin - shadowReachPx;
  const ry0 = rect.y - rect.margin - shadowReachPx;
  const rx1 = rect.x + rect.w + rect.margin + 18;
  const ry1 = rect.y + rect.h + rect.margin + 18;
  const out: TStructure[] = [];

  for (let i = 0; i < structures.length; i += 1) {
    const s = structures[i];
    const sx0 = s.col * ts;
    const sy0 = s.row * ts;
    const sx1 = sx0 + s.w * ts;
    const sy1 = sy0 + s.h * ts;
    if (sx1 >= rx0 && sx0 <= rx1 && sy1 >= ry0 && sy0 <= ry1) {
      out.push(s);
    }
  }
  return out;
}

/**
 * Shared clipped shadow + ambient-occlusion painter used both for initial full-map
 * baking and fast incremental dirty-chunk patching across all four themes.
 */
export function drawStructureShadowsAndAoRegion<TStructure extends BakeableStructure>(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  structures: readonly TStructure[],
  opts: ShadowStrokeOptions,
  rect?: ChunkRect,
  scratchCanvas?: HTMLCanvasElement | null,
): void {
  const ts = map.tileSize;
  const worldW = map.width * ts;
  const worldH = map.height * ts;
  const rx = rect ? rect.x : 0;
  const ry = rect ? rect.y : 0;
  const rw = rect ? rect.w : worldW;
  const rh = rect ? rect.h : worldH;
  const margin = rect ? rect.margin : 0;

  const list = rect ? filterStructuresInRegion(structures, ts, rect) : structures;

  // 1. Directional cast shadows on 0.5x canvas (only sized to chunk+margin when patching!)
  if (typeof document !== 'undefined' && list.length > 0) {
    const padX0 = Math.max(0, rx - margin);
    const padY0 = Math.max(0, ry - margin);
    const padX1 = Math.min(worldW, rx + rw + margin);
    const padY1 = Math.min(worldH, ry + rh + margin);
    const padW = Math.max(1, padX1 - padX0);
    const padH = Math.max(1, padY1 - padY0);

    const sc = scratchCanvas ?? document.createElement('canvas');
    const targetW = Math.max(1, Math.floor(padW * 0.5));
    const targetH = Math.max(1, Math.floor(padH * 0.5));
    if (sc.width !== targetW || sc.height !== targetH) {
      sc.width = targetW;
      sc.height = targetH;
    }

    const sctx = sc.getContext('2d');
    if (sctx) {
      sctx.save();
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, sc.width, sc.height);
      sctx.fillStyle = opts.shadowColor;

      // Multi-tap soft shadow offsets instead of slow ctx.filter blur
      const taps =
        opts.blurPx > 0
          ? [
              { ox: 0, oy: 0, alpha: 0.48 },
              { ox: 2.2, oy: 2.2, alpha: 0.24 },
              { ox: -1.8, oy: 1.8, alpha: 0.16 },
              { ox: 2.2, oy: -1.8, alpha: 0.16 },
            ]
          : [{ ox: 0, oy: 0, alpha: 1 }];

      for (const tap of taps) {
        sctx.save();
        sctx.scale(0.5, 0.5);
        sctx.translate(-padX0 + tap.ox, -padY0 + tap.oy);
        sctx.globalAlpha = tap.alpha;

        for (const s of list) {
          const bx = s.col * ts;
          const by = s.row * ts;
          const bw = s.w * ts;
          const bh = s.h * ts;
          const dx = s.elevation * opts.shadowOffsetXFactor;
          const dy = s.elevation * opts.shadowOffsetYFactor;

          sctx.beginPath();
          sctx.moveTo(bx + bw, by);
          sctx.lineTo(bx + bw + dx, by + dy);
          sctx.lineTo(bx + bw + dx, by + bh + dy);
          sctx.lineTo(bx + dx, by + bh + dy);
          sctx.lineTo(bx, by + bh);
          sctx.closePath();
          sctx.fill();
        }
        sctx.restore();
      }
      sctx.restore();

      ctx.save();
      ctx.globalAlpha = opts.shadowAlpha;
      ctx.drawImage(sc, padX0, padY0, padW, padH);
      ctx.restore();
    }
  }

  // 2. Ambient occlusion contact seams around interior structures
  ctx.save();
  for (const s of list) {
    if (s.isBorder) continue;
    const bx = s.col * ts;
    const by = s.row * ts;
    const bw = s.w * ts;
    const bh = s.h * ts;

    ctx.strokeStyle = opts.aoOuterColor;
    ctx.lineWidth = opts.aoOuterWidth;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.strokeStyle = opts.aoInnerColor;
    ctx.lineWidth = opts.aoInnerWidth;
    ctx.strokeRect(bx, by, bw, bh);
  }
  ctx.restore();
}
