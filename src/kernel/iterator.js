// Generates iterator functions from settings.
// Each returned iterator receives pRe and pIm (the point to iterate); all other
// parameters are baked in.

import {
  iterStyleFragment,
  formulaFragment,
  orbitTrapFragment,
  smoothingFragment,
  trapSupportsSquare,
} from './fragments/cpu/float64.js';

import {
  dapAbs,
  dapGt,
  dapIterStyleFragment,
  dapFormulaFragment,
  dapSmoothingFragment,
} from './fragments/cpu/dap.js';

import {
  ddAdd,
  ddSub,
  ddMul,
  ddAbs,
  ddGt,
  ddIterStyleFragment,
  ddFormulaFragment,
  ddOrbitTrapFragment,
  ddSmoothingFragment,
} from './fragments/cpu/doubleDouble.js';


export function createFloat64Iterator(settings) {
  const { formula, iterStyle, expType, params } = settings.fractal;
  const { maxIter, escapeRadius, smoothing, orbitTraps } = settings.iteration;

  const allTrapsSquare = orbitTraps.every(t => trapSupportsSquare[t.type]);

  const src = `
    return function iterate(pRe, pIm, buf, idx) {
      ${iterStyleFragment({ iterStyle, params })}
      let ot = Infinity;
      let _otDist;
      for (let i = 0; i < ${maxIter}; i++) {
        ${formulaFragment({ formula, expType, params})}
        ${orbitTrapFragment({ orbitTraps, allTrapsSquare })}
        if (zRe*zRe + zIm*zIm > ${escapeRadius ** 2}) {
          buf[idx] = ${smoothingFragment({ smoothing, expType, params, maxIter })};
          buf[idx+1] = ${allTrapsSquare ? `Math.sqrt(ot)` : `ot`};
          return;
        }
      }
      buf[idx] = ${maxIter};
      buf[idx+1] = ${allTrapsSquare ? `Math.sqrt(ot)` : `ot`};
    }
  `;

  return new Function(src)();
}

// Double-double version: two float64s per coordinate for ~31 significant digits.
// pRe/pIm are passed as DD pairs (pReHi, pReLo, pImHi, pImLo).
// Throws for unsupported expType so the caller can fall back to float64.
export function createDoubleDoubleIterator(settings) {
  const { formula, iterStyle, expType, params } = settings.fractal;
  const { maxIter, escapeRadius, smoothing, orbitTraps } = settings.iteration;

  const allTrapsSquare = orbitTraps.every(t => trapSupportsSquare[t.type]);

  const src = `
    return function iterate(pReHi, pReLo, pImHi, pImLo, buf, idx) {
      ${ddIterStyleFragment({ iterStyle, params })}
      let ot = Infinity;
      let _otDist;
      for (let i = 0; i < ${maxIter}; i++) {
        ${ddFormulaFragment({ formula, expType, params })}
        ${ddOrbitTrapFragment({ orbitTraps, allTrapsSquare })}
        if (zReHi*zReHi + zImHi*zImHi > ${escapeRadius ** 2}) {
          buf[idx] = ${ddSmoothingFragment({ smoothing, expType, params, maxIter })};
          buf[idx+1] = ${allTrapsSquare ? `Math.sqrt(ot)` : `ot`};
          return;
        }
      }
      buf[idx] = ${maxIter};
      buf[idx+1] = ${allTrapsSquare ? `Math.sqrt(ot)` : `ot`};
    }
  `;

  return new Function('ddAdd', 'ddSub', 'ddMul', 'ddAbs', 'ddGt', src)(
    ddAdd, ddSub, ddMul, ddAbs, ddGt,
  );
}

// DAP version: mirrors createFloat64Iterator but operates on DapContext numbers.
// pRe and pIm are DAP numbers. Throws for unsupported configurations so the
// caller can fall back to float64.
// zReSq/zImSq are carried forward between iterations (3 DAP muls/iter vs 5).
export function createDAPIterator(settings, ctx) {
  const { formula, iterStyle, expType, params } = settings.fractal;
  const { maxIter, escapeRadius, smoothing } = settings.iteration;

  // dapFormulaFragment (via dapZExpFragment) throws for unsupported configs —
  // propagate to the caller so it can fall back to float64.
  const src = `
    return function iterate(pRe, pIm, buf, idx) {
      ${dapIterStyleFragment({ iterStyle, params })}
      let zReSq = ctx.mul(zRe, zRe);
      let zImSq = ctx.mul(zIm, zIm);
      let escaped = false, lastZSq = null, iter = 0;
      while (iter < ${maxIter}) {
        ${dapFormulaFragment({ formula, expType, params })}
        zReSq = ctx.mul(zRe, zRe);
        zImSq = ctx.mul(zIm, zIm);
        const zSq = ctx.add(zReSq, zImSq);
        if (dapGt(ctx, zSq, _escapeR2)) { lastZSq = zSq; escaped = true; break; }
        iter++;
      }
      if (escaped) {
        const zSqF = parseFloat(ctx.toString(lastZSq));
        buf[idx] = ${dapSmoothingFragment({ smoothing })};
      } else {
        buf[idx] = ${maxIter};
      }
      buf[idx + 1] = Infinity;
    }
  `;

  const _zero     = ctx.n(0);
  const _two      = ctx.n(2);
  const _three    = ctx.n(3);
  const _escapeR2 = ctx.n(escapeRadius * escapeRadius);
  const _juliaRe  = iterStyle === 'julia' ? ctx.n(params.jRe) : null;
  const _juliaIm  = iterStyle === 'julia' ? ctx.n(params.jIm) : null;

  return new Function('ctx', 'dapAbs', 'dapGt', '_zero', '_two', '_three', '_escapeR2', '_juliaRe', '_juliaIm', src)(
    ctx, dapAbs, dapGt, _zero, _two, _three, _escapeR2, _juliaRe, _juliaIm,
  );
}