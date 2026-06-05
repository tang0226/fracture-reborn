import { V, bindStore } from "../lmnt.js";
import { store } from "../store.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { Slider } from './Slider.js';
import { SelectInput } from './SelectInput.js';
import { CheckboxInput } from './CheckboxInput.js';

export function RenderSection({}) {
  bindStore(store, { select: s => s.render });

  return () => {
    const { render: renderCfg } = store.getState();
    return V(CollapsibleSection, { title: 'Render' },
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
