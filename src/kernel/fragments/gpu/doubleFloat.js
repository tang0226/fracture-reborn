// GLSL fragment generators for the double-float GPU shader.
// A DF number is a vec2 of two float32s (.x = hi, .y = lo) whose true value is hi + lo,
// giving ~48 mantissa bits (~14 decimal digits) against float32's 24 bits (~7 digits).
// Mirrors float.js one-for-one so the DF and float32 shaders stay structurally identical.

function floatLit(n) { return Number.isInteger(n) ? `${n}.0` : String(n); }

// Emits a DF literal that carries the whole float64 value of v, not just its float32 head.
function dfLit(v) {
  const hi = Math.fround(v);
  return `vec2(${floatLit(hi)}, ${floatLit(v - hi)})`;
}

export const GLSL_DF_HELPERS = `
// ─── Double-float arithmetic (vec2: .x = hi, .y = lo, value = hi + lo) ───

// Optimization barrier. Every error term below is algebraically zero — in df_add,
// s - v is just a.x again — and the whole method depends on the compiler evaluating
// them as written rather than simplifying them away. GLSL ES 3.00 has no 'precise'
// qualifier to ask for that, so instead each sum that an error term is measured
// against is routed through a multiply by a uniform the compiler cannot prove is 1.0,
// which leaves it no algebraic identity to apply. u_dfOne is exactly 1.0 at runtime,
// so the multiply is exact and the arithmetic is unchanged.
uniform float u_dfOne;
float df_opaque(float x) { return x * u_dfOne; }

// Knuth two-sum plus the low words. Exact for any relative magnitude of a and b,
// unlike the fast two-sum which requires |a| >= |b|.
vec2 df_add(vec2 a, vec2 b) {
  float s = df_opaque(a.x + b.x);
  float v = s - a.x;
  float e = (a.x - (s - v)) + (b.x - v);
  float t = e + a.y + b.y;
  float hi = df_opaque(s + t);
  return vec2(hi, t - (hi - s));
}

vec2 df_neg(vec2 a) { return vec2(-a.x, -a.y); }
vec2 df_sub(vec2 a, vec2 b) { return df_add(a, df_neg(b)); }

// Dekker two-product. The hi/lo split masks off the low 12 mantissa bits instead of using
// the usual Veltkamp trick (c = SPLIT*a; ah = c - (c - a)): GLSL compilers may contract a
// multiply-add pair into a single FMA, which collapses that expression to ah = a and turns
// the split into a silent no-op. Masking leaves 12 significant bits per half, so each of
// the four partial products below fits exactly in a float32 significand.
vec2 df_mul(vec2 a, vec2 b) {
  float p  = df_opaque(a.x * b.x);
  float ah = uintBitsToFloat(floatBitsToUint(a.x) & 0xfffff000u);
  float al = a.x - ah;
  float bh = uintBitsToFloat(floatBitsToUint(b.x) & 0xfffff000u);
  float bl = b.x - bh;
  float err = ((ah*bh - p) + ah*bl + al*bh) + al*bl;
  float e  = a.x*b.y + a.y*b.x + err;
  float hi = df_opaque(p + e);
  return vec2(hi, e - (hi - p));
}

// A normalized pair with hi == 0.0 has lo == 0.0, so the sign of hi decides.
vec2 df_abs(vec2 a) { return a.x < 0.0 ? df_neg(a) : a; }
`;

export function glslDFIterStyleFragment({ iterStyle, params }) {
  switch (iterStyle) {
    case 'mandelbrot':
      return `vec2 zRe = vec2(0.0), zIm = vec2(0.0), cRe = pRe, cIm = pIm;`;
    case 'julia':
      return `vec2 zRe = pRe, zIm = pIm, cRe = ${dfLit(params.jRe)}, cIm = ${dfLit(params.jIm)};`;
    default:
      throw new Error(`Unknown iterStyle: ${iterStyle}`);
  }
}

function glslDFZExpFragment({ expType, params }) {
  if (expType !== 'int') throw new Error(`DF shader: expType '${expType}' not supported`);
  const e = params.e;
  if (!Number.isInteger(e) || e < 2) throw new Error(`DF shader: integer exponent ${e} not supported`);

  // Scaling by 2 is exact in binary FP, so doubling both words keeps the pair normalized.
  if (e === 2) return `
    vec2 _zr2 = df_mul(zRe, zRe);
    vec2 _zi2 = df_mul(zIm, zIm);
    vec2 _nIm = df_mul(vec2(2.0*zRe.x, 2.0*zRe.y), zIm);
    zRe = df_sub(_zr2, _zi2);
    zIm = _nIm;`;

  // e≥3: repeated complex multiplication — ${e} is a literal so the compiler can unroll
  return `
    vec2 _rRe = zRe, _rIm = zIm;
    for (int _k = 1; _k < ${e}; _k++) {
      vec2 _nRe = df_sub(df_mul(_rRe, zRe), df_mul(_rIm, zIm));
      _rIm = df_add(df_mul(_rRe, zIm), df_mul(_rIm, zRe));
      _rRe = _nRe;
    }
    zRe = _rRe; zIm = _rIm;`;
}

export function glslDFFormulaFragment({ formula, expType, params }) {
  const exp = glslDFZExpFragment({ expType, params });
  switch (formula) {
    case 'mandelbrot':
      return `${exp}
    zRe = df_add(zRe, cRe); zIm = df_add(zIm, cIm);`;
    case 'burningShip':
      return `zRe = df_abs(zRe); zIm = df_abs(zIm);${exp}
    zRe = df_add(zRe, cRe); zIm = df_add(zIm, cIm);`;
    case 'tricorn':
      return `zIm = df_neg(zIm);${exp}
    zRe = df_add(zRe, cRe); zIm = df_add(zIm, cIm);`;
    default:
      throw new Error(`Unknown formula: ${formula}`);
  }
}

// At escape |z| >= escapeRadius, so the hi words carry every significant bit and the
// float32 logarithms are as accurate as they are in the plain float32 shader.
export function glslDFSmoothingFragment({ smoothing, expType, params }) {
  if (!smoothing || expType === 'complex') return `float(i)`;
  if (params.e === 2) return `float(i) + 1.0 - log2(0.5 * log2(zRe.x*zRe.x + zIm.x*zIm.x))`;
  return `float(i) + 1.0 - log(0.5 * log(zRe.x*zRe.x + zIm.x*zIm.x)) / log(${floatLit(params.e)})`;
}

// Returns GLSL code that updates `float ot` (minimum trap distance) inside the iteration loop.
// Trap coordinates are O(1) rather than O(pixel size), so float32 distances suffice.
export function glslDFOrbitTrapFragment({ orbitTraps }) {
  if (!orbitTraps || orbitTraps.length === 0) return '';
  let res = '';
  for (const trap of orbitTraps) {
    if (trap.type === 'point') {
      res += `
    { float _dRe = zRe.x - ${floatLit(trap.re)}, _dIm = zIm.x - ${floatLit(trap.im)};
      float _d = sqrt(_dRe*_dRe + _dIm*_dIm);
      if (_d < ot) ot = _d; }`;
    } else if (trap.type === 'circle') {
      res += `
    { float _dRe = zRe.x - ${floatLit(trap.re)}, _dIm = zIm.x - ${floatLit(trap.im)};
      float _d = abs(sqrt(_dRe*_dRe + _dIm*_dIm) - ${floatLit(trap.radius)});
      if (_d < ot) ot = _d; }`;
    }
  }
  return res;
}
