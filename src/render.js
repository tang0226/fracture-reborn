import { needsArbitraryPrecision } from './store.js';
import { store } from './store.js';
import { buildColoringSettings } from './coloring.js';

export const colorizeWorker = new Worker(new URL('./workers/colorize.worker.js', import.meta.url), { type: 'module' });
const workerPool = [];

// Broadcast a message to every worker in the pool (e.g. settings updates).
function postAll(msg) {
  for (let worker of workerPool) {
    worker.postMessage(msg);
  }
}

// Workers are recreated on each full render to cancel in-flight iteration; this keeps creation in one place.
function createIterateWorker() {
  return new Worker(new URL('./workers/iterate.worker.js', import.meta.url), { type: 'module' });
}

let renderID = 0;
let renderStartTime = 0;
let colorizeListener = null;

// Iteration data cache
let tileCache = null;      // { snapshot, strides: Map<stride, { buf, width, height }> }
let pendingCache = null;   // same shape; becomes tileCache on full render completion
let cacheProduced = false; // false if last full render couldn't allocate buffers

// Returns the effective pixel grid size for a stride, matching buildTileQueue's own dimension logic.
// AA at stride 1 scales the full grid; all other strides divide canvas dimensions.
function strideDimensions(settings, stride) {
  const { canvas, render } = settings;
  if (stride === 1 && render.antiAliasing) {
    return { width: canvas.width * render.antiAliasing, height: canvas.height * render.antiAliasing };
  }
  return { width: Math.ceil(canvas.width / stride), height: Math.ceil(canvas.height / stride) };
}

// Returns true if tileCache holds iteration data usable for the current settings.
// Excludes tileSize, workerCount, and coloring — only iteration-affecting fields are part of the key.
// cacheProduced guards against a stale tileCache left over before a failed allocation.
function isCacheValid(settings) {
  if (!tileCache || !cacheProduced) return false;
  const s = tileCache.snapshot;
  const { render } = settings;
  const effectiveStrides = render.progressive ? render.strides : [1];
  if (!effectiveStrides.every(stride => tileCache.strides.has(stride))) return false;
  return s.viewport === settings.viewport &&
         s.canvasWidth === settings.canvas.width &&
         s.canvasHeight === settings.canvas.height &&
         s.fractal === settings.fractal &&
         s.iteration === settings.iteration &&
         s.engine === settings.engine &&
         s.antiAliasing === render.antiAliasing;
}

// Replaces any existing colorize listener so concurrent renders don't double-count tiles.
// onAllDone fires once all colorize tiles land — used to commit pendingCache → tileCache.
function setupColorizeListener(tilesTotal, startTime, onAllDone) {
  if (colorizeListener) colorizeWorker.removeEventListener('message', colorizeListener);
  let colorizedDone = 0;
  colorizeListener = ({ data }) => {
    if (data.type === 'tileDone') {
      colorizedDone++;
      store.dispatch({ type: 'renderStatus/tileDone', payload: { elapsed: performance.now() - startTime } });
      if (colorizedDone === tilesTotal) {
        store.dispatch({ type: 'renderStatus/done', payload: { elapsed: performance.now() - startTime } });
        colorizeWorker.removeEventListener('message', colorizeListener);
        colorizeListener = null;
        onAllDone?.();
      }
    }
  };
  colorizeWorker.addEventListener('message', colorizeListener);
}

// Writes a completed iterate tile into the flat per-stride buffer using absolute pixel offsets,
// so the cache is independent of tile size and can be re-tiled on replay.
function saveTileToCache(payload) {
  if (!pendingCache) return;
  const { tile, buf } = payload;
  const strideData = pendingCache.strides.get(tile.stride);
  if (!strideData) return;
  for (let row = 0; row < tile.h; row++) {
    const srcOff = row * tile.w * 2;
    const dstOff = ((tile.y + row) * strideData.width + tile.x) * 2;
    strideData.buf.set(buf.subarray(srcOff, srcOff + tile.w * 2), dstOff);
  }
}

// Extracts a tile-shaped slice from the flat cache buffer and sends it directly to the colorize worker,
// skipping iteration entirely. Any tile size works because the buffer is indexed by absolute pixel coord.
function replayTileFromCache(tile, id) {
  const strideData = tileCache.strides.get(tile.stride);
  const tileBuf = new Float64Array(tile.w * tile.h * 2);
  for (let row = 0; row < tile.h; row++) {
    const srcOff = ((tile.y + row) * strideData.width + tile.x) * 2;
    tileBuf.set(strideData.buf.subarray(srcOff, srcOff + tile.w * 2), row * tile.w * 2);
  }
  colorizeWorker.postMessage({ type: 'colorize', payload: { buf: tileBuf, tile, renderID: id } });
}

// Public entry point. Snapshots the current canvas size, increments renderID to invalidate
// any in-flight workers from the previous render, then dispatches to the appropriate renderer.
export function render(settings) {
  renderID++;

  const canvas = { width: window.innerWidth, height: window.innerHeight };
  store.dispatch({ type: 'canvas/setDim', payload: canvas });
  settings = { ...settings, canvas };

  const { engine, viewport } = settings;

  if (needsArbitraryPrecision(viewport, engine) && engine.usePerturbation) {
    // create reference orbit
  }

  if (settings.engine.processor === 'gpu') {
    // renderGPU
  } else {
    renderCPU(settings, renderID);
  }
}

// Fast path: if iteration data is cached for these settings, replay buffers to the colorize worker
// and skip iteration entirely. Full path: terminates in-flight workers, rebuilds the worker pool
// to match workerCount, attempts to allocate cache buffers, then dispatches tiles pass by pass.
async function renderCPU(settings, id) {
  const { render } = settings;
  pendingCache = null; // abandon any in-progress cache build

  const effectiveStrides = render.progressive ? render.strides : [1];
  const tileSets = effectiveStrides.map(s => buildTileQueue(settings, s));
  const tilesTotal = tileSets.reduce((sum, t) => sum + t.length, 0);
  const coloringPayload = { ...settings, coloring: buildColoringSettings(settings.coloring), renderID: id };

  if (isCacheValid(settings)) {
    // ── Fast path: re-colorize from cache ─────────────────────────────
    colorizeWorker.postMessage({ type: 'settings', payload: coloringPayload });
    renderStartTime = performance.now();
    store.dispatch({ type: 'renderStatus/start', payload: { tilesTotal, fromCache: true } });
    setupColorizeListener(tilesTotal, renderStartTime, null);

    for (let i = 0; i < effectiveStrides.length; i++) {
      if (id !== renderID) return;
      for (const tile of tileSets[i]) {
        replayTileFromCache(tile, id);
      }
    }
    return;
  }

  // ── Full render ────────────────────────────────────────────────────
  tileCache = null;

  // Terminate and recreate all workers to cancel any in-flight iteration
  for (let i = 0; i < workerPool.length; i++) {
    workerPool[i].terminate();
    workerPool[i] = createIterateWorker();
  }
  // Add / remove workers to match the current workerCount setting
  if (render.workerCount >= workerPool.length) {
    for (let i = workerPool.length; i < render.workerCount; i++) {
      workerPool.push(createIterateWorker());
    }
  } else if (render.workerCount < workerPool.length) {
    for (let i = workerPool.length - 1; i >= render.workerCount; i--) {
      workerPool[i].terminate();
      workerPool.pop();
    }
  }

  postAll({ type: 'settings', payload: settings });
  colorizeWorker.postMessage({ type: 'settings', payload: coloringPayload });

  // Initialize pending cache — may fail if AA is high and buffers are too large
  cacheProduced = false;
  try {
    const pendingStrides = new Map();
    effectiveStrides.forEach(stride => {
      const { width, height } = strideDimensions(settings, stride);
      pendingStrides.set(stride, { buf: new Float64Array(width * height * 2), width, height });
    });
    pendingCache = {
      snapshot: {
        viewport: settings.viewport,
        canvasWidth: settings.canvas.width,
        canvasHeight: settings.canvas.height,
        fractal: settings.fractal,
        iteration: settings.iteration,
        engine: settings.engine,
        antiAliasing: render.antiAliasing,
      },
      strides: pendingStrides,
    };
  } catch (e) {
    pendingCache = null;
    console.warn('Iteration cache disabled: buffer allocation failed.', e.message);
  }

  renderStartTime = performance.now();
  store.dispatch({ type: 'renderStatus/start', payload: { tilesTotal } });
  setupColorizeListener(tilesTotal, renderStartTime, () => {
    if (pendingCache) {
      tileCache = { snapshot: pendingCache.snapshot, strides: pendingCache.strides };
      pendingCache = null;
      cacheProduced = true;
    }
  });

  for (let i = 0; i < effectiveStrides.length; i++) {
    if (id !== renderID) return;
    await dispatchPass(tileSets[i], settings, id, saveTileToCache);
  }
}

// Builds a tile queue for one stride pass, sorted by distance from center so the image
// resolves outward from the focal point. Edge tiles are clamped to avoid overdraw.
function buildTileQueue(settings, stride) {
  const { canvas, render } = settings;
  let { tileSize } = render;
  let imgDataW = Math.ceil(canvas.width / stride);
  let imgDataH = Math.ceil(canvas.height / stride);
  if (stride === 1 && render.antiAliasing) {
    imgDataW *= render.antiAliasing;
    imgDataH *= render.antiAliasing;
    tileSize *= render.antiAliasing;
  }
  // the dimensions of the grid of tiles
  let tilesW = Math.ceil(imgDataW / tileSize);
  let tilesH = Math.ceil(imgDataH / tileSize);
  // Center of screen at pixel resolution
  let centerX = imgDataW / 2;
  let centerY = imgDataH / 2;
  let tiles = [];
  for (let tileY = 0; tileY < tilesH; tileY++) {
    let y = tileY * tileSize;
    for (let tileX = 0; tileX < tilesW; tileX++) {
      let tile = {
        tileX,
        tileY,
        x: tileX * tileSize,
        y,
        w: tileX === tilesW - 1 ? (imgDataW % tileSize || tileSize) : tileSize,
        h: tileY === tilesH - 1 ? (imgDataH % tileSize || tileSize) : tileSize,
        stride: stride,
      };
      tile.distSq = (tile.x + tileSize / 2 - centerX) ** 2
                  + (tile.y + tileSize / 2 - centerY) ** 2;
      tiles.push(tile);
    }
  }
  tiles.sort((a, b) => a.distSq - b.distSq);
  return tiles;
}

// Pops the next tile off the shared queue and sends it to a specific worker.
function sendNextTile(worker, tiles) {
  worker.postMessage({
    type: 'iterate',
    payload: tiles.shift(),
  });
}

// Distributes tiles across the worker pool using a work-stealing pattern: each worker is seeded
// with one tile and immediately picks up the next when done. Resolves when all tiles are colorized.
// onTileSaved is called per tile to write results into the iteration cache.
function dispatchPass(tiles, settings, id, onTileSaved) {
  return new Promise(resolve => {
    let remaining = tiles.length;

    for (const worker of workerPool) {
      worker.onmessage = ({ data }) => {
        if (data.type === 'tileDone') {
          onTileSaved?.(data.payload);
          colorizeWorker.postMessage({
            type: 'colorize',
            payload: { ...data.payload, renderID: id },
          });
          remaining--;
          if (remaining === 0) resolve();
          else if (tiles.length > 0) sendNextTile(worker, tiles);
        }
      }
    }

    const initialCount = Math.min(workerPool.length, tiles.length);
    for (let i = 0; i < initialCount; i++) {
      sendNextTile(workerPool[i], tiles);
    }
  });
}
