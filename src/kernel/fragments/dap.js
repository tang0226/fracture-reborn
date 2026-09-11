// Fragment generators for DAP (arbitrary-precision) kernels.
// Parallel to fragments/float64.js: each function returns a JS code string
// assembled into a dynamically-created iterate function via new Function().
//
// DAP constants (_zero, _two, _three, _escapeR2, _juliaRe, _juliaIm) and
// runtime helpers (ctx, dapAbs, dapGt) are passed as parameters to the
// generated function — the DAP equivalent of baking in numeric literals.

export function dapAbs(ctx, a) {
  return a.m >= 0n ? a : ctx.neg(a);
}

// Fast escape check: short-circuits on the DAP exponent before a full comparison.
export function dapGt(ctx, a, b) {
  if (a.m <= 0n) return false;
  if (a.e > b.e) return true;
  if (a.e < b.e) return false;
  return ctx.gt(a, b);
}

export function dapIterStyleFragment({ iterStyle }) {
  switch (iterStyle) {
    case 'mandelbrot':
      return `let zRe = _zero, zIm = _zero, cRe = pRe, cIm = pIm;`;
    case 'julia':
      return `let zRe = pRe, zIm = pIm, cRe = _juliaRe, cIm = _juliaIm;`;
    default:
      throw new Error(`DAP iterator: unknown iterStyle "${iterStyle}"`);
  }
}

// Computes z^e from _fZRe and _fZIm (the pre-transformed components), producing
// _expZRe and _expZIm. Uses the carry-forward zReSq/zImSq as the squares of
// _fZRe/_fZIm — valid for all pre-transforms since |x|² = x² and (-x)² = x².
export function dapZExpFragment({ expType, params }) {
  if (expType === 'int' && params.e === 2) return `
    const _expZRe = ctx.sub(zReSq, zImSq);
    const _expZIm = ctx.mul(_two, ctx.mul(_fZRe, _fZIm));
  `;

  if (expType === 'int' && params.e === 3) return `
    const _expZRe = ctx.mul(_fZRe, ctx.sub(zReSq, ctx.mul(_three, zImSq)));
    const _expZIm = ctx.mul(_fZIm, ctx.sub(ctx.mul(_three, zReSq), zImSq));
  `;

  throw new Error(`DAP iterator: unsupported exponent "${expType}" e=${params.e}`);
}

// Applies the formula-specific pre-transform, delegates to dapZExpFragment for
// z^e, then adds c. Parallel to formulaFragment in float64.js.
export function dapFormulaFragment({ formula, expType, params }) {
  const exp = dapZExpFragment({ expType, params });
  switch (formula) {
    case 'mandelbrot': return `
      const _fZRe = zRe, _fZIm = zIm;
      ${exp}
      zRe = ctx.add(_expZRe, cRe);
      zIm = ctx.add(_expZIm, cIm);
    `;
    case 'burningShip': return `
      const _fZRe = dapAbs(ctx, zRe), _fZIm = dapAbs(ctx, zIm);
      ${exp}
      zRe = ctx.add(_expZRe, cRe);
      zIm = ctx.add(_expZIm, cIm);
    `;
    case 'tricorn': return `
      const _fZRe = zRe, _fZIm = ctx.neg(zIm);
      ${exp}
      zRe = ctx.add(_expZRe, cRe);
      zIm = ctx.add(_expZIm, cIm);
    `;
    default:
      throw new Error(`DAP iterator: unknown formula "${formula}"`);
  }
}

export function dapSmoothingFragment({ smoothing }) {
  if (!smoothing) return `iter`;
  return `iter + 1 - Math.log2(0.5 * Math.log2(zSqF))`;
}
