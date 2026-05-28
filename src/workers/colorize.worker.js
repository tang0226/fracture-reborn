let settings,
  engine,
  render,
  viewport,
  canvas,
  fractal,
  iteration,
  coloring,
  intColorizer,
  extColorizer;

function buildLutColorizer(lut, getT) {
  return (colorBuf, ci, smoothIter, dist) => {
    const li = (((getT(smoothIter, dist) % 1.0) + 1) % 1.0 * lut.length / 4) | 0;
    colorBuf[ci]     = lut[li * 4];
    colorBuf[ci + 1] = lut[li * 4 + 1];
    colorBuf[ci + 2] = lut[li * 4 + 2];
    colorBuf[ci + 3] = 255;
  };
}

function buildExteriorColorizer(exterior, orbitTrap, maxIter) {
  if (exterior.method === 'solid') {
    const { r, g, b } = exterior.solid;
    return (colorBuf, ci, _s, _d) => {
      colorBuf[ci] = r;
      colorBuf[ci + 1] = g;
      colorBuf[ci + 2] = b;
      colorBuf[ci + 3] = 255;
    };
  }
  if (exterior.method === 'smoothIter') {
    const { lut, period, offset, logScale } = exterior.smoothIter;
    const getT = logScale
      ? (s, _d) => Math.log(s + 1) / Math.log(maxIter + 1) * period + offset
      : (s, _d) => s / period + offset;
    return buildLutColorizer(lut, getT);
  }
  if (exterior.method === 'orbitTrap') {
    const { lut, scale, offset, logScale } = orbitTrap;
    const getT = logScale
      ? (_s, d) => Math.log(d + 1) / scale + offset
      : (_s, d) => d / scale + offset;
    return buildLutColorizer(lut, getT);
  }
}

function buildInteriorColorizer(interior, orbitTrap) {
  if (interior.method === 'solid') {
    const { r, g, b } = interior.solid;
    return (colorBuf, ci) => {
      colorBuf[ci]     = r;
      colorBuf[ci + 1] = g;
      colorBuf[ci + 2] = b;
      colorBuf[ci + 3] = 255;
    };
  }
  if (interior.method === 'orbitTrap') {
    const { lut, scale, offset, logScale } = orbitTrap;
    const getT = logScale
      ? (_s, d) => Math.log(d + 1) / scale + offset
      : (_s, d) => d / scale + offset;
    return buildLutColorizer(lut, getT);
  }
}

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
        coloring,
      } = settings);
      extColorizer = buildExteriorColorizer(coloring.exterior, coloring.orbitTrap, iteration.maxIter);
      intColorizer = buildInteriorColorizer(coloring.interior, coloring.orbitTrap);
      break;
    }
    case 'colorize': {
      const { buf, tile } = payload;

      const colorBuf = new Uint8ClampedArray(tile.w * tile.h * 4);

      for (let i = 0; i < tile.w * tile.h; i++) {
        if (buf[i * 2] === iteration.maxIter) {
          intColorizer(colorBuf, i * 4, null, buf[i * 2 + 1]);
        }
        else {
          extColorizer(colorBuf, i * 4, buf[i * 2], buf[i * 2 + 1]);
        }
      }

      // Anti-aliasing
      if (render.antiAliasing && tile.stride === 1) {
        const aa = render.antiAliasing;
        const aaSq = aa * aa;
        const aaW = tile.w / aa;
        const aaH = tile.h / aa;
        const aaBuf = new Uint8ClampedArray(aaW * aaH * 4);
        for (let y = 0; y < aaH; y++) {
          const ySrc = y * aa;
          for (let x = 0; x < aaW; x++) {
            let r = 0, g = 0, b = 0;
            const xSrc = x * aa;
            for (let sy = 0; sy < aa; sy++) {
              let ci = ((ySrc + sy) * tile.w + xSrc) * 4;
              for (let sx = 0; sx < aa; sx++, ci += 4) {
                r += colorBuf[ci];
                g += colorBuf[ci + 1];
                b += colorBuf[ci + 2];
              }
            }
            const oi = (y * aaW + x) * 4;
            aaBuf[oi]     = r / aaSq;
            aaBuf[oi + 1] = g / aaSq;
            aaBuf[oi + 2] = b / aaSq;
            aaBuf[oi + 3] = 255;
          }
        }
        // Covnert tile dimensions and positions back to canvas coordinates
        const aliasedTile = { ...tile };
        aliasedTile.x /= aa;
        aliasedTile.y /= aa;
        aliasedTile.w /= aa;
        aliasedTile.h /= aa;
        self.postMessage({
          type: 'tileDone',
          payload: {
            buf: aaBuf,
            tile: aliasedTile,
          },
        });
      }
      else {
        self.postMessage({
          type: 'tileDone',
          payload: {
            buf: colorBuf,
            tile,
          },
        });
      }

      break;
    }
  }
};