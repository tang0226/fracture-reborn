import { V, useState, useStyle, bindStore } from "../lmnt.js";
import { store } from "../store.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { LogSlider } from './LogSlider.js';
import { CheckboxInput } from './CheckboxInput.js';
import { SelectInput } from './SelectInput.js';

const TRAP_TYPE_OPTIONS = [
  { value: 'point',  label: 'Point'  },
  { value: 'circle', label: 'Circle' },
];

const DEFAULT_TRAP = {
  point:  { type: 'point',  re: 0, im: 0            },
  circle: { type: 'circle', re: 0, im: 0, radius: 1 },
};

export function IterationSection({}) {
  const addType = useState('point');

  bindStore(store, { select: s => s.iteration });

  useStyle(`
    & .orbit-traps-label {
      color: var(--panel-text-muted);
      font-size: var(--text-base);
    }
    & .trap-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    & .trap-card {
      background: var(--panel-surface);
      border: 1px solid var(--panel-border);
      border-radius: var(--panel-radius);
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    & .trap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    & .trap-type {
      font-size: var(--text-base);
      font-weight: 500;
      color: var(--panel-text);
    }
    & .trap-remove {
      background: none;
      border: none;
      color: var(--panel-text-muted);
      cursor: pointer;
      padding: 0;
      font-size: 15px;
      line-height: 1;
    }
    & .trap-remove:hover {
      color: var(--panel-text);
    }
    & .add-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    & .add-btn {
      background: var(--panel-surface);
      border: 1px solid var(--panel-border);
      color: var(--panel-text);
      font-size: var(--text-base);
      padding: 4px 10px;
      border-radius: var(--panel-radius);
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    & .add-btn:hover {
      border-color: var(--panel-text);
    }
  `);

  return () => {
    const { iteration } = store.getState();
    const { orbitTraps } = iteration;
    const type = addType.get();

    function updateTrap(index, patch) {
      const updated = orbitTraps.map((t, i) => i === index ? { ...t, ...patch } : t);
      store.dispatch({ type: 'iteration/setOrbitTraps', payload: updated });
    }

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

      V('hr'),
      V('span', { class: 'orbit-traps-label' }, 'Orbit traps'),

      orbitTraps.length > 0 ? V('div', { class: 'trap-list' },
        ...orbitTraps.map((trap, i) =>
          V('div', { class: 'trap-card' },
            V('div', { class: 'trap-header' },
              V('span', { class: 'trap-type' }, trap.type === 'point' ? 'Point' : 'Circle'),
              V('button', {
                class: 'trap-remove',
                title: 'Remove',
                onClick: () => {
                  store.dispatch({ type: 'iteration/removeOrbitTrap', payload: trap });
                  if (orbitTraps.length === 1) {
                    const { coloring } = store.getState();
                    if (coloring.exterior.method === 'orbitTrap')
                      store.dispatch({ type: 'coloring/setExteriorMethod', payload: 'smoothIter' });
                    if (coloring.interior.method === 'orbitTrap')
                      store.dispatch({ type: 'coloring/setInteriorMethod', payload: 'solid' });
                  }
                },
              }, '×'),
            ),
            V(LogSlider, {
              label: 'Re',
              value: trap.re,
              min: 1e-5, max: 128, bipolar: true,
              onChange: v => updateTrap(i, { re: v }),
            }),
            V(LogSlider, {
              label: 'Im',
              value: trap.im,
              min: 1e-5, max: 128, bipolar: true,
              onChange: v => updateTrap(i, { im: v }),
            }),
            trap.type === 'circle' ? V(LogSlider, {
              label: 'Radius',
              value: trap.radius,
              min: 1e-4, max: 4,
              onChange: v => updateTrap(i, { radius: v }),
            }) : null,
          )
        ),
      ) : null,

      V('div', { class: 'add-row' },
        V('button', {
          class: 'add-btn',
          onClick: () => store.dispatch({
            type: 'iteration/addOrbitTrap',
            payload: { ...DEFAULT_TRAP[type] },
          }),
        }, '+ Add'),
        V(SelectInput, {
          value: type,
          options: TRAP_TYPE_OPTIONS,
          onChange: v => addType.set(v),
        }),
      ),
    );
  };
}
