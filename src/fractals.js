// Fractal metadata

const fractals = {};

fractals.methods = {
  escapeTime: 'escapeTime',
  buddha: 'buddha',
  newton: 'newton',
};

fractals.iterStyles = {
  mandelbrot: {
    label: 'Mandelbrot',
    params: {},
  },
  julia: {
    label: 'Julia',
    params: {
      cRe: { type: 'float', default: 0 },
      cIm: { type: 'float', default: 0 },
    },
  },
};


fractals.expTypes = {
  int: {
    params: {
      e: { type: 'int', default: 2 },
    },
  },
  float: {
    params: {
      e: { type: 'float', default: 2 },
    },
  },
  complex: {
    params: {
      eRe: { type: 'float', default: 2 },
      eIm: { type: 'float', default: 2 },
    },
  },
};

fractals.formulas = {
  mandelbrot: {
    label: 'Mandelbrot',
    method: fractals.methods.escapeTime,
    defaultIterStyle: 'mandelbrot',
    defaultExpType: 'int',
  },
  burningShip: {
    label: 'Burning Ship',
    method: fractals.methods.escapeTime,
    defaultIterStyle: 'mandelbrot',
    defaultExpType: 'int',
  },
  tricorn: {
    label: 'Tricorn',
    method: fractals.methods.escapeTime,
    defaultIterStyle: 'mandelbrot',
    defaultExpType: 'int',
  },
  custom: {
    label: 'Custom',
    method: null,
    defaultIterStyle: null,
    defaultExpType: null,
  },
};

function paramsDataFor(formula, iterStyleKey, expTypeKey) {
  const s = fractals.iterStyles[iterStyleKey ?? formula.defaultIterStyle];
  const e = fractals.expTypes[expTypeKey ?? formula.defaultExpType];
  return {
    ...formula.params,
    ...s?.params,
    ...e?.params,
  };
}

function defaultParamsValuesFor(formula, iterStyle, expType) {
  const params = paramsDataFor(formula, iterStyle, expType);
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v.default]));
}

export { fractals, paramsDataFor, defaultParamsValuesFor };
