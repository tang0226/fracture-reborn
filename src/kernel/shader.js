// Generates WebGL2 GLSL fragment shader source from settings.
// Mirrors the float64 fragment pattern: each function takes settings and returns a GLSL code string.

// Ensures a JS number is a GLSL float literal (integers get .0 appended).
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

export function glslZExpFragment({ expType, params }) {
  if (expType !== 'int') throw new Error(`GPU shader: expType '${expType}' not supported`);
  const e = params.e;
  if (!Number.isInteger(e) || e < 2) throw new Error(`GPU shader: integer exponent ${e} not supported`);

  // e=2: direct closed-form (3 multiplies instead of the loop's 4)
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

export function buildFragmentShader(settings) {
  const { fractal, iteration } = settings;
  const { formula, iterStyle, expType, params } = fractal;
  const { maxIter, smoothing, orbitTraps } = iteration;

  // These may throw for unsupported formula/expType — caller should fall back to CPU
  const iterStyleCode = glslIterStyleFragment({ iterStyle, params });
  const formulaCode   = glslFormulaFragment({ formula, expType, params });
  const smoothExpr    = glslSmoothingFragment({ smoothing, expType, params });
  const trapCode      = glslOrbitTrapFragment({ orbitTraps });

  return `#version 300 es
precision highp float;
precision highp int;

uniform vec2  u_resolution;
uniform vec2  u_center;
uniform float u_size;
uniform int   u_maxIter;
uniform float u_escapeR2;
uniform int   u_flipY;
uniform int   u_aa;
uniform sampler2D u_palette;
uniform float u_palPeriod;
uniform float u_palOffset;
uniform int   u_palLogScale;
uniform vec3  u_interiorColor;
uniform int   u_interiorMethod;
uniform int   u_exteriorMethod;
uniform vec3  u_exteriorSolid;
uniform sampler2D u_otPalette;
uniform float u_otScale;
uniform float u_otOffset;
uniform int   u_otLogScale;

out vec4 outColor;

// result.x = smooth iter count (or -1.0 for interior); result.y = min orbit trap distance
vec2 iteratePoint(float pRe, float pIm) {
  ${iterStyleCode}
  float ot = 1e20;
  for (int i = 0; i < ${maxIter}; i++) {
    ${formulaCode}${trapCode}
    if (zRe*zRe + zIm*zIm > u_escapeR2) {
      return vec2(${smoothExpr}, ot);
    }
  }
  return vec2(-1.0, ot);
}

vec3 samplePalette(float smoothIter) {
  float t = smoothIter;
  if (u_palLogScale == 1) {
    t = log(t + 1.0) / log(float(${maxIter}) + 1.0) * u_palPeriod + u_palOffset;
  } else {
    t = t / u_palPeriod + u_palOffset;
  }
  t = mod(mod(t, 1.0) + 1.0, 1.0);
  return texture(u_palette, vec2(t, 0.5)).rgb;
}

vec3 sampleOtPalette(float ot) {
  float t = u_otLogScale == 1
    ? log(ot + 1.0) / u_otScale + u_otOffset
    : ot / u_otScale + u_otOffset;
  t = mod(mod(t, 1.0) + 1.0, 1.0);
  return texture(u_otPalette, vec2(t, 0.5)).rgb;
}

vec3 colorize(vec2 result) {
  float smoothIter = result.x;
  float ot = result.y;
  if (smoothIter < 0.0) {
    // interior
    if (u_interiorMethod == 1) return sampleOtPalette(ot);
    return u_interiorColor;
  }
  // exterior
  if (u_exteriorMethod == 2) return sampleOtPalette(ot);
  if (u_exteriorMethod == 1) return u_exteriorSolid;
  return samplePalette(smoothIter);
}

void main() {
  vec3 acc = vec3(0.0);
  float aspect = u_resolution.y / u_resolution.x;
  float ySign  = u_flipY == 1 ? 1.0 : -1.0;

  for (int dy = 0; dy < u_aa; dy++) {
    for (int dx = 0; dx < u_aa; dx++) {
      vec2 sc = gl_FragCoord.xy
              + (vec2(float(dx), float(dy)) + 0.5) / float(u_aa) - 0.5;
      float pRe = u_center.x + (sc.x / u_resolution.x - 0.5) * u_size;
      float pIm = u_center.y + ySign * (0.5 - sc.y / u_resolution.y) * u_size * aspect;
      acc += colorize(iteratePoint(pRe, pIm));
    }
  }

  outColor = vec4(acc / float(u_aa * u_aa), 1.0);
}`;
}
