// Fragment generators for double-double JS kernels.
// Each DD number is two float64s (hi, lo) where hi+lo = true value.
// Knuth two-sum and Dekker two-product algorithms.

export function ddAdd(aHi, aLo, bHi, bLo) {
  const s = aHi + bHi;
  const v = s - aHi;
  // Full Knuth two-sum: captures rounding error from both aHi and bHi.
  // Fast two-sum (bHi - (s - aHi)) only works when |aHi| >= |bHi|.
  const e = (aHi - (s - v)) + (bHi - v);
  const t = aLo + bLo + e;
  const hi = s + t;
  return [hi, t - (hi - s)];
}

export function ddSub(aHi, aLo, bHi, bLo) {
  return ddAdd(aHi, aLo, -bHi, -bLo);
}

const _SPLIT = 134217729; // 2^27 + 1 (Veltkamp splitter)

export function ddMul(aHi, aLo, bHi, bLo) {
  const p = aHi * bHi;
  const ac = _SPLIT * aHi, ah = ac - (ac - aHi), al = aHi - ah;
  const bc = _SPLIT * bHi, bh = bc - (bc - bHi), bl = bHi - bh;
  const err = ((ah*bh - p) + ah*bl + al*bh) + al*bl;
  const e = aHi*bLo + aLo*bHi + err;
  const hi = p + e;
  return [hi, e - (hi - p)];
}

export function ddAbs(hi, lo) { return hi < 0 ? [-hi, -lo] : [hi, lo]; }

export function ddGt(aHi, aLo, bHi, bLo) {
  return aHi > bHi || (aHi === bHi && aLo > bLo);
}

// --- Fragment generators (same convention as float64.js) ---

export function ddIterStyleFragment({ iterStyle, params }) {
  switch (iterStyle) {
    case 'mandelbrot':
      return `let zReHi=0,zReLo=0,zImHi=0,zImLo=0;
      let cReHi=pReHi,cReLo=pReLo,cImHi=pImHi,cImLo=pImLo;`;
    case 'julia':
      return `let zReHi=pReHi,zReLo=pReLo,zImHi=pImHi,zImLo=pImLo;
      let cReHi=${params.jRe},cReLo=0,cImHi=${params.jIm},cImLo=0;`;
    default:
      throw new Error(`Unknown iterStyle: ${iterStyle}`);
  }
}

function ddZExpFragment({ expType, params }) {
  if (expType === 'float' || expType === 'complex') {
    throw new Error(`DD kernel: expType '${expType}' not supported`);
  }
  const e = params.e;

  if (e === 2) return `
      const[_a0,_a1]=ddMul(zReHi,zReLo,zReHi,zReLo);
      const[_b0,_b1]=ddMul(zImHi,zImLo,zImHi,zImLo);
      const[_t0,_t1]=ddMul(2,0,zReHi,zReLo);
      const[_nIm0,_nIm1]=ddMul(_t0,_t1,zImHi,zImLo);
      const[_nRe0,_nRe1]=ddSub(_a0,_a1,_b0,_b1);
      zReHi=_nRe0;zReLo=_nRe1;zImHi=_nIm0;zImLo=_nIm1;`;

  if (e === 3) return `
      const[_re2_0,_re2_1]=ddMul(zReHi,zReLo,zReHi,zReLo);
      const[_im2_0,_im2_1]=ddMul(zImHi,zImLo,zImHi,zImLo);
      const[_re3_0,_re3_1]=ddMul(_re2_0,_re2_1,zReHi,zReLo);
      const[_im3_0,_im3_1]=ddMul(_im2_0,_im2_1,zImHi,zImLo);
      const[_t1_0,_t1_1]=ddMul(_im2_0,_im2_1,zReHi,zReLo);
      const[_t2_0,_t2_1]=ddMul(_re2_0,_re2_1,zImHi,zImLo);
      const[_3t1_0,_3t1_1]=ddMul(3,0,_t1_0,_t1_1);
      const[_3t2_0,_3t2_1]=ddMul(3,0,_t2_0,_t2_1);
      const[_nRe0,_nRe1]=ddSub(_re3_0,_re3_1,_3t1_0,_3t1_1);
      const[_nIm0,_nIm1]=ddSub(_3t2_0,_3t2_1,_im3_0,_im3_1);
      zReHi=_nRe0;zReLo=_nRe1;zImHi=_nIm0;zImLo=_nIm1;`;

  // e >= 4: repeated complex multiplication
  return `
      let _rReHi=zReHi,_rReLo=zReLo,_rImHi=zImHi,_rImLo=zImLo;
      for(let _k=1;_k<${e};_k++){
        const[_nRe0,_nRe1]=ddSub(...ddMul(_rReHi,_rReLo,zReHi,zReLo),...ddMul(_rImHi,_rImLo,zImHi,zImLo));
        const[_nIm0,_nIm1]=ddAdd(...ddMul(_rReHi,_rReLo,zImHi,zImLo),...ddMul(_rImHi,_rImLo,zReHi,zReLo));
        _rReHi=_nRe0;_rReLo=_nRe1;_rImHi=_nIm0;_rImLo=_nIm1;
      }
      zReHi=_rReHi;zReLo=_rReLo;zImHi=_rImHi;zImLo=_rImLo;`;
}

export function ddFormulaFragment({ formula, expType, params }) {
  const exp = ddZExpFragment({ expType, params }); // may throw for unsupported expType
  switch (formula) {
    case 'mandelbrot': return `
      ${exp}
      [zReHi,zReLo]=ddAdd(zReHi,zReLo,cReHi,cReLo);
      [zImHi,zImLo]=ddAdd(zImHi,zImLo,cImHi,cImLo);`;
    case 'burningShip': return `
      [zReHi,zReLo]=ddAbs(zReHi,zReLo);[zImHi,zImLo]=ddAbs(zImHi,zImLo);
      ${exp}
      [zReHi,zReLo]=ddAdd(zReHi,zReLo,cReHi,cReLo);
      [zImHi,zImLo]=ddAdd(zImHi,zImLo,cImHi,cImLo);`;
    case 'tricorn': return `
      zImHi=-zImHi;zImLo=-zImLo;
      ${exp}
      [zReHi,zReLo]=ddAdd(zReHi,zReLo,cReHi,cReLo);
      [zImHi,zImLo]=ddAdd(zImHi,zImLo,cImHi,cImLo);`;
    default: throw new Error(`Unknown formula: ${formula}`);
  }
}

// Trap distances are O(1) so float64 conversion is accurate enough.
// Wrapped in a block so _zReF/_zImF are block-scoped; _otDist is declared by the caller.
export function ddOrbitTrapFragment({ orbitTraps, allTrapsSquare }) {
  if (!orbitTraps || orbitTraps.length === 0) return '';
  let checks = '';
  for (const trap of orbitTraps) {
    switch (trap.type) {
      case 'point':
        checks += `
          _otDist=${allTrapsSquare
            ? `(_zReF-${trap.re})**2+(_zImF-${trap.im})**2`
            : `Math.sqrt((_zReF-${trap.re})**2+(_zImF-${trap.im})**2)`};
          if(_otDist<ot)ot=_otDist;`;
        break;
      case 'circle':
        checks += `
          _otDist=Math.abs(Math.sqrt((_zReF-${trap.re})**2+(_zImF-${trap.im})**2)-${trap.radius});
          if(_otDist<ot)ot=_otDist;`;
        break;
    }
  }
  return `{ const _zReF=zReHi+zReLo,_zImF=zImHi+zImLo;${checks} }`;
}

// At escape, |zReHi| >> |zReLo|, so float64 log is accurate enough.
export function ddSmoothingFragment({ smoothing, expType, params, maxIter }) {
  if (!smoothing || expType === 'complex') return `i`;
  const logBlock = params.e === 2
    ? `Math.log2(0.5*Math.log2((zReHi+zReLo)**2+(zImHi+zImLo)**2))`
    : `Math.log(0.5*Math.log((zReHi+zReLo)**2+(zImHi+zImLo)**2))/${Math.log(params.e)}`;
  return `i===${maxIter}?i:i+1-${logBlock}`;
}
