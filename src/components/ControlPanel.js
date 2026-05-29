import { V, useState, useStyle, bindStore } from "../lmnt.js";
import { store } from "../store.js";
import { render } from "../render.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { LogSlider } from "./LogSlider.js";
import { CheckboxInput } from "./CheckboxInput.js";

export function ControlPanel() {

  const open = useState(true);
  bindStore(store, { select: s => s.iteration });

  useStyle(`
    & {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2;
    }
    & .panel {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 400px;
      padding: 60px 20px 20px 20px;
      background: var(--panel-bg);
      transition: transform 0.25s ease;
      pointer-events: auto;
    }
    &.closed .panel {
      transform: translateX(-100%);
    }
    & .toggle-btn {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 30px;
      background: var(--panel-bg);
      border: none;
      color: var(--panel-text);
      cursor: pointer;
      font-size: 20px;
      padding: 6px 0;
      border-radius: var(--panel-radius);
      pointer-events: auto;
      text-align: center;
    }
    & .toggle-btn:hover {
      background: var(--panel-btn-hover);
    }
    & .toggle-btn:active {
      background: var(--panel-btn-active);
    }
    & .render-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: var(--panel-surface);
      border: 1px solid var(--panel-border);
      color: var(--panel-text);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      padding: 5px 14px;
      border-radius: var(--panel-radius);
    }
    & .render-btn:hover {
      background: var(--panel-surface-hover);
    }
    & .render-btn:active {
      background: var(--panel-surface-active);
    }
  `);

  return () => {
    const isOpen = open.get();
    return V('div', { class: isOpen ? '' : 'closed' },
      V('div', { class: 'panel' },
        V('button', { class: 'render-btn', onClick: () => render(store.getState()) }, 'Render'),

        V(CollapsibleSection, { title: 'Iteration' },
          V(LogSlider, {
            label: 'Max iterations',
            value: store.getState().iteration.maxIter,
            min: 1, max: 100000, step: 1,
            onChange: v => store.dispatch({ type: 'iteration/setMaxIter', payload: v }),
          }),

          V(CheckboxInput, {
            label: 'Smoothing',
            checked: store.getState().iteration.smoothing,
            onChange: (checked) => store.dispatch({ type: 'iteration/setSmoothing', payload: checked })
          }),
        ),

        V('hr'),
      ),
      V('button', { class: 'toggle-btn', onClick: () => open.set(!isOpen) },
        isOpen ? '«' : '☰'
      ),
    );
  };
}
