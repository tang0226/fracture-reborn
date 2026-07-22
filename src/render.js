import { needsArbitraryPrecision } from './store.js';
import { store } from './store.js';
import { buildColoringSettings } from './coloring.js';

// Master worker spawns and maintains other workers

export const colorizeWorker = new Worker(new URL('./workers/colorize.worker.js', import.meta.url), { type: 'module' });
const workerPool = [];

function postAll(msg) {
  for (let worker of workerPool) {
    worker.postMessage(msg);
  }
}

function createIterateWorker() {
  return new Worker(new URL('./workers/iterate.worker.js', import.meta.url), { type: 'module' });
}

let renderID = 0;
let renderStartTime = 0;
let colorizeListener = null;

export function render(settings) {
  renderID++;

  const canvas = { width: window.innerWidth, height: window.innerHeight };
  store.dispatch({ type: 'canvas/setDim', payload: canvas });
  settings = { ...settings, canvas };

  const {
    engine,
    viewport,
    fractal,
    iteration,
    coloring,
  } = settings;

  if (needsArbitraryPrecision(viewport, engine) && engine.usePerturbation) {
    // create reference orbit
  }

  if (settings.engine.processor === 'gpu') {
    // renderGPU
  } else {
    renderCPU(settings, renderID);
  }
}

async function renderCPU(settings, id) {

  const { render } = settings;

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

  // Send settings to all workers
  postAll({
    type: 'settings',
    payload: settings,
  });
  colorizeWorker.postMessage({
    type: 'settings',
    payload: { ...settings, coloring: buildColoringSettings(settings.coloring), renderID: id },
  });

  const strides = settings.render.progressive ? settings.render.strides : [1];
  const tileSets = strides.map(s => buildTileQueue(settings, s));
  const tilesTotal = tileSets.reduce((sum, t) => sum + t.length, 0);
  renderStartTime = performance.now();
  store.dispatch({ type: 'renderStatus/start', payload: { tilesTotal } });

  // Listen for colorize completion — fires after RenderCanvas's onmessage property
  if (colorizeListener) colorizeWorker.removeEventListener('message', colorizeListener);
  let colorizedDone = 0;
  colorizeListener = ({ data }) => {
    if (data.type === 'tileDone') {
      colorizedDone++;
      if (colorizedDone === tilesTotal) {
        store.dispatch({ type: 'renderStatus/done', payload: { elapsed: performance.now() - renderStartTime } });
        colorizeWorker.removeEventListener('message', colorizeListener);
        colorizeListener = null;
      }
    }
  };
  colorizeWorker.addEventListener('message', colorizeListener);

  for (const tiles of tileSets) {
    if (id !== renderID) return;
    await dispatchPass(tiles, settings, id);
  }
}

// Builds a queue of canvas regions for workers to iterate
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

function sendNextTile(worker, tiles) {
  worker.postMessage({
    type: 'iterate',
    payload: tiles.shift(),
  });
}

// Send queued tiles to workers until all tiles have been rendered
function dispatchPass(tiles, settings, id) {
  return new Promise(resolve => {
    let remaining = tiles.length;

    for (const worker of workerPool) {
      worker.onmessage = ({ data }) => {
        if (data.type === 'tileDone') {
          colorizeWorker.postMessage({
            type: 'colorize',
            payload: { ...data.payload, renderID: id },
          });
          remaining--;
          store.dispatch({ type: 'renderStatus/tileDone', payload: { elapsed: performance.now() - renderStartTime } });
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
