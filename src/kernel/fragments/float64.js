// Fragment generators for float64 JS kernels

import { wrapIf } from "../utils.js";

export function iterStyleFragment({ iterStyle, params }) {
  switch (iterStyle) {
    case 'mandelbrot':
      return `let zRe = 0, zIm = 0, cRe = pRe, cIm = pIm;`;
    case 'julia':
      return `let zRe = pRe, zIm = pIm, cRe = ${params.jRe}, cIm = ${params.jIm};`;
  }
}

export function zExpFragment({ expType, params, zReSuffix = '', zImSuffix = '' }) {
  if (expType === 'int' && params.e === 2) return `
    const zRe2 = zRe*zRe - zIm*zIm;
    zIm = (2*zRe*zIm)${zImSuffix};
    zRe = zRe2${zReSuffix};
  `;

  if (expType === 'int' && params.e === 3) return `
    const zRe2 = zRe*zRe*zRe - 3*zRe*zIm*zIm;
    zIm = (3*zRe*zRe*zIm - zIm*zIm*zIm)${zImSuffix};
    zRe = zRe2${zReSuffix};
  `;

  if (expType === 'int' || expType === 'float') return `
    const _r     = Math.pow(zRe*zRe + zIm*zIm, ${params.e} / 2);
    const _theta = Math.atan2(zIm, zRe) * ${params.e};
    zRe = (_r * Math.cos(_theta))${zReSuffix};
    zIm = (_r * Math.sin(_theta))${zImSuffix};
  `;

  if (expType === 'complex') return `
    const _lnR  = 0.5 * Math.log(zRe*zRe + zIm*zIm);
    const _arg  = Math.atan2(zIm, zRe);
    const _re   = _lnR * ${params.eRe} - _arg * ${params.eIm};
    const _im   = _lnR * ${params.eIm} + _arg * ${params.eRe};
    const _mag  = Math.exp(_re);
    zRe = (_mag * Math.cos(_im))${zReSuffix};
    zIm = (_mag * Math.sin(_im))${zImSuffix};
  `;
}

export function formulaFragment({ formula, expType, params }) {
  switch (formula) {
    case 'mandelbrot': return `
      ${zExpFragment({ expType, params, zReSuffix: `+cRe`, zImSuffix: `+cIm` })}
    `;
    case 'burningShip': return `
      zRe = Math.abs(zRe);
      zIm = Math.abs(zIm);
      ${zExpFragment({ expType, params, zReSuffix: `+cRe`, zImSuffix: `+cIm` })}
    `;
    case 'tricorn': return `
      zIm = -zIm;
      ${zExpFragment({ expType, params, zReSuffix: `+cRe`, zImSuffix: `+cIm` })}
    `;
    default: throw new Error(`Unknown formula: ${formula}`);
  }
}

export const trapSupportsSquare = {
  point: true,
  circle: false,
};

export function orbitTrapFragment({ orbitTraps, allTrapsSquare }) {
  let res = ``;
  for (let trap of orbitTraps) {
    switch(trap.type) {
      case 'point':
        res += `
          _otDist = ${wrapIf(
            `(zRe - ${trap.re}) ** 2 + (zIm - ${trap.im}) ** 2`,
            !allTrapsSquare,
            `Math.sqrt(`,
            `)`
          )};
          if (_otDist < ot) ot = _otDist;
        `
        break;
    }
  }
  return res;
}

export function smoothingFragment({ smoothing, expType, params, maxIter }) {
  if (!smoothing) return `i`;

  if (expType === 'complex') return `i`;

  const logBlock = params.e === 2
    ? `Math.log2(0.5 * Math.log2(zRe*zRe + zIm*zIm))`
    : `Math.log(0.5 * Math.log(zRe*zRe + zIm*zIm)) / ${Math.log(params.e)}`;

  return `i === ${maxIter} ? i : i + 1 - ${logBlock}`;
}
