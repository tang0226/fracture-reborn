// Defines structure and content of main app store
// Default structure should be constant, but some time down the line it can load from localStorage, cookies, or account data

import { shallowArrayEqual } from './utils.js';
import { fractals, paramsDataFor, defaultParamsValuesFor } from './fractals.js';

const viewport = {
  state: {
    center: {
      re: -0.5,
      im: 0,
    },
    size: 2,
  },
  reducer: (state, action) => {
    const { type, payload } = action;
    switch (type) {
      case 'viewport/setViewport':
        return { center: payload.center, size: payload.size };
      case 'viewport/setCenter':
        return { ...state, center: payload };
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
      case 'fractal/setFormula':
        let formula = fractals.formulas[payload];
        return {
          ...state,
          formula: payload,
          iterStyle: formula.defaultIterStyle,
          expType: formula.defaultExpType,
        };
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
    smoothing: false,
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




export {
  viewport,
  canvas,
  fractal,
  iteration,
};
