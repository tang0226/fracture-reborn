import { V, bindStore } from "../lmnt.js";
import { store, DEFAULT_MAX_ITER, DEFAULT_SMOOTH_ITER_PERIOD, DEFAULT_SMOOTH_ITER_PERIOD_LOG } from "../store.js";
import { render } from "../render.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { SelectInput } from './SelectInput.js';
import { CheckboxInput } from './CheckboxInput.js';

export function ZoomSection({}) {
  bindStore(store, {
    select: s => ({ viewport: s.viewport, engine: s.engine }),
    shouldUpdate: (next, prev) =>
      next.viewport.flipYAxis !== prev.viewport.flipYAxis ||
      next.viewport.clickZoomFactor !== prev.viewport.clickZoomFactor ||
      next.engine.processor !== prev.engine.processor ||
      next.engine.useDoubleDouble !== prev.engine.useDoubleDouble ||
      next.engine.useArbitraryPrecision !== prev.engine.useArbitraryPrecision ||
      next.engine.dapPrecision !== prev.engine.dapPrecision,
  });

  return () => {
    const { viewport, engine } = store.getState();
    return V(CollapsibleSection, { title: 'Zoom' },
      V(SelectInput, {
        label: 'Click zoom factor',
        value: String(viewport.clickZoomFactor),
        options: [
          { value: '1.5', label: '1.5' },
          { value: '2',   label: '2'   },
          { value: '4',   label: '4'   },
          { value: '8',   label: '8'   },
          { value: '16',  label: '16'  },
        ],
        onChange: v => store.dispatch({ type: 'viewport/setClickZoomFactor', payload: Number(v) }),
      }),
      V('button', {
        class: 'standalone-btn',
        onClick: () => {
          const state = store.getState();
          store.dispatch({
            type: 'viewport/resetZoom',
            payload: { formulaKey: state.fractal.formula, params: state.fractal.params },
          });
          store.dispatch({ type: 'iteration/setMaxIter', payload: DEFAULT_MAX_ITER });
          const logScale = store.getState().coloring.exterior.smoothIter.logScale;
          store.dispatch({ type: 'coloring/setSmoothIter', payload: { period: logScale ? DEFAULT_SMOOTH_ITER_PERIOD_LOG : DEFAULT_SMOOTH_ITER_PERIOD } });
          render(store.getState());
        },
      }, 'Reset zoom'),
      V(CheckboxInput, {
        label: 'Flip y-axis',
        checked: viewport.flipYAxis,
        onChange: v => store.dispatch({ type: 'viewport/setFlipYAxis', payload: v }),
      }),
      engine.processor === 'cpu' && !engine.useArbitraryPrecision ? V(CheckboxInput, {
        label: 'Double precision (deep zoom)',
        checked: engine.useDoubleDouble,
        onChange: checked => {
          store.dispatch({ type: 'engine/setDoubleDouble', payload: checked });
          render(store.getState());
        },
      }) : null,
      V(CheckboxInput, {
        label: 'Arbitrary precision (deep zoom)',
        checked: engine.useArbitraryPrecision,
        onChange: checked => {
          store.dispatch({ type: 'engine/setArbitraryPrecision', payload: checked });
          render(store.getState());
        },
      }),
      engine.useArbitraryPrecision ? V(SelectInput, {
        label: 'DAP digits',
        value: String(engine.dapPrecision),
        options: [
          { value: '16',  label: '16'  },
          { value: '24',  label: '24'  },
          { value: '32',  label: '32'  },
          { value: '48',  label: '48'  },
          { value: '64',  label: '64'  },
          { value: '96',  label: '96'  },
          { value: '128', label: '128' },
        ],
        onChange: v => {
          store.dispatch({ type: 'engine/setDapPrecision', payload: Number(v) });
          render(store.getState());
        },
      }) : null,
    );
  };
}
