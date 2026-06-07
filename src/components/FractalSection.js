import { V, bindStore } from "../lmnt.js";
import { store, DEFAULT_MAX_ITER, DEFAULT_SMOOTH_ITER_PERIOD, DEFAULT_SMOOTH_ITER_PERIOD_LOG } from "../store.js";
import { render } from "../render.js";
import { fractals } from "../fractals.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { SelectInput } from './SelectInput.js';
import { Slider } from './Slider.js';

const FORMULA_OPTIONS = Object.entries(fractals.formulas).map(([value, f]) => ({ value, label: f.label }));

function resetZoomAndRender() {
  const { fractal } = store.getState();
  store.dispatch({
    type: 'viewport/resetZoom',
    payload: { formulaKey: fractal.formula, params: fractal.params },
  });
  store.dispatch({ type: 'iteration/setMaxIter', payload: DEFAULT_MAX_ITER });
  const logScale = store.getState().coloring.exterior.smoothIter.logScale;
  store.dispatch({ type: 'coloring/setSmoothIter', payload: { period: logScale ? DEFAULT_SMOOTH_ITER_PERIOD_LOG : DEFAULT_SMOOTH_ITER_PERIOD } });
  render(store.getState());
}

export function FractalSection({}) {
  bindStore(store, { select: s => s.fractal });

  return () => {
    const { fractal } = store.getState();
    return V(CollapsibleSection, { title: 'Fractal' },
      V(SelectInput, {
        label: 'Formula',
        value: fractal.formula,
        options: FORMULA_OPTIONS,
        onChange: v => {
          store.dispatch({ type: 'fractal/setFormula', payload: v });
          resetZoomAndRender();
        },
      }),
      fractal.expType === 'int' ? V(Slider, {
        label: 'Exponent',
        value: fractal.params.e,
        min: 2, max: 10, step: 1, integer: true,
        onChange: v => {
          store.dispatch({ type: 'fractal/setParam', payload: { param: 'e', value: v } });
          resetZoomAndRender();
        },
      }) : null,
    );
  };
}
