import { V, bindStore } from "../lmnt.js";
import { store } from "../store.js";
import { render } from "../render.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { SelectInput } from './SelectInput.js';
import { CheckboxInput } from './CheckboxInput.js';

export function ZoomSection({}) {
  bindStore(store, {
    select: s => s.viewport,
    shouldUpdate: (next, prev) =>
      next.flipYAxis !== prev.flipYAxis ||
      next.clickZoomFactor !== prev.clickZoomFactor,
  });

  return () => {
    const { viewport } = store.getState();
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
          render(store.getState());
        },
      }, 'Reset zoom'),
      V(CheckboxInput, {
        label: 'Flip y-axis',
        checked: viewport.flipYAxis,
        onChange: v => store.dispatch({ type: 'viewport/setFlipYAxis', payload: v }),
      }),
    );
  };
}
