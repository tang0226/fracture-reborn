import { V, bindStore } from "../lmnt.js";
import { store } from "../store.js";
import { render } from "../render.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { Slider } from './Slider.js';
import { SelectInput } from './SelectInput.js';
import { CheckboxInput } from './CheckboxInput.js';

export function RenderSection({}) {
  bindStore(store, {
    select: s => ({ render: s.render, processor: s.engine.processor }),
    shouldUpdate: (next, prev) => next.render !== prev.render || next.processor !== prev.processor,
  });

  return () => {
    const state = store.getState();
    const renderCfg = state.render;
    const processor = state.engine.processor;
    return V(CollapsibleSection, { title: 'Render' },
      V(SelectInput, {
        label: 'Processor',
        value: processor,
        options: [
          { value: 'cpu', label: 'CPU' },
          { value: 'gpu', label: 'GPU (float32)' },
        ],
        onChange: v => {
          store.dispatch({ type: 'engine/setProcessor', payload: v });
          render(store.getState());
        },
      }),
      V(Slider, {
        label: 'Workers',
        value: renderCfg.workerCount,
        min: 1, max: navigator.hardwareConcurrency, step: 1,
        onChange: v => store.dispatch({ type: 'render/setWorkerCount', payload: v }),
      }),
      V(SelectInput, {
        label: 'Tile size',
        value: String(renderCfg.tileSize),
        options: [16, 32, 64, 128, 256].map(n => ({ value: String(n), label: String(n) })),
        onChange: v => store.dispatch({ type: 'render/setTileSize', payload: +v }),
      }),
      V(CheckboxInput, {
        label: 'Anti-aliasing',
        checked: renderCfg.antiAliasing !== false,
        onChange: checked => store.dispatch({
          type: 'render/setAntiAliasing',
          payload: checked ? 4 : false,
        }),
      }),
      renderCfg.antiAliasing !== false ? V(Slider, {
        label: 'AA degree (NxN)',
        value: renderCfg.antiAliasing,
        min: 2, max: 8, step: 1,
        onChange: v => store.dispatch({ type: 'render/setAntiAliasing', payload: v }),
      }) : null,
      V(CheckboxInput, {
        label: 'Progressive resolution',
        checked: renderCfg.progressive,
        onChange: checked => store.dispatch({ type: 'render/setProgressive', payload: checked }),
      }),
    );
  };
}
