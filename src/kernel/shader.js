// Builds WebGL2 GLSL fragment shaders from settings.
// Mirrors iterator.js: imports fragment generators from fragments/gpu/ and assembles shaders here.

import {
  glslIterStyleFragment,
  glslFormulaFragment,
  glslSmoothingFragment,
  glslOrbitTrapFragment,
} from './fragments/gpu/float.js';

import {
  GLSL_DF_HELPERS,
  glslDFIterStyleFragment,
  glslDFFormulaFragment,
  glslDFSmoothingFragment,
  glslDFOrbitTrapFragment,
} from './fragments/gpu/doubleFloat.js';

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

// Double-float variant: every coordinate is a vec2 (hi, lo) pair of float32s, extending
// usable zoom depth from ~1e-6 to ~1e-14. Identical to buildFragmentShader apart from the
// DF helper block, the hi/lo uniforms, and the coordinate arithmetic in main().
export function buildDFFragmentShader(settings) {
  const { fractal, iteration } = settings;
  const { formula, iterStyle, expType, params } = fractal;
  const { maxIter, smoothing, orbitTraps } = iteration;

  // These may throw for unsupported formula/expType — caller should fall back to CPU
  const iterStyleCode = glslDFIterStyleFragment({ iterStyle, params });
  const formulaCode   = glslDFFormulaFragment({ formula, expType, params });
  const smoothExpr    = glslDFSmoothingFragment({ smoothing, expType, params });
  const trapCode      = glslDFOrbitTrapFragment({ orbitTraps });

  return `#version 300 es
precision highp float;
precision highp int;

uniform vec2  u_resolution;
uniform vec4  u_center_df;   // (re.hi, re.lo, im.hi, im.lo)
uniform vec2  u_size_df;     // (hi, lo)
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
${GLSL_DF_HELPERS}
// result.x = smooth iter count (or -1.0 for interior); result.y = min orbit trap distance
vec2 iteratePoint(vec2 pRe, vec2 pIm) {
  ${iterStyleCode}
  float ot = 1e20;
  for (int i = 0; i < ${maxIter}; i++) {
    ${formulaCode}${trapCode}
    // Escape only needs the hi words: at |z| >= escapeRadius they hold every significant bit.
    if (zRe.x*zRe.x + zIm.x*zIm.x > u_escapeR2) {
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
      // The pixel offsets stay float32: they are O(1) fractions of the viewport, so their
      // 1e-7 relative error is ~1e-4 of a pixel. Only center + offset*size needs DF.
      float xFrac = sc.x / u_resolution.x - 0.5;
      float yFrac = ySign * (0.5 - sc.y / u_resolution.y) * aspect;
      vec2 pRe = df_add(u_center_df.xy, df_mul(vec2(xFrac, 0.0), u_size_df));
      vec2 pIm = df_add(u_center_df.zw, df_mul(vec2(yFrac, 0.0), u_size_df));
      acc += colorize(iteratePoint(pRe, pIm));
    }
  }

  outColor = vec4(acc / float(u_aa * u_aa), 1.0);
}`;
}
