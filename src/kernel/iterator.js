// Generates JS iterator function from settings
// The returned iterator receives pRe and pIm (the value of the point to be iterated). All other parameters are baked in

import { 
  iterStyleFragment,
  formulaFragment,
  orbitTrapFragment,
  smoothingFragment,
  trapSupportsSquare,
} from './fragments/float64.js';



export function createIterator(settings) {
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
          buf[idx+1] = ${allTrapsSquare ? `Math.sqrt(_otDist)` : `_otDist`};
          return;
        }
      }
      buf[idx] = ${maxIter};
      buf[idx+1] = ${allTrapsSquare ? `Math.sqrt(_otDist)` : `_otDist`};
    }
  `;

  return new Function(src)();
}