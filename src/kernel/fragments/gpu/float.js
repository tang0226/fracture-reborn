// GLSL fragment generators for the float32 GPU shader.

function floatLit(n) { return Number.isInteger(n) ? `${n}.0` : String(n); }

export function glslIterStyleFragment({ iterStyle, params }) {
  switch (iterStyle) {
    case 'mandelbrot':
      return `float zRe = 0.0, zIm = 0.0, cRe = pRe, cIm = pIm;`;
    case 'julia':
      return `float zRe = pRe, zIm = pIm, cRe = ${floatLit(params.jRe)}, cIm = ${floatLit(params.jIm)};`;
    default:
      throw new Error(`Unknown iterStyle: ${iterStyle}`);
  }
}

function glslZExpFragment({ expType, params }) {
  if (expType !== 'int') throw new Error(`GPU shader: expType '${expType}' not supported`);
  const e = params.e;
  if (!Number.isInteger(e) || e < 2) throw new Error(`GPU shader: integer exponent ${e} not supported`);

  if (e === 2) return `
    float zRe2 = zRe*zRe - zIm*zIm;
    zIm = 2.0*zRe*zIm;
    zRe = zRe2;`;

  // e≥3: repeated complex multiplication — ${e} is a literal so the compiler can unroll
  return `
    float _rRe = zRe, _rIm = zIm;
    for (int _k = 1; _k < ${e}; _k++) {
      float _nRe = _rRe*zRe - _rIm*zIm;
      _rIm = _rRe*zIm + _rIm*zRe;
      _rRe = _nRe;
    }
    zRe = _rRe; zIm = _rIm;`;
}

export function glslFormulaFragment({ formula, expType, params }) {
  const exp = glslZExpFragment({ expType, params });
  switch (formula) {
    case 'mandelbrot':
      return `${exp}
    zRe += cRe; zIm += cIm;`;
    case 'burningShip':
      return `zRe = abs(zRe); zIm = abs(zIm);${exp}
    zRe += cRe; zIm += cIm;`;
    case 'tricorn':
      return `zIm = -zIm;${exp}
    zRe += cRe; zIm += cIm;`;
    default:
      throw new Error(`Unknown formula: ${formula}`);
  }
}

export function glslSmoothingFragment({ smoothing, expType, params }) {
  if (!smoothing || expType === 'complex') return `float(i)`;
  if (params.e === 2) return `float(i) + 1.0 - log2(0.5 * log2(zRe*zRe + zIm*zIm))`;
  return `float(i) + 1.0 - log(0.5 * log(zRe*zRe + zIm*zIm)) / log(${params.e}.0)`;
}

// Returns GLSL code that updates `float ot` (minimum trap distance) inside the iteration loop.
// Trap parameters are baked as literals — changing traps triggers shader recompilation.
export function glslOrbitTrapFragment({ orbitTraps }) {
  if (!orbitTraps || orbitTraps.length === 0) return '';
  let res = '';
  for (const trap of orbitTraps) {
    if (trap.type === 'point') {
      res += `
    { float _d = sqrt((zRe - ${floatLit(trap.re)})*(zRe - ${floatLit(trap.re)}) + (zIm - ${floatLit(trap.im)})*(zIm - ${floatLit(trap.im)}));
      if (_d < ot) ot = _d; }`;
    } else if (trap.type === 'circle') {
      res += `
    { float _d = abs(sqrt((zRe - ${floatLit(trap.re)})*(zRe - ${floatLit(trap.re)}) + (zIm - ${floatLit(trap.im)})*(zIm - ${floatLit(trap.im)})) - ${floatLit(trap.radius)});
      if (_d < ot) ot = _d; }`;
    }
  }
  return res;
}
