// Defines structure and content of main app store
// Default structure should be constant, but some time down the line it can load from localStorage, cookies, or account data

import { shallowArrayEqual } from './utils.js';
import { fractals, paramsDataFor, defaultParamsValuesFor } from './fractals.js';
import { createStore } from './lmnt.js';
import { palettes } from './palettes.js';

const engine = {
  state: {
    processor: 'cpu',
    useArbitraryPrecision: false,
    usePerturbation: false,
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'engine/setProcessor':
        if (payload !== 'cpu' && payload !== 'gpu') throw new Error('Invalid processor type');
        return { ...state, processor: payload };
      case 'engine/setArbitraryPrecision':
        return { ...state, useArbitraryPrecision: payload };
      case 'engine/setPerturbation':
        return { ...state, usePerturbation: payload };
    }
    return state;
  },
};

const render = {
  state: {
    workerCount: navigator.hardwareConcurrency - 2,
    tileSize: 64,
    antiAliasing: false,
    progressive: true,
    strides: [16, 8, 4, 1],
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'render/setWorkerCount':
        return { ...state, workerCount: payload };
      case 'render/setTileSize':
        return { ...state, tileSize: payload };
      case 'render/setAntiAliasing':
        return { ...state, antiAliasing: payload };
      case 'render/setProgressive':
        return { ...state, progressive: payload };
      case 'render/setStrides':
        return { ...state, strides: payload };
    }
    return state;
  },
};

const viewport = {
  state: {
    center: {
      re: -0.5,
      im: 0,
    },
    size: 4,
    flipYAxis: false,
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'viewport/setViewport':
        return { center: payload.center, size: payload.size };
      case 'viewport/setCenter':
        return { ...state, center: payload };
      case 'viewport/setFlipYAxis':
        return { ...state, flipYAxis: payload };
      case 'viewport/zoom': // Zoom on center
        return { ...state, size: state.size / payload };
      case 'viewport/zoomOnPoint':
        if (payload.dapCtx) { // Using arbitrary precision?
          // distance from center to focus point
          let dRe = dapCtx.sub(payload.point.re, state.center.re);
          let dIm = dapCtx.sub(payload.point.im, state.center.im);
          return {
            center: {
              re: dapCtx.sub(payload.point.re, dapCtx.div(dRe, payload.zoom)),
              im: dapCtx.sub(payload.point.im, dapCtx.div(dIm, payload.zoom)),
            },
            size: state.size / payload.zoom,
          };
        } else {
          return {
            center: {
              re: payload.point.re - (payload.point.re - state.center.re) / payload.zoom,
              im: payload.point.im - (payload.point.im - state.center.im) / payload.zoom,
            },
            size: state.size / payload.zoom,
          };
        }
    }
    return state;
  },
};

const canvas = {
  state: {
    width: window.innerWidth,
    height: window.innerHeight,
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'canvas/setDim':
        return { ...state, width: payload.width, height: payload.height };
    }
    return state;
  },
};

let _defaultFormulaKey = 'mandelbrot';
let _defaultFormula = fractals.formulas[_defaultFormulaKey];
const fractal = {
  state: {
    formula: _defaultFormulaKey,
    iterStyle: _defaultFormula.defaultIterStyle,
    expType: _defaultFormula.defaultExpType,
    params: defaultParamsValuesFor(_defaultFormula),
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'fractal/setFormula': {
        const formula = fractals.formulas[payload];
        return {
          ...state,
          formula: payload,
          iterStyle: formula.defaultIterStyle,
          expType: formula.defaultExpType,
        };
      }
      case 'fractal/setIterStyle':
        return { ...state, iterStyle: payload};
      case 'fractal/setExpType':
        return { ...state, expType: payload };
      case 'fractal/setParams':
        return { ...state, params: payload };
      case 'fractal/setParam':
        return { ...state, params: {...state.params, [payload.param]: payload.value}};
    }
    return state;
  },
};

const iteration = {
  state: {
    maxIter: 200,
    escapeRadius: 256,
    smoothing: true,
    orbitTraps: [],
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'iteration/setMaxIter':
        return { ...state, maxIter: payload };
      case 'iteration/setEscapeRadius':
        return { ...state, escapeRadius: payload };
      case 'iteration/setSmoothing':
        return { ...state, smoothing: payload };
      case 'iteration/setOrbitTraps':
        return { ...state, orbitTraps: payload };
      case 'iteration/addOrbitTrap':
        return { ...state, orbitTraps: [...state.orbitTraps, payload] };
      case 'iteration/removeOrbitTrap':
        return { ...state, orbitTraps: state.orbitTraps.filter(t => t !== payload) };
    }
    return state;
  },
  equals: (a, b) => a.maxIter === b.maxIter
                 && a.escapeRadius === b.escapeRadius
                 && a.smoothing === b.smoothing
                 && shallowArrayEqual(a.orbitTraps, b.orbitTraps),
};

const coloring = {
  state: {
    exterior: {
      method: 'smoothIter',  // 'smoothIter' | 'orbitTrap' | 'solid'
      smoothIter: {
        stops: palettes.rainbowBlack,
        period: 100,
        offset: 0,
        logScale: false,
      },
      solid: { r: 255, g: 255, b: 255 },
    },
    interior: {
      method: 'solid', // 'solid' | 'orbitTrap',
      solid: { r: 0, g: 0, b: 0 },
    },
    orbitTrap: {
      stops: palettes.orbitTrap1,
      scale: 1,
      offset: 0,
      logScale: true,
    },
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'coloring/setExteriorMethod':
        return { ...state, exterior: { ...state.exterior, method: payload } };
      case 'coloring/setExteriorSolid':
        return { ...state, exterior: { ...state.exterior, solid: payload } };
      case 'coloring/setSmoothIter':
        return { ...state, exterior: { ...state.exterior, smoothIter: { ...state.exterior.smoothIter, ...payload } } };
      case 'coloring/setSmoothIterStops':
        return { ...state, exterior: { ...state.exterior, smoothIter: { ...state.exterior.smoothIter, stops: payload } } };
      case 'coloring/setInteriorMethod':
        return { ...state, interior: { ...state.interior, method: payload } };
      case 'coloring/setInteriorSolid':
        return { ...state, interior: { ...state.interior, solid: payload } };
      case 'coloring/setOrbitTrap':
        return { ...state, orbitTrap: { ...state.orbitTrap, ...payload } };
      case 'coloring/setOrbitTrapStops':
        return { ...state, orbitTrap: { ...state.orbitTrap, stops: payload } };
    }
    return state;
  },
};

function normalizePalette(p) {
  const { stops, lut } = p;
  if (stops[0].pos > 0) {
    stops.unshift({ ...stops[stops.length - 1], pos: 0 });
  }
  if (stops[stops.length - 1].pos < 1) {
    stops.push({ ...stops[0], pos: 1 });
  }
  return p;
}

export function needsArbitraryPrecision(viewport, engine) {
  const threshold = engine.processor === 'gpu' ? 1e-6 : 1e-13;
  return viewport.size < threshold;
}

export const store = createStore({
  engine,
  render,
  viewport,
  canvas,
  fractal,
  iteration,
  coloring,
});
