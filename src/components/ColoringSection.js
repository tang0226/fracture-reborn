import { V, useStyle, bindStore } from "../lmnt.js";
import { store } from "../store.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { SelectInput } from './SelectInput.js';
import { PaletteEditor } from './PaletteEditor.js';
import { Slider } from './Slider.js';
import { LogSlider } from './LogSlider.js';
import { CheckboxInput } from './CheckboxInput.js';

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function ColoringSection({}) {
  bindStore(store, { select: s => s.coloring });

  useStyle(`
    & .solid-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    & .swatch {
      width: 22px;
      height: 22px;
      border-radius: var(--panel-radius);
      border: 1px solid var(--panel-border);
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
      cursor: pointer;
    }
    & .swatch input[type="color"] {
      position: absolute;
      width: 200%;
      height: 200%;
      top: -50%;
      left: -50%;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    & .solid-label {
      color: var(--panel-text-muted);
      font-size: var(--text-base);
    }
  `);

  return () => {
    const { exterior, interior, orbitTrap } = store.getState().coloring;

    return V(CollapsibleSection, { title: 'Coloring' },

      V(SelectInput, {
        label: 'Exterior',
        value: exterior.method,
        options: [
          { value: 'smoothIter', label: 'Smooth iteration' },
          { value: 'orbitTrap',  label: 'Orbit trap'       },
          { value: 'solid',      label: 'Solid'            },
        ],
        onChange: m => store.dispatch({ type: 'coloring/setExteriorMethod', payload: m }),
      }),

      exterior.method === 'smoothIter' ? V(PaletteEditor, {
        stops: exterior.smoothIter.stops,
        onChange: stops => store.dispatch({ type: 'coloring/setSmoothIterStops', payload: stops }),
      }) : null,
      exterior.method === 'smoothIter' ? (exterior.smoothIter.logScale
        ? V(Slider, {
            label: 'Period',
            value: exterior.smoothIter.period,
            min: 0.1, max: 20, step: 0.1,
            onChange: v => store.dispatch({ type: 'coloring/setSmoothIter', payload: { period: v } }),
          })
        : V(LogSlider, {
            label: 'Period',
            value: exterior.smoothIter.period,
            min: 1, max: 10000,
            onChange: v => store.dispatch({ type: 'coloring/setSmoothIter', payload: { period: v } }),
          })
      ) : null,
      exterior.method === 'smoothIter' ? V(Slider, {
        label: 'Offset',
        value: exterior.smoothIter.offset,
        min: -1, max: 1, step: 0.01,
        onChange: v => store.dispatch({ type: 'coloring/setSmoothIter', payload: { offset: v } }),
      }) : null,
      exterior.method === 'smoothIter' ? V(CheckboxInput, {
        label: 'Log scale',
        checked: exterior.smoothIter.logScale,
        onChange: c => store.dispatch({ type: 'coloring/setSmoothIter', payload: { logScale: c, period: c ? 1 : 200 } }),
      }) : null,

      exterior.method === 'orbitTrap' ? V(PaletteEditor, {
        stops: orbitTrap.stops,
        onChange: stops => store.dispatch({ type: 'coloring/setOrbitTrapStops', payload: stops }),
      }) : null,
      exterior.method === 'orbitTrap' ? V(LogSlider, {
        label: 'Scale',
        value: orbitTrap.scale,
        min: 0.001, max: 100,
        onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { scale: v } }),
      }) : null,
      exterior.method === 'orbitTrap' ? V(Slider, {
        label: 'Offset',
        value: orbitTrap.offset,
        min: -1, max: 1, step: 0.01,
        onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { offset: v } }),
      }) : null,
      exterior.method === 'orbitTrap' ? V(CheckboxInput, {
        label: 'Log scale',
        checked: orbitTrap.logScale,
        onChange: c => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { logScale: c } }),
      }) : null,

      exterior.method === 'solid' ? V('div', { class: 'solid-row' },
        V('div', { class: 'swatch' },
          V('input', {
            type: 'color',
            value: rgbToHex(exterior.solid.r, exterior.solid.g, exterior.solid.b),
            onInput: e => {
              const { r, g, b } = hexToRgb(e.target.value);
              store.dispatch({ type: 'coloring/setExteriorSolid', payload: { r, g, b } });
            },
          }),
        ),
        V('span', { class: 'solid-label' }, 'Solid color'),
      ) : null,

      V('hr'),

      V(SelectInput, {
        label: 'Interior',
        value: interior.method,
        options: [
          { value: 'solid',     label: 'Solid'      },
          { value: 'orbitTrap', label: 'Orbit trap' },
        ],
        onChange: m => store.dispatch({ type: 'coloring/setInteriorMethod', payload: m }),
      }),

      interior.method === 'solid' ? V('div', { class: 'solid-row' },
        V('div', { class: 'swatch' },
          V('input', {
            type: 'color',
            value: rgbToHex(interior.solid.r, interior.solid.g, interior.solid.b),
            onInput: e => {
              const { r, g, b } = hexToRgb(e.target.value);
              store.dispatch({ type: 'coloring/setInteriorSolid', payload: { r, g, b } });
            },
          }),
        ),
        V('span', { class: 'solid-label' }, 'Solid color'),
      ) : null,

      interior.method === 'orbitTrap' ? V(PaletteEditor, {
        stops: orbitTrap.stops,
        onChange: stops => store.dispatch({ type: 'coloring/setOrbitTrapStops', payload: stops }),
      }) : null,
      interior.method === 'orbitTrap' ? V(LogSlider, {
        label: 'Scale',
        value: orbitTrap.scale,
        min: 0.001, max: 100,
        onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { scale: v } }),
      }) : null,
      interior.method === 'orbitTrap' ? V(Slider, {
        label: 'Offset',
        value: orbitTrap.offset,
        min: -1, max: 1, step: 0.01,
        onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { offset: v } }),
      }) : null,
      interior.method === 'orbitTrap' ? V(CheckboxInput, {
        label: 'Log scale',
        checked: orbitTrap.logScale,
        onChange: c => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { logScale: c } }),
      }) : null,
    );
  };
}
