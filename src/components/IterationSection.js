import { V, bindStore } from "../lmnt.js";
import { store } from "../store.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { LogSlider } from './LogSlider.js';
import { CheckboxInput } from './CheckboxInput.js';

export function IterationSection({}) {
  bindStore(store, { select: s => s.iteration });

  return () => {
    const { iteration } = store.getState();
    return V(CollapsibleSection, { title: 'Iteration' },
      V(LogSlider, {
        label: 'Max iterations',
        value: iteration.maxIter,
        min: 1, max: 100000, integer: true,
        onChange: v => store.dispatch({ type: 'iteration/setMaxIter', payload: v }),
      }),
      V(CheckboxInput, {
        label: 'Smoothing',
        checked: iteration.smoothing,
        onChange: checked => store.dispatch({ type: 'iteration/setSmoothing', payload: checked }),
      }),
    );
  };
}
