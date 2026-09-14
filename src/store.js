// Defines structure and content of main app store
// Default structure should be constant, but some time down the line it can load from localStorage, cookies, or account data

import { shallowArrayEqual } from './utils.js';
import { fractals, paramsDataFor, defaultParamsValuesFor, defaultViewportFor } from './fractals.js';
import { createStore } from './lmnt.js';
import { palettes } from './palettes.js';
import { dapCtx, setDapPrecision } from './dap-ctx.js';

// Precision values by processor:
//   CPU: 'float64' | 'dd' (double-double) | 'dap' (arbitrary precision)
//   GPU: 'float32' | 'df' (double-float)
const engine = {
  state: {
    processor: 'cpu',
    precision: 'float64',
    usePerturbation: false,
    dapPrecision: 32,
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'engine/setProcessor':
        if (payload !== 'cpu' && payload !== 'gpu') throw new Error('Invalid processor type');
        return { ...state, processor: payload, precision: payload === 'gpu' ? 'float32' : 'float64' };
      case 'engine/setPrecision':
        return { ...state, precision: payload };
      case 'engine/setPerturbation':
        return { ...state, usePerturbation: payload };
      case 'engine/setDapPrecision':
        setDapPrecision(payload);
        return { ...state, dapPrecision: payload };
    }
    return state;
  },
};

const render = {
  state: {
    workerCount: navigator.hardwareConcurrency - 2,
    tileSize: 64,
    antiAliasing: 4,
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
  // center and size are always strings to support arbitrary-precision zoom.
  // Float64 path parses them with parseFloat; DAP path parses them with dapCtx.n().
  state: {
    center: { re: '0', im: '0' },
    size: '4',
    flipYAxis: true,
    clickZoomFactor: 4,
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'viewport/setViewport':
        return {
          ...state,
          center: { re: String(payload.center.re), im: String(payload.center.im) },
          size: String(payload.size),
        };
      case 'viewport/setFlipYAxis':
        return { ...state, flipYAxis: payload };
      case 'viewport/zoomInOnPointFromClick': {
        const { width, height, reCoeff, imCoeff } = payload;
        const yFactor = height / width * (state.flipYAxis ? 1 : -1);
        if (payload.useAP) {
          const sz = dapCtx.n(state.size);
          const cf = dapCtx.n(state.clickZoomFactor);
          const reDiff = dapCtx.mul(dapCtx.n(reCoeff), sz);
          const imDiff = dapCtx.mul(dapCtx.n(imCoeff * yFactor), sz);
          return {
            ...state,
            center: {
              re: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.re), dapCtx.sub(reDiff, dapCtx.div(reDiff, cf)))),
              im: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.im), dapCtx.sub(imDiff, dapCtx.div(imDiff, cf)))),
            },
            size: dapCtx.toString(dapCtx.div(sz, cf)),
          };
        } else {
          const cr = parseFloat(state.center.re), ci = parseFloat(state.center.im), sz = parseFloat(state.size);
          const reDiff = reCoeff * sz;
          const imDiff = imCoeff * sz * yFactor;
          return {
            ...state,
            center: {
              re: String(cr + reDiff - reDiff / state.clickZoomFactor),
              im: String(ci + imDiff - imDiff / state.clickZoomFactor),
            },
            size: String(sz / state.clickZoomFactor),
          };
        }
      }
      case 'viewport/zoomOutFromPointFromClick': {
        const { width, height, reCoeff, imCoeff } = payload;
        const yFactor = height / width * (state.flipYAxis ? 1 : -1);
        if (payload.useAP) {
          const sz = dapCtx.n(state.size);
          const cf = dapCtx.n(state.clickZoomFactor);
          const reDiff = dapCtx.mul(dapCtx.n(reCoeff), sz);
          const imDiff = dapCtx.mul(dapCtx.n(imCoeff * yFactor), sz);
          return {
            ...state,
            center: {
              re: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.re), dapCtx.sub(reDiff, dapCtx.mul(reDiff, cf)))),
              im: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.im), dapCtx.sub(imDiff, dapCtx.mul(imDiff, cf)))),
            },
            size: dapCtx.toString(dapCtx.mul(sz, cf)),
          };
        } else {
          const cr = parseFloat(state.center.re), ci = parseFloat(state.center.im), sz = parseFloat(state.size);
          const reDiff = reCoeff * sz;
          const imDiff = imCoeff * sz * yFactor;
          return {
            ...state,
            center: {
              re: String(cr + reDiff - reDiff * state.clickZoomFactor),
              im: String(ci + imDiff - imDiff * state.clickZoomFactor),
            },
            size: String(sz * state.clickZoomFactor),
          };
        }
      }
      case 'viewport/zoomFromDrag': {
        const { width, height, reCoeff, imCoeff, sizeCoeff } = payload;
        const yFactor = height / width * (state.flipYAxis ? 1 : -1);
        if (payload.useAP) {
          const sz = dapCtx.n(state.size);
          return {
            ...state,
            center: {
              re: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.re), dapCtx.mul(dapCtx.n(reCoeff), sz))),
              im: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.im), dapCtx.mul(dapCtx.n(imCoeff * yFactor), sz))),
            },
            size: dapCtx.toString(dapCtx.mul(sz, dapCtx.n(sizeCoeff))),
          };
        } else {
          const cr = parseFloat(state.center.re), ci = parseFloat(state.center.im), sz = parseFloat(state.size);
          return {
            ...state,
            center: {
              re: String(cr + reCoeff * sz),
              im: String(ci + imCoeff * sz * yFactor),
            },
            size: String(sz * sizeCoeff),
          };
        }
      }
      case 'viewport/centerFromClick': {
        const { width, height, reCoeff, imCoeff } = payload;
        const yFactor = height / width * (state.flipYAxis ? 1 : -1);
        if (payload.useAP) {
          const sz = dapCtx.n(state.size);
          return {
            ...state,
            center: {
              re: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.re), dapCtx.mul(dapCtx.n(reCoeff), sz))),
              im: dapCtx.toString(dapCtx.add(dapCtx.n(state.center.im), dapCtx.mul(dapCtx.n(imCoeff * yFactor), sz))),
            },
          };
        } else {
          const cr = parseFloat(state.center.re), ci = parseFloat(state.center.im), sz = parseFloat(state.size);
          return {
            ...state,
            center: {
              re: String(cr + reCoeff * sz),
              im: String(ci + imCoeff * sz * yFactor),
            },
          };
        }
      }
      case 'viewport/setClickZoomFactor':
        return { ...state, clickZoomFactor: payload };
      case 'viewport/resetZoom': {
        const dv = defaultViewportFor(payload.formulaKey, payload.params);
        return {
          ...state,
          center: { re: String(dv.center.re), im: String(dv.center.im) },
          size: String(dv.size),
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
          params: defaultParamsValuesFor(formula),
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

export const DEFAULT_MAX_ITER = 200;
export const DEFAULT_SMOOTH_ITER_PERIOD = 100;
export const DEFAULT_SMOOTH_ITER_PERIOD_LOG = 1;

const iteration = {
  state: {
    maxIter: DEFAULT_MAX_ITER,
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
        stops: palettes.earthAndSky,
        period: DEFAULT_SMOOTH_ITER_PERIOD,
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

const renderStatus = {
  state: {
    phase: 'idle',
    tilesDone: 0,
    tilesTotal: 0,
    elapsed: 0,
  },
  reducer: (state, action) => {
    switch (action.type) {
      case 'renderStatus/start':
        return { phase: 'rendering', tilesDone: 0, tilesTotal: action.payload.tilesTotal, elapsed: 0, fromCache: action.payload.fromCache ?? false };
      case 'renderStatus/tileDone':
        return { ...state, tilesDone: state.tilesDone + 1, elapsed: action.payload.elapsed };
      case 'renderStatus/done':
        return { ...state, phase: 'done', tilesDone: state.tilesTotal, elapsed: action.payload.elapsed };
    }
    return state;
  },
};

export function needsArbitraryPrecision(viewport, engine) {
  // Depth at which the active precision runs out: float32 ~1e-6, double-float ~1e-13.
  const threshold = engine.processor === 'gpu' && engine.precision !== 'df' ? 1e-6 : 1e-13;
  return parseFloat(viewport.size) < threshold;
}

export const store = createStore({
  engine,
  render,
  viewport,
  canvas,
  fractal,
  iteration,
  coloring,
  renderStatus,
});
