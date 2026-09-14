import { createFloat64Iterator, createDAPIterator, createDoubleDoubleIterator } from '../kernel/iterator.js';
import { ddAdd, ddMul } from '../kernel/fragments/cpu/doubleDouble.js';
import { DapContext } from '../dap/dap-context.js';

let settings, iterateTile,
  engine,
  render,
  viewport,
  canvas,
  fractal,
  iteration;

self.onmessage = (e) => {
  const { type, payload } = e.data;
  switch (type) {
    case 'settings': {
      settings = payload;
      ({
        engine,
        render,
        viewport,
        canvas,
        fractal,
        iteration,
      } = settings);

      if (engine.processor === 'cpu') {
        if (engine.precision === 'dap') {
          iterateTile = setupDAP(settings);
        } else if (engine.precision === 'dd') {
          iterateTile = setupDoubleDouble(settings);
        } else {
          iterateTile = setupFloat64(settings);
        }
      }
      break;
    }
    case 'iterate': {
      const res = iterateTile(payload);
      self.postMessage({
        type: 'tileDone',
        payload: res,
      });
      break;
    }
  }
};

// Sets up worker output buffer and iterateTile function using float64 arithmetic.
// viewport.center.re/im and viewport.size are strings; parsed to float once here.
function setupFloat64(settings) {
  const { canvas, render, viewport } = settings;

  const centerRe = parseFloat(viewport.center.re);
  const centerIm = parseFloat(viewport.center.im);
  const size     = parseFloat(viewport.size);

  const iterate = createFloat64Iterator(settings);
  let buf = new Float64Array();

  return function iterateTile(tile) {
    const { stride } = tile;
    const imgDataW = Math.ceil(canvas.width  / stride) * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);
    const imgDataH = Math.ceil(canvas.height / stride) * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);
    const halfW = imgDataW / 2;
    const halfH = imgDataH / 2;
    const pxSize = size / imgDataW;
    const yDir = viewport.flipYAxis ? 1 : -1;

    const l = tile.w * tile.h * 2;
    if (buf.length !== l) buf = new Float64Array(l);

    let i = 0;
    for (let y = tile.y; y < tile.y + tile.h; y++) {
      for (let x = tile.x; x < tile.x + tile.w; x++) {
        iterate(
          centerRe + (x - halfW) * pxSize,
          centerIm + yDir * (y - halfH) * pxSize,
          buf, i,
        );
        i += 2;
      }
    }

    return { buf, tile };
  };
}

// Sets up worker output buffer and iterateTile function using double-double arithmetic.
// Viewport coordinates are parsed via DapContext then converted to DD pairs [hi, lo].
// Falls back to float64 when the kernel does not support the current configuration.
function setupDoubleDouble(settings) {
  try {
    return _setupDoubleDouble(settings);
  } catch (err) {
    console.warn(`[iterate.worker] DD kernel unavailable (${err.message}); falling back to float64`);
    return setupFloat64(settings);
  }
}

function _setupDoubleDouble(settings) {
  const { canvas, render, viewport } = settings;

  const ctx = new DapContext(settings.engine.dapPrecision ?? 32);

  let iterate;
  try {
    iterate = createDoubleDoubleIterator(settings);
  } catch (err) {
    console.warn(`[iterate.worker] DD kernel unavailable (${err.message}); falling back to float64`);
    return setupFloat64(settings);
  }

  // Convert a high-precision decimal string to a [hi, lo] DD pair.
  // hi = best float64; lo = remainder computed via DAP.
  function toDD(str) {
    const hi = parseFloat(str);
    const lo = parseFloat(ctx.toString(ctx.sub(ctx.n(str), ctx.n(String(hi)))));
    return [hi, lo];
  }

  const [centerReHi, centerReLo] = toDD(viewport.center.re);
  const [centerImHi, centerImLo] = toDD(viewport.center.im);
  const sizeDAP = ctx.n(viewport.size);

  let buf = new Float64Array();

  return function iterateTile(tile) {
    const { stride } = tile;
    const imgDataW = Math.ceil(canvas.width  / stride) * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);
    const imgDataH = Math.ceil(canvas.height / stride) * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);

    const yDir = viewport.flipYAxis ? 1 : -1;
    const l = tile.w * tile.h * 2;
    if (buf.length !== l) buf = new Float64Array(l);

    // pxSize as DD, computed via DAP (two DAP ops per tile, not per pixel)
    const [pxSizeHi, pxSizeLo] = toDD(ctx.toString(ctx.div(sizeDAP, ctx.n(imgDataW))));
    const pxSizeImHi = yDir * pxSizeHi;
    const pxSizeImLo = yDir * pxSizeLo;

    const halfW = imgDataW / 2;
    const halfH = imgDataH / 2;

    // Start coordinates for the tile's top-left pixel using DD arithmetic
    let [rowReHi, rowReLo] = ddAdd(centerReHi, centerReLo, ...ddMul(tile.x - halfW, 0, pxSizeHi, pxSizeLo));
    let [rowImHi, rowImLo] = ddAdd(centerImHi, centerImLo, ...ddMul(yDir * (tile.y - halfH), 0, pxSizeHi, pxSizeLo));

    let bufIdx = 0;

    for (let y = tile.y; y < tile.y + tile.h; y++) {
      let pReHi = rowReHi, pReLo = rowReLo;

      for (let x = tile.x; x < tile.x + tile.w; x++) {
        iterate(pReHi, pReLo, rowImHi, rowImLo, buf, bufIdx);
        [pReHi, pReLo] = ddAdd(pReHi, pReLo, pxSizeHi, pxSizeLo);
        bufIdx += 2;
      }

      [rowImHi, rowImLo] = ddAdd(rowImHi, rowImLo, pxSizeImHi, pxSizeImLo);
    }

    return { buf, tile };
  };
}

// Sets up worker output buffer and iterateTile function using arbitrary-precision
// (DAP) arithmetic. viewport.center/size are strings, parsed via dapCtx.n().
// Falls back to float64 when the kernel does not support the current configuration.
function setupDAP(settings) {
  try {
    return _setupDAP(settings);
  } catch (err) {
    console.error('[iterate.worker] setupDAP failed unexpectedly — falling back to float64.', err);
    return setupFloat64(settings);
  }
}

function _setupDAP(settings) {
  const { canvas, render, viewport } = settings;

  const ctx = new DapContext(settings.engine.dapPrecision ?? 32);

  let iterate;
  try {
    iterate = createDAPIterator(settings, ctx);
  } catch (err) {
    console.warn(`[iterate.worker] DAP kernel unavailable (${err.message}); falling back to float64`);
    return setupFloat64(settings);
  }

  // Viewport constants parsed once per render (same for every tile)
  const centerRe = ctx.n(viewport.center.re);
  const centerIm = ctx.n(viewport.center.im);
  const sizeDAP  = ctx.n(viewport.size);

  let buf = new Float64Array();

  return function iterateTile(tile) {
    const { stride } = tile;
    const imgDataW = Math.ceil(canvas.width  / stride) * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);
    const imgDataH = Math.ceil(canvas.height / stride) * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);

    const yDir = viewport.flipYAxis ? 1 : -1;
    const l = tile.w * tile.h * 2;
    if (buf.length !== l) buf = new Float64Array(l);

    // Compute the complex coordinate for the tile's top-left pixel, then step
    // by pxSize using only DAP additions — avoids a multiply per pixel.
    const pxSize  = ctx.div(sizeDAP, ctx.n(imgDataW));
    const pxSizeY = yDir === 1 ? pxSize : ctx.neg(pxSize);

    const halfW = imgDataW / 2;
    const halfH = imgDataH / 2;
    const startRe = ctx.add(centerRe, ctx.mul(ctx.n(tile.x - halfW), pxSize));
    const startIm = ctx.add(centerIm, ctx.mul(ctx.n(yDir * (tile.y - halfH)), pxSize));

    let bufIdx = 0;
    let rowIm = startIm;

    for (let y = tile.y; y < tile.y + tile.h; y++) {
      let pRe = startRe;

      for (let x = tile.x; x < tile.x + tile.w; x++) {
        iterate(pRe, rowIm, buf, bufIdx);
        pRe = ctx.add(pRe, pxSize);
        bufIdx += 2;
      }

      rowIm = ctx.add(rowIm, pxSizeY);
    }

    return { buf, tile };
  };
}
