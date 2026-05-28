import { createFloat64Iterator } from '../kernel/iterator.js';

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

      // float64
      if (engine.processor === 'cpu' && !engine.useArbitraryPrecision) {
        iterateTile = setupFloat64(settings);
      } else {
        iterateTile = setupDAP(settings);
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

// Sets up worker output buffer and iterateTile function
function setupFloat64(settings) {
  const { canvas, render, viewport } = settings;

  const iterate = createFloat64Iterator(settings);

  let buf = new Float64Array();

  return function iterateTile(tile) {
    const { stride } = tile;
    const imgDataW = Math.ceil(canvas.width / stride)
                  * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);
    const imgDataH = Math.ceil(canvas.height / stride)
                  * ((stride === 1 && render.antiAliasing) ? render.antiAliasing : 1);
    const halfImgDataW = imgDataW / 2;
    const halfImgDataH = imgDataH / 2;
    const pxSize = viewport.size / imgDataW;

    const yDir = viewport.flipYAxis ? 1 : -1;
    const l = tile.w * tile.h * 2;
    if (buf.length !== l) { buf = new Float64Array(l); }

    let i = 0;
    for (let y = tile.y; y < tile.y + tile.h; y++) {
      for (let x = tile.x; x < tile.x + tile.w; x++) {
        iterate(
          viewport.center.re + (x - halfImgDataW) * pxSize,
          viewport.center.im + yDir * (y - halfImgDataH) * pxSize,
          buf, i,
        );
        i += 2;
      }
    }

    return { buf, tile };
  }
}